// 엔젤스데이.com 원본 사진 (public/images/ 에 WebP 로 최적화해 보관)
import type { EventType, HallId } from '@shared/types';

/** 배포 경로(base)에 맞춘 이미지 주소 */
export const img = (path: string) => `${import.meta.env.BASE_URL}images/${path}.webp`;

const range = (prefix: string, n: number) => Array.from({ length: n }, (_, i) => img(`${prefix}-${i + 1}`));

export const HALL_PHOTOS: Record<Exclude<HallId, 'whole'>, string[]> = {
  lovely: range('halls/lovely', 6),
  aloha: range('halls/aloha', 6),
  bellita: range('halls/bellita', 6),
  sia: range('halls/sia', 6),
};

export const HERO_SLIDES = [
  {
    image: img('halls/aloha-1'),
    title: '가장 행복한 순간,\n맛있는 기억으로 남다',
    desc: '스몰웨딩부터 돌잔치, 기업행사까지 12년 동안 음식으로 특별한 순간을 준비해왔습니다.',
  },
  {
    image: img('halls/aloha-3'),
    title: '새롭게 리뉴얼된\n김포 프라이빗 웨딩 베뉴',
    desc: '70명 스몰웨딩부터 250명 웨딩연회까지, 장기역 2번 출구 스카이라운지에서 품격 있는 웨딩을 완성해 보세요.',
  },
  {
    image: img('events/dol-4'),
    title: '소중한 첫 생일,\n엔젤스데이 프리미엄 돌잔치',
    desc: '그리너리 돌상과 정성 가득한 음식으로 우리 아이의 특별한 하루를 완성합니다.',
  },
];

export const FEATURES = [
  { image: img('halls/lovely-1'), title: '스카이라운지 프라이빗 룸', desc: '통창으로 펼쳐지는 도심 전망과 자연채광, 단독으로 쓰는 4개의 홀.' },
  { image: img('places/food-2'), title: '호텔 출신 셰프의 즉석 조리', desc: '그릴 스테이크와 초밥, 생선회 등 시스 코너를 현장에서 바로.' },
  { image: img('places/food-3'), title: '프리미엄 120여 가지 뷔페', desc: '한식·중식·일식·양식 뷔페 메뉴 대부분을 즉석에서 조리해요.' },
];

export const PLACES = [
  {
    id: 'food',
    en: 'FOOD ZONE',
    title: '푸드존',
    desc: '수백 명을 동시에 수용할 수 있는 공간. 한식, 중식, 일식, 양식 등 뷔페 메뉴 대부분을 즉석 조리하며, 그릴 스테이크와 초밥·생선회 시스 코너, 계절 메뉴를 선보입니다.',
    photos: range('places/food', 12),
  },
  {
    id: 'photo',
    en: 'PHOTO ZONE',
    title: '포토존',
    desc: '한옥마을에 온 듯한 전통 한옥집 세트와, 자연 속 심플하고 모던한 공간. 돌잔치와 가족 사진을 위한 감성 포토존입니다.',
    photos: range('places/photo', 3),
  },
  {
    id: 'bride',
    en: 'MAKEUP & DRESS ROOM',
    title: '메이크업 & 의상실',
    desc: '통창으로 들어오는 자연채광과 풍성한 플라워 스타일링. 신부님과 주인공을 위한 프라이빗한 대기 공간입니다.',
    photos: range('places/bride', 3),
  },
];

export const EVENT_PHOTOS: Record<EventType, string[]> = {
  wedding: range('events/wedding', 6),
  dol: range('events/dol', 6),
  birthday: range('events/birthday', 2),
  corporate: range('events/corporate', 6),
  catering: range('events/catering', 6),
};

export const GALLERY = Array.from({ length: 18 }, (_, i) => img(`gallery/g-${String(i + 1).padStart(2, '0')}`));
