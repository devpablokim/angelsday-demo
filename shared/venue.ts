import type { EventType, HallId, ISODate } from './types';

export const VENUE = {
  name: '엔젤스데이 파티하우스',
  nameEn: 'ANGELSDAY PARTY HOUSE',
  since: 2014,
  address: '경기도 김포시 김포한강4로 113 신한프라자 12층',
  addressShort: '김포 장기역 2번 출구 · 신한프라자 12층 스카이라운지',
  phone: '010-7113-4005',
  fax: '031-986-1415',
  email: 'hjkh75@naver.com',
  ceo: '이희자',
  bizNo: '129-34-17826',
  homepage: 'https://www.엔젤스데이.com',
  cateringSite: 'https://www.angelsdaycatering.com/',
  parking: '신한프라자 지하 주차장 이용 (행사 고객 무료 주차 등록 — 데스크에 차량번호를 알려주세요)',
  mapUrl: 'https://map.naver.com/p/search/%EA%B9%80%ED%8F%AC%ED%95%9C%EA%B0%954%EB%A1%9C%20113',
  kakaoMapUrl: 'https://map.kakao.com/?q=%EA%B9%80%ED%8F%AC%ED%95%9C%EA%B0%954%EB%A1%9C%20113',
} as const;

export interface Hall {
  id: HallId;
  name: string;
  nameEn: string;
  guaranteed: number; // 보증 인원
  seats: number; // 총 좌석
  desc: string;
  bestFor: string;
}

export const HALLS: Hall[] = [
  {
    id: 'lovely',
    name: '러블리룸',
    nameEn: 'LOVELY',
    guaranteed: 80,
    seats: 120,
    desc: '통창뷰의 현대적인 감각, 세련된 인테리어',
    bestFor: '돌잔치 · 스몰웨딩 · 기업행사 · 회식',
  },
  {
    id: 'aloha',
    name: '알로하룸',
    nameEn: 'ALOHA',
    guaranteed: 100,
    seats: 140,
    desc: '고급스러운 화이트 인테리어',
    bestFor: '돌잔치 · 스몰웨딩 · 기업행사 · 회식',
  },
  {
    id: 'bellita',
    name: '벨리타룸',
    nameEn: 'BELLITA',
    guaranteed: 50,
    seats: 80,
    desc: '통창뷰와 야경, 원목의 자연스러움이 편안한 공간',
    bestFor: '소규모 돌잔치 · 가족·지인 모임',
  },
  {
    id: 'sia',
    name: '시아룸',
    nameEn: 'SIA',
    guaranteed: 30,
    seats: 56,
    desc: '통창뷰, 심플함이 돋보이는 모던 인테리어',
    bestFor: '돌잔치 · 스몰웨딩 · 기업행사 · 회식',
  },
  {
    id: 'whole',
    name: '전관 단독',
    nameEn: 'GRAND',
    guaranteed: 200,
    seats: 250,
    desc: '400평 스카이라운지 전체를 4시간 단독으로',
    bestFor: '200명 이상 웨딩 연회 · 대규모 기업행사',
  },
];

export const ROOM_HALLS: HallId[] = ['lovely', 'aloha', 'bellita', 'sia'];

export function hallById(id?: HallId): Hall | undefined {
  return HALLS.find((h) => h.id === id);
}

export function hallName(id?: HallId): string {
  return hallById(id)?.name ?? '출장';
}

export function hallShort(id?: HallId): string {
  if (!id) return '출장';
  return hallById(id)?.nameEn ?? id;
}

export interface TimeSlot {
  id: string;
  time: string;
  label: string;
}

export const TIME_SLOTS: TimeSlot[] = [
  { id: 'lunch1', time: '11:00', label: '런치 1부' },
  { id: 'lunch2', time: '13:30', label: '런치 2부' },
  { id: 'dinner', time: '18:00', label: '디너' },
];

export function slotOf(time: string): TimeSlot | undefined {
  // 정확히 일치하지 않으면 가장 가까운 앞 슬롯
  const exact = TIME_SLOTS.find((s) => s.time === time);
  if (exact) return exact;
  const mins = (t: string) => {
    const [h, m] = t.split(':').map(Number);
    return h * 60 + m;
  };
  const t = mins(time);
  let best = TIME_SLOTS[0];
  for (const s of TIME_SLOTS) if (mins(s.time) <= t) best = s;
  return best;
}

/** 홀 추천: 인원 기준 보증인원 ~ 좌석 범위 */
export function recommendHalls(guests: number, eventType: EventType): HallId[] {
  if (eventType === 'catering') return [];
  if (guests >= 200) return ['whole'];
  return ROOM_HALLS.filter((id) => {
    const h = hallById(id)!;
    return guests <= h.seats && guests >= Math.min(h.guaranteed * 0.6, 20);
  });
}

/** 2026–2027 대한민국 공휴일 (대체공휴일 포함) — 매년 관리자가 갱신 */
export const HOLIDAYS: Record<ISODate, string> = {
  '2026-01-01': '신정',
  '2026-02-16': '설날 연휴',
  '2026-02-17': '설날',
  '2026-02-18': '설날 연휴',
  '2026-03-01': '삼일절',
  '2026-03-02': '대체공휴일',
  '2026-05-05': '어린이날',
  '2026-05-24': '부처님오신날',
  '2026-05-25': '대체공휴일',
  '2026-06-03': '지방선거',
  '2026-06-06': '현충일',
  '2026-08-15': '광복절',
  '2026-08-17': '대체공휴일',
  '2026-09-24': '추석 연휴',
  '2026-09-25': '추석',
  '2026-09-26': '추석 연휴',
  '2026-10-03': '개천절',
  '2026-10-05': '대체공휴일(개천절)',
  '2026-10-09': '한글날',
  '2026-12-25': '성탄절',
  '2027-01-01': '신정',
  '2027-02-06': '설날 연휴',
  '2027-02-07': '설날',
  '2027-02-08': '설날 연휴',
  '2027-02-09': '대체공휴일',
  '2027-03-01': '삼일절',
  '2027-05-05': '어린이날',
  '2027-05-13': '부처님오신날',
  '2027-06-06': '현충일',
  '2027-08-15': '광복절',
  '2027-08-16': '대체공휴일',
  '2027-09-14': '추석 연휴',
  '2027-09-15': '추석',
  '2027-09-16': '추석 연휴',
  '2027-10-03': '개천절',
  '2027-10-04': '대체공휴일',
  '2027-10-09': '한글날',
  '2027-10-11': '대체공휴일',
  '2027-12-25': '성탄절',
  '2027-12-27': '대체공휴일',
};
