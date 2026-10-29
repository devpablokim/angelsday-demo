import type { ISODate } from './types';

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'];

/** 한국 시간(Asia/Seoul) 기준 오늘 날짜 */
export function todayKST(now: Date = new Date()): ISODate {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Seoul',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now);
  return parts; // en-CA → YYYY-MM-DD
}

export function parseDate(d: ISODate): Date {
  const [y, m, day] = d.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, day));
}

export function toISODate(d: Date): ISODate {
  return d.toISOString().slice(0, 10);
}

export function addDays(d: ISODate, n: number): ISODate {
  const t = parseDate(d);
  t.setUTCDate(t.getUTCDate() + n);
  return toISODate(t);
}

export function diffDays(from: ISODate, to: ISODate): number {
  return Math.round((parseDate(to).getTime() - parseDate(from).getTime()) / 86400000);
}

export function weekday(d: ISODate): number {
  return parseDate(d).getUTCDay();
}

export function weekdayLabel(d: ISODate): string {
  return WEEKDAYS[weekday(d)];
}

export function isWeekend(d: ISODate): boolean {
  const w = weekday(d);
  return w === 0 || w === 6;
}

/** 'D-86', 'D-DAY', 'D+3' */
export function ddayLabel(eventDate: ISODate, today: ISODate = todayKST()): string {
  const n = diffDays(today, eventDate);
  if (n === 0) return 'D-DAY';
  return n > 0 ? `D-${n}` : `D+${-n}`;
}

/** 2027.01.23 (토) */
export function formatDate(d: ISODate, opts: { weekday?: boolean } = { weekday: true }): string {
  const [y, m, day] = d.split('-');
  return `${y}.${m}.${day}${opts.weekday ? ` (${weekdayLabel(d)})` : ''}`;
}

/** 1월 23일 (토) */
export function formatDateShort(d: ISODate): string {
  const [, m, day] = d.split('-').map(Number);
  return `${m}월 ${day}일 (${weekdayLabel(d)})`;
}

export function formatDateTime(iso: string): string {
  const d = new Date(iso);
  const f = new Intl.DateTimeFormat('ko-KR', {
    timeZone: 'Asia/Seoul',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(d);
  const get = (t: string) => f.find((p) => p.type === t)?.value ?? '';
  return `${get('month')}.${get('day')} ${get('hour')}:${get('minute')}`;
}

/** ISO 날짜 + 시(KST) → ISO datetime */
export function kstDateTime(d: ISODate, hour = 10, minute = 0): string {
  const t = parseDate(d);
  t.setUTCHours(hour - 9, minute, 0, 0);
  return t.toISOString();
}

export function monthMatrix(year: number, month0: number): ISODate[][] {
  // month0: 0-11, 일요일 시작 6주 이하 매트릭스
  const first = new Date(Date.UTC(year, month0, 1));
  const start = new Date(first);
  start.setUTCDate(1 - first.getUTCDay());
  const weeks: ISODate[][] = [];
  const cur = new Date(start);
  for (let w = 0; w < 6; w++) {
    const row: ISODate[] = [];
    for (let i = 0; i < 7; i++) {
      row.push(toISODate(cur));
      cur.setUTCDate(cur.getUTCDate() + 1);
    }
    weeks.push(row);
    if (cur.getUTCMonth() !== month0 && w >= 3) break;
  }
  return weeks;
}

export function won(n: number): string {
  return `${Math.round(n).toLocaleString('ko-KR')}원`;
}

/** 1,234만원 / 9,800원 처럼 큰 금액을 짧게 */
export function wonShort(n: number): string {
  if (Math.abs(n) >= 100000000) return `${(n / 100000000).toFixed(1).replace(/\.0$/, '')}억원`;
  if (Math.abs(n) >= 10000) return `${Math.round(n / 10000).toLocaleString('ko-KR')}만원`;
  return won(n);
}
