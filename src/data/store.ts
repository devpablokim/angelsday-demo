import type { Booking, CalendarEntry, Catalog, PaymentMethod } from '@shared/types';

export type Unsubscribe = () => void;

export interface ChatTurn {
  role: 'user' | 'assistant';
  content: string;
}

export interface AdminUser {
  email: string;
  name: string;
}

/**
 * 화면은 이 인터페이스만 사용합니다.
 * - demoStore: 브라우저 localStorage 에 저장 (Firebase 없이 바로 체험)
 * - firebaseStore: Firestore · Auth · Cloud Functions
 */
export interface DataStore {
  mode: 'demo' | 'firebase';

  // 구독 (실시간)
  listenBooking(id: string, cb: (b: Booking | null) => void): Unsubscribe;
  listenBookings(cb: (list: Booking[]) => void): Unsubscribe; // 관리자 전용
  listenCalendar(cb: (entries: CalendarEntry[]) => void): Unsubscribe; // 공개 일정 (개인정보 없음)
  listenAdminCalendar(cb: (entries: CalendarEntry[]) => void): Unsubscribe; // 관리자 수동 일정 (프로모션·외부 예약·휴무)
  listenCatalog(cb: (c: Catalog) => void): Unsubscribe;
  listenEmailRules(cb: (enabled: Record<string, boolean>) => void): Unsubscribe;

  /** 예약 비밀번호 → 예약 ID (없으면 null) */
  findBookingByCode(code: string): Promise<string | null>;

  // 쓰기
  createBooking(b: Booking): Promise<void>;
  saveBooking(b: Booking): Promise<void>;
  saveCalendarEntry(e: CalendarEntry): Promise<void>;
  deleteCalendarEntry(id: string): Promise<void>;
  saveCatalog(c: Catalog): Promise<void>;
  saveEmailRules(enabled: Record<string, boolean>): Promise<void>;

  // 서버 동작
  payDeposit(bookingId: string, method: PaymentMethod): Promise<void>;
  chat(bookingId: string | undefined, history: ChatTurn[]): Promise<string>;
  sendEmailNow(bookingId: string, ruleId: string): Promise<void>;
  runEmailScheduler(): Promise<number>;
  uploadPhoto(bookingId: string, file: File): Promise<string>;

  // 관리자 인증
  onAdminChange(cb: (u: AdminUser | null) => void): Unsubscribe;
  adminSignIn(email: string, password: string): Promise<void>;
  adminSignOut(): Promise<void>;

  resetDemo?(): void;
}

export const ENV = {
  mode: (import.meta.env.VITE_DATA_MODE as 'demo' | 'firebase' | undefined) ?? 'demo',
  adminPasscode: (import.meta.env.VITE_ADMIN_DEMO_PASSCODE as string | undefined) ?? 'angels2026',
  kakaoUrl: (import.meta.env.VITE_KAKAO_CHANNEL_URL as string | undefined) ?? 'https://pf.kakao.com/',
  publicBaseUrl: (import.meta.env.VITE_PUBLIC_BASE_URL as string | undefined) || (typeof location !== 'undefined' ? location.origin : ''),
  hashRouter: import.meta.env.MODE === 'preview',
  designSystemUrl: (import.meta.env.VITE_DESIGN_SYSTEM_URL as string | undefined) || undefined,
};

/** 고객 관리 페이지 절대 URL */
export function customerUrl(id: string): string {
  if (ENV.hashRouter) return `${location.origin}${location.pathname}#/my/${id}`;
  return `${ENV.publicBaseUrl.replace(/\/$/, '')}/my/${id}`;
}
