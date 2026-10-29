import { formatDateTime, won } from '@shared/dates';
import { eventConfig } from '@shared/eventTypes';
import * as ops from '@shared/ops';
import { calcQuote, expectedRevenue, paidAmount } from '@shared/quote';
import { computeStep, depositPaid, nextAction, STEPS, subState, type SubState } from '@shared/steps';
import type { Booking, HallId, PaymentMethod } from '@shared/types';
import { HALLS } from '@shared/venue';
import { useEffect, useState } from 'react';
import { Icon } from '../../../components/Icon';
import { Counter, Sheet } from '../../../components/ui';
import { useCatalog, useToday } from '../../../data/hooks';
import { useSaveBooking } from '../adminUtils';

const SUB_LABEL: Record<SubState, string> = {
  req_draft: '필요사항 작성 중',
  quote_waiting: '견적 작성 대기 (관리자 차례)',
  quote_ready: '견적 발송됨 · 고객 결제 대기',
  adjusting: '조정 요청 검토 필요',
  paid: '결제 완료 · 준비 시작 전',
  preparing: '준비 진행 중',
  eventday: '오늘 행사',
  after_unpaid: '행사 종료 · 잔금 미결제',
  photos_waiting: '잔금 완료 · 사진 공개 대기',
  photos: '사진 공개 완료',
};

export function OverviewTab({ booking: b }: { booking: Booking }) {
  const save = useSaveBooking();
  const catalog = useCatalog();
  const today = useToday();
  const cfg = eventConfig(b.eventType);
  const step = computeStep(b, today);
  const sub = subState(b, today);
  const na = nextAction(b, today);
  const rev = expectedRevenue(b, catalog);
  const totals = b.quote ? calcQuote(b.quote) : undefined;
  const paid = paidAmount(b);

  const [form, setForm] = useState(() => toForm(b));
  useEffect(() => setForm(toForm(b)), [b]);
  const dirty = JSON.stringify(form) !== JSON.stringify(toForm(b));

  const [balanceOpen, setBalanceOpen] = useState(false);
  const [balanceMethod, setBalanceMethod] = useState<PaymentMethod>('onsite');
  const [cancelOpen, setCancelOpen] = useState(false);
  const [reason, setReason] = useState('');

  async function saveInfo() {
    const changed: string[] = [];
    if (form.date !== b.date || form.time !== b.time) changed.push(`일시 ${form.date} ${form.time}`);
    if (form.hallId !== (b.hallId ?? '')) changed.push(`홀 변경`);
    if (form.guests !== b.guests) changed.push(`인원 ${form.guests}명`);
    let next: Booking = {
      ...b,
      date: form.date,
      time: form.time,
      hallId: cfg.usesHall ? ((form.hallId || undefined) as HallId | undefined) : undefined,
      location: cfg.usesHall ? b.location : form.location,
      guests: form.guests,
      customer: { name: form.name, phone: form.phone, email: form.email },
      manager: form.managerName ? { name: form.managerName, phone: form.managerPhone } : undefined,
      adminMemo: form.adminMemo,
      requirements: { ...b.requirements, ...(cfg.usesHall && form.hallId ? { hallId: form.hallId } : {}), ...(!cfg.usesHall ? { location: form.location } : {}), guestsAdult: Math.max(1, form.guests - Number(b.requirements.guestsKids ?? 0)) },
    };
    next = ops.log(next, 'admin', 'edit', changed.length ? `예약 정보 변경: ${changed.join(', ')}` : '예약 기본 정보 수정', changed.length === 0);
    await save(next, '기본 정보를 저장했어요.');
  }

  const depositAmount = totals?.deposit ?? 0;
  const balance = totals ? totals.total - paid : 0;

  return (
    <div className="detail-grid">
      <div className="stack gap-16">
        <section className="card card--gold">
          <div className="overline">STATUS</div>
          <div className="title-md mt-8">
            STEP {step} · {STEPS[step - 1].title}
          </div>
          <p className="body-sm">{b.cancelledAt ? `취소됨 · ${formatDateTime(b.cancelledAt)}` : SUB_LABEL[sub]}</p>
          {!b.cancelledAt && (
            <div className="callout callout--neutral mt-16">
              <span className="callout__icon">{na.who === 'angels' ? 'A' : 'C'}</span>
              <div>
                <div className="title-sm">{na.who === 'angels' ? '엔젤스데이 차례' : '고객 차례'} — {na.title}</div>
                <p className="caption">{na.desc}</p>
              </div>
            </div>
          )}
          <dl className="kv mt-16">
            <dt>예상 매출</dt>
            <dd className="price">
              {won(rev.amount)} <span className="caption">{rev.source === 'quote' ? `견적 v${b.quote?.version}` : '추정치'}</span>
            </dd>
            <dt>결제 금액</dt>
            <dd className="price">{won(paid)}</dd>
            {totals && (
              <>
                <dt>남은 금액</dt>
                <dd className="price">{won(Math.max(0, totals.total - paid))}</dd>
              </>
            )}
            <dt>문의 경로</dt>
            <dd>{{ web: '웹 문의', phone: '전화', kakao: '카카오톡', walkin: '방문' }[b.source]}</dd>
            <dt>문의 일시</dt>
            <dd>{formatDateTime(b.createdAt)}</dd>
          </dl>
          {b.inquiryMemo && (
            <div className="mt-16">
              <span className="label">고객 문의 메모</span>
              <p className="body-sm text-ink">{b.inquiryMemo}</p>
            </div>
          )}
        </section>

        <section className="card">
          <div className="title-md">빠른 작업</div>
          <div className="quick-actions mt-16">
            <button
              className="quick-action"
              disabled={!b.quote || depositPaid(b) || !!b.cancelledAt}
              onClick={() => void save(ops.addPayment(b, 'deposit', depositAmount, 'transfer', 'admin', '계좌이체 입금 확인'), '예약금 입금을 확인했어요. 예약이 확정되었어요.')}
            >
              <Icon name="bank" />
              <span className="stack">
                <b>계좌이체 입금 확인</b>
                <span className="caption">{b.quote ? `예약금 ${won(depositAmount)}` : '견적서 발송 후 가능'}</span>
              </span>
            </button>
            <button className="quick-action" disabled={!depositPaid(b) || balance <= 0 || !!b.cancelledAt} onClick={() => setBalanceOpen(true)}>
              <Icon name="card" />
              <span className="stack">
                <b>잔금 결제 등록</b>
                <span className="caption">{depositPaid(b) ? `잔금 ${won(Math.max(0, balance))}` : '예약금 결제 후 가능'}</span>
              </span>
            </button>
            <button className="quick-action" disabled={!depositPaid(b) || !!b.prepStartedAt || !!b.cancelledAt} onClick={() => void save(ops.startPrep(b, 'admin'), '준비 단계를 시작했어요.')}>
              <Icon name="sparkle" />
              <span className="stack">
                <b>준비 단계 시작</b>
                <span className="caption">{b.prepStartedAt ? `시작됨 · ${formatDateTime(b.prepStartedAt)}` : 'STEP 4로 이동'}</span>
              </span>
            </button>
            {b.cancelledAt ? (
              <button className="quick-action" onClick={() => void save(ops.log({ ...b, cancelledAt: undefined }, 'admin', 'cancel', '예약 취소를 철회했어요'), '예약을 복구했어요.')}>
                <Icon name="arrowLeft" />
                <span className="stack">
                  <b>예약 복구</b>
                  <span className="caption">취소를 철회합니다</span>
                </span>
              </button>
            ) : (
              <button className="quick-action quick-action--danger" onClick={() => setCancelOpen(true)}>
                <Icon name="close" />
                <span className="stack">
                  <b>예약 취소</b>
                  <span className="caption">사유를 기록합니다</span>
                </span>
              </button>
            )}
          </div>
        </section>
      </div>

      <section className="card">
        <div className="card__head">
          <div className="title-md">기본 정보</div>
          <button className="btn btn--primary btn--sm" disabled={!dirty} onClick={() => void saveInfo()}>
            저장
          </button>
        </div>
        <div className="form-grid form-grid--2">
          <label className="field">
            <span className="field__label">행사일</span>
            <input className="input" type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
          </label>
          <label className="field">
            <span className="field__label">시간</span>
            <input className="input" type="time" value={form.time} onChange={(e) => setForm({ ...form, time: e.target.value })} />
          </label>
          {cfg.usesHall ? (
            <label className="field">
              <span className="field__label">홀</span>
              <select className="select" value={form.hallId} onChange={(e) => setForm({ ...form, hallId: e.target.value })}>
                {HALLS.map((h) => (
                  <option key={h.id} value={h.id}>
                    {h.name} (보증 {h.guaranteed} · 좌석 {h.seats})
                  </option>
                ))}
              </select>
            </label>
          ) : (
            <label className="field">
              <span className="field__label">행사 장소</span>
              <input className="input" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} />
            </label>
          )}
          <div className="field">
            <span className="field__label">총 인원</span>
            <Counter value={form.guests} onChange={(n) => setForm({ ...form, guests: n })} min={1} max={1000} label="총 인원" />
          </div>
          <label className="field">
            <span className="field__label">고객 이름</span>
            <input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </label>
          <label className="field">
            <span className="field__label">연락처</span>
            <input className="input" type="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          </label>
          <label className="field">
            <span className="field__label">이메일</span>
            <input className="input" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          </label>
          <label className="field">
            <span className="field__label">담당 플래너</span>
            <input className="input" value={form.managerName} onChange={(e) => setForm({ ...form, managerName: e.target.value })} placeholder="김지은 플래너" />
          </label>
          <label className="field">
            <span className="field__label">플래너 연락처</span>
            <input className="input" type="tel" value={form.managerPhone} onChange={(e) => setForm({ ...form, managerPhone: e.target.value })} />
          </label>
        </div>
        <label className="field mt-16">
          <span className="field__label">관리자 메모 (고객에게 보이지 않아요)</span>
          <textarea className="textarea" value={form.adminMemo} onChange={(e) => setForm({ ...form, adminMemo: e.target.value })} placeholder="VIP, 특이사항, 정산 메모 등" />
        </label>
      </section>

      <Sheet
        open={balanceOpen}
        onClose={() => setBalanceOpen(false)}
        title="잔금 결제 등록"
        footer={
          <button
            className="btn btn--primary btn--block"
            onClick={async () => {
              if (await save(ops.addPayment(b, 'balance', Math.max(0, balance), balanceMethod, 'admin', '잔금 결제'), '잔금 결제를 등록했어요.')) setBalanceOpen(false);
            }}
          >
            {won(Math.max(0, balance))} 결제 완료로 등록
          </button>
        }
      >
        <p className="body-sm">잔금이 결제되면 행사 사진을 공개할 수 있어요 (STEP 6).</p>
        <div className="row wrap gap-8 mt-16">
          {(['onsite', 'card', 'transfer', 'kakaopay'] as PaymentMethod[]).map((m) => (
            <button key={m} className="chip chip--sm" aria-pressed={balanceMethod === m} onClick={() => setBalanceMethod(m)}>
              {ops.methodLabel(m)}
            </button>
          ))}
        </div>
      </Sheet>

      <Sheet
        open={cancelOpen}
        onClose={() => setCancelOpen(false)}
        title="예약 취소"
        footer={
          <button
            className="btn btn--danger btn--block"
            disabled={!reason.trim()}
            onClick={async () => {
              if (await save(ops.cancelBooking(b, reason.trim()), '예약을 취소 처리했어요.')) {
                setCancelOpen(false);
                setReason('');
              }
            }}
          >
            취소 처리
          </button>
        }
      >
        <p className="body-sm">취소된 예약은 캘린더와 자동 메일에서 제외돼요. 환불이 필요하면 결제 탭에서 별도로 처리해 주세요.</p>
        <label className="field mt-16">
          <span className="field__label">취소 사유</span>
          <input className="input" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="예) 고객 요청 — 일정 변경" />
        </label>
      </Sheet>
    </div>
  );
}

function toForm(b: Booking) {
  return {
    date: b.date,
    time: b.time,
    hallId: (b.hallId ?? '') as string,
    location: b.location ?? '',
    guests: b.guests,
    name: b.customer.name,
    phone: b.customer.phone,
    email: b.customer.email,
    managerName: b.manager?.name ?? '',
    managerPhone: b.manager?.phone ?? '',
    adminMemo: b.adminMemo ?? '',
  };
}
