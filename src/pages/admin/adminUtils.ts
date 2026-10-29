import type { EmailRule, PlanStatus } from '@shared/emailRules';
import { todayKST } from '@shared/dates';
import { honoreeLabel } from '@shared/eventTypes';
import { depositPaid } from '@shared/steps';
import type { Booking, CalendarEntry } from '@shared/types';
import { useCallback } from 'react';
import { useToast } from '../../components/ui';
import { useStore } from '../../data/hooks';
import { customerUrl } from '../../data/store';

export function errorMessage(e: unknown): string {
  if (e instanceof Error) return e.message;
  return '처리 중 문제가 발생했어요.';
}

/** 예약 변경 저장 + 토스트 */
export function useSaveBooking() {
  const store = useStore();
  const toast = useToast();
  return useCallback(
    async (next: Booking, message?: string) => {
      try {
        await store.saveBooking(next);
        if (message) toast(message);
        return true;
      } catch (e) {
        toast(errorMessage(e), 'error');
        return false;
      }
    },
    [store, toast],
  );
}

/** 메일 본문 링크의 기준 주소 */
export function emailBaseUrl(): string {
  return customerUrl('').replace(/#\/my\/$/, '#').replace(/\/my\/$/, '');
}

/** 관리자 캘린더용: 모든 예약(이름 포함, 출장 포함)을 일정으로 */
export function adminEntries(bookings: Booking[]): CalendarEntry[] {
  return bookings
    .filter((b) => !b.cancelledAt)
    .map((b) => ({
      id: `b_${b.id}`,
      date: b.date,
      time: b.time,
      hallId: b.hallId,
      title: honoreeLabel(b.eventType, b.honorees),
      eventType: b.eventType,
      status: depositPaid(b) ? 'confirmed' : 'pending',
      bookingId: b.id,
    }));
}

export function lastActivity(b: Booking): string {
  const t = b.timeline[b.timeline.length - 1];
  return t ? t.message : '—';
}

export function isThisMonth(date: string, today = todayKST()): boolean {
  return date.slice(0, 7) === today.slice(0, 7);
}

export function digitsOnly(s: string): number {
  return Number(s.replace(/[^\d]/g, '')) || 0;
}


const EVENT_TEXT: Record<string, string> = {
  created: '문의 접수 직후',
  quote_sent: '견적서 발송 직후',
  adjust_replied: '조정 요청 답변 직후',
  deposit_paid: '예약금 결제 직후',
  photos_released: '사진 공개 직후',
};
const ANCHOR_TEXT: Record<string, string> = { eventDate: '행사일', createdAt: '문의일', quoteSentAt: '견적 발송일', photosReleasedAt: '사진 공개일' };
const COND_TEXT: Record<string, string> = {
  always: '항상',
  step1: 'STEP 1(필요사항 미제출)일 때',
  step2_quote_sent: '견적 발송 후 미결제 · 조정 요청 없음',
  paid: '예약금 결제 고객',
  paid_not_done: '예약 확정 · 행사 전',
  photos: '사진 공개 고객',
};

export function triggerText(r: EmailRule): string {
  if (r.trigger.type === 'event') return EVENT_TEXT[r.trigger.event] ?? r.trigger.event;
  const n = r.trigger.offsetDays;
  const anchor = ANCHOR_TEXT[r.trigger.anchor] ?? r.trigger.anchor;
  const rel = r.trigger.anchor === 'eventDate' ? (n < 0 ? `D${n}` : `D+${n}`) : `${anchor} +${n}일`;
  return `${rel} · ${String(r.trigger.hour).padStart(2, '0')}:00 (KST)`;
}

export function conditionText(r: EmailRule): string {
  return COND_TEXT[r.condition] ?? r.condition;
}

export const PLAN_LABEL: Record<PlanStatus, string> = {
  sent: '발송 완료',
  due: '발송 대상',
  scheduled: '예약됨',
  waiting: '대기',
  skipped: '건너뜀',
  disabled: '꺼짐',
};
