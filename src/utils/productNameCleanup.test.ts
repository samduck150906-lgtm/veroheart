import { describe, expect, it } from 'vitest';
import { suggestProductNameCleanup } from './productNameCleanup';

/**
 * 운영 DB 의 실제 제품명으로 검사한다.
 *
 * 이 제안은 사람이 확인한 뒤 DB 를 덮어쓰는 데 쓰이므로, "무엇을 자르는지"보다
 * "무엇을 절대 자르지 않는지"가 더 중요하다. 주원료·연령·기능·맛처럼 제품을
 * 구분하는 정보가 사라지면 다른 제품과 섞인다.
 */
describe('제품명 정리 제안', () => {
  it('쿠팡 옵션 꼬리(수량·중량·맛)를 자른다', () => {
    const result = suggestProductNameCleanup({
      name: '굿포펫 엔자이츄 강아지 덴탈껌 효소 치석 양치껌 오래먹는 강아지간식 소형견 이갈이 꿀고구마맛, 1개, 100g, 꿀고구마맛',
      brandName: '굿포펫',
    });
    expect(result.name).toBe(
      '굿포펫 엔자이츄 강아지 덴탈껌 효소 치석 양치껌 오래먹는 강아지간식 소형견 이갈이 꿀고구마맛',
    );
    expect(result.changed).toBe(true);
    expect(result.needsReview).toBe(false);
  });

  it('밑줄 뒤 판매자 홍보 문구와 옵션을 함께 자른다', () => {
    const result = suggestProductNameCleanup({
      name: '올바른끼니 플러스 - 소고기 + 연어 + 오리 3.6kg 대용량 강아지사료 _ 60%생육, 100%휴먼그레이드, 스팀공법 영양식 강아지밥, 1세트, 3.75kg, 소+연어',
      brandName: '올바른끼니',
    });
    expect(result.name).toBe('올바른끼니 플러스 - 소고기 + 연어 + 오리 3.6kg 대용량 강아지사료');
  });

  it('파이프 뒤 키워드 나열을 자른다', () => {
    const result = suggestProductNameCleanup({
      name: '버기빅스 강아지 저알러지 간식 | 곤충단백질, 알러지, 눈물자국 개선, 프리미엄간식, 2개, 70g, 에브리데이(Everyday)',
      brandName: '쿠팡검색',
    });
    expect(result.name).toBe('버기빅스 강아지 저알러지 간식');
  });

  it('수집 출처 브랜드는 제품명 첫 단어를 제안한다', () => {
    const result = suggestProductNameCleanup({
      name: '펫트리언츠 반려동물 루트릿덕 오리 동결건조 간식, 2개, 120g, 파티믹스',
      brandName: '쿠팡검색',
    });
    expect(result.brandName).toBe('펫트리언츠');
    expect(result.reasons.some((reason) => reason.includes('수집 출처'))).toBe(true);
  });

  it('이미 실제 브랜드가 있으면 브랜드를 건드리지 않는다', () => {
    const result = suggestProductNameCleanup({
      name: '닥터뉴토 강아지 습식 주식 대용 뉴트리케어 리커버리, 15g, 60개, 가수분해닭',
      brandName: '닥터뉴토',
    });
    expect(result.brandName).toBe('닥터뉴토');
  });

  it('광고성 대괄호를 제거한다', () => {
    const result = suggestProductNameCleanup({
      name: '[대용량] 슬로울리라이프 10+ (10~12세) 노령견 소프트 사료 MEGA PACK 4.8kg, 1개, 4.8kg, 연어+오리',
      brandName: '슬로울리라이프',
    });
    expect(result.name).toBe('슬로울리라이프 10+ (10~12세) 노령견 소프트 사료 MEGA PACK 4.8kg');
  });

  it('제품을 구분하는 정보(연령·주원료·맛)는 남긴다', () => {
    const result = suggestProductNameCleanup({
      name: '보노네이처 고양이 유기농 ( 피부 & 요로방광 ) 가수분해 전연령 기능성사료, 7kg, 1개, 닭',
      brandName: '보노네이처',
    });
    expect(result.name).toContain('피부 & 요로방광');
    expect(result.name).toContain('전연령');
  });

  it('바꿀 것이 없으면 변경 없음으로 둔다', () => {
    const result = suggestProductNameCleanup({
      name: '오리젠 오리지널 캣',
      brandName: '오리젠',
    });
    expect(result.changed).toBe(false);
    expect(result.name).toBe('오리젠 오리지널 캣');
  });

  it('과도하게 잘리면 원본을 유지하고 사람 확인을 요구한다', () => {
    const result = suggestProductNameCleanup({
      // 제목 전체가 사실상 옵션 나열인 경우
      name: '강아지, 1개, 100g, 닭가슴살, 오리, 연어, 소고기, 참치, 대용량',
      brandName: '쿠팡검색',
    });
    expect(result.needsReview).toBe(true);
    expect(result.name).toBe('강아지, 1개, 100g, 닭가슴살, 오리, 연어, 소고기, 참치, 대용량');
  });

  it('빈 이름에도 안전하게 동작한다', () => {
    const result = suggestProductNameCleanup({ name: '', brandName: '' });
    expect(result.changed).toBe(false);
    expect(result.needsReview).toBe(false);
  });
});
