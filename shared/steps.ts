import { diffDays, todayKST } from './dates';
import { calcQuote, paidAmount } from './quote';
import type { Booking, StepNo } from './types';

export interface StepDef {
  no: StepNo;
  key: string;
  title: string;
  short: string;
  /** 이 단계에서 일어나는 일 — 고객이 전체 흐름을 이해할 수 있도록 */
  about: string;
  /** 고객이 할 일 */
  customerAction: string;
  /** 엔젤스데이가 할 일 */
  angelsAction: string;
}

export const STEPS: StepDef[] = [
  {
    no: 1,
    key: 'requirements',
    title: '필요사항 작성',
    short: '필요사항',
    about: '어떤 홀에서, 몇 분과, 어떤 꽃과 음식으로 진행할지 알려주세요. 작성 중 저장되며 언제든 이어서 쓸 수 있어요.',
    customerAction: '행사 필요사항을 작성하고 제출해 주세요.',
    angelsAction: '작성하신 내용을 담당 플래너가 확인해요.',
  },
  {
    no: 2,
    key: 'quote',
    title: '견적 확인 및 결제',
    short: '견적·결제',
    about: '필요사항에 맞춘 견적서(PDF)를 할인율까지 적용해 보내드려요. 그대로 진행하시려면 안내된 계좌로 예약금을 입금하고, 바꾸고 싶은 부분은 조정 요청을 남겨 주세요.',
    customerAction: '견적서를 확인하고 예약금을 입금하거나 조정을 요청해 주세요.',
    angelsAction: '영업일 1일 이내에 맞춤 견적서를 보내드려요.',
  },
  {
    no: 3,
    key: 'paid',
    title: '결제 완료',
    short: '결제 완료',
    about: '입금이 확인되면 날짜와 홀이 확정돼요. 영수증을 내려받고 예약 확정 안내 메일을 받아 보세요.',
    customerAction: '영수증을 내려받고 준비 사항 확인으로 넘어가 주세요.',
    angelsAction: '담당 플래너를 배정하고 준비 일정을 만들어요.',
  },
  {
    no: 4,
    key: 'prep',
    title: '준비 사항 확인',
    short: '준비',
    about: '행사 전까지 엔젤스데이가 준비하는 진행 상황과 고객님이 챙기실 체크리스트를 한곳에서 확인해요. 모든 내용은 기록으로 남아요.',
    customerAction: '체크리스트를 하나씩 완료해 주세요.',
    angelsAction: '꽃·메뉴·연출·인력 준비 상황을 실시간으로 업데이트해요.',
  },
  {
    no: 5,
    key: 'eventday',
    title: '행복한 행사일',
    short: '행사일',
    about: '당일 타임테이블, 오시는 길과 주차, 담당 매니저 연락처를 확인하세요. 잔금은 행사 당일 행사장에서 결제하고, 결제가 확인되면 영수증을 드려요.',
    customerAction: '편안하게 오셔서 행사를 즐겨 주세요.',
    angelsAction: '세팅부터 마무리까지 현장을 책임져요.',
  },
  {
    no: 6,
    key: 'photos',
    title: '행사 사진 확인',
    short: '사진',
    about: '잔금 결제가 확인되면 행사 사진과 영상의 원본·보정본이 이 페이지에 올라와요. 마음에 들지 않는 부분은 수정을 요청하고, 원하는 파일을 내려받으세요.',
    customerAction: '사진·영상을 확인하고 수정 요청이나 다운로드를 해 주세요.',
    angelsAction: '보정본과 원본, 하이라이트 영상을 올리고 수정 요청을 반영해요.',
  },
];

export function depositPaid(b: Booking): boolean {
  return b.payments.some((p) => p.kind === 'deposit');
}

export function balancePaid(b: Booking): boolean {
  if (!b.quote) return false;
  const total = calcQuote(b.quote).total;
  return paidAmount(b) >= total && b.payments.some((p) => p.kind === 'balance');
}

/** 저장된 데이터로부터 현재 단계를 계산합니다 (관리자/고객 화면 공통). */
export function computeStep(b: Booking, today = todayKST()): StepNo {
  if (!b.requirementsSubmittedAt) return 1;
  if (!depositPaid(b)) return 2;
  if (b.photosReleasedAt && balancePaid(b)) return 6;
  if (diffDays(today, b.date) <= 0) return 5;
  if (b.prepStartedAt) return 4;
  return 3;
}

export type SubState =
  | 'req_draft'
  | 'quote_waiting'
  | 'quote_ready'
  | 'transfer_pending'
  | 'adjusting'
  | 'paid'
  | 'preparing'
  | 'eventday'
  | 'after_unpaid'
  | 'photos_waiting'
  | 'photos';

export function subState(b: Booking, today = todayKST()): SubState {
  const step = computeStep(b, today);
  switch (step) {
    case 1:
      return 'req_draft';
    case 2:
      if (b.adjustRequests.some((r) => r.status === 'open')) return 'adjusting';
      if (b.transferNotice) return 'transfer_pending';
      if (b.quote?.status === 'sent' || b.quote?.status === 'accepted') return 'quote_ready';
      return 'quote_waiting';
    case 3:
      return 'paid';
    case 4:
      return 'preparing';
    case 5:
      if (diffDays(today, b.date) === 0) return 'eventday';
      return balancePaid(b) ? 'photos_waiting' : 'after_unpaid';
    case 6:
      return 'photos';
  }
}

/** 고객에게 보여줄 “지금 할 일” 한 줄 */
export function nextAction(b: Booking, today = todayKST()): { title: string; desc: string; who: 'customer' | 'angels' } {
  switch (subState(b, today)) {
    case 'req_draft':
      return { title: '필요사항을 작성해 주세요', desc: '홀, 인원, 꽃장식, 식사, 촬영 등 원하시는 내용을 알려주시면 맞춤 견적을 보내드려요.', who: 'customer' };
    case 'quote_waiting':
      return { title: '맞춤 견적서를 준비하고 있어요', desc: '담당 플래너가 영업일 1일 이내에 견적서를 보내드려요. 도착하면 메일로 알려드릴게요.', who: 'angels' };
    case 'adjusting':
      return { title: '요청하신 조정 내용을 검토하고 있어요', desc: '조정된 견적서가 준비되면 바로 알려드릴게요.', who: 'angels' };
    case 'quote_ready':
      return { title: '견적서를 확인하고 예약금을 입금해 주세요', desc: '이대로 진행하시려면 안내된 계좌로 예약금을 입금하고 ‘입금했어요’를 눌러 주세요. 바꾸고 싶은 부분이 있다면 조정 요청을 남겨 주세요.', who: 'customer' };
    case 'transfer_pending':
      return { title: '입금을 확인하고 있어요', desc: '담당자가 입금 내역을 확인하면 예약이 확정되고, 영수증과 확정 안내 메일을 보내드려요.', who: 'angels' };
    case 'paid':
      return { title: '예약이 확정되었어요', desc: '영수증을 내려받고 준비 사항 확인으로 넘어가 주세요.', who: 'customer' };
    case 'preparing':
      return { title: '함께 준비하고 있어요', desc: '엔젤스데이 준비 현황과 고객님 체크리스트를 확인해 주세요.', who: 'customer' };
    case 'eventday':
      return { title: '오늘은 행복한 날이에요', desc: '타임테이블과 오시는 길을 확인하고 편안하게 오세요.', who: 'customer' };
    case 'after_unpaid':
      return { title: '잔금 결제를 확인하고 있어요', desc: '행사장에서 결제하신 잔금이 확인되면 영수증과 함께 사진·영상 공개 일정을 알려드려요.', who: 'angels' };
    case 'photos_waiting':
      return { title: '사진과 영상을 보정하고 있어요', desc: '잔금 결제가 확인되었어요. 보정이 끝나는 대로 원본과 보정본을 이 페이지에 올려드릴게요.', who: 'angels' };
    case 'photos':
      return { title: '행사 사진과 영상이 도착했어요', desc: '보정본과 원본, 하이라이트 영상을 확인하고 수정을 요청하거나 내려받으세요.', who: 'customer' };
  }
}

/** 지금 단계에 들어온 시각 — 관리자 화면에서 ‘몇 일째 머무는지’를 보여 줄 때 씁니다 */
export function stepEnteredAt(b: Booking, today = todayKST()): string {
  const deposit = b.payments.find((p) => p.kind === 'deposit');
  switch (computeStep(b, today)) {
    case 1:
      return b.createdAt;
    case 2:
      return b.requirementsSubmittedAt ?? b.createdAt;
    case 3:
      return deposit?.paidAt ?? b.updatedAt;
    case 4:
      return b.prepStartedAt ?? deposit?.paidAt ?? b.updatedAt;
    case 5:
      return `${b.date}T00:00:00+09:00`;
    case 6:
      return b.photosReleasedAt ?? b.updatedAt;
  }
}

/** 지금 단계에 머문 날수 (0 = 오늘 들어옴) */
export function daysInStep(b: Booking, today = todayKST()): number {
  const entered = todayKST(new Date(stepEnteredAt(b, today)));
  return Math.max(0, diffDays(entered, today));
}
