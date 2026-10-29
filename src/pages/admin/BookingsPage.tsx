import { ddayLabel, formatDate, todayKST, won } from '@shared/dates';
import { EVENT_TYPE_LIST, EVENT_TYPES, eventConfig, honoreeLabel } from '@shared/eventTypes';
import * as ops from '@shared/ops';
import { expectedRevenue } from '@shared/quote';
import { computeStep, STEPS } from '@shared/steps';
import type { Booking, EventType, HallId, Requirements, StepNo } from '@shared/types';
import { HALLS, hallName, TIME_SLOTS } from '@shared/venue';
import { useMemo, useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router';
import { FieldInput } from '../../components/FieldInput';
import { Icon } from '../../components/Icon';
import { Counter, Empty, EventBadge, PageLoading, Sheet, useToast } from '../../components/ui';
import { useBookings, useCatalog, useStore, useToday } from '../../data/hooks';
import { errorMessage, lastActivity } from './adminUtils';

export function StepMini({ step, cancelled }: { step: StepNo; cancelled?: boolean }) {
  if (cancelled) return <span className="badge badge--error">취소</span>;
  return (
    <span className="step-mini" title={`STEP ${step} ${STEPS[step - 1].title}`}>
      <span className="step-mini__dots" aria-hidden="true">
        {STEPS.map((s) => (
          <i key={s.no} className={s.no < step ? 'is-done' : s.no === step ? 'is-current' : ''} />
        ))}
      </span>
      <span className="step-mini__label">
        {step}. {STEPS[step - 1].short}
      </span>
    </span>
  );
}

type StepFilter = 'all' | StepNo | 'cancelled';

export function BookingsPage() {
  const bookings = useBookings();
  const catalog = useCatalog();
  const today = useToday();
  const [q, setQ] = useState('');
  const [step, setStep] = useState<StepFilter>('all');
  const [type, setType] = useState<EventType | 'all'>('all');
  const [sort, setSort] = useState<'date' | 'recent'>('date');
  const [showPast, setShowPast] = useState(true);
  const [newOpen, setNewOpen] = useState(false);

  const rows = useMemo(() => {
    if (!bookings) return [];
    const needle = q.trim().toLowerCase();
    return bookings
      .map((b) => ({ b, step: computeStep(b, today), rev: expectedRevenue(b, catalog) }))
      .filter(({ b, step: s }) => {
        if (step === 'cancelled') {
          if (!b.cancelledAt) return false;
        } else if (b.cancelledAt && step !== 'all') return false;
        if (typeof step === 'number' && s !== step) return false;
        if (type !== 'all' && b.eventType !== type) return false;
        if (!showPast && b.date < today) return false;
        if (!needle) return true;
        const hay = [b.customer.name, b.customer.phone, b.customer.email, b.honorees.primary, b.honorees.secondary, b.honorees.detail, b.accessCode].join(' ').toLowerCase();
        return hay.includes(needle) || hay.replace(/-/g, '').includes(needle.replace(/-/g, ''));
      })
      .sort((a, z) => (sort === 'date' ? a.b.date.localeCompare(z.b.date) || a.b.time.localeCompare(z.b.time) : z.b.updatedAt.localeCompare(a.b.updatedAt)));
  }, [bookings, catalog, q, step, type, sort, showPast, today]);

  if (!bookings) return <PageLoading />;

  const counts = (s: StepFilter) => bookings.filter((b) => (s === 'all' ? true : s === 'cancelled' ? !!b.cancelledAt : !b.cancelledAt && computeStep(b, today) === s)).length;
  const totalRev = rows.filter((r) => !r.b.cancelledAt).reduce((s, r) => s + r.rev.amount, 0);

  return (
    <div className="admin-page">
      <div className="admin-page__head">
        <div>
          <div className="overline">CUSTOMERS</div>
          <h1 className="display-md">고객 관리</h1>
          <p className="caption">
            {rows.length}건 · 예상 매출 합계 {won(totalRev)}
          </p>
        </div>
        <button className="btn btn--primary btn--sm" onClick={() => setNewOpen(true)}>
          <Icon name="plus" size={16} /> 전화 · 수기 예약 등록
        </button>
      </div>

      <div className="filter-bar">
        <label className="filter-bar__search">
          <Icon name="user" size={18} />
          <input className="input input--sm" value={q} onChange={(e) => setQ(e.target.value)} placeholder="이름 · 연락처 · 주인공 검색" aria-label="검색" />
        </label>
        <select className="select select--sm" value={type} onChange={(e) => setType(e.target.value as EventType | 'all')} aria-label="행사 종류">
          <option value="all">전체 행사</option>
          {EVENT_TYPE_LIST.map((t) => (
            <option key={t} value={t}>
              {EVENT_TYPES[t].label}
            </option>
          ))}
        </select>
        <select className="select select--sm" value={sort} onChange={(e) => setSort(e.target.value as 'date' | 'recent')} aria-label="정렬">
          <option value="date">행사일 순</option>
          <option value="recent">최근 활동 순</option>
        </select>
        <label className="check body-sm">
          <input type="checkbox" checked={showPast} onChange={(e) => setShowPast(e.target.checked)} /> 지난 행사 포함
        </label>
      </div>
      <div className="chip-row mt-12">
        {(['all', 1, 2, 3, 4, 5, 6, 'cancelled'] as StepFilter[]).map((s) => (
          <button key={String(s)} className="chip chip--sm" aria-pressed={step === s} onClick={() => setStep(s)}>
            {s === 'all' ? '전체' : s === 'cancelled' ? '취소' : `STEP ${s} ${STEPS[s - 1].short}`}
            <span className="caption">{counts(s)}</span>
          </button>
        ))}
      </div>

      {rows.length === 0 ? (
        <div className="card mt-24">
          <Empty>조건에 맞는 고객이 없어요.</Empty>
        </div>
      ) : (
        <>
          <div className="table-wrap mt-16 hide-mobile">
            <table className="table">
              <thead>
                <tr>
                  <th>고객 · 행사</th>
                  <th>행사일</th>
                  <th>홀 · 인원</th>
                  <th>진행 단계</th>
                  <th className="num">예상 매출</th>
                  <th>최근 활동</th>
                </tr>
              </thead>
              <tbody>
                {rows.map(({ b, step: s, rev }) => (
                  <tr key={b.id} className="table-link-row">
                    <td>
                      <Link to={`/admin/bookings/${b.id}`} className="stack gap-4">
                        <span className="row gap-8">
                          <EventBadge type={b.eventType} short />
                          <b className="text-ink">{honoreeLabel(b.eventType, b.honorees)}</b>
                        </span>
                        <span className="caption">
                          {b.customer.name} · {b.customer.phone}
                          {b.accessCode && <span className="code-text"> · {b.accessCode}</span>}
                          {b.source !== 'web' && <span className="badge badge--outline" style={{ marginLeft: 6 }}>{b.source === 'phone' ? '전화' : b.source}</span>}
                        </span>
                      </Link>
                    </td>
                    <td>
                      <div className="stack">
                        <span className="numeral dday-cell">{ddayLabel(b.date, today)}</span>
                        <span className="caption">
                          {formatDate(b.date)} {b.time}
                        </span>
                      </div>
                    </td>
                    <td>
                      <div className="stack">
                        <span>{b.eventType === 'catering' ? '출장' : hallName(b.hallId)}</span>
                        <span className="caption">{b.guests}명</span>
                      </div>
                    </td>
                    <td>
                      <StepMini step={s} cancelled={!!b.cancelledAt} />
                    </td>
                    <td className="num">
                      <div className="stack">
                        <span className="price">{won(rev.amount)}</span>
                        <span className="caption">{rev.source === 'quote' ? `견적 v${b.quote?.version}` : '추정'}</span>
                      </div>
                    </td>
                    <td className="activity-cell caption">{lastActivity(b)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <ul className="booking-cards mt-16 hide-desktop">
            {rows.map(({ b, step: s, rev }) => (
              <li key={b.id}>
                <Link to={`/admin/bookings/${b.id}`} className="booking-card">
                  <div className="row between gap-8">
                    <span className="row gap-8">
                      <EventBadge type={b.eventType} short />
                      <span className="numeral dday-cell">{ddayLabel(b.date, today)}</span>
                    </span>
                    <StepMini step={s} cancelled={!!b.cancelledAt} />
                  </div>
                  <div className="title-sm mt-8">{honoreeLabel(b.eventType, b.honorees)}</div>
                  <div className="caption">
                    {formatDate(b.date)} {b.time} · {b.eventType === 'catering' ? '출장' : hallName(b.hallId)} · {b.guests}명
                  </div>
                  <div className="row between mt-8">
                    <span className="caption">
                      {b.customer.name}
                      {b.accessCode && <span className="code-text"> · {b.accessCode}</span>}
                    </span>
                    <span className="price">
                      {won(rev.amount)} <span className="caption">{rev.source === 'quote' ? '견적' : '추정'}</span>
                    </span>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </>
      )}

      <NewBookingSheet open={newOpen} onClose={() => setNewOpen(false)} />
    </div>
  );
}

function NewBookingSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const store = useStore();
  const toast = useToast();
  const nav = useNavigate();
  const [eventType, setEventType] = useState<EventType>('wedding');
  const [date, setDate] = useState(todayKST());
  const [time, setTime] = useState(TIME_SLOTS[1].time);
  const [hallId, setHallId] = useState<HallId>('lovely');
  const [guests, setGuests] = useState(60);
  const [customer, setCustomer] = useState({ name: '', phone: '', email: '' });
  const [hv, setHv] = useState<Requirements>({});
  const [memo, setMemo] = useState('');
  const [source, setSource] = useState<Booking['source']>('phone');
  const [busy, setBusy] = useState(false);
  const cfg = eventConfig(eventType);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    const missing = cfg.honoreeFields.filter((f) => f.required && !String(hv[f.key] ?? '').trim());
    if (!customer.name.trim() || !customer.phone.trim()) return toast('고객 이름과 연락처를 입력해 주세요.', 'error');
    if (missing.length) return toast(`${missing.map((f) => f.label).join(', ')}을(를) 입력해 주세요.`, 'error');
    setBusy(true);
    try {
      const values: Requirements = { ...Object.fromEntries(cfg.honoreeFields.filter((f) => f.defaultValue !== undefined).map((f) => [f.key, f.defaultValue!])), ...hv };
      let b = ops.createBooking({ eventType, date, time, hallId: cfg.usesHall ? hallId : undefined, guests, customer, honoreeValues: values, memo, source });
      b = ops.log(b, 'admin', 'note', `관리자가 ${source === 'phone' ? '전화' : source === 'kakao' ? '카카오톡' : '방문'} 문의를 등록했어요`, true);
      await store.createBooking(b);
      toast('예약 문의를 등록했어요.');
      onClose();
      nav(`/admin/bookings/${b.id}`);
    } catch (err) {
      toast(errorMessage(err), 'error');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Sheet open={open} onClose={onClose} title="전화 · 수기 예약 등록" wide>
      <form className="stack gap-24" onSubmit={onSubmit}>
        <div className="field">
          <span className="field__label">행사 종류</span>
          <div className="row wrap gap-8">
            {EVENT_TYPE_LIST.map((t) => (
              <button type="button" key={t} className="chip chip--sm" aria-pressed={eventType === t} onClick={() => setEventType(t)}>
                {EVENT_TYPES[t].label}
              </button>
            ))}
          </div>
        </div>
        <div className="field">
          <span className="field__label">문의 경로</span>
          <div className="row wrap gap-8">
            {(['phone', 'kakao', 'walkin'] as const).map((s) => (
              <button type="button" key={s} className="chip chip--sm" aria-pressed={source === s} onClick={() => setSource(s)}>
                {{ phone: '전화', kakao: '카카오톡', walkin: '방문' }[s]}
              </button>
            ))}
          </div>
        </div>
        <div className="form-grid form-grid--2">
          <label className="field">
            <span className="field__label">행사일</span>
            <input className="input" type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
          </label>
          <label className="field">
            <span className="field__label">시간</span>
            <input className="input" type="time" value={time} onChange={(e) => setTime(e.target.value)} list="admin-slots" required />
            <datalist id="admin-slots">
              {TIME_SLOTS.map((s) => (
                <option key={s.id} value={s.time}>
                  {s.label}
                </option>
              ))}
            </datalist>
          </label>
          {cfg.usesHall && (
            <label className="field">
              <span className="field__label">홀</span>
              <select className="select" value={hallId} onChange={(e) => setHallId(e.target.value as HallId)}>
                {HALLS.map((h) => (
                  <option key={h.id} value={h.id}>
                    {h.name} (좌석 {h.seats})
                  </option>
                ))}
              </select>
            </label>
          )}
          <div className="field">
            <span className="field__label">예상 인원</span>
            <Counter value={guests} onChange={setGuests} min={1} max={1000} label="예상 인원" />
          </div>
        </div>
        <div className="form-grid form-grid--2">
          {cfg.honoreeFields.map((f) => (
            <FieldInput key={f.key} field={f} value={hv[f.key] ?? f.defaultValue} onChange={(v) => setHv((x) => ({ ...x, [f.key]: v }))} />
          ))}
        </div>
        <div className="form-grid form-grid--2">
          <label className="field">
            <span className="field__label">
              고객 이름<span className="req">*</span>
            </span>
            <input className="input" value={customer.name} onChange={(e) => setCustomer({ ...customer, name: e.target.value })} />
          </label>
          <label className="field">
            <span className="field__label">
              연락처<span className="req">*</span>
            </span>
            <input className="input" type="tel" value={customer.phone} onChange={(e) => setCustomer({ ...customer, phone: e.target.value })} placeholder="010-0000-0000" />
          </label>
          <label className="field">
            <span className="field__label">이메일</span>
            <input className="input" type="email" value={customer.email} onChange={(e) => setCustomer({ ...customer, email: e.target.value })} placeholder="안내 메일 수신용" />
          </label>
        </div>
        <label className="field">
          <span className="field__label">상담 메모</span>
          <textarea className="textarea" value={memo} onChange={(e) => setMemo(e.target.value)} placeholder="통화 내용, 고객 요청사항" />
        </label>
        <div className="row gap-8">
          <button type="button" className="btn btn--secondary grow" onClick={onClose}>
            취소
          </button>
          <button type="submit" className="btn btn--primary grow" disabled={busy}>
            {busy ? <span className="spinner" /> : '등록하고 고객 페이지 만들기'}
          </button>
        </div>
      </form>
    </Sheet>
  );
}
