import { monthMatrix, weekday } from '@shared/dates';
import type { CalendarEntry, ISODate } from '@shared/types';
import { HOLIDAYS, hallShort } from '@shared/venue';
import { Icon } from './Icon';

const WEEK = ['일', '월', '화', '수', '목', '금', '토'];

interface Props {
  year: number;
  month0: number;
  onMonthChange: (year: number, month0: number) => void;
  entries: CalendarEntry[];
  today: ISODate;
  selected?: ISODate;
  onSelect?: (d: ISODate) => void;
  /** 오늘 이전 날짜 선택 불가 */
  disablePast?: boolean;
  minMonth?: { year: number; month0: number };
}

const ORDER: Record<CalendarEntry['status'], number> = { blocked: 0, confirmed: 1, pending: 2, promo: 3 };

export function MonthCalendar({ year, month0, onMonthChange, entries, today, selected, onSelect, disablePast, minMonth }: Props) {
  const weeks = monthMatrix(year, month0);
  const byDate = new Map<string, CalendarEntry[]>();
  for (const e of entries) {
    if (!byDate.has(e.date)) byDate.set(e.date, []);
    byDate.get(e.date)!.push(e);
  }
  const prev = () => (month0 === 0 ? onMonthChange(year - 1, 11) : onMonthChange(year, month0 - 1));
  const next = () => (month0 === 11 ? onMonthChange(year + 1, 0) : onMonthChange(year, month0 + 1));
  const atMin = minMonth && (year < minMonth.year || (year === minMonth.year && month0 <= minMonth.month0));

  return (
    <div className="mcal">
      <div className="mcal__nav">
        <button className="mcal__arrow" onClick={prev} disabled={atMin} aria-label="이전 달">
          <Icon name="chevronLeft" />
        </button>
        <h2 className="mcal__title">
          <span className="numeral">{year}</span>년 <span className="numeral">{month0 + 1}</span>월
        </h2>
        <button className="mcal__arrow" onClick={next} aria-label="다음 달">
          <Icon name="chevronRight" />
        </button>
      </div>
      <div className="mcal__grid" role="grid">
        {WEEK.map((w, i) => (
          <div key={w} className={`mcal__dow ${i === 0 ? 'is-sun' : i === 6 ? 'is-sat' : ''}`} role="columnheader">
            {w}
          </div>
        ))}
        {weeks.flat().map((d) => {
          const inMonth = Number(d.slice(5, 7)) === month0 + 1;
          const past = d < today;
          const holiday = HOLIDAYS[d];
          const dow = weekday(d);
          const list = (byDate.get(d) ?? []).slice().sort((a, b) => ORDER[a.status] - ORDER[b.status] || (a.time ?? '').localeCompare(b.time ?? ''));
          const promo = list.find((e) => e.status === 'promo');
          const events = list.filter((e) => e.status !== 'promo');
          const blocked = events.some((e) => e.status === 'blocked' && !e.hallId);
          const disabled = !inMonth || (disablePast && past);
          const cls = [
            'mcal__cell',
            !inMonth && 'is-out',
            past && 'is-past',
            d === today && 'is-today',
            d === selected && 'is-selected',
            (dow === 0 || holiday) && 'is-sun',
            dow === 6 && !holiday && 'is-sat',
            promo && 'has-promo',
            blocked && 'is-blocked',
          ]
            .filter(Boolean)
            .join(' ');
          return (
            <button key={d} className={cls} role="gridcell" disabled={disabled} aria-selected={d === selected} onClick={() => onSelect?.(d)} aria-label={`${d}${holiday ? ` ${holiday}` : ''} 일정 ${events.length}건`}>
              <span className="mcal__date">
                <span className="mcal__num">{Number(d.slice(8))}</span>
                {holiday && inMonth && <span className="mcal__holiday">{holiday}</span>}
              </span>
              {inMonth && promo && <span className="mcal__promo">{promo.discountRate ? `${promo.discountRate}%` : '특가'}</span>}
              {inMonth && (
                <>
                  <span className="mcal__dots" aria-hidden="true">
                    {events.slice(0, 4).map((e) => (
                      <i key={e.id} className={`dot dot--${e.status}`} />
                    ))}
                  </span>
                  <span className="mcal__events">
                    {events.slice(0, 3).map((e) => (
                      <span key={e.id} className={`mcal__event mcal__event--${e.status}`}>
                        {e.time && <span className="mcal__time">{e.time}</span>}
                        <span className="mcal__etitle">{e.title}</span>
                        <span className="mcal__emeta">
                          {e.hallId && <b>{hallShort(e.hallId)}</b>}
                          {e.status === 'pending' ? '예약 문의중' : e.status === 'blocked' ? '마감' : '계약 확정'}
                        </span>
                      </span>
                    ))}
                    {events.length > 3 && <span className="mcal__more">+{events.length - 3}건</span>}
                  </span>
                </>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function CalendarLegend() {
  return (
    <div className="row wrap gap-8">
      <span className="status-pill status-pill--confirmed">계약 확정</span>
      <span className="status-pill status-pill--pending">예약 문의중</span>
      <span className="status-pill status-pill--promo">프로모션일</span>
      <span className="caption">표시가 없는 날짜는 문의 시 가능 여부를 안내드립니다</span>
    </div>
  );
}
