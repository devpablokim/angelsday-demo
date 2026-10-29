// 데모 저장소 — Firebase 없이 브라우저 localStorage 에서 전체 흐름이 동작합니다.
import { publicEntryFromBooking } from '@shared/calendar';
import { localBotReply } from '@shared/chatFaq';
import { DEFAULT_CATALOG } from '@shared/catalog';
import { dueEmails, EMAIL_RULES, enabledMap, renderEmail, withEmailLog } from '@shared/emailRules';
import * as ops from '@shared/ops';
import { calcQuote } from '@shared/quote';
import type { Booking, CalendarEntry, Catalog } from '@shared/types';
import { buildSeed } from './seed';
import { customerUrl, ENV, type AdminUser, type DataStore } from './store';

const KEY = 'angelsday.demo.v1';
const ADMIN_KEY = 'angelsday.demo.admin';

interface DemoState {
  bookings: Booking[];
  calendar: CalendarEntry[];
  catalog: Catalog;
  emailRules: Record<string, boolean>;
  seededAt: string;
}

type Listener = () => void;

function memoryStorage() {
  const m = new Map<string, string>();
  return { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => void m.set(k, v), removeItem: (k: string) => void m.delete(k) };
}

function safeStorage(kind: 'local' | 'session') {
  try {
    const s = kind === 'local' ? window.localStorage : window.sessionStorage;
    const probe = '__ad_probe__';
    s.setItem(probe, '1');
    s.removeItem(probe);
    return s;
  } catch {
    return memoryStorage();
  }
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const clone = <T,>(x: T): T => JSON.parse(JSON.stringify(x));

export function createDemoStore(): DataStore {
  const storage = safeStorage('local');
  const session = safeStorage('session');
  const listeners = new Set<Listener>();
  const adminListeners = new Set<(u: AdminUser | null) => void>();

  const baseUrl = () => customerUrl('').replace(/\/my\/$/, '').replace(/#\/my\/$/, '#');

  function fresh(): DemoState {
    const seed = buildSeed();
    return { bookings: seed.bookings, calendar: seed.calendar, catalog: clone(DEFAULT_CATALOG), emailRules: enabledMap(), seededAt: new Date().toISOString() };
  }

  function load(): DemoState {
    try {
      const raw = storage.getItem(KEY);
      if (raw) return JSON.parse(raw) as DemoState;
    } catch {
      /* 손상된 데이터는 새로 만듭니다 */
    }
    const s = fresh();
    storage.setItem(KEY, JSON.stringify(s));
    return s;
  }

  let state = load();

  const emit = () => listeners.forEach((l) => l());
  const persist = () => {
    try {
      storage.setItem(KEY, JSON.stringify(state));
    } catch {
      /* 저장 공간 부족 등 — 메모리 상태로 계속 동작 */
    }
    emit();
  };

  // 다른 탭(예: 관리자 ↔ 고객 페이지)에서 바뀐 내용을 반영
  if (typeof window !== 'undefined') {
    window.addEventListener('storage', (e) => {
      if (e.key === KEY && e.newValue) {
        state = JSON.parse(e.newValue) as DemoState;
        emit();
      }
    });
  }

  /** 행동 직후 보내는 이벤트 메일(문의 접수, 견적 발송, 결제 등)을 발송한 것으로 기록 */
  function dispatchEventEmails(b: Booking): Booking {
    let out = b;
    for (const p of dueEmails(b, state.emailRules, new Date(), true)) {
      out = withEmailLog(out, p, renderEmail(p.rule.id, out, baseUrl()).subject);
    }
    return out;
  }

  function put(b: Booking) {
    const next = dispatchEventEmails(b);
    const i = state.bookings.findIndex((x) => x.id === next.id);
    state = { ...state, bookings: i >= 0 ? state.bookings.map((x) => (x.id === next.id ? next : x)) : [...state.bookings, next] };
    persist();
  }

  function subscribe<T>(select: () => T, cb: (v: T) => void) {
    const l = () => cb(select());
    listeners.add(l);
    queueMicrotask(l);
    return () => void listeners.delete(l);
  }

  const publicCalendar = (): CalendarEntry[] => [
    ...state.bookings.map(publicEntryFromBooking).filter((e): e is CalendarEntry => !!e),
    ...state.calendar.map((e) => ({ ...e, note: undefined })),
  ];

  const currentAdmin = (): AdminUser | null => {
    const raw = session.getItem(ADMIN_KEY);
    return raw ? (JSON.parse(raw) as AdminUser) : null;
  };

  return {
    mode: 'demo',

    listenBooking: (id, cb) => subscribe(() => clone(state.bookings.find((b) => b.id === id) ?? null), cb),
    listenBookings: (cb) => subscribe(() => clone(state.bookings), cb),
    listenCalendar: (cb) => subscribe(publicCalendar, cb),
    listenAdminCalendar: (cb) => subscribe(() => clone(state.calendar), cb),
    listenCatalog: (cb) => subscribe(() => clone(state.catalog), cb),
    listenEmailRules: (cb) => subscribe(() => ({ ...state.emailRules }), cb),

    async createBooking(b) {
      await sleep(400);
      put(b);
    },
    async saveBooking(b) {
      put(b);
    },
    async saveCalendarEntry(e) {
      const i = state.calendar.findIndex((x) => x.id === e.id);
      state = { ...state, calendar: i >= 0 ? state.calendar.map((x) => (x.id === e.id ? e : x)) : [...state.calendar, e] };
      persist();
    },
    async deleteCalendarEntry(id) {
      state = { ...state, calendar: state.calendar.filter((x) => x.id !== id) };
      persist();
    },
    async saveCatalog(c) {
      state = { ...state, catalog: { ...c, updatedAt: new Date().toISOString() } };
      persist();
    },
    async saveEmailRules(enabled) {
      state = { ...state, emailRules: { ...enabled } };
      persist();
    },

    async payDeposit(bookingId, method) {
      await sleep(1400); // 결제 승인 대기 연출
      const b = state.bookings.find((x) => x.id === bookingId);
      if (!b?.quote) throw new Error('견적서를 찾을 수 없어요.');
      if (b.payments.some((p) => p.kind === 'deposit')) return;
      put(ops.addPayment(b, 'deposit', calcQuote(b.quote).deposit, method));
    },

    async chat(bookingId, history) {
      await sleep(650);
      const b = bookingId ? state.bookings.find((x) => x.id === bookingId) : undefined;
      const last = [...history].reverse().find((h) => h.role === 'user');
      return localBotReply(last?.content ?? '', { booking: b }).text;
    },

    async sendEmailNow(bookingId, ruleId) {
      const b = state.bookings.find((x) => x.id === bookingId);
      const rule = EMAIL_RULES.find((r) => r.id === ruleId);
      if (!b || !rule) return;
      const content = renderEmail(ruleId, b, baseUrl());
      const next = withEmailLog(b, { rule, status: 'due', scheduledFor: new Date().toISOString() }, content.subject);
      const i = state.bookings.findIndex((x) => x.id === bookingId);
      state = { ...state, bookings: state.bookings.map((x, j) => (j === i ? ops.log(next, 'admin', 'email', `메일 수동 발송: ${content.subject}`, true) : x)) };
      persist();
    },

    async runEmailScheduler() {
      let count = 0;
      const now = new Date();
      state = {
        ...state,
        bookings: state.bookings.map((b) => {
          let out = b;
          for (const p of dueEmails(b, state.emailRules, now)) {
            out = withEmailLog(out, p, renderEmail(p.rule.id, out, baseUrl()).subject);
            count++;
          }
          return out;
        }),
      };
      persist();
      return count;
    },

    async uploadPhoto(_bookingId, file) {
      // 데모: 작은 미리보기 이미지로 변환해 localStorage 에 보관
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const img = new Image();
        const url = URL.createObjectURL(file);
        img.onload = () => {
          const scale = Math.min(1, 900 / Math.max(img.width, img.height));
          const c = document.createElement('canvas');
          c.width = Math.round(img.width * scale);
          c.height = Math.round(img.height * scale);
          c.getContext('2d')!.drawImage(img, 0, 0, c.width, c.height);
          URL.revokeObjectURL(url);
          resolve(c.toDataURL('image/jpeg', 0.78));
        };
        img.onerror = reject;
        img.src = url;
      });
      return dataUrl;
    },

    onAdminChange(cb) {
      adminListeners.add(cb);
      queueMicrotask(() => cb(currentAdmin()));
      return () => void adminListeners.delete(cb);
    },
    async adminSignIn(email, password) {
      await sleep(300);
      if (password !== ENV.adminPasscode) throw new Error('비밀번호가 올바르지 않아요.');
      const u: AdminUser = { email: email || 'admin@angelsday.kr', name: '엔젤스데이 운영자' };
      session.setItem(ADMIN_KEY, JSON.stringify(u));
      adminListeners.forEach((l) => l(u));
    },
    async adminSignOut() {
      session.removeItem(ADMIN_KEY);
      adminListeners.forEach((l) => l(null));
    },

    resetDemo() {
      state = fresh();
      persist();
    },
  };
}
