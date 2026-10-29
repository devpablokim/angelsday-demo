import { addDays, diffDays, todayKST } from './dates';
import { uid } from './ids';
import type { Booking, ChecklistItem, EventType, PrepTask, ScheduleItem } from './types';

interface TaskTpl {
  title: string;
  owner: string;
  daysBefore: number;
  visible?: boolean;
}
interface CheckTpl {
  title: string;
  description?: string;
  daysBefore: number;
}

const COMMON_TASKS: TaskTpl[] = [
  { title: '담당 플래너 배정 및 예약 확정 안내', owner: '플래너', daysBefore: 120 },
  { title: '최종 인원 반영 · 식자재 발주', owner: '주방', daysBefore: 5 },
  { title: '큐시트 확정 및 현장 스태프 브리핑', owner: '플래너', daysBefore: 2 },
  { title: '홀 세팅 · 리허설', owner: '현장팀', daysBefore: 0 },
];

const TASKS: Record<EventType, TaskTpl[]> = {
  wedding: [
    { title: '홀 레이아웃 · 하객 동선 설계', owner: '플래너', daysBefore: 60 },
    { title: '꽃장식 디자인 시안 공유', owner: '플라워', daysBefore: 45 },
    { title: '메뉴 시식 일정 안내 · 진행', owner: '주방', daysBefore: 40 },
    { title: '스냅 작가 배정 · 촬영 콘셉트 확인', owner: '촬영', daysBefore: 30 },
    { title: '사회자 · 축가 섭외 확정', owner: '플래너', daysBefore: 21 },
    { title: '식순 · BGM · 식전 영상 테스트', owner: '음향', daysBefore: 7 },
    { title: '웨딩 케이크 · 답례품 제작 확정', owner: '주방', daysBefore: 7 },
    { title: '생화 입고 · 플라워 연출 세팅', owner: '플라워', daysBefore: 1 },
  ],
  dol: [
    { title: '돌상 스타일 · 테마 컬러 시안 공유', owner: '플래너', daysBefore: 30 },
    { title: '성장 영상 파일 수령 · 상영 테스트', owner: '음향', daysBefore: 7 },
    { title: '돌잡이 소품 · 포토존 준비', owner: '플래너', daysBefore: 3 },
    { title: '돌스냅 작가 배정', owner: '촬영', daysBefore: 14 },
    { title: '그리너리 돌상 · 생화 세팅', owner: '플라워', daysBefore: 0 },
  ],
  birthday: [
    { title: '상차림 · 고임상 구성 확정', owner: '플래너', daysBefore: 21 },
    { title: '축하 현수막 시안 공유', owner: '디자인', daysBefore: 14 },
    { title: '어르신 맞춤 메뉴 구성 확인', owner: '주방', daysBefore: 10 },
    { title: '공연팀 · 사회자 섭외 확정', owner: '플래너', daysBefore: 14 },
    { title: '가족 영상 상영 테스트', owner: '음향', daysBefore: 3 },
  ],
  corporate: [
    { title: '행사 큐시트 · 좌석 배치도 공유', owner: '플래너', daysBefore: 21 },
    { title: '음향 · 영상 장비 리허설 일정 확정', owner: '음향', daysBefore: 10 },
    { title: '현수막 · 포토월 시안 공유', owner: '디자인', daysBefore: 14 },
    { title: '주류 · 음료 발주', owner: '주방', daysBefore: 5 },
    { title: '세금계산서 · 정산 서류 준비', owner: '경영지원', daysBefore: 1 },
  ],
  catering: [
    { title: '현장 답사 · 반입 동선 확인', owner: '케이터링팀', daysBefore: 14 },
    { title: '메뉴 구성 확정 · 알레르기 확인', owner: '주방', daysBefore: 10 },
    { title: '장비 · 차량 · 인력 배차', owner: '케이터링팀', daysBefore: 3 },
    { title: '현장 세팅 · 운영', owner: '케이터링팀', daysBefore: 0 },
  ],
};

const COMMON_CHECKS: CheckTpl[] = [
  { title: '최종 참석 인원 확정해 알려주기', description: '보증 인원 기준으로 식자재가 준비돼요. D-7까지 알려주세요.', daysBefore: 7 },
  { title: '잔금 결제 수단 준비', description: '잔금은 행사 당일 현장에서 카드·계좌이체로 결제해요.', daysBefore: 1 },
];

const CHECKS: Record<EventType, CheckTpl[]> = {
  wedding: [
    { title: '모바일 청첩장 발송', daysBefore: 60 },
    { title: '드레스 · 헤어메이크업 일정 확정', daysBefore: 45 },
    { title: '메뉴 시식 방문 (2인)', daysBefore: 40 },
    { title: '식순 · 원하는 연출 전달', description: '입장곡, 축가, 특별한 순서가 있다면 알려주세요.', daysBefore: 30 },
    { title: '식전 영상 · BGM 파일 전달', daysBefore: 14 },
    { title: '혼주 · 하객 좌석 배치 요청 정리', daysBefore: 10 },
    { title: '부모님 꽃(코사지) 수량 확인', daysBefore: 7 },
  ],
  dol: [
    { title: '초대장 발송', daysBefore: 30 },
    { title: '돌복 · 한복 준비', daysBefore: 21 },
    { title: '성장 영상 파일 전달 (mp4)', daysBefore: 7 },
    { title: '돌잡이 특별 소품이 있다면 준비', daysBefore: 3 },
  ],
  birthday: [
    { title: '가족 · 친지 초대 연락', daysBefore: 30 },
    { title: '현수막 문구 전달', description: '예) “사랑하는 어머니의 칠순을 축하드립니다”', daysBefore: 14 },
    { title: '가족 영상 · 사진 파일 전달', daysBefore: 7 },
    { title: '헌수 · 큰절 순서 가족과 정하기', daysBefore: 5 },
  ],
  corporate: [
    { title: '행사 진행 순서 · 발표 자료 전달', daysBefore: 10 },
    { title: '현수막 · 포토월 문구 · 로고 파일 전달', daysBefore: 14 },
    { title: '시상품 · 경품 준비', daysBefore: 3 },
    { title: '세금계산서 발행 정보 확인', daysBefore: 7 },
  ],
  catering: [
    { title: '행사장 사용 허가 · 전기 사용 확인', daysBefore: 10 },
    { title: '현장 담당자 연락처 전달', daysBefore: 5 },
    { title: '차량 진입 · 주차 위치 안내', daysBefore: 3 },
  ],
};

const SCHEDULES: Record<EventType, (start: string) => ScheduleItem[]> = {
  wedding: (s) => [
    { time: shift(s, -120), title: '신부 대기실 입실 · 메이크업 마무리' },
    { time: shift(s, -60), title: '하객 맞이 · 포토 테이블' },
    { time: s, title: '본식 시작' },
    { time: shift(s, 40), title: '양가 인사 · 단체 사진' },
    { time: shift(s, 50), title: '피로연 · 뷔페 오픈' },
    { time: shift(s, 150), title: '마무리 · 퇴장' },
  ],
  dol: (s) => [
    { time: shift(s, -60), title: '가족 도착 · 돌상 앞 가족사진' },
    { time: shift(s, -20), title: '손님 맞이' },
    { time: s, title: '돌잔치 시작 · 성장 영상' },
    { time: shift(s, 20), title: '돌잡이 · 이벤트' },
    { time: shift(s, 40), title: '식사 · 자유 시간' },
    { time: shift(s, 150), title: '마무리' },
  ],
  birthday: (s) => [
    { time: shift(s, -40), title: '가족 도착 · 상차림 확인' },
    { time: s, title: '잔치 시작 · 주인공 입장' },
    { time: shift(s, 15), title: '헌수 · 큰절 · 가족 영상' },
    { time: shift(s, 40), title: '식사 · 축하 공연' },
    { time: shift(s, 120), title: '가족 단체 사진 · 마무리' },
  ],
  corporate: (s) => [
    { time: shift(s, -90), title: '장비 리허설' },
    { time: shift(s, -30), title: '참석자 등록 · 웰컴 드링크' },
    { time: s, title: '개회 · 인사말' },
    { time: shift(s, 30), title: '식사 · 네트워킹' },
    { time: shift(s, 90), title: '시상 · 공연 · 레크리에이션' },
    { time: shift(s, 150), title: '폐회' },
  ],
  catering: (s) => [
    { time: shift(s, -150), title: '케이터링팀 출발' },
    { time: shift(s, -90), title: '현장 도착 · 세팅' },
    { time: s, title: '뷔페 오픈' },
    { time: shift(s, 120), title: '서비스 마감 · 정리 · 철수' },
  ],
};

function shift(hhmm: string, minutes: number): string {
  const [h, m] = hhmm.split(':').map(Number);
  const t = (((h * 60 + m + minutes) % 1440) + 1440) % 1440;
  return `${String(Math.floor(t / 60)).padStart(2, '0')}:${String(t % 60).padStart(2, '0')}`;
}

/** 결제 이후 준비 리스트·체크리스트·당일 일정을 템플릿으로 생성합니다. 이미 지난 날짜는 오늘로 당깁니다. */
export function generatePrep(b: Booking, today = todayKST()): Pick<Booking, 'prepTasks' | 'checklist' | 'daySchedule'> {
  const due = (daysBefore: number) => {
    const d = addDays(b.date, -daysBefore);
    return diffDays(today, d) < 0 ? today : d;
  };
  const prepTasks: PrepTask[] = [...COMMON_TASKS.slice(0, 1), ...TASKS[b.eventType], ...COMMON_TASKS.slice(1)]
    .sort((a, z) => z.daysBefore - a.daysBefore)
    .map((t) => ({ id: uid('pt'), title: t.title, owner: t.owner, dueDate: due(t.daysBefore), status: 'todo', visibleToCustomer: t.visible ?? true }));
  const checklist: ChecklistItem[] = [...CHECKS[b.eventType], ...COMMON_CHECKS]
    .sort((a, z) => z.daysBefore - a.daysBefore)
    .map((c) => ({ id: uid('ck'), title: c.title, description: c.description, dueDate: due(c.daysBefore), done: false, addedBy: 'template' }));
  return { prepTasks, checklist, daySchedule: SCHEDULES[b.eventType](b.time) };
}
