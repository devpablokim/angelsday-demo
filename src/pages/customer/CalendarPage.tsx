import { dayAvailability, hallsBlockedBy, promoOf } from '@shared/calendar';
import { addDays, formatDateShort, todayKST } from '@shared/dates';
import type { CalendarEntry, EventType, HallId, ISODate } from '@shared/types';
import { HALLS, hallById, hallShort, HOLIDAYS, ROOM_HALLS } from '@shared/venue';
import { useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router';
import { Icon } from '../../components/Icon';
import { CalendarLegend, MonthCalendar } from '../../components/MonthCalendar';
import { StatusPill } from '../../components/ui';
import { useCalendar, useToday } from '../../data/hooks';
import { CtaBand } from './HomePage';

type HallFilter = 'all' | HallId;

export function CalendarPage() {
  const today = useToday();
  const entries = useCalendar();
  const [params, setParams] = useSearchParams();
  const type = (params.get('type') as EventType | null) ?? undefined;
  const [hall, setHall] = useState<HallFilter>((params.get('hall') as HallFilter) || 'all');
  const [view, setView] = useState<'month' | 'list'>('month');
  const [selected, setSelected] = useState<ISODate | undefined>(params.get('date') ?? undefined);
  const [ym, setYm] = useState(() => {
    const d = params.get('date') ?? todayKST();
    return { year: Number(d.slice(0, 4)), month0: Number(d.slice(5, 7)) - 1 };
  });

  const visible = useMemo(
    () => entries.filter((e) => e.status === 'promo' || hall === 'all' || (e.status === 'blocked' && !e.hallId) || hallsBlockedBy(e).includes(hall)),
    [entries, hall],
  );

  const select = (d: ISODate) => {
    setSelected(d);
    const p = new URLSearchParams(params);
    p.set('date', d);
    setParams(p, { replace: true });
    requestAnimationFrame(() => document.getElementById('day-panel')?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
  };

  return (
    <>
      <section className="page-head">
        <div className="container">
          <Link to="/" className="back-link">
            <Icon name="arrowLeft" size={16} /> 엔젤스데이 홈
          </Link>
          <span className="overline mt-24" style={{ display: 'block' }}>
            SCHEDULE
          </span>
          <h1 className="display-lg mt-8">대관 가능일 확인</h1>
          <p className="body-md text-muted mt-12">
            러블리 · 알로하 · 벨리타 · 시아룸의 예약 현황입니다.
            <br className="hide-mobile" /> 날짜를 누르면 홀별 가능한 시간을 확인하고 바로 문의할 수 있어요.
          </p>
        </div>
      </section>

      <section className="section section--soft cal-section">
        <div className="container">
          <div className="cal-toolbar">
            <div className="chip-row" role="tablist" aria-label="홀 선택">
              <button className="chip" aria-pressed={hall === 'all'} onClick={() => setHall('all')}>
                전체 홀
              </button>
              {ROOM_HALLS.map((h) => (
                <button key={h} className="chip" aria-pressed={hall === h} onClick={() => setHall(h)}>
                  {hallById(h)!.name}
                </button>
              ))}
            </div>
            <div className="row gap-8 cal-toolbar__view">
              <button className="chip chip--sm" aria-pressed={view === 'month'} onClick={() => setView('month')}>
                <Icon name="grid" size={15} /> 달력
              </button>
              <button className="chip chip--sm" aria-pressed={view === 'list'} onClick={() => setView('list')}>
                <Icon name="list" size={15} /> 목록
              </button>
            </div>
          </div>
          <div className="mt-16">
            <CalendarLegend />
          </div>

          {view === 'month' ? (
            <div className="mt-24">
              <MonthCalendar
                year={ym.year}
                month0={ym.month0}
                onMonthChange={(year, month0) => setYm({ year, month0 })}
                entries={visible}
                today={today}
                selected={selected}
                onSelect={select}
                disablePast
                minMonth={{ year: Number(today.slice(0, 4)), month0: Number(today.slice(5, 7)) - 1 }}
              />
              <p className="caption mt-12 hide-desktop">날짜를 누르면 아래에서 홀별 가능한 시간을 볼 수 있어요.</p>
            </div>
          ) : (
            <UpcomingList entries={visible} today={today} onPick={select} />
          )}

          <div id="day-panel">{selected && <DayPanel date={selected} entries={entries} hall={hall} type={type} />}</div>
        </div>
      </section>
      <CtaBand />
    </>
  );
}

function DayPanel({ date, entries, hall, type }: { date: ISODate; entries: CalendarEntry[]; hall: HallFilter; type?: EventType }) {
  const halls: HallId[] = hall === 'all' ? [...ROOM_HALLS] : [hall];
  const slots = dayAvailability(date, entries, halls);
  const promo = promoOf(date, entries);
  const holiday = HOLIDAYS[date];
  const free = slots.filter((s) => !s.taken).length;
  const inquiryUrl = (h?: HallId, time?: string) => {
    const p = new URLSearchParams({ date });
    if (h) p.set('hall', h);
    if (time) p.set('time', time);
    if (type) p.set('type', type);
    return `/inquiry?${p.toString()}`;
  };
  return (
    <div className="card day-panel mt-24">
      <div className="day-panel__head">
        <div>
          <span className="overline">SELECTED DATE</span>
          <h2 className="display-md mt-8">{formatDateShort(date)}</h2>
          <div className="row wrap gap-8 mt-8">
            {holiday && <span className="badge badge--error">{holiday}</span>}
            {promo && <span className="status-pill status-pill--promo">{promo.title} {promo.discountRate ? `${promo.discountRate}% 할인` : ''}</span>}
            <span className="caption">{free > 0 ? `예약 가능한 시간 ${free}개` : '모든 시간이 마감되었어요'}</span>
          </div>
        </div>
        <Link to={inquiryUrl(hall === 'all' ? undefined : hall)} className="btn btn--primary hide-mobile">
          이 날짜로 문의하기
        </Link>
      </div>
      <div className="slot-table">
        {halls.map((h) => {
          const info = HALLS.find((x) => x.id === h)!;
          return (
            <div key={h} className="slot-row">
              <div className="slot-row__hall">
                <span className="title-sm">{info.name}</span>
                <span className="caption">
                  보증 {info.guaranteed} · 좌석 {info.seats}
                </span>
              </div>
              <div className="slot-row__slots">
                {slots
                  .filter((s) => s.hallId === h)
                  .map((s) =>
                    s.taken ? (
                      <div key={s.slotId} className={`slot slot--taken slot--${s.taken.status}`}>
                        <span className="slot__time">{s.time}</span>
                        <span className="slot__label">{s.taken.status === 'pending' ? '예약 문의중' : s.taken.status === 'blocked' ? '마감' : '계약 확정'}</span>
                      </div>
                    ) : (
                      <Link key={s.slotId} to={inquiryUrl(h, s.time)} className="slot slot--free">
                        <span className="slot__time">{s.time}</span>
                        <span className="slot__label">
                          {s.label}
                          <span className="hide-mobile"> · 문의</span> <Icon name="arrowRight" size={13} />
                        </span>
                      </Link>
                    ),
                  )}
              </div>
            </div>
          );
        })}
      </div>
      <div className="row wrap gap-8 mt-16">
        <Link to={inquiryUrl(hall === 'all' ? undefined : hall)} className="btn btn--primary btn--block hide-desktop">
          이 날짜로 문의하기
        </Link>
        <p className="caption">200명 이상은 전관 단독 이용으로 문의해 주세요. 표시가 없는 시간도 상황에 따라 조율할 수 있어요.</p>
      </div>
    </div>
  );
}

function UpcomingList({ entries, today, onPick }: { entries: CalendarEntry[]; today: ISODate; onPick: (d: ISODate) => void }) {
  const until = addDays(today, 90);
  const upcoming = entries.filter((e) => e.date >= today && e.date <= until).sort((a, b) => a.date.localeCompare(b.date) || (a.time ?? '').localeCompare(b.time ?? ''));
  const groups = new Map<string, CalendarEntry[]>();
  for (const e of upcoming) {
    if (!groups.has(e.date)) groups.set(e.date, []);
    groups.get(e.date)!.push(e);
  }
  if (!groups.size) return <p className="empty">앞으로 90일 동안 등록된 일정이 없어요. 원하시는 날짜로 편하게 문의해 주세요.</p>;
  return (
    <div className="upcoming mt-24">
      {[...groups.entries()].map(([d, list]) => (
        <button key={d} className="upcoming__day" onClick={() => onPick(d)}>
          <span className="upcoming__date">
            <span className="numeral">{d.slice(8)}</span>
            <span className="caption">{formatDateShort(d).replace(/^\d+월 \d+일 /, '')}</span>
          </span>
          <span className="upcoming__items">
            <span className="caption">{formatDateShort(d)}</span>
            {list.map((e) => (
              <span key={e.id} className="row gap-8 wrap">
                <StatusPill status={e.status} />
                <span className="body-sm text-ink">
                  {e.time && <b>{e.time} </b>}
                  {e.title}
                  {e.hallId && <span className="caption"> · {hallShort(e.hallId)}</span>}
                  {e.status === 'promo' && e.discountRate ? ` ${e.discountRate}%` : ''}
                </span>
              </span>
            ))}
          </span>
          <Icon name="chevronRight" size={18} />
        </button>
      ))}
    </div>
  );
}
