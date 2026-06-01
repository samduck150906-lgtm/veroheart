import re
import sys
import logging
from typing import List, Dict, Any, Tuple, Optional

# 로거 설정
logger = logging.getLogger("nutrition_scorer")
logger.setLevel(logging.INFO)
handler = logging.StreamHandler(sys.stdout)
handler.setFormatter(logging.Formatter("[%(asctime)s] [%(levelname)s] (Scorer) %(message)s"))
logger.addHandler(handler)


# --- 1 ~ 8. PetFoodScorer 통합 클래스 구현 ---
class PetFoodScorer:
    """반려동물 사료 영양학 및 원료 채점 엔진"""
    def __init__(self):
        # 100점 만점으로 시작하는 스코어링 시스템 토폴로지
        self.base_score = 100
        
        # 감점 요인 딕셔너리 명세 (부산물, 화학 보존제, 정화 필터)
        self.penalties_dictionary = {
            "bha": {"points": 10, "reason": "인공 합성 방부제 BHA 검출 (종양 유발 우려)"},
            "bht": {"points": 10, "reason": "인공 합성 방부제 BHT 검출 (간/신장 기능 장애 우려)"},
            "에톡시퀸": {"points": 10, "reason": "에톡시퀸(Ethoxyquin) 방부제 검출 (신장 독성 가능성)"},
            "ethoxyquin": {"points": 10, "reason": "인공 합성 에톡시퀸 방부제 검출 (신장 독성)"},
            "부산물": {"points": 5, "reason": "출처 명확 동물성 부산물 포함 (소화율 저하)"},
            "by-product": {"points": 5, "reason": "동물성 부산물(By-product) 검출"},
            "설탕": {"points": 5, "reason": "불필요한 당류 첨가 (비만 및 치아 손상 우려)"},
            "sugar": {"points": 5, "reason": "당류 첨가"},
            "소금": {"points": 3, "reason": "과도한 나트륨 함량 (신장 및 심혈관 부하 우려)"},
            "salt": {"points": 3, "reason": "염화나트륨(Salt) 첨가"}
        }

        # 가점 요인 딕셔너리 명세 (명확한 생육, 프리미엄 천연 오일 등)
        self.bonuses_dictionary = {
            "닭고기": {"points": 5, "reason": "첫 번째 원료로 고품질 생육(닭고기) 사용"},
            "오리고기": {"points": 5, "reason": "첫 번째 원료로 고품질 생육(오리고기) 사용"},
            "소고기": {"points": 5, "reason": "첫 번째 원료로 고품질 생육(소고기) 사용"},
            "양고기": {"points": 5, "reason": "첫 번째 원료로 고품질 생육(양고기) 사용"},
            "연어": {"points": 5, "reason": "첫 번째 원료로 오메가3가 풍부한 생육(연어) 사용"},
            "연어오일": {"points": 3, "reason": "천연 오메가3 보충원인 연어 오일 첨가"},
            "salmon oil": {"points": 3, "reason": "연어 오일 함유"},
            "해바라기씨유": {"points": 2, "reason": "피모 건강에 도움을 주는 해바라기씨유 첨가"},
            "sunflower oil": {"points": 2, "reason": "해바라기씨유 함유"},
            "아마씨": {"points": 2, "reason": "천연 프리바이오틱스 및 섬유질 공급원인 아마씨 함유"}
        }

    # --- ② 정규표현식: 출처 불분명 육류 필터 (Anonymous Meat Filter) ---
    def check_anonymous_meat(self, ingredients: List[str]) -> List[Dict[str, Any]]:
        """명확한 동물명이 표시되지 않은 가금류/고기/동물성 육분, 지방, 부산물 감점
        
        닭, 소, 돼지 등의 구체적 생물이 아닌 '육분', '동물성지방' 등은 낮은 등급의 폐사육이나 도축 부산물일 확률이 매우 높습니다.
        """
        penalties = []
        
        # 1. 동물 명칭 배제 정규식 패턴 (닭, 소, 돼지, 오리, 양, 칠면조, 토끼, 연어, 명태 등 명확한 명칭이 있을 땐 통과)
        clear_animals_rx = re.compile(
            r"(닭|소|돼지|오리|양|칠면조|토끼|연어|명태|대구|참치|고등어|치킨|비프|포크|덕|램|터키|새먼|tuna|salmon|chicken|beef|pork|lamb|turkey)", 
            re.IGNORECASE
        )
        
        # 2. 출처 불분명 육류 시그니처 정규식 패턴 (고기, 가금류, 동물성, 육, 가금 + 육분, 지방, 부산물, 기름 등)
        anonymous_meat_rx = re.compile(
            r"(고기|가금|동물성|육|식육|가축|meat|poultry|animal)\s*(분|가루|지방|유|부산물|기름|혼합물|meal|fat|by-product|oil)",
            re.IGNORECASE
        )
        
        # '육분', '육골분' 등 단어 단독 매칭
        single_bad_rx = re.compile(r"^(육분|육골분|동물성지방|가금부산물|가금분|meat meal|animal fat|poultry meal)$", re.IGNORECASE)

        for ing in ingredients:
            ing_clean = ing.strip()
            
            # 구체적인 동물 명칭이 포함되어 있다면 감점 제외
            if clear_animals_rx.search(ing_clean):
                continue
                
            # 출처 불분명 패턴이나 단독 단어가 매칭될 경우 -10점 감점
            if anonymous_meat_rx.search(ing_clean) or single_bad_rx.search(ing_clean):
                pen = {
                    "ingredient": ing_clean,
                    "points": 10,
                    "reason": f"출처 불분명한 육류 성분 감지 ({ing_clean}): 급여 성분의 정확한 출처 파악이 불가능함."
                }
                penalties.append(pen)
                
        return penalties

    # --- ③ 논리 검증: 곡물 분할 탐지기 (Ingredient Splitting Detector) ---
    def detect_ingredient_splitting(self, ingredients: List[str]) -> List[Dict[str, Any]]:
        """상위 5대 핵심 주원료 내에서 꼼수 '곡물 분할' 탐지
        
        동일한 종류의 곡물을 여러 형태로 나누어 표기함으로써, 육류 성분보다 고지비율의 곡물이 
        뒤쪽에 배치되도록 유도하는 라벨 꼼수를 정밀 타겟팅합니다.
        """
        penalties = []
        if len(ingredients) < 2:
            return penalties

        # 분석 범위: 성분표 중량이 가장 높은 최상위 5대 성분 추출
        top_5 = [ing.strip() for ing in ingredients[:5]]
        
        # 어원(root) 및 동등 곡물 유래 패밀리 분류 맵
        grain_families = {
            "쌀 계열": ["쌀", "쌀가루", "미강", "싸라기", "백미", "현미", "왕겨", "rice", "brown rice"],
            "옥수수 계열": ["옥수수", "옥수수글루텐", "옥수수분", "콘글루텐", "corn", "maize"],
            "대두 계열": ["대두", "대두박", "콩가루", "대두단백", "소이빈", "soybean", "soy"],
            "밀 계열": ["밀", "밀가루", "소맥", "소맥분", "밀글루텐", "wheat", "wheat bran"]
        }

        # 5대 주원료 순회하며 카운트
        detected_families = {}
        for ing in top_5:
            for family_name, synonyms in grain_families.items():
                # 유사도 대조 및 포함 관계 검사
                if any(syn in ing.lower() for syn in synonyms):
                    if family_name not in detected_families:
                        detected_families[family_name] = []
                    detected_families[family_name].append(ing)

        # 2번 이상 분할 검출된 곡물 패밀리에 대해 -5점 감점 조치
        for family_name, matched_ingredients in detected_families.items():
            if len(matched_ingredients) >= 2:
                pen = {
                    "family": family_name,
                    "points": 5,
                    "reason": f"곡물 분할(Ingredient Splitting) 감지 ({family_name}): "
                              f"{', '.join(matched_ingredients)} 성분이 분할 표기되어 주원료 함량이 왜곡되었을 우려가 있음."
                }
                penalties.append(pen)

        return penalties

    # --- ④ AAFCO 검증: 영양 요구량 DMB 밸리데이터 (AAFCO Validator) ---
    def validate_aafco_dmb(self, guaranteed_analysis: Dict[str, float]) -> Tuple[bool, List[str]]:
        """강아지(Dog) 성견 유지기(Adult Maintenance) AAFCO 최소 충족 요건 밸리데이터
        
        수분을 완전히 배제한 **건물 기준 (Dry Matter Basis, DMB)**으로 모든 값을 수학적 변환하여 비교합니다.
        """
        passed = True
        failures = []

        # 1. 필수 성분 추출
        moisture = guaranteed_analysis.get("moisture", 0.0)
        
        # 수분이 100% 이상일 수 없도록 방어 처리
        if moisture >= 100.0:
            moisture = 99.0
            
        dry_matter = (100.0 - moisture) / 100.0

        # DMB 변환 내부 헬퍼 (수분 0% 상태의 순수 건물 기준 영양 수치 환산)
        def to_dmb(val: float) -> float:
            return round(val / dry_matter, 2)

        # 2. AAFCO Adult Dog 영양 성분별 DMB 최소값 기준 매핑
        # - 조단백: 18.0% 이상 (DMB)
        # - 조지방: 5.5% 이상 (DMB)
        # - 칼슘: 0.6% 이상 (DMB)
        # - 인: 0.5% 이상 (DMB)
        aafco_limits = {
            "crude_protein": {"min": 18.0, "name": "조단백질"},
            "crude_fat": {"min": 5.5, "name": "조지방"},
            "calcium": {"min": 0.6, "name": "칼슘"},
            "phosphorus": {"min": 0.5, "name": "인"}
        }

        for key, limit in aafco_limits.items():
            raw_val = guaranteed_analysis.get(key, 0.0)
            dmb_val = to_dmb(raw_val)
            
            if dmb_val < limit["min"]:
                passed = False
                failures.append(
                    f"{limit['name']} DMB 충족 미달: 실측 DMB {dmb_val}% (AAFCO 최소 기준 {limit['min']}% 미만)"
                )

        return passed, failures

    # --- ⑤ 에너지 계산: Atwater 칼로리 계산기 (Atwater Calculator) ---
    def calculate_atwater_calories(self, guaranteed_analysis: Dict[str, float]) -> float:
        """Modified Atwater factors 기반 사료 칼로리(kcal/kg) 추정 연산
        
        단백질 3.5 kcal/g, 지방 8.5 kcal/g, 탄수화물(NFE) 3.5 kcal/g 기준
        """
        protein = guaranteed_analysis.get("crude_protein", 0.0)
        fat = guaranteed_analysis.get("crude_fat", 0.0)
        fiber = guaranteed_analysis.get("crude_fiber", 0.0)
        ash = guaranteed_analysis.get("crude_ash", 0.0)
        moisture = guaranteed_analysis.get("moisture", 0.0)

        # NFE (무질소추출물, 탄수화물 추정치) 계산 공식
        # NFE = 100 - (조단백 + 조지방 + 조섬유 + 조회분 + 수분)
        nfe = 100.0 - (protein + fat + fiber + ash + moisture)
        if nfe < 0:
            nfe = 0.0

        # Modified Atwater kcal/kg 공식
        # Calories (kcal/kg) = ((3.5 * protein) + (8.5 * fat) + (3.5 * NFE)) * 10
        calories = ((3.5 * protein) + (8.5 * fat) + (3.5 * nfe)) * 10.0
        return round(calories, 2)

    # --- ⑥ FEDIAF 교차검증: 상한선 경고 시스템 (Maximum Limit Alert) ---
    def check_fediaf_limits(self, guaranteed_analysis: Dict[str, float]) -> List[str]:
        """유럽 FEDIAF 영양 지침 가이드에 따른 과잉 섭취 방지용 상한선(Maximum Limit) 경고 시스템"""
        warnings = []

        calcium = guaranteed_analysis.get("calcium", 0.0)
        phosphorus = guaranteed_analysis.get("phosphorus", 0.0)

        # 1. 칼슘 대 인 비율(Ca:P ratio) 검증 (권장 가이드: 1:1 ~ 2:1)
        if phosphorus > 0:
            ratio = calcium / phosphorus
            if ratio < 1.0 or ratio > 2.0:
                warnings.append(
                    f"⚠️ [Ca:P 비율 경고] 칼슘-인 비율 불균형: {ratio:.2f}:1 (권장 범위 1:1 ~ 2:1 벗어남. 골격 발달 악영향 우려)"
                )
        else:
            warnings.append("⚠️ [데이터 누락] '인' 함량이 표기되지 않아 Ca:P 균형 연산이 불가합니다.")

        # 2. 미량 영양소 과잉 여부 검증 (비타민 A, 아연 등 고독성 원소 타겟팅)
        # 만약 DMB로 변환된 칼슘 수치가 과도하게 높을 경우 (FEDIAF 최대 상한선 2.5% 기준 검사)
        moisture = guaranteed_analysis.get("moisture", 0.0)
        dry_matter = (100.0 - moisture) / 100.0 if moisture < 100.0 else 1.0
        calcium_dmb = calcium / dry_matter

        if calcium_dmb > 2.5:
            warnings.append(
                f"⚠️ [FEDIAF 상한선 초과] 칼슘 수치 과다: DMB {calcium_dmb:.2f}% (FEDIAF 최대 영양 상한인 2.5% 초과. 신장 결석 유발 가능)"
            )

        return warnings

    # --- ⑧ 마이펫 매칭: 사용자 알레르기 연동 분석 (Allergy Matcher) ---
    def match_allergies(self, ingredients: List[str], pet_allergies: List[str]) -> Tuple[bool, List[str]]:
        """마이펫 프로필에 기입된 특정 알레르기 유발 물질을 스캔하여 위험 원료 추출"""
        allergy_warning = False
        danger_ingredients = []

        if not pet_allergies:
            return allergy_warning, danger_ingredients

        # 사용자가 등록한 알레르기 단어 정규식 컴파일 (예: 닭고기, 닭, 소, 연어 등)
        for allergy in pet_allergies:
            allergy_clean = allergy.strip().lower()
            if not allergy_clean:
                continue
                
            # 부분 일치 정규식 (예: '닭고기' 알레르기 시 '닭고기분', '계육' 등 대조)
            allergy_rx = re.compile(
                rf"({allergy_clean}|닭|계육|치킨|오리|덕|소|우육|비프|돼지|포크|양|램|연어|salmon|chicken|beef|pork|lamb)", 
                re.IGNORECASE
            )

            for ing in ingredients:
                ing_lower = ing.lower()
                if allergy_clean in ing_lower or allergy_rx.search(ing_lower):
                    allergy_warning = True
                    if ing not in danger_ingredients:
                        danger_ingredients.append(ing)

        return allergy_warning, danger_ingredients

    # --- ⑦ 데이터 종합: 메인 채점 컨트롤러 파이프라인 (Main Controller) ---
    def score_pet_food(
        self, 
        ingredients: List[str], 
        guaranteed_analysis: Dict[str, float], 
        pet_allergies: Optional[List[str]] = None
    ) -> Dict[str, Any]:
        """모든 서브시스템 모듈을 엮어 최상급 정량적 영양 평점을 수립하는 마스터 채점 파이프라인"""
        score = self.base_score
        penalties = []
        bonuses = []

        # 1. ingredients 원재료 가점 및 감점 1차 딕셔너리 스캔
        if ingredients:
            # 첫 번째 주원료가 고품질 생육인지 검사 (우선 가점 부여)
            first_ing = ingredients[0].strip()
            for key, val in self.bonuses_dictionary.items():
                if key in first_ing:
                    bonuses.append({"reason": val["reason"], "points": val["points"]})
                    score += val["points"]
                    break # 첫 성분 생육 가점은 중복 적용 배제

            # 전체 성분 순회하며 천연 오일 가점 및 방부제 감점 적용
            seen_items = set()
            for ing in ingredients:
                ing_clean = ing.strip()
                # 가점 체크
                for key, val in self.bonuses_dictionary.items():
                    if key in ing_clean and key not in seen_items:
                        # 첫 원료 생육 가점 중복 방지
                        if "첫 번째 원료" in val["reason"]:
                            continue
                        bonuses.append({"reason": val["reason"], "points": val["points"]})
                        score += val["points"]
                        seen_items.add(key)

                # 감점 체크
                for key, val in self.penalties_dictionary.items():
                    if key in ing_clean.lower() and key not in seen_items:
                        penalties.append({"reason": val["reason"], "points": val["points"]})
                        score -= val["points"]
                        seen_items.add(key)

        # 2. 출처 불분명 육류 감점 적용
        anon_meat_penalties = self.check_anonymous_meat(ingredients)
        for amp in anon_meat_penalties:
            penalties.append({"reason": amp["reason"], "points": amp["points"]})
            score -= amp["points"]

        # 3. 곡물 분할 감점 적용
        splitting_penalties = self.detect_ingredient_splitting(ingredients)
        for sp in splitting_penalties:
            penalties.append({"reason": sp["reason"], "points": sp["points"]})
            score -= sp["points"]

        # 4. 점수 범위 제한 조정 (최소 0점 ~ 최대 100점 바인딩)
        score = max(0, min(100, score))

        # 5. 등급(Grade) 산출 (A: 90점 이상, B: 80~89점, C: 70~79점, D: 60~69점, F: 60점 미만)
        if score >= 90:
            grade = "A"
        elif score >= 80:
            grade = "B"
        elif score >= 70:
            grade = "C"
        elif score >= 60:
            grade = "D"
        else:
            grade = "F"

        # 6. AAFCO DMB 영양 적합성 판정
        aafco_passed, aafco_failures = self.validate_aafco_dmb(guaranteed_analysis)

        # 7. 칼로리 추정 연산 (라벨 칼로리 미표기 시 Modified Atwater factor 추정치 산출)
        estimated_calories = self.calculate_atwater_calories(guaranteed_analysis)

        # 8. FEDIAF 가이드라인 상한선 및 비율 균형 검사
        warnings = self.check_fediaf_limits(guaranteed_analysis)
        for fail in aafco_failures:
            warnings.append(f"❌ [AAFCO 규격 미달] {fail}")

        # 9. 마이펫 알레르기 성분 크로스 스캔 매핑
        allergy_warning, danger_ingredients = self.match_allergies(ingredients, pet_allergies or [])

        # 10. 최종 통합 JSON 명세 반환
        return {
            "score": score,
            "grade": grade,
            "bonuses": bonuses,
            "penalties": penalties,
            "aafco_passed": aafco_passed,
            "estimated_calories_kcal_kg": estimated_calories,
            "warnings": warnings,
            "allergy_warning": allergy_warning,
            "danger_ingredients": danger_ingredients
        }


# --- 로컬 영양 채점 파이프라인 무결성 진단 테스트 ---
if __name__ == "__main__":
    def run_diagnostics():
        logger.info("=========================================")
        logger.info("베로로 프리미엄 영양학 채점 엔진 자가 진단")
        logger.info("=========================================")

        # 테스트용 시뮬레이션 데이터셋 정의
        # 1. 고품질 연어 베이스 쌀 분할 사료
        ingredients = ["연어", "쌀", "미강", "닭고기분", "동물성지방", "에톡시퀸", "연어오일", "소금"]
        analysis = {
            "crude_protein": 28.0,
            "crude_fat": 12.0,
            "crude_fiber": 3.0,
            "crude_ash": 6.5,
            "moisture": 10.0,
            "calcium": 1.2,
            "phosphorus": 0.8
        }
        pet_allergies = ["닭고기", "밀"]

        # 채점 개시
        scorer = PetFoodScorer()
        results = scorer.score_pet_food(ingredients, analysis, pet_allergies)

        logger.info("종합 채점 완료 JSON 검증:")
        import json
        print(json.dumps(results, ensure_ascii=False, indent=2))

        # 논리적 검사 확인
        assert results["score"] < 100, "감점 요인이 정상 작동해야 합니다."
        assert results["allergy_warning"] is True, "닭고기 알레르기가 감지되어야 합니다."
        assert len(results["danger_ingredients"]) > 0, "위험 성분 배열에 닭고기분이 담겨야 합니다."
        
        logger.info("=========================================")
        logger.info("모든 Scorer 서브 컴포넌트 무오류 통과 검증 완료!")
        logger.info("=========================================")

    run_diagnostics()
