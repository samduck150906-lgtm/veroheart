/**
 * 설명 생성기 — 파이프라인의 마지막 단계.
 *
 * 핵심 원칙(가장 중요한 운영 원칙):
 *   LLM은 판단 엔진으로 쓰지 않는다. 위험/안전 판정은 규칙 엔진이 끝낸 상태이고,
 *   LLM(또는 템플릿)은 "이미 정해진 사실"을 사용자에게 쉬운 말로 풀어주기만 한다.
 *
 *   라벨 → 사전 매칭 → 규칙 엔진 판단 → 점수 계산 → (여기) 설명 생성
 *
 * 그래서 이 모듈은:
 *  1) 결정적 템플릿 생성기(TemplateExplanationGenerator)를 기본 제공하고,
 *  2) LLM을 끼우고 싶을 때 쓸 프롬프트(buildExplanationPrompt)와 주입형
 *     Generator 인터페이스를 제공한다. LLM이 받는 입력은 "사실"뿐이며,
 *     실패하면 템플릿으로 안전하게 폴백한다.
 */
import type { Finding, Grade, RuleEngineResult } from './types';

export interface UserExplanation {
  /** 한 줄 헤드라인 (등급/요약) */
  headline: string;
  /** 본문 요약(2~3문장) */
  summary: string;
  goodPoints: string[];
  cautionPoints: string[];
  missingInfo: string[];
  disclaimer: string;
}

export interface ExplanationGenerator {
  generate(result: RuleEngineResult, petName?: string): Promise<UserExplanation>;
}

function gradePhrase(grade: Grade, hasDanger: boolean): string {
  if (hasDanger) return '급여 전 확인이 꼭 필요해요';
  switch (grade) {
    case 'A+':
    case 'A':
      return '안심하고 급여할 수 있는 구성이에요';
    case 'B+':
    case 'B':
      return '대체로 무난하지만 일부 확인이 필요해요';
    case 'C':
      return '주의해서 살펴볼 점이 있어요';
    default:
      return '전문가 상담이 권장돼요';
  }
}

function findingLine(f: Finding): string {
  const names = f.ingredients?.length ? `${f.ingredients.join(', ')} — ` : '';
  return `${names}${f.message}`;
}

/**
 * 사실(RuleEngineResult)만으로 결정적 설명을 만든다. LLM 불필요.
 * 항상 동작하며, LLM 경로의 안전한 폴백이기도 하다.
 */
export class TemplateExplanationGenerator implements ExplanationGenerator {
  async generate(result: RuleEngineResult, petName?: string): Promise<UserExplanation> {
    const hasDanger = result.warnings.some((w) => w.level === 'danger');
    const who = petName || '우리 아이';
    const headline = `종합 등급: ${result.grade} · ${gradePhrase(result.grade, hasDanger)}`;

    const summary = hasDanger
      ? `${who}에게 위험할 수 있는 성분이 포함돼 있어요. ${result.summary}`
      : `${result.summary}`;

    return {
      headline,
      summary,
      goodPoints: result.positives.map(findingLine),
      cautionPoints: result.warnings
        .slice()
        .sort((a, b) => a.scoreDelta - b.scoreDelta)
        .map(findingLine),
      missingInfo: result.unknowns.length
        ? [`사전에 없는 원료(${result.unknowns.join(', ')})는 추가 확인이 필요해요.`]
        : [],
      disclaimer: result.disclaimer,
    };
  }
}

/**
 * LLM에 넘길 프롬프트를 만든다.
 * LLM은 아래 "사실"만 받아 한국어로 쉽게 풀어쓰며, 판단/추가·삭제를 하지 않는다.
 */
export function buildExplanationPrompt(result: RuleEngineResult, petName?: string): string {
  const facts = {
    petName: petName ?? null,
    grade: result.grade,
    score: result.score,
    hasDanger: result.warnings.some((w) => w.level === 'danger'),
    goodPoints: result.positives.map((p) => ({ title: p.title, detail: p.message, ingredients: p.ingredients ?? [] })),
    cautionPoints: result.warnings.map((w) => ({
      level: w.level,
      title: w.title,
      detail: w.message,
      ingredients: w.ingredients ?? [],
    })),
    missingInfo: result.unknowns,
  };

  return [
    '당신은 반려동물 사료/간식 분석 결과를 보호자에게 친절하게 설명하는 역할입니다.',
    '아래 JSON은 규칙 엔진이 이미 확정한 "사실"입니다. 당신의 임무는 이 사실을 한국어로',
    '쉽고 따뜻하게 풀어 설명하는 것뿐입니다.',
    '',
    '엄격한 규칙:',
    '- 위험/안전 여부, 등급, 점수를 절대 바꾸거나 새로 판단하지 마세요.',
    '- 주어진 사실에 없는 성분·효능·위험을 추가하지 마세요(환각 금지).',
    '- 진단/치료를 단정하지 말고, 표현은 "~할 수 있어요" 수준으로 부드럽게.',
    '- goodPoints/cautionPoints/missingInfo 항목 수를 임의로 늘리거나 줄이지 마세요.',
    '',
    '출력 형식(JSON): { "headline": string, "summary": string, "goodPoints": string[], "cautionPoints": string[], "missingInfo": string[] }',
    '',
    '사실(JSON):',
    JSON.stringify(facts, null, 2),
  ].join('\n');
}

/**
 * LLM 기반 설명 생성기.
 *
 * complete: 프롬프트 문자열을 받아 모델 응답 문자열을 돌려주는 함수(provider 주입).
 *           실제 모델/SDK는 호출부가 결정한다(여기서는 모델 비종속).
 * 응답 파싱이나 호출이 실패하면 TemplateExplanationGenerator로 폴백한다.
 */
export class LlmExplanationGenerator implements ExplanationGenerator {
  private fallback = new TemplateExplanationGenerator();
  private complete: (prompt: string) => Promise<string>;

  constructor(complete: (prompt: string) => Promise<string>) {
    this.complete = complete;
  }

  async generate(result: RuleEngineResult, petName?: string): Promise<UserExplanation> {
    try {
      const raw = await this.complete(buildExplanationPrompt(result, petName));
      const parsed = JSON.parse(extractJson(raw));
      // LLM은 설명만 한다. 판정 관련 필드(disclaimer 등)는 사실에서 그대로 가져온다.
      return {
        headline: String(parsed.headline ?? ''),
        summary: String(parsed.summary ?? ''),
        goodPoints: toStringArray(parsed.goodPoints),
        cautionPoints: toStringArray(parsed.cautionPoints),
        missingInfo: toStringArray(parsed.missingInfo),
        disclaimer: result.disclaimer,
      };
    } catch {
      return this.fallback.generate(result, petName);
    }
  }
}

function toStringArray(v: unknown): string[] {
  return Array.isArray(v) ? v.map((x) => String(x)) : [];
}

/** 모델 응답에서 JSON 본문만 추출(코드펜스/잡텍스트 방어) */
function extractJson(raw: string): string {
  const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fenced) return fenced[1].trim();
  const first = raw.indexOf('{');
  const last = raw.lastIndexOf('}');
  if (first >= 0 && last > first) return raw.slice(first, last + 1);
  return raw.trim();
}

/** 기본 생성기(앱에서 즉시 사용 가능, 비용/네트워크 없음) */
export const defaultExplanationGenerator = new TemplateExplanationGenerator();
