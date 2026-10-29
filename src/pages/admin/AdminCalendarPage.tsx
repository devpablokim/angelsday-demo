import { formatDateShort } from '@shared/dates';
import { uid } from '@shared/ids';
import type { CalendarEntry, CalendarStatus, HallId } from '@shared/types';
import { HALLS, hallName, HOLIDAYS, TIME_SLOTS } from '@shared/venue';
import { useMemo, useState } from 'react';
import { Link } from 'react-router';
import { Icon } from '../../components/Icon';
import { MonthCalendar } from '../../components/MonthCalendar';
import { EventBadge, PageLoading, Sheet, StatusPill, useToast } from '../../components/ui';
import { useAdminCalendar, useBookings, useStore, useToday } from '../../data/hooks';
import { adminEntries, errorMessage } from './adminUtils';

type Kind = 'external' | 'blocked' | 'promo';

interface Draft {
  id?: string;
  kind: Kind;
  status: CalendarStatus;
  date: string;
  time: string; // '' = 종일
  hallId: HallId | '';
  title: string;
  note: string;
  discountRate: number;
}

function toDraft(e: CalendarEntry): Draft {
  return {
    id: e.id,
    kind: e.status === 'promo' ? 'promo' : e.status === 'blocked' ? 'blocked' : 'external',
    status: e.status,
    date: e.date,
    time: e.time ?? '',
    hallId: e.hallId ?? '',
    title: e.title,
    note: e.note ?? '',
    discountRate: e.discountRate ?? 15,
  };
}

export function AdminCalendarPage() {
  const bookings = useBookings();
  const manual = useAdminCalendar();
  const store = useStore();
  const toast = useToast();
  const today = useToday();
  const [ym, setYm] = useState(() => ({ year: Number(today.slice(0, 4)), month0: Number(today.slice(5, 7)) - 1 }));
  const [selected, setSelected] = useState(today);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [hall, setHall] = useState<HallId | 'all'>('all');

  const entries = useMemo(() => {
    const all = [...adminEntries(bookings ?? []), ...manual];
    return hall === 'all' ? all : all.filter((e) => !e.hallId || e.hallId === hall || e.hallId === 'whole' || e.status === 'promo');
  }, [bookings, manual, hall]);

  if (!bookings) return <PageLoading />;

  const dayList = entries.filter((e) => e.date === selected).sort((a, z) => (a.time ?? '').localeCompare(z.time ?? ''));

  function newDraft(kind: Kind) {
    setDraft({ kind, status: kind === 'promo' ? 'promo' : kind === 'blocked' ? 'blocked' : 'confirmed', date: selected, time: kind === 'external' ? TIME_SLOTS[1].time : '', hallId: kind === 'external' ? 'lovely' : '', title: kind === 'promo' ? '평일 프로모션' : kind === 'blocked' ? '휴무 · 마감' : '외부 예약', note: '', discountRate: 15 });
  }

  async function saveDraft() {
    if (!draft) return;
    const e: CalendarEntry = {
      id: draft.id ?? uid('cal'),
      date: draft.date,
      status: draft.kind === 'promo' ? 'promo' : draft.kind === 'blocked' ? 'blocked' : draft.status,
      title: draft.title.trim() || '일정',
      ...(draft.time ? { time: draft.time } : {}),
      ...(draft.hallId ? { hallId: draft.hallId } : {}),
      ...(draft.note.trim() ? { note: draft.note.trim() } : {}),
      ...(draft.kind === 'promo' ? { discountRate: draft.discountRate } : {}),
    };
    try {
      await store.saveCalendarEntry(e);
      toast('일정을 저장했어요.');
      setDraft(null);
    } catch (err) {
      toast(errorMessage(err), 'error');
    }
  }

  async function remove(id: string) {
    try {
      await store.deleteCalendarEntry(id);
      toast('일정을 삭제했어요.');
      setDraft(null);
    } catch (err) {
      toast(errorMessage(err), 'error');
    }
  }

  return (
    <div className="admin-page">
      <div className="admin-page__head">
        <div>
          <div className="overline">SCHEDULE</div>
          <h1 className="display-md">캘린더</h1>
          <p className="caption">모든 예약(이름 포함)과 수동 일정입니다. 고객용 캘린더에는 행사 종류 · 홀 · 상태만 공개돼요.</p>
        </div>
        <div className="row gap-8 wrap">
          <button className="btn btn--secondary btn--sm" onClick={() => newDraft('promo')}>
            프로모션일
          </button>
          <button className="btn btn--secondary btn--sm" onClick={() => newDraft('blocked')}>
            휴무 · 마감
          </button>
          <button className="btn btn--primary btn--sm" onClick={() => newDraft('external')}>
            <Icon name="plus" size={16} /> 외부 예약
          </button>
        </div>
      </div>

      <div className="chip-row mb-16">
        <button className="chip chip--sm" aria-pressed={hall === 'all'} onClick={() => setHall('all')}>
          전체 홀
        </button>
        {HALLS.map((h) => (
          <button key={h.id} className="chip chip--sm" aria-pressed={hall === h.id} onClick={() => setHall(h.id)}>
            {h.name}
          </button>
        ))}
      </div>

      <div className="admin-cal">
        <div className="card admin-cal__main">
          <MonthCalendar year={ym.year} month0={ym.month0} onMonthChange={(year, month0) => setYm({ year, month0 })} entries={entries} today={today} selected={selected} onSelect={setSelected} />
        </div>
        <aside className="card admin-cal__side">
          <div className="card__head">
            <div>
              <div className="overline">{selected === today ? 'TODAY' : 'SELECTED'}</div>
              <div className="title-md">{formatDateShort(selected)}</div>
              {HOLIDAYS[selected] && <span className="caption text-error">{HOLIDAYS[selected]}</span>}
            </div>
            <button className="btn btn--secondary btn--sm" onClick={() => newDraft('external')}>
              <Icon name="plus" size={14} /> 일정 추가
            </button>
          </div>
          {dayList.length === 0 ? (
            <p className="caption">등록된 일정이 없어요.</p>
          ) : (
            <ul className="day-list">
              {dayList.map((e) => {
                const b = e.bookingId ? bookings.find((x) => x.id === e.bookingId) : undefined;
                const body = (
                  <>
                    <span className="day-list__time numeral">{e.time ?? '종일'}</span>
                    <span className="grow stack">
                      <span className="row gap-8 wrap">
                        {b && <EventBadge type={b.eventType} short />}
                        <b className="text-ink">{e.title}</b>
                      </span>
                      <span className="caption">
                        {e.hallId ? hallName(e.hallId) : b ? '출장' : '전관'}
                        {e.discountRate ? ` · ${e.discountRate}% 할인` : ''}
                        {e.note ? ` · ${e.note}` : ''}
                      </span>
                    </span>
                    <StatusPill status={e.status} />
                  </>
                );
                return (
                  <li key={e.id}>
                    {b ? (
                      <Link to={`/admin/bookings/${b.id}`} className="day-list__item">
                        {body}
                      </Link>
                    ) : (
                      <button className="day-list__item" onClick={() => setDraft(toDraft(e))}>
                        {body}
                      </button>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </aside>
      </div>

      <Sheet
        open={!!draft}
        onClose={() => setDraft(null)}
        title={draft?.id ? '일정 수정' : '일정 추가'}
        footer={
          <div className="row gap-8">
            {draft?.id && (
              <button className="btn btn--danger" onClick={() => void remove(draft.id!)}>
                <Icon name="trash" size={16} /> 삭제
              </button>
            )}
            <button className="btn btn--primary grow" onClick={() => void saveDraft()}>
              저장
            </button>
          </div>
        }
      >
        {draft && (
          <div className="stack gap-16">
            <div className="row wrap gap-8">
              {(['external', 'blocked', 'promo'] as Kind[]).map((k) => (
                <button key={k} className="chip chip--sm" aria-pressed={draft.kind === k} onClick={() => setDraft({ ...draft, kind: k, status: k === 'external' ? 'confirmed' : k })}>
                  {{ external: '외부 예약', blocked: '휴무 · 마감', promo: '프로모션일' }[k]}
                </button>
              ))}
            </div>
            {draft.kind === 'external' && (
              <div className="row gap-8">
                {(['confirmed', 'pending'] as CalendarStatus[]).map((s) => (
                  <button key={s} className="chip chip--sm chip--gold-active" aria-pressed={draft.status === s} onClick={() => setDraft({ ...draft, status: s })}>
                    {s === 'confirmed' ? '계약 확정' : '예약 문의중'}
                  </button>
                ))}
              </div>
            )}
            <div className="form-grid form-grid--2">
              <label className="field">
                <span className="field__label">날짜</span>
                <input className="input" type="date" value={draft.date} onChange={(e) => setDraft({ ...draft, date: e.target.value })} />
              </label>
              <label className="field">
                <span className="field__label">시간대</span>
                <select className="select" value={draft.time} onChange={(e) => setDraft({ ...draft, time: e.target.value })}>
                  <option value="">종일</option>
                  {TIME_SLOTS.map((s) => (
                    <option key={s.id} value={s.time}>
                      {s.label} ({s.time})
                    </option>
                  ))}
                </select>
              </label>
              {draft.kind !== 'promo' && (
                <label className="field">
                  <span className="field__label">홀</span>
                  <select className="select" value={draft.hallId} onChange={(e) => setDraft({ ...draft, hallId: e.target.value as HallId | '' })}>
                    <option value="">전관 (모든 홀)</option>
                    {HALLS.map((h) => (
                      <option key={h.id} value={h.id}>
                        {h.name}
                      </option>
                    ))}
                  </select>
                </label>
              )}
              {draft.kind === 'promo' && (
                <label className="field">
                  <span className="field__label">할인율 (%)</span>
                  <input className="input" inputMode="numeric" value={draft.discountRate} onChange={(e) => setDraft({ ...draft, discountRate: Math.min(100, Number(e.target.value.replace(/\D/g, '')) || 0) })} />
                </label>
              )}
              <label className="field">
                <span className="field__label">제목 (고객 캘린더 표시)</span>
                <input className="input" value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} placeholder="예) 돌잔치, 기업행사" />
              </label>
            </div>
            <label className="field">
              <span className="field__label">메모</span>
              <input className="input" value={draft.note} onChange={(e) => setDraft({ ...draft, note: e.target.value })} placeholder="예) 전화 예약 · 담당 김지은" />
              <span className="field__hint">고객 캘린더 화면에는 표시되지 않지만, 공개 일정 데이터에 함께 저장되니 고객 연락처 등 개인정보는 적지 마세요.</span>
            </label>
          </div>
        )}
      </Sheet>
    </div>
  );
}
