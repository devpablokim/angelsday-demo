import { itemByKey } from './catalog';
import { addDays, isWeekend, todayKST } from './dates';
import { allFields, isFieldVisible } from './eventTypes';
import { uid } from './ids';
import type { Booking, Catalog, CatalogItem, Quote, QuoteLine } from './types';
import { hallName } from './venue';

export interface QuoteTotals {
  subtotal: number;
  discountAmount: number;
  total: number;
  deposit: number;
  balance: number;
}

export function guestCounts(b: Booking): { adults: number; kids: number; all: number } {
  const adults = Number(b.requirements.guestsAdult ?? b.guests) || 0;
  const kids = Number(b.requirements.guestsKids ?? 0) || 0;
  return { adults, kids, all: adults + kids };
}

function qtyFor(item: CatalogItem, counts: { adults: number; all: number }, explicit?: number): number {
  if (explicit !== undefined) return explicit;
  if (item.peoplePerUnit) {
    const base = item.basis === 'adults' ? counts.adults : counts.all;
    return Math.max(1, Math.ceil(base / item.peoplePerUnit));
  }
  return 1;
}

function lineFrom(item: CatalogItem, qty: number): QuoteLine {
  return { id: uid('ql'), category: item.category, label: item.label, unitPrice: item.price, qty, unit: item.unit, catalogKey: item.key };
}

/** 고객이 작성한 필요사항으로 견적 항목을 자동 구성합니다. */
export function buildQuoteLines(b: Booking, catalog: Catalog): QuoteLine[] {
  const lines: QuoteLine[] = [];
  const seen = new Set<string>();
  const counts = guestCounts(b);
  const add = (key: string, explicitQty?: number) => {
    if (seen.has(key)) return;
    const item = itemByKey(catalog, key);
    if (!item) return;
    const qty = qtyFor(item, counts, explicitQty);
    if (qty <= 0) return;
    seen.add(key);
    lines.push(lineFrom(item, qty));
  };

  const hallId = (b.requirements.hallId as Booking['hallId']) ?? b.hallId;
  if (b.eventType !== 'catering' && hallId) {
    const rent = catalog.hallRental[hallId] ?? 0;
    lines.push({ id: uid('ql'), category: '대관', label: `${hallName(hallId)} 대관`, unitPrice: rent, qty: 1, unit: '식', catalogKey: `hall_${hallId}` });
  }

  for (const f of allFields(b.eventType)) {
    if (!isFieldVisible(f, b.requirements)) continue;
    const v = b.requirements[f.key];
    if (v === undefined || v === '' || v === false) continue;
    if ((f.kind === 'radio' || f.kind === 'select') && f.options) {
      const opt = f.options.find((o) => o.value === v);
      if (opt?.catalogKey) add(opt.catalogKey);
      if (f.key === 'menuTier' && counts.kids > 0) add('food_kids', counts.kids);
    } else if (f.kind === 'multi' && Array.isArray(v) && f.options) {
      for (const val of v) {
        const opt = f.options.find((o) => o.value === val);
        if (opt?.catalogKey) add(opt.catalogKey);
      }
    } else if (f.kind === 'toggle' && v === true && f.catalogKey) {
      add(f.catalogKey);
    } else if (f.kind === 'counter' && f.catalogKey && Number(v) > 0) {
      add(f.catalogKey, Number(v));
    }
  }

  if (b.eventType === 'catering') add('cat_delivery');
  return lines;
}

/** 날짜/프로모션 기준 추천 할인 */
export function suggestDiscount(b: Booking, catalog: Catalog, promoRate?: number): { rate: number; label: string } {
  if (promoRate) return { rate: promoRate, label: `프로모션일 특가 ${promoRate}%` };
  const month = Number(b.date.slice(5, 7));
  if (b.eventType !== 'catering' && !isWeekend(b.date)) {
    const p = catalog.discountPresets.find((d) => d.id === 'weekday');
    if (p) return { rate: p.rate, label: p.label };
  }
  if ([1, 2, 7, 8].includes(month)) {
    const p = catalog.discountPresets.find((d) => d.id === 'offseason');
    if (p) return { rate: p.rate, label: p.label };
  }
  return { rate: 0, label: '' };
}

export function draftQuote(b: Booking, catalog: Catalog, promoRate?: number, today = todayKST()): Quote {
  const d = suggestDiscount(b, catalog, promoRate);
  return {
    version: (b.quote?.version ?? 0) + 1,
    lines: buildQuoteLines(b, catalog),
    discountRate: d.rate,
    discountLabel: d.label,
    extraDiscount: 0,
    depositRate: catalog.defaultDepositRate,
    validUntil: addDays(today, catalog.quoteValidDays),
    status: 'draft',
    updatedAt: new Date().toISOString(),
  };
}

export function lineAmount(l: QuoteLine): number {
  return Math.round(l.unitPrice * l.qty);
}

export function calcQuote(q: Pick<Quote, 'lines' | 'discountRate' | 'extraDiscount' | 'depositRate'>): QuoteTotals {
  const subtotal = q.lines.reduce((s, l) => s + lineAmount(l), 0);
  const rateDiscount = Math.round((subtotal * (q.discountRate || 0)) / 100 / 1000) * 1000;
  const discountAmount = Math.min(subtotal, rateDiscount + (q.extraDiscount || 0));
  const total = subtotal - discountAmount;
  const deposit = Math.min(total, Math.ceil((total * (q.depositRate || 0)) / 100 / 10000) * 10000);
  return { subtotal, discountAmount, total, deposit, balance: total - deposit };
}

/** 견적서가 있으면 견적 총액, 없으면 필요사항(또는 문의 내용) 기반 추정 매출 */
export function expectedRevenue(b: Booking, catalog: Catalog): { amount: number; source: 'quote' | 'estimate' } {
  if (b.quote && b.quote.lines.length) return { amount: calcQuote(b.quote).total, source: 'quote' };
  const est = { ...b, requirements: { menuTier: 'premium', drinks: 'soft', ...b.requirements, guestsAdult: b.requirements.guestsAdult ?? b.guests } } as Booking;
  if (b.eventType === 'catering' && !est.requirements.serviceType) est.requirements.serviceType = 'full';
  const lines = buildQuoteLines(est, catalog);
  return { amount: lines.reduce((s, l) => s + lineAmount(l), 0), source: 'estimate' };
}

export function paidAmount(b: Booking, kind?: 'deposit' | 'balance'): number {
  return b.payments.filter((p) => !kind || p.kind === kind).reduce((s, p) => s + p.amount, 0);
}

export function groupLines(lines: QuoteLine[]): { category: string; lines: QuoteLine[]; sum: number }[] {
  const order: string[] = [];
  const map = new Map<string, QuoteLine[]>();
  for (const l of lines) {
    if (!map.has(l.category)) {
      map.set(l.category, []);
      order.push(l.category);
    }
    map.get(l.category)!.push(l);
  }
  return order.map((c) => ({ category: c, lines: map.get(c)!, sum: map.get(c)!.reduce((s, l) => s + lineAmount(l), 0) }));
}
