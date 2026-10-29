import { depositPaid } from './steps';
import type { Booking, CalendarEntry, HallId, ISODate } from './types';
import { ROOM_HALLS, slotOf, TIME_SLOTS } from './venue';

const PUBLIC_TITLES = { wedding: '웨딩', dol: '돌잔치', birthday: '생신연', corporate: '기업행사', catering: '케이터링' } as const;

/** 공개 캘린더 문서 ID — 고객 관리 토큰(booking.id)이 노출되지 않도록 단방향 해시 */
export function publicEntryId(bookingId: string): string {
  let h1 = 0x811c9dc5;
  let h2 = 0x01000193;
  for (let i = 0; i < bookingId.length; i++) {
    const c = bookingId.charCodeAt(i);
    h1 = Math.imul(h1 ^ c, 0x01000193) >>> 0;
    h2 = Math.imul(h2 ^ (c + i), 0x5bd1e995) >>> 0;
  }
  return `bk${h1.toString(36)}${h2.toString(36)}`;
}

/** 예약 → 고객 공개용 일정 (이름·연락처 없이 행사 종류/홀/상태만). 출장 케이터링·취소 건은 제외 */
export function publicEntryFromBooking(b: Booking): CalendarEntry | null {
  if (b.cancelledAt || b.eventType === 'catering' || !b.hallId) return null;
  return {
    id: publicEntryId(b.id),
    date: b.date,
    time: b.time,
    hallId: b.hallId,
    title: PUBLIC_TITLES[b.eventType],
    eventType: b.eventType,
    status: depositPaid(b) ? 'confirmed' : 'pending',
  };
}

export function hallsBlockedBy(e: CalendarEntry): HallId[] {
  if (!e.hallId) return [];
  return e.hallId === 'whole' ? [...ROOM_HALLS, 'whole'] : [e.hallId, 'whole'];
}

export interface SlotAvailability {
  hallId: HallId;
  slotId: string;
  time: string;
  label: string;
  taken?: CalendarEntry;
}

/** 특정 날짜의 홀 × 시간대 가용성 */
export function dayAvailability(date: ISODate, entries: CalendarEntry[], halls: HallId[] = [...ROOM_HALLS, 'whole']): SlotAvailability[] {
  const dayEntries = entries.filter((e) => e.date === date && (e.status === 'confirmed' || e.status === 'pending' || e.status === 'blocked'));
  const out: SlotAvailability[] = [];
  for (const hallId of halls) {
    for (const s of TIME_SLOTS) {
      const taken = dayEntries.find((e) => {
        const allDay = !e.time;
        const sameSlot = allDay || slotOf(e.time!)?.id === s.id;
        return sameSlot && (e.status === 'blocked' && !e.hallId ? true : hallsBlockedBy(e).includes(hallId));
      });
      out.push({ hallId, slotId: s.id, time: s.time, label: s.label, taken });
    }
  }
  return out;
}

export function promoOf(date: ISODate, entries: CalendarEntry[]): CalendarEntry | undefined {
  return entries.find((e) => e.date === date && e.status === 'promo');
}

export function freeSlotCount(date: ISODate, entries: CalendarEntry[]): number {
  return dayAvailability(date, entries, ROOM_HALLS).filter((s) => !s.taken).length;
}
