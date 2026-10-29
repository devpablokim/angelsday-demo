// 엔젤스데이 도메인 모델 — 웹(Vite)과 Cloud Functions 가 함께 사용합니다.

export type EventType = 'wedding' | 'dol' | 'birthday' | 'corporate' | 'catering';
export type HallId = 'lovely' | 'aloha' | 'bellita' | 'sia' | 'whole';
export type StepNo = 1 | 2 | 3 | 4 | 5 | 6;
export type ISODate = string; // 'YYYY-MM-DD'
export type ISODateTime = string; // new Date().toISOString()

export interface Customer {
  name: string;
  phone: string;
  email: string;
}

/** 헤드라인(“OOO님과 OOO님의 행복한 웨딩까지”)에 쓰이는 주인공 정보 */
export interface Honorees {
  primary: string; // 신랑 / 아기 / 주인공 / 회사 / 단체
  secondary?: string; // 신부
  detail?: string; // 칠순·첫돌·송년회 등 행사명
}

export type FieldValue = string | number | boolean | string[];
export type Requirements = Record<string, FieldValue>;

export interface QuoteLine {
  id: string;
  category: string;
  label: string;
  unitPrice: number;
  qty: number;
  unit: string;
  note?: string;
  catalogKey?: string;
}

export interface Quote {
  version: number;
  lines: QuoteLine[];
  discountRate: number; // %
  discountLabel?: string;
  extraDiscount: number; // 원 단위 추가 할인
  depositRate: number; // %
  validUntil: ISODate;
  memo?: string;
  status: 'draft' | 'sent' | 'accepted';
  sentAt?: ISODateTime;
  acceptedAt?: ISODateTime;
  updatedAt: ISODateTime;
}

export type PaymentMethod = 'card' | 'transfer' | 'kakaopay' | 'onsite';

export interface Payment {
  id: string;
  kind: 'deposit' | 'balance';
  amount: number;
  method: PaymentMethod;
  paidAt: ISODateTime;
  receiptNo: string;
  memo?: string;
}

export type TaskStatus = 'todo' | 'doing' | 'done';

/** 엔젤스데이가 행사 전까지 준비하는 항목 */
export interface PrepTask {
  id: string;
  title: string;
  owner: string; // 담당 (플래너, 주방, 플라워 …)
  dueDate: ISODate;
  status: TaskStatus;
  note?: string;
  visibleToCustomer: boolean;
  updatedAt?: ISODateTime;
}

/** 고객이 준비해야 하는 체크리스트 */
export interface ChecklistItem {
  id: string;
  title: string;
  description?: string;
  dueDate: ISODate;
  done: boolean;
  doneAt?: ISODateTime;
  addedBy: 'template' | 'admin' | 'customer';
}

export type Actor = 'customer' | 'admin' | 'system';

export interface TimelineEntry {
  id: string;
  at: ISODateTime;
  actor: Actor;
  type: string;
  message: string;
  internal?: boolean; // true 면 관리자에게만 표시
}

export interface AdjustRequest {
  id: string;
  at: ISODateTime;
  message: string;
  status: 'open' | 'resolved';
  reply?: string;
  repliedAt?: ISODateTime;
}

export interface EmailLog {
  id: string;
  ruleId: string;
  subject: string;
  to: string;
  scheduledFor: ISODateTime;
  sentAt: ISODateTime;
  status: 'sent' | 'failed';
}

export interface Photo {
  id: string;
  url: string;
  caption?: string;
}

export interface ScheduleItem {
  time: string;
  title: string;
}

export interface Booking {
  id: string; // 고객 관리 URL 토큰을 겸합니다 (추측 불가능한 난수)
  eventType: EventType;
  date: ISODate;
  time: string; // 'HH:mm'
  hallId?: HallId; // 출장 케이터링은 없음
  location?: string; // 출장 케이터링 행사 장소
  guests: number;
  customer: Customer;
  honorees: Honorees;
  inquiryMemo?: string;
  source: 'web' | 'phone' | 'kakao' | 'walkin';

  requirements: Requirements;
  requirementsSubmittedAt?: ISODateTime;

  quote?: Quote;
  adjustRequests: AdjustRequest[];
  payments: Payment[];

  prepStartedAt?: ISODateTime;
  prepTasks: PrepTask[];
  checklist: ChecklistItem[];
  daySchedule: ScheduleItem[];

  photos: Photo[];
  photoAlbumUrl?: string;
  photosReleasedAt?: ISODateTime;

  timeline: TimelineEntry[];
  emails: EmailLog[];

  manager?: { name: string; phone: string };
  adminMemo?: string;
  cancelledAt?: ISODateTime;
  createdAt: ISODateTime;
  updatedAt: ISODateTime;
}

export type CalendarStatus = 'confirmed' | 'pending' | 'promo' | 'blocked';

/** 고객용 캘린더에 공개되는 일정 (개인정보 없이 행사 종류/홀/상태만) */
export interface CalendarEntry {
  id: string;
  date: ISODate;
  time?: string;
  hallId?: HallId;
  title: string;
  eventType?: EventType;
  status: CalendarStatus;
  discountRate?: number; // 프로모션일 할인율
  bookingId?: string;
  note?: string;
}

export interface CatalogItem {
  key: string;
  category: string;
  label: string;
  price: number;
  unit: string;
  /** 인원 기준 수량 자동 계산 (1 = 1인당 1개, 4 = 4인당 1세트) */
  peoplePerUnit?: number;
  /** 'adults' 면 성인 인원 기준, 기본은 전체 인원 */
  basis?: 'adults' | 'all';
  desc?: string;
  eventTypes?: EventType[];
}

export interface DiscountPreset {
  id: string;
  label: string;
  rate: number;
}

export interface Catalog {
  items: CatalogItem[];
  hallRental: Record<HallId, number>;
  discountPresets: DiscountPreset[];
  defaultDepositRate: number;
  quoteValidDays: number;
  updatedAt: ISODateTime;
}

export interface EmailRuleState {
  enabled: Record<string, boolean>;
}
