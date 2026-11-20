// 사업부 — 내부 관리 화면은 모두 베뉴(파티하우스 홀 행사)와 케이터링(출장)으로 나눠 봅니다.
// 고객·메뉴 정보는 함께 쓰고, 고객 목록·대시보드·캘린더·가격표·메일 발송 예정은 사업부별로 따로 봅니다.
import { EVENT_TYPES } from './eventTypes';
import type { CalendarEntry, CatalogItem, EventType } from './types';

export type BusinessUnit = 'venue' | 'catering';

export interface UnitInfo {
  id: BusinessUnit;
  label: string;
  en: string;
  desc: string;
  eventTypes: EventType[];
}

export const BUSINESS_UNITS: UnitInfo[] = [
  {
    id: 'venue',
    label: '베뉴',
    en: 'VENUE',
    desc: '파티하우스 홀 행사 — 웨딩·돌잔치·생신연·기업 연회',
    eventTypes: ['wedding', 'dol', 'birthday', 'corporate'],
  },
  {
    id: 'catering',
    label: '케이터링',
    en: 'CATERING',
    desc: '출장 뷔페·케이터링 — 기업·기관·교회·야외 행사',
    eventTypes: ['catering'],
  },
];

export function unitInfo(id: BusinessUnit): UnitInfo {
  return BUSINESS_UNITS.find((u) => u.id === id)!;
}

export function unitOfType(t: EventType): BusinessUnit {
  return t === 'catering' ? 'catering' : 'venue';
}

export function unitOf(b: { eventType: EventType }): BusinessUnit {
  return unitOfType(b.eventType);
}

/** 가격표 항목이 어느 사업부 문의서에서 쓰이는지 (문의서 선택지의 catalogKey 로 찾습니다) */
let keyUnits: Map<string, Set<BusinessUnit>> | null = null;
function catalogKeyUnits(): Map<string, Set<BusinessUnit>> {
  if (keyUnits) return keyUnits;
  const map = new Map<string, Set<BusinessUnit>>();
  const walk = (node: unknown, unit: BusinessUnit) => {
    if (!node || typeof node !== 'object') return;
    if (Array.isArray(node)) return node.forEach((n) => walk(n, unit));
    const o = node as Record<string, unknown>;
    if (typeof o.catalogKey === 'string') {
      const s = map.get(o.catalogKey) ?? new Set<BusinessUnit>();
      s.add(unit);
      map.set(o.catalogKey, s);
    }
    Object.values(o).forEach((v) => walk(v, unit));
  };
  for (const [t, cfg] of Object.entries(EVENT_TYPES)) walk(cfg, unitOfType(t as EventType));
  keyUnits = map;
  return map;
}

/** 이 사업부 가격표에 보여 줄 항목인가 (두 사업부에서 함께 쓰는 항목은 양쪽에 나옵니다) */
export function itemInUnit(item: CatalogItem, unit: BusinessUnit): boolean {
  if (item.eventTypes?.length) return item.eventTypes.some((t) => unitOfType(t) === unit);
  if (item.category === '케이터링') return unit === 'catering';
  const used = catalogKeyUnits().get(item.key);
  return !used || used.has(unit);
}

/** 내부 캘린더 일정: 케이터링 행사는 케이터링, 홀 일정·프로모션·막아 둔 날은 베뉴 */
export function entryInUnit(e: CalendarEntry, unit: BusinessUnit): boolean {
  if (e.eventType) return unitOfType(e.eventType) === unit;
  return unit === 'venue';
}
