import type { Catalog, CatalogItem } from './types';

/**
 * 기본 가격표 — ⚠️ 데모용 예시 가격입니다. 관리자 > 가격표에서 실제 가격으로 수정하세요.
 * (VAT 포함, 원 단위)
 */
export const DEFAULT_ITEMS: CatalogItem[] = [
  // 식사
  { key: 'food_standard', category: '식사', label: '스탠다드 뷔페', price: 49000, unit: '인', peoplePerUnit: 1, basis: 'adults' },
  { key: 'food_premium', category: '식사', label: '프리미엄 뷔페 (120여 가지)', price: 59000, unit: '인', peoplePerUnit: 1, basis: 'adults' },
  { key: 'food_signature', category: '식사', label: '시그니처 뷔페 (스테이크·초밥·회)', price: 69000, unit: '인', peoplePerUnit: 1, basis: 'adults' },
  { key: 'food_kids', category: '식사', label: '소인 뷔페 (만 4~12세)', price: 29000, unit: '인' },
  { key: 'food_coffee_break', category: '식사', label: '커피 브레이크', price: 8000, unit: '인', peoplePerUnit: 1, basis: 'adults' },
  // 음료
  { key: 'drink_soft', category: '음료', label: '음료 무제한', price: 0, unit: '인', peoplePerUnit: 1, basis: 'adults' },
  { key: 'drink_alcohol', category: '음료', label: '주류 무제한 (맥주·소주·하우스 와인)', price: 15000, unit: '인', peoplePerUnit: 1, basis: 'adults' },
  { key: 'drink_corkage', category: '음료', label: '주류 반입 콜키지 (기본 10병)', price: 150000, unit: '식' },
  // 웨딩
  { key: 'wed_paebaek', category: '예식', label: '폐백 (폐백실·음식·수모)', price: 450000, unit: '식' },
  { key: 'wed_afterparty', category: '예식', label: '애프터파티 (2시간·핑거푸드·DJ)', price: 900000, unit: '식' },
  { key: 'wed_bridalroom', category: '예식', label: '신부대기실 · 메이크업&의상실', price: 300000, unit: '식' },
  { key: 'wed_cake', category: '예식', label: '웨딩 케이크', price: 250000, unit: '개' },
  { key: 'wed_flower_standard', category: '꽃장식', label: '웨딩 생화 스탠다드', price: 1200000, unit: '식' },
  { key: 'wed_flower_premium', category: '꽃장식', label: '웨딩 생화 프리미엄', price: 2200000, unit: '식' },
  { key: 'wed_flower_signature', category: '꽃장식', label: '시그니처 플라워 (1:1 디자인)', price: 3500000, unit: '식' },
  // 돌잔치
  { key: 'dol_table_greenery', category: '돌상', label: '그리너리 돌상', price: 350000, unit: '식' },
  { key: 'dol_table_traditional', category: '돌상', label: '전통 한상 돌상', price: 450000, unit: '식' },
  { key: 'dol_table_premium', category: '돌상', label: '프리미엄 테마 돌상', price: 650000, unit: '식' },
  // 생신연
  { key: 'bd_table_modern', category: '상차림', label: '모던 테이블 세팅', price: 300000, unit: '식' },
  { key: 'bd_table_traditional', category: '상차림', label: '전통 고임상 · 병풍', price: 650000, unit: '식' },
  { key: 'bd_flower_basic', category: '꽃장식', label: '테이블 플라워', price: 200000, unit: '식' },
  { key: 'bd_flower_premium', category: '꽃장식', label: '메인 포토월 플라워', price: 550000, unit: '식' },
  // 진행
  { key: 'mc', category: '진행', label: '전문 사회자', price: 300000, unit: '식' },
  { key: 'mc_dol', category: '진행', label: '돌잔치 전문 사회자', price: 250000, unit: '식' },
  { key: 'singer', category: '진행', label: '축가', price: 250000, unit: '식' },
  { key: 'officiant', category: '진행', label: '전문 주례', price: 300000, unit: '식' },
  { key: 'perf_gugak', category: '진행', label: '국악 공연', price: 500000, unit: '식' },
  { key: 'perf_band', category: '진행', label: '라이브 밴드', price: 800000, unit: '식' },
  // 장비·연출
  { key: 'av_video_play', category: '장비', label: '영상 상영 (빔·스크린·음향)', price: 100000, unit: '식' },
  { key: 'av_video_make', category: '장비', label: '영상 제작 + 상영', price: 350000, unit: '식' },
  { key: 'av_projector', category: '장비', label: '빔프로젝터 · 스크린', price: 200000, unit: '식' },
  { key: 'av_sound', category: '장비', label: '무선마이크 · 음향 오퍼레이터', price: 150000, unit: '식' },
  { key: 'av_stage', category: '장비', label: '무대 · 조명', price: 400000, unit: '식' },
  { key: 'deco_banner', category: '장식', label: '현수막 제작', price: 120000, unit: '개' },
  { key: 'deco_photowall', category: '장식', label: '포토월 제작', price: 350000, unit: '식' },
  // 촬영
  { key: 'photo_wed_basic', category: '촬영', label: '본식 스냅 베이직', price: 600000, unit: '식' },
  { key: 'photo_wed_premium', category: '촬영', label: '본식 스냅 프리미엄 (2인·앨범)', price: 1100000, unit: '식' },
  { key: 'photo_wed_video', category: '촬영', label: '본식 하이라이트 영상', price: 900000, unit: '식' },
  { key: 'photo_dol', category: '촬영', label: '돌스냅', price: 350000, unit: '식' },
  { key: 'photo_dol_video', category: '촬영', label: '돌스냅 + 하이라이트 영상', price: 600000, unit: '식' },
  { key: 'photo_event', category: '촬영', label: '행사 스냅 촬영', price: 400000, unit: '식' },
  { key: 'photo_family', category: '촬영', label: '가족 단체 원판 사진', price: 150000, unit: '식' },
  // 답례
  { key: 'gift_ricecake', category: '답례품', label: '답례 떡 세트', price: 6000, unit: '개', peoplePerUnit: 1 },
  { key: 'gift_cookie', category: '답례품', label: '수제 쿠키 박스', price: 9000, unit: '개', peoplePerUnit: 1 },
  // 케이터링
  { key: 'cat_full_buffet', category: '케이터링', label: '출장 풀 뷔페 (셰프 동행)', price: 45000, unit: '인', peoplePerUnit: 1, basis: 'adults' },
  { key: 'cat_finger', category: '케이터링', label: '핑거푸드 케이터링', price: 28000, unit: '인', peoplePerUnit: 1, basis: 'adults' },
  { key: 'cat_lunchbox', category: '케이터링', label: '프리미엄 도시락', price: 18000, unit: '개', peoplePerUnit: 1, basis: 'adults' },
  { key: 'cat_homeparty', category: '케이터링', label: '홈파티 박스 (4인 세트)', price: 160000, unit: '세트', peoplePerUnit: 4, basis: 'adults' },
  { key: 'cat_delivery', category: '케이터링', label: '출장 · 운반 · 세팅비', price: 200000, unit: '식' },
  { key: 'eq_tables', category: '장비', label: '테이블 · 의자 대여 (10인 기준)', price: 60000, unit: '세트', peoplePerUnit: 10, basis: 'adults' },
  { key: 'eq_tent', category: '장비', label: '야외 텐트', price: 180000, unit: '동' },
  { key: 'staff_server', category: '인력', label: '서빙 인력 추가', price: 180000, unit: '명' },
];

export const DEFAULT_CATALOG: Catalog = {
  items: DEFAULT_ITEMS,
  hallRental: { lovely: 600000, aloha: 800000, bellita: 400000, sia: 250000, whole: 3000000 },
  discountPresets: [
    { id: 'weekday', label: '평일 할인', rate: 10 },
    { id: 'offseason', label: '비수기 할인 (1·2·7·8월)', rate: 5 },
    { id: 'promo', label: '프로모션일 특가', rate: 15 },
    { id: 'return', label: '재방문 고객', rate: 5 },
    { id: 'early', label: '얼리버드 (6개월 전 예약)', rate: 7 },
  ],
  defaultDepositRate: 20,
  quoteValidDays: 7,
  updatedAt: '2026-10-01T00:00:00.000Z',
};

export function itemByKey(c: Catalog, key: string): CatalogItem | undefined {
  return c.items.find((i) => i.key === key);
}
