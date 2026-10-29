// 예약 문서가 바뀔 때마다: ① 공개 캘린더 동기화 ② 행동 직후 보내는 이벤트 메일 발송
import { publicEntryFromBooking, publicEntryId } from '../../shared/calendar';
import type { Booking } from '../../shared/types';
import { logger } from 'firebase-functions';
import { onDocumentWritten } from 'firebase-functions/v2/firestore';
import { db } from './app';
import { loadEnabledRules, sendDueForBooking } from './mail';

export const onBookingWritten = onDocumentWritten('bookings/{bookingId}', async (event) => {
  const id = event.params.bookingId;
  const before = event.data?.before;
  const after = event.data?.after;
  const calRef = db.doc(`calendar/${publicEntryId(id)}`);

  // ① 공개 캘린더 — 이름·연락처·토큰 없이 행사 종류/홀/상태만
  if (!after?.exists) {
    await calRef.delete().catch(() => undefined);
    return;
  }
  const b = { ...(after.data() as Booking), id };
  const entry = publicEntryFromBooking(b);
  const prevEntry = before?.exists ? publicEntryFromBooking({ ...(before.data() as Booking), id }) : null;
  if (JSON.stringify(entry) !== JSON.stringify(prevEntry)) {
    if (entry) await calRef.set({ ...entry, source: 'booking' });
    else await calRef.delete().catch(() => undefined);
  }

  // ② 이벤트 메일 (문의 접수 · 견적 발송 · 조정 답변 · 예약 확정 · 사진 공개)
  // 이 함수가 emails 배열만 갱신한 쓰기로 다시 트리거되면 due 가 0 이 되어 루프가 멈춥니다.
  try {
    const sent = await sendDueForBooking(id, await loadEnabledRules(), true);
    if (sent) logger.info('event emails queued', { sent });
  } catch (err) {
    logger.error('event email failed', err);
  }
});
