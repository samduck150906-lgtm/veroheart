import { Reveal } from "@/components/Reveal";
import { SectionHeading } from "@/components/SectionHeading";
import { ShieldCheckIcon, InfoIcon, CheckIcon } from "@/components/icons";

export function AnalysisPreview() {
  return (
    <section
      id="analysis-preview"
      className="bg-sand py-20 sm:py-28"
      aria-labelledby="analysis-preview-heading"
    >
      <div className="mx-auto max-w-6xl px-5 sm:px-6">
        <Reveal>
          <SectionHeading
            kicker="분석 결과 미리 보기"
            id="analysis-preview-heading"
            title="결론부터, 근거까지 함께 보여드려요"
            description="점수를 여러 개 나열하지 않고, 우리 아이 기준의 최종 결론 하나를 먼저 보여드려요."
          />
        </Reveal>

        <div className="mx-auto max-w-md">
          <Reveal>
            <div className="rounded-2xl bg-paper p-6 sm:p-8">
              <div className="flex items-center justify-between text-xs font-semibold text-ink-500">
                <span>예시 데이터</span>
                <span>코코 · 고양이 · 4세</span>
              </div>

              <div className="mt-5 flex items-center gap-3">
                <ShieldCheckIcon className="h-6 w-6 shrink-0 text-safe-deep" />
                <h3 className="text-xl font-extrabold leading-snug tracking-tightest text-ink-950">
                  코코에게 대체로 잘 맞아요
                </h3>
              </div>

              <ul className="mt-6 space-y-3.5 text-sm leading-relaxed text-ink-900">
                <li className="flex gap-2.5">
                  <CheckIcon className="mt-0.5 h-4 w-4 shrink-0 text-safe-deep" />
                  연어가 첫 번째 원료로 확인됐어요.
                </li>
                <li className="flex gap-2.5">
                  <CheckIcon className="mt-0.5 h-4 w-4 shrink-0 text-safe-deep" />
                  등록된 알레르기(닭고기)와 겹치는 원료는 발견되지 않았어요.
                </li>
                <li className="flex gap-2.5">
                  <InfoIcon className="mt-0.5 h-4 w-4 shrink-0 text-caution-deep" />
                  오메가 지방산 함량은 라벨에 공개되어 있지 않아 &lsquo;정보
                  부족&rsquo;으로 표시했어요.
                </li>
              </ul>

              <div className="mt-6 space-y-1.5 border-t border-ink-950/10 pt-5 text-xs text-ink-500">
                <p>주요 원료: 연어, 현미, 완두단백</p>
                <p>데이터 신뢰도: 라벨 공개 정보 기준</p>
              </div>
            </div>
          </Reveal>

          <Reveal delayMs={60}>
            <p className="mt-4 text-center text-xs leading-relaxed text-ink-500">
              위 화면은 서비스 구조를 보여주기 위한 예시입니다. 실제 분석
              결과는 제품 라벨 정보와 반려동물 프로필에 따라 달라집니다.
            </p>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
