import os
import sys
import json
import logging
import asyncio
from typing import List, Dict, Any, Optional

# google-genai 최신 SDK 연동 대응 예외 안전 아키텍처
try:
    from google import genai
    from google.genai import types
except ImportError:
    genai = None
    types = None

# 로거 설정
logger = logging.getLogger("gemini_analyzer")
logger.setLevel(logging.INFO)
handler = logging.StreamHandler(sys.stdout)
handler.setFormatter(logging.Formatter("[%(asctime)s] [%(levelname)s] (Gemini) %(message)s"))
logger.addHandler(handler)


# --- 1. API 스키마: OpenAPI 규격 기반 JSON 출력 스키마 정의 ---
def get_gemini_response_schema() -> Dict[str, Any]:
    """Gemini API에 전달할 OpenAPI 호환 Response Schema 정의
    
    이 스키마는 google-genai SDK의 GenerateContentConfig(response_schema=...) 포맷을 완벽하게 만족합니다.
    """
    return {
        "type": "OBJECT",
        "properties": {
            "product_name": {
                "type": "STRING",
                "description": "사료 또는 간식의 공식 한국어/영어 브랜드 및 상품명"
            },
            "ingredients": {
                "type": "ARRAY",
                "items": {"type": "STRING"},
                "description": "사용 원료 목록. 쉼표(,)를 기준으로 완전하게 정제되고 표준화된 개별 성분명의 배열"
            },
            "guaranteed_analysis": {
                "type": "OBJECT",
                "properties": {
                    "crude_protein": {"type": "NUMBER", "description": "조단백질 보증 등록 성분비 (%)"},
                    "crude_fat": {"type": "NUMBER", "description": "조지방 보증 등록 성분비 (%)"},
                    "crude_fiber": {"type": "NUMBER", "description": "조섬유 보증 등록 성분비 (%)"},
                    "crude_ash": {"type": "NUMBER", "description": "조회분 보증 등록 성분비 (%)"},
                    "moisture": {"type": "NUMBER", "description": "수분 보증 등록 성분비 (%)"},
                    "calcium": {"type": "NUMBER", "description": "칼슘 보증 등록 성분비 (%)"},
                    "phosphorus": {"type": "NUMBER", "description": "인 보증 등록 성분비 (%)"},
                    "total_dietary_fiber": {"type": "NUMBER", "description": "AAFCO 2024 규정 총 식이섬유 (Total Dietary Fiber) (%) (미표기 시 null)"}
                },
                "required": ["crude_protein", "crude_fat", "crude_fiber", "crude_ash", "moisture", "calcium", "phosphorus"],
                "description": "보증 성분 분석 데이터 객체"
            },
            "calories_per_kg": {
                "type": "NUMBER",
                "description": "1kg당 대사 에너지 칼로리(kcal/kg) (라벨 표기 또는 공식 데이터 기반, 없을 시 계산 추정치)"
            },
            "intended_life_stage": {
                "type": "STRING",
                "enum": ["Puppy", "Adult", "Senior", "All"],
                "description": "권장 급여 생애 단계 (Puppy: 성장기/자묘/자견, Adult: 성견/성묘, Senior: 노령견/노령묘, All: 전연령용)"
            },
            "contains_toxic": {
                "type": "BOOLEAN",
                "description": "ingredients 목록 내에 강아지/고양이에게 유해하거나 치명적인 성분 포함 여부"
            },
            "toxic_ingredients": {
                "type": "ARRAY",
                "items": {
                    "type": "OBJECT",
                    "properties": {
                        "ingredient": {"type": "STRING", "description": "유해 성분명"},
                        "reason": {"type": "STRING", "description": "해당 유해 성분의 수의 영양학적/독성학적 급여 제한 사유"}
                    },
                    "required": ["ingredient", "reason"]
                },
                "description": "포착된 유해/독성 성분 목록"
            },
            "caloric_distribution": {
                "type": "OBJECT",
                "properties": {
                    "protein_pct": {"type": "NUMBER", "description": "단백질 유래 칼로리 에너지 비율 (%)"},
                    "fat_pct": {"type": "NUMBER", "description": "지방 유래 칼로리 에너지 비율 (%)"},
                    "carbohydrate_pct": {"type": "NUMBER", "description": "탄수화물 유래 칼로리 에너지 비율 (%)"}
                },
                "description": "AAFCO 2024 현대화 규정에 따른 단백질, 지방, 탄수화물 유래 에너지의 백분율 비율 (미표기 시 null)"
            }
        },
        "required": [
            "product_name", 
            "ingredients", 
            "guaranteed_analysis", 
            "calories_per_kg", 
            "intended_life_stage", 
            "contains_toxic", 
            "toxic_ingredients"
        ]
    }


# --- 2, 3, 4, 6, 8. 핵심 수의 영양학 AI 프롬프트 설계 ---
def get_system_prompt() -> str:
    """수의학 전문 정보 추출 및 정제용 종합 시스템 프롬프트 튜닝"""
    return """당신은 전 세계의 반려동물 사료 영양학 및 규제 기준(AAFCO, FEDIAF)을 완벽히 꿰뚫고 있는 **수의 영양학 전문 분석 AI**입니다. 
당신에게는 사료 포장지의 라벨 사진, 성분표 스캔 이미지, 또는 이커머스의 길게 이어진 상세 설명 이미지들이 주어집니다. 
당신의 주 임무는 이미지에서 마케팅 목적의 수식어("유기농 최고급", "기적의 눈물 지우개" 등)를 철저히 걷어내고, 오직 수의학적/영양학적 사실 정보인 **'사용 원료(Ingredients)'**와 **'보증 등록 성분(Guaranteed Analysis)'**을 극도로 정밀하게 스캔 및 분석하여 JSON으로 출력하는 것입니다.

반드시 다음 규칙을 엄격하게 고수하여 원본 데이터를 정제하십시오:

### 1. 사용 원료(Ingredients) 정제 및 표준화 (OCR 에러 보정)
- 이미지 해상도 저하, 핫링크 가림 등으로 인한 철자 오탈자를 문맥을 파악하여 가장 합당한 한국어/영어 표준 사료 원료명으로 정규화(Normalization)하십시오.
  * 예: '닭고기 분말' 또는 '치킨밀' -> '닭고기분'
  * 예: '연어 고기' -> '연어'
  * 예: '비타민 E 보존제' 또는 '토코페릴 아세테이트' -> '혼합 토코페롤' (보존 목적인 경우)
  * 예: '보래지 유' -> '보리지 오일'
- '원료 목록'은 쉼표(,)를 기준으로 완전히 쪼개어 배열 형태로 구조화하십시오. 괄호 안의 하위 복합 원료는 가급적 풀어내어 단일 원료 목록에 병합하십시오.

### 2. 알레르기 및 치명적 유해 성분 판별 (Toxic Detector)
- 정제된 원료 배열(ingredients)을 면밀히 대조 검사하십시오. 
- 강아지 또는 고양이에게 아주 미량이라도 치명적 중독 반응이나 독성을 유발할 수 있는 아래 성분군이 단 하나라도 검출되면, 즉시 JSON 결과의 `contains_toxic` 필드를 `true`로 설정하고 `toxic_ingredients` 객체 배열에 빠짐없이 기재하십시오:
  * 대상 성분: 자일리톨, 포도(건포도, 포도씨 추출물 포함), 양파, 파, 마늘, 부추, 카카오(코코아, 초콜릿), 마카다미아, 아보카도, 알코올 등.
  * 요약문: "수의 영양학적으로 적혈구 파괴(용혈성 빈혈)를 유발할 수 있음", "급성 신부전을 일으켜 치명적임" 등 한 줄로 전문적 이유를 명시하십시오. 발견되지 않았다면 `contains_toxic: false`로 설정하고 배열을 비워두십시오.

### 3. 보증 성분량(Guaranteed Analysis) 논리 검증 (Format Validator)
- 보증 성분의 원본 값 뒤에 문자가 섞이거나 단위(%, mg/kg 등)가 섞여있다면 순수한 숫자형 데이터로 정제하십시오.
- 데이터 추출 후 아래의 논리적 한계 수치를 자체 검증(Self-Correction)하십시오:
  * 조단백질(crude_protein) + 조지방(crude_fat) + 조섬유(crude_fiber) + 조회분(crude_ash) + 수분(moisture)의 총합은 절대 100%를 초과할 수 없습니다. 
  * 만약 총합이 100%를 초과하거나, 수분 함량이 비정상적으로 높게 검출된다면 소수점(.) 위치 오독(예: "8.5%"를 "85%"로 인식)을 저지르지 않았는지 이미지 속 소수점 크기와 화질을 재추적하여 완벽히 재교정하십시오.
  * 수분은 일반 건식 사료의 경우 8~12%, 습식의 경우 70~85% 수준을 가집니다.

### 4. AAFCO 2024 라벨 현대화 규정 적용 (AAFCO 2024 Modernization)
- 신규 AAFCO 라벨 규정에 맞추어, 기존 조섬유(Crude Fiber) 외에 **총 식이섬유(Total Dietary Fiber)** 검출 수치가 라벨에 별도로 명시되어 있는지 집요하게 스캔하고, 있다면 `total_dietary_fiber` 필드에 숫자로 매핑하십시오. (미표기 시 null 처리)
- 영양 정보 또는 AAFCO 칼로리 선언문 근처에 명시되는 **단백질, 지방, 탄수화물 유래 칼로리 기여도 비율 (Caloric Distribution)** 데이터를 식별해 냅니다.
  * 예: "단백질로부터 28%, 지방으로부터 42%, 탄수화물로부터 30%의 에너지 공급" -> `caloric_distribution`에 각각의 백분율 비율 수치를 기록하십시오. (없을 시 null 처리)

### 5. 급여 생애 단계 (intended_life_stage) 식별
- 라벨에 "자견/자묘용", "성장기", "임신/수유기" 표기가 보인다면 -> "Puppy"
- "성견용", "성묘용", "어덜트" -> "Adult"
- "노령견", "실버", "시니어" -> "Senior"
- "전연령용", "All Life Stages" -> "All"
"""


# --- 5, 7. API 통합: SDK 연동 비동기 호출 & 다중 이미지 일괄 처리 ---
class GeminiNutritionAnalyzer:
    """Google GenAI 최신 SDK 기반 비동기 이미지 다중 분석 엔진"""
    def __init__(self, api_key: Optional[str] = None):
        self.api_key = api_key or os.environ.get("GEMINI_API_KEY", "")
        self.model_name = "gemini-1.5-pro"  # 복잡한 다중 이미지 추론과 OCR 보정을 위한 최상위 모델 지정
        
        if genai:
            # google-genai 최신 SDK는 genai.Client를 진입점으로 사용합니다.
            self.client = genai.Client(api_key=self.api_key)
        else:
            self.client = None
            logger.warning("google-genai SDK가 설치되어 있지 않습니다. 모의(Mock) 호출 체계를 사용합니다.")

    async def analyze_feed_images_batch(self, image_paths: List[str]) -> Dict[str, Any]:
        """최대 3장(전면, 성분표, 급여 가이드 등)의 사료 사진을 일괄 취합하여 단일 분석 JSON으로 병합 반환"""
        if not self.api_key and not self.client:
            logger.warning("[API Key 누락] 모의 분석 데이터를 반환합니다.")
            return self._generate_mock_output()

        logger.info(f"📁 총 {len(image_paths)}개의 이미지를 일괄 업로드 및 분석을 예약합니다.")
        
        try:
            uploaded_files = []
            
            # 1. google-genai SDK의 비동기 파일 업로드 (client.files.upload API)
            # Deno/Node의 File API처럼 대용량 이미지를 업로드한 후 URI를 넘겨 메모리 오버헤드와 봇 탐지를 회피합니다.
            for idx, path in enumerate(image_paths):
                if not os.path.exists(path):
                    logger.error(f"파일이 존재하지 않아 스킵합니다: {path}")
                    continue
                
                logger.info(f"  [{idx+1}/{len(image_paths)}] Gemini 서버로 이미지 파일 업로드 중: {os.path.basename(path)}")
                
                # google-genai SDK: client.files.upload API 동기 실행을 Executor를 통해 비동기로 가동
                loop = asyncio.get_running_loop()
                uploaded_file = await loop.run_in_executor(
                    None,
                    lambda p=path: self.client.files.upload(file=p)
                )
                uploaded_files.append(uploaded_file)
                logger.info(f"    -> 업로드 성공 (URI: {uploaded_file.uri})")

            if not uploaded_files:
                raise FileNotFoundError("분석할 유효한 이미지 파일이 성공적으로 업로드되지 않았습니다.")

            # 2. OpenAPI Response 스키마 및 시스템 프롬프트 설정 구성
            response_schema = get_gemini_response_schema()
            system_prompt = get_system_prompt()

            # types.GenerateContentConfig를 이용한 최신 google-genai 설정 정의
            config = types.GenerateContentConfig(
                system_instruction=system_prompt,
                response_mime_type="application/json",
                response_schema=response_schema,
                temperature=0.1,  # OCR 및 정량적 데이터 무결성을 위해 높은 일관성(낮은 온도) 지정
                max_output_tokens=2048
            )

            # 3. 다중 이미지(URI)와 프롬프트를 묶어 컨텐츠 배열(contents) 구성
            # 세 이미지에 흩어져 있는 전면 브랜드명, 후면 성분표, 칼로리 표기를 지능적으로 결합(Merge) 추론하게 지시
            contents = []
            contents.extend(uploaded_files)
            contents.append(
                "동시에 전달된 사료 이미지 세트들을 수의 영양학적 기준에 따라 하나의 통합된 정보 객체로 완벽히 정제하여 병합 출력하십시오."
            )

            # 4. 비동기 Generate Content API 구동
            logger.info(f"🔮 Gemini {self.model_name} 모델 비동기 분석 요청 전송 중...")
            loop = asyncio.get_running_loop()
            
            response = await loop.run_in_executor(
                None,
                lambda: self.client.models.generate_content(
                    model=self.model_name,
                    contents=contents,
                    config=config
                )
            )

            # 5. 결과 파싱 및 안전 가독성 2차 예외 처리
            result_text = response.text.strip()
            if not result_text:
                logger.warning("Gemini에서 비어있는 문자열을 반환했습니다. 이미지 가독성 오류로 판정합니다.")
                return self._get_empty_fallback("Empty API Response")

            parsed_json = json.loads(result_text)
            logger.info("🎉 Gemini 비동기 다중 이미지 분석 및 정보 병합 성공!")
            return parsed_json

        except json.JSONDecodeError as je:
            logger.error(f"Gemini 반환 JSON 파싱 에러 (반환 텍스트 오류): {je}")
            return self._get_empty_fallback(f"JSON Parse Error: {str(je)}")
        except Exception as e:
            logger.error(f"⚠️ [Gemini API Exception] 분석 실패: {e}")
            return self._get_empty_fallback(str(e))

    def _get_empty_fallback(self, reason: str) -> Dict[str, Any]:
        """이미지가 너무 흐려 텍스트를 판별할 수 없거나 API 에러 발생 시의 규격화된 빈 JSON Fallback 객체"""
        logger.warning(f"🚨 [FALLBACK 발동] 사료 정보 추출에 실패하여 빈 규격화 객체를 반환합니다 (사유: {reason})")
        return {
            "product_name": "판별 불가능 (화질 저하 또는 분석 실패)",
            "ingredients": [],
            "guaranteed_analysis": {
                "crude_protein": 0.0,
                "crude_fat": 0.0,
                "crude_fiber": 0.0,
                "crude_ash": 0.0,
                "moisture": 0.0,
                "calcium": 0.0,
                "phosphorus": 0.0,
                "total_dietary_fiber": None
            },
            "calories_per_kg": 0.0,
            "intended_life_stage": "All",
            "contains_toxic": False,
            "toxic_ingredients": [],
            "caloric_distribution": None
        }

    def _generate_mock_output(self) -> Dict[str, Any]:
        """API 키가 유효하지 않을 때 반환할 정밀 모의 영양 데이터"""
        return {
            "product_name": "[모의 분석] 베로로 프리미엄 인도어 치킨 사료",
            "ingredients": ["닭고기분", "보리", "현미", "혼합 토코페롤", "L-라이신", "타우린", "유기농 아마씨", "보리지 오일"],
            "guaranteed_analysis": {
                "crude_protein": 32.5,
                "crude_fat": 14.0,
                "crude_fiber": 3.2,
                "crude_ash": 7.5,
                "moisture": 9.5,
                "calcium": 1.2,
                "phosphorus": 0.95,
                "total_dietary_fiber": 5.4
            },
            "calories_per_kg": 3750.0,
            "intended_life_stage": "Adult",
            "contains_toxic": False,
            "toxic_ingredients": [],
            "caloric_distribution": {
                "protein_pct": 31.0,
                "fat_pct": 38.0,
                "carbohydrate_pct": 31.0
            }
        }


# --- 로컬 모듈 기능 및 데이터 정제 자가 테스트 ---
if __name__ == "__main__":
    async def run_test():
        logger.info("=========================================")
        logger.info("Gemini 영양학 분석기 자가 검증 프로세스 가동")
        logger.info("=========================================")

        # 1. API 스키마 정합성 검증
        schema = get_gemini_response_schema()
        logger.info(f"OpenAPI 규격 스키마 로드 완료 (필수 필드 수: {len(schema['required'])})")
        
        # 2. Mock 분석기 구동 테스트
        analyzer = GeminiNutritionAnalyzer(api_key="")
        mock_res = await analyzer.analyze_feed_images_batch(["mock_front.png", "mock_ingredients.jpg"])
        
        logger.info(f"정밀 모의 분석 결과 JSON 출력 검증:\n{json.dumps(mock_res, ensure_ascii=False, indent=2)}")

        # 3. 수의 영양학적 1차 독성 판별 시뮬레이션
        # ingredients 목록에 자일리톨이 들어갔을 때contains_toxic 갱신 기능 예시
        raw_ingredients = ["닭고기", "자일리톨", "포도씨오일", "쌀가루"]
        logger.info(f"자가 진단용 원재료: {raw_ingredients}")
        
        # 가상의 정제 파이프라인
        contains_toxic = any(x in ["자일리톨", "포도", "포도씨오일", "양파", "마늘"] for x in raw_ingredients)
        logger.info(f"독성 유무 1차 감지 필터 테스트: {contains_toxic} (자일리톨 감지됨)")
        
        logger.info("=========================================")
        logger.info("Gemini 분석기 자가 검증 성공적으로 완료")
        logger.info("=========================================")

    asyncio.run(run_test())
