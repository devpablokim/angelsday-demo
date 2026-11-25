import { activeCancellation, cancelEstimate, CHANNEL_LABEL } from '@shared/contract';
import { formatDateTime, todayKST, won } from '@shared/dates';
import * as ops from '@shared/ops';
import type { Booking, ChangeChannel } from '@shared/types';
import { useEffect, useState } from 'react';
import { Icon } from '../../../components/Icon';
import { Sheet, useToast } from '../../../components/ui';
import { useAdmin, useStore } from '../../../data/hooks';
import { errorMessage, useSaveBooking } from '../adminUtils';

const CHANNELS: ChangeChannel[] = ['phone', 'kakao', 'sms', 'email', 'visit'];
const toWon = (s: string) => Math.max(0, Number(s.replace(/[^\d]/g, '')) || 0);
const fmt = (n: number) => n.toLocaleString('ko-KR');

function ChannelChips({ value, onChange }: { value: ChangeChannel; onChange: (c: ChangeChannel) => void }) {
  return (
    <div className="row wrap gap-8">
      {CHANNELS.map((c) => (
        <button key={c} type="button" className="chip" aria-pressed={value === c} onClick={() => onChange(c)}>
          {CHANNEL_LABEL[c]}
        </button>
      ))}
    </div>
  );
}

/**
 * 계약 취소 — 언제든(고객 확인 전·후, 결제 전·후, 행사일이 지나도) 할 수 있습니다.
 * 규정대로 계산한 위약금·환불을 제안하고, 금액은 직원이 자유롭게 고칩니다. 예약도 함께 취소할지 고릅니다.
 */
export function CancelContractSheet({ open, onClose, booking: b }: { open: boolean; onClose: () => void; booking: Booking }) {
  const admin = useAdmin();
  const store = useStore();
  const toast = useToast();
  const save = useSaveBooking();
  const est = cancelEstimate(b, todayKST());
  const [requester, setRequester] = useState('');
  const [channel, setChannel] = useState<ChangeChannel>('phone');
  const [staff, setStaff] = useState('');
  const [reason, setReason] = useState('');
  const [penalty, setPenalty] = useState('');
  const [refund, setRefund] = useState('');
  const [withBooking, setWithBooking] = useState(true);
  const [mail, setMail] = useState(true);
  const [busy, setBusy] = useState(false);

  // 열 때마다 제안값으로 새로 시작
  useEffect(() => {
    if (!open) return;
    setRequester(`${b.customer.name} ${b.customer.phone}`);
    setChannel('phone');
    setStaff(admin?.name || b.manager?.name || '');
    setReason('');
    setPenalty(fmt(est.penalty));
    setRefund(fmt(est.refund));
    setWithBooking(!b.cancelledAt);
    setMail(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  function changePenalty(s: string) {
    setPenalty(s);
    setRefund(fmt(Math.max(0, est.paid - toWon(s))));
  }

  async function submit() {
    setBusy(true);
    try {
      const next = ops.cancelContract(b, {
        requester: requester.trim(),
        channel,
        staff: staff.trim(),
        reason: reason.trim(),
        penalty: toWon(penalty),
        refund: toWon(refund),
        rule: est.rule,
        withBooking: withBooking || !!b.cancelledAt,
      });
      if (!(await save(next))) return;
      if (mail && b.customer.email) await store.sendEmailNow(b.id, 'contract_cancelled');
      toast(`계약을 취소했어요.${mail && b.customer.email ? ' 고객에게 안내 메일을 보냈어요.' : ''}`);
      onClose();
    } catch (e) {
      toast(errorMessage(e), 'error');
    } finally {
      setBusy(false);
    }
  }

  const ready = reason.trim() && staff.trim();
  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="계약 취소"
      footer={
        <button className="btn btn--danger btn--block" disabled={!ready || busy} onClick={() => void submit()}>
          {busy ? <span className="spinner" /> : <Icon name="close" size={18} />} 계약 취소 처리
        </button>
      }
    >
      <div className="stack gap-12">
        <div className="cancel-estimate">
          <div className="row between gap-8">
            <span className="title-sm">규정 기준 제안</span>
            <span className="caption">{est.daysBefore >= 0 ? `행사 D-${est.daysBefore}` : `행사 ${-est.daysBefore}일 지남`}</span>
          </div>
          <p className="body-sm mt-4">{est.rule}</p>
          <dl className="cancel-estimate__grid">
            <div>
              <dt>받은 금액</dt>
              <dd>{won(est.paid)}</dd>
            </div>
            <div>
              <dt>정상가 총액</dt>
              <dd>{est.base ? won(est.base) : '견적 없음'}</dd>
            </div>
            <div>
              <dt>위약금 제안</dt>
              <dd>{won(est.penalty)}</dd>
            </div>
            <div>
              <dt>{est.extra ? '추가로 받을 금액' : '환불 제안'}</dt>
              <dd>{won(est.extra || est.refund)}</dd>
            </div>
          </dl>
          <p className="caption mt-4">금액은 상황에 맞게 자유롭게 고칠 수 있어요.</p>
        </div>

        <div className="form-grid form-grid--2 cancel-amounts">
          <label className="field">
            <span className="field__label">위약금 (원)</span>
            <input className="input" inputMode="numeric" value={penalty} onChange={(e) => changePenalty(e.target.value)} />
          </label>
          <label className="field">
            <span className="field__label">환불할 금액 (원)</span>
            <input className="input" inputMode="numeric" value={refund} onChange={(e) => setRefund(e.target.value)} />
          </label>
        </div>
        <label className="field">
          <span className="field__label">취소 사유 *</span>
          <textarea className="textarea" rows={2} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="예) 고객 사정으로 행사 취소 요청" />
        </label>
        <label className="field">
          <span className="field__label">요청자 (이름·연락처)</span>
          <input className="input" value={requester} onChange={(e) => setRequester(e.target.value)} />
        </label>
        <div className="field">
          <span className="field__label">요청 경로</span>
          <ChannelChips value={channel} onChange={setChannel} />
        </div>
        <label className="field">
          <span className="field__label">처리한 직원 *</span>
          <input className="input" value={staff} onChange={(e) => setStaff(e.target.value)} />
        </label>
        {!b.cancelledAt && (
          <label className="check">
            <input type="checkbox" checked={withBooking} onChange={(e) => setWithBooking(e.target.checked)} />
            <span>예약도 함께 취소 (캘린더·자동 메일에서 빠져요)</span>
          </label>
        )}
        <label className="check">
          <input type="checkbox" checked={mail} onChange={(e) => setMail(e.target.checked)} disabled={!b.customer.email} />
          <span>고객에게 취소 안내 메일 보내기 (위약금·환불 금액 포함){!b.customer.email && ' — 메일 주소 없음'}</span>
        </label>
        <p className="caption">취소해도 계약서와 기록은 그대로 남고, 언제든 ‘취소 철회’로 되돌릴 수 있어요. 실제 환불 송금은 결제 탭에서 처리해 주세요.</p>
      </div>
    </Sheet>
  );
}

/** 계약 취소 철회 — 예약 취소도 함께 되돌릴 수 있습니다 */
export function RestoreContractSheet({ open, onClose, booking: b }: { open: boolean; onClose: () => void; booking: Booking }) {
  const admin = useAdmin();
  const toast = useToast();
  const save = useSaveBooking();
  const c = activeCancellation(b);
  const [reason, setReason] = useState('');
  const [staff, setStaff] = useState('');
  const [channel, setChannel] = useState<ChangeChannel>('phone');
  const [withBooking, setWithBooking] = useState(true);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    setReason('');
    setStaff(admin?.name || b.manager?.name || '');
    setChannel('phone');
    setWithBooking(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  async function submit() {
    setBusy(true);
    try {
      const next = ops.restoreContract(b, { requester: `${b.customer.name} ${b.customer.phone}`, channel, staff: staff.trim(), reason: reason.trim(), withBooking: withBooking && !!b.cancelledAt });
      if (await save(next, withBooking && b.cancelledAt ? '계약과 예약을 되살렸어요.' : '계약 취소를 철회했어요.')) onClose();
    } catch (e) {
      toast(errorMessage(e), 'error');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="계약 취소 철회"
      footer={
        <button className="btn btn--primary btn--block" disabled={!reason.trim() || !staff.trim() || busy} onClick={() => void submit()}>
          {busy ? <span className="spinner" /> : <Icon name="refresh" size={18} />} 취소 철회하기
        </button>
      }
    >
      <div className="stack gap-12">
        {c && (
          <p className="body-sm">
            {formatDateTime(c.at)}에 취소된 계약이에요 (사유: {c.reason}). 철회하면 계약서가 다시 유효해지고, 취소·철회 기록은 모두 남아요.
          </p>
        )}
        <label className="field">
          <span className="field__label">철회 사유 *</span>
          <textarea className="textarea" rows={2} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="예) 고객이 취소 요청을 거둬들임" />
        </label>
        <div className="field">
          <span className="field__label">요청 경로</span>
          <ChannelChips value={channel} onChange={setChannel} />
        </div>
        <label className="field">
          <span className="field__label">처리한 직원 *</span>
          <input className="input" value={staff} onChange={(e) => setStaff(e.target.value)} />
        </label>
        {b.cancelledAt && (
          <label className="check">
            <input type="checkbox" checked={withBooking} onChange={(e) => setWithBooking(e.target.checked)} />
            <span>예약 취소도 함께 되돌리기</span>
          </label>
        )}
      </div>
    </Sheet>
  );
}
