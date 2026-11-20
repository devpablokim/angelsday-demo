// 계약서 자동 작성 — 엔젤스데이 엑셀 계약서 4종의 '어느 칸에 무엇을 넣는지'와 예약에서 채울 값.
// 엑셀 파일(public/contracts/*.xlsx)은 scripts/contracts/make_templates.py 로 원본에서 개인정보를 지워 만든 빈 양식입니다.
// 칸 주소는 그 양식 기준이며, 앞면(0)은 계약서, 뒷면(1)은 '연회계약규정' 시트입니다.
import { calendarName } from './eventTypes';
import { calcQuote } from './quote';
import type { Booking, ContractChange, ContractTemplateId, ContractVersion, EventType } from './types';
import { hallById } from './venue';

export type ContractGroup = '행사' | '주최자' | '계약금' | '품목' | '뷔페' | '준비사항' | '계약' | '규정면';

export interface ContractField {
  key: string;
  label: string;
  group: ContractGroup;
  sheet: 0 | 1;
  cell: string;
  /** number: 숫자 칸(엑셀 숫자 서식 유지) · multiline: 줄바꿈 입력 */
  kind?: 'text' | 'number' | 'multiline';
  /** 긴 문구 안의 금액만 바꿉니다 (뒷면 '계약금 \ 500,000 을 지급') */
  replaceAmount?: boolean;
  /** 이 칸 값으로 부가세·합계 칸을 함께 채웁니다 (웨딩 ITEM 표) */
  vatCell?: string;
  totalCell?: string;
  hint?: string;
}

export interface ContractTemplate {
  id: ContractTemplateId;
  label: string;
  file: string;
  eventTypes: EventType[];
  fields: ContractField[];
}

const f = (key: string, label: string, group: ContractGroup, cell: string, extra: Partial<ContractField> = {}): ContractField => ({ key, label, group, sheet: 0, cell, ...extra });
const back = (key: string, label: string, cell: string, extra: Partial<ContractField> = {}): ContractField => ({ key, label, group: '규정면', sheet: 1, cell, ...extra });

export const CONTRACT_TEMPLATES: ContractTemplate[] = [
  {
    id: 'dol',
    label: '돌 계약서',
    file: 'contracts/dol.xlsx',
    eventTypes: ['dol'],
    fields: [
      f('eventDate', '행사일', '행사', 'C5'),
      f('hall', '장소', '행사', 'M5'),
      f('eventName', '행사명', '행사', 'C6'),
      f('guests', '보증인원(대인)', '행사', 'M6'),
      f('host1Name', '아빠', '주최자', 'C7'),
      f('host1Phone', '아빠 연락처', '주최자', 'G7'),
      f('host2Name', '엄마', '주최자', 'C8'),
      f('host2Phone', '엄마 연락처', '주최자', 'G8'),
      f('address', '주소', '주최자', 'L8'),
      f('address2', '주소 (둘째 줄)', '주최자', 'L9'),
      f('deposit', '계약금', '계약금', 'C9'),
      f('depositMemo', '입금 메모', '계약금', 'G9', { hint: '예) 10/24 김민지' }),
      f('packagePrice', '돌상패키지 금액', '품목', 'F13'),
      f('vendorSnap', '협력업체 · 스냅 촬영', '품목', 'J13'),
      f('vendorHair', '협력업체 · Hair & Make-up', '품목', 'J14'),
      f('vendorDress', '협력업체 · 의상', '품목', 'J15'),
      f('vendorGift', '협력업체 · 답례품', '품목', 'J16'),
      f('vendorEvent', '협력업체 · 이벤트선물', '품목', 'J17'),
      f('buffetAdult', '뷔페 대인', '뷔페', 'C22', { kind: 'multiline' }),
      f('buffetChild', '뷔페 소인', '뷔페', 'E22', { kind: 'multiline' }),
      f('contractYear', '계약일 · 년', '계약', 'C34'),
      f('contractMonth', '계약일 · 월', '계약', 'F34'),
      f('contractDay', '계약일 · 일', '계약', 'H34'),
      f('manager', '담당자', '계약', 'C35'),
      back('rulesDeposit', '규정면 계약금', 'B7', { replaceAmount: true, hint: '규정 1항의 계약금 금액' }),
      back('rulesCustomer', '규정면 고객님', 'D19'),
      back('rulesManager', '규정면 담당자', 'H19'),
    ],
  },
  {
    id: 'birthday',
    label: '생신·연회 계약서',
    file: 'contracts/birthday.xlsx',
    eventTypes: ['birthday'],
    fields: [
      f('eventDate', '행사일', '행사', 'C3'),
      f('hall', '장소', '행사', 'M3'),
      f('eventName', '행사명', '행사', 'C4'),
      f('guests', '보증인원(대인)', '행사', 'M4'),
      f('host1Name', '성함', '주최자', 'C5'),
      f('host1Phone', '연락처', '주최자', 'H5'),
      f('host1Email', 'E-mail', '주최자', 'L5'),
      f('host2Name', '성함 (둘째 줄)', '주최자', 'C6'),
      f('cashReceipt', '현금영수증', '주최자', 'H6'),
      f('address', '주소', '주최자', 'L6'),
      f('address2', '주소 (둘째 줄)', '주최자', 'L7'),
      f('deposit', '계약금', '계약금', 'D7', { kind: 'number' }),
      f('depositMemo', '입금 메모', '계약금', 'G7', { hint: '예) 10/24 김민지' }),
      f('itemRental', '홀대관료', '품목', 'C10', { kind: 'number' }),
      f('itemRentalNote', '홀대관료 비고', '품목', 'E10', { kind: 'multiline' }),
      f('itemTable', '생신상(기본)', '품목', 'C11', { kind: 'number' }),
      f('itemTableNote', '생신상 비고', '품목', 'E11'),
      f('itemFruit', '떡·과일 (생물)', '품목', 'C12', { kind: 'number' }),
      f('itemMc', '사회자', '품목', 'C13', { kind: 'number' }),
      f('itemBanner', '현수막', '품목', 'C14', { kind: 'number' }),
      f('itemBannerNote', '현수막 비고', '품목', 'E14'),
      f('itemToast', '헌주상', '품목', 'C15', { kind: 'number' }),
      f('itemInvite', '모바일초대장', '품목', 'C16', { kind: 'number' }),
      f('itemInviteNote', '모바일초대장 비고', '품목', 'E16'),
      f('itemPhoto', '포토테이블', '품목', 'C17', { kind: 'number' }),
      f('itemBand1', '밴드1인', '품목', 'J10', { kind: 'number' }),
      f('itemBand2', '밴드2인', '품목', 'J11', { kind: 'number' }),
      f('itemKaraoke', '노래방', '품목', 'J12', { kind: 'number' }),
      f('buffetAdult', '뷔페 대인', '뷔페', 'C22', { kind: 'multiline' }),
      f('buffetChild', '뷔페 소인', '뷔페', 'E22', { kind: 'multiline' }),
      f('contractDate', '계약일', '계약', 'C33'),
      f('manager', '담당자', '계약', 'C34'),
      back('rulesDeposit', '규정면 계약금', 'B7', { replaceAmount: true, hint: '규정 1항의 계약금 금액' }),
      back('rulesCustomer', '규정면 고객님', 'C20'),
      back('rulesManager', '규정면 담당자', 'G20'),
    ],
  },
  {
    id: 'wedding',
    label: '웨딩 계약서',
    file: 'contracts/wedding.xlsx',
    eventTypes: ['wedding'],
    fields: [
      f('eventDate', '행사일', '행사', 'C4'),
      f('hall', '장소', '행사', 'O4'),
      f('eventName', '행사명', '행사', 'C5'),
      f('guests', '보증인원', '행사', 'O5'),
      f('host1Name', '신랑', '주최자', 'C6'),
      f('host1Phone', '신랑 전화번호', '주최자', 'H6'),
      f('host1Email', 'E-mail', '주최자', 'N6'),
      f('host1En', '신랑 영문명', '주최자', 'C7'),
      f('host2Name', '신부', '주최자', 'C8'),
      f('host2Phone', '신부 전화번호', '주최자', 'H8'),
      f('host2En', '신부 영문명', '주최자', 'C9'),
      f('address', '주소', '주최자', 'N8'),
      f('deposit', '계약금', '계약금', 'D10', { kind: 'number' }),
      f('depositMemo', '입금 메모', '계약금', 'H10', { hint: '예) 10/17 박미영님' }),
      f('itemPackage', '웨딩패키지 PRICE', '품목', 'D14', { kind: 'number', vatCell: 'G14', totalCell: 'I14' }),
      f('itemFlower', '생화장식', '품목', 'D15'),
      f('itemMc', '웨딩전문사회자 PRICE', '품목', 'D16', { kind: 'number', vatCell: 'G16', totalCell: 'I16' }),
      f('itemBouquet', '생화부케 PRICE', '품목', 'D17', { kind: 'number' }),
      f('itemBanner', '포토배너 PRICE', '품목', 'D18', { kind: 'number' }),
      f('itemCake', '케잌 & 와인 PRICE', '품목', 'D19', { kind: 'number' }),
      f('buffetAdult', '뷔페 대인', '뷔페', 'C27', { kind: 'multiline' }),
      f('buffetChild', '뷔페 소인', '뷔페', 'E27', { kind: 'multiline' }),
      f('notes', '준비사항', '준비사항', 'C32', { kind: 'multiline' }),
      f('contractYear', '계약일 · 년', '계약', 'C40'),
      f('contractMonth', '계약일 · 월', '계약', 'F40'),
      f('contractDay', '계약일 · 일', '계약', 'I40'),
      f('contractWeekday', '계약일 · 요일', '계약', 'L40'),
      f('manager', '담당자', '계약', 'C41'),
      back('rulesDeposit', '규정면 계약금', 'B6', { replaceAmount: true, hint: '규정 1항의 계약금 금액' }),
      back('rulesCustomer', '규정면 고객님', 'C19'),
      back('rulesManager', '규정면 담당자', 'G19'),
    ],
  },
  {
    id: 'banquet',
    label: '연회·기업행사 계약서',
    file: 'contracts/banquet.xlsx',
    eventTypes: ['corporate', 'catering'],
    fields: [
      f('eventDate', '행사일', '행사', 'C4'),
      f('hall', '장소', '행사', 'O4'),
      f('eventName', '행사명', '행사', 'C5'),
      f('seats', '좌석수', '행사', 'L5'),
      f('guests', '보증인원', '행사', 'O5'),
      f('host1Name', '담당자', '주최자', 'C6'),
      f('host1Phone', '담당자 전화번호', '주최자', 'H6'),
      f('host1Email', 'E-mail', '주최자', 'N6'),
      f('host2Name', '담당자 (둘째 줄)', '주최자', 'C7'),
      f('host2Phone', '전화번호 (둘째 줄)', '주최자', 'H7'),
      f('address', '주소', '주최자', 'N7'),
      f('deposit', '계약금', '계약금', 'D8', { kind: 'number' }),
      f('depositMemo', '입금 메모', '계약금', 'H8'),
      f('itemRental', '대관료 (정가)', '품목', 'C12', { kind: 'number' }),
      f('itemRentalActual', '대관료 (적용가)', '품목', 'E12', { kind: 'number' }),
      f('itemRecreation', '레크레이션', '품목', 'C13'),
      f('itemBand1', '밴드 1인조', '품목', 'C14', { kind: 'number' }),
      f('itemBand2', '밴드 2인조', '품목', 'C15', { kind: 'number' }),
      f('itemBandRec', '밴드 + 레크레이션', '품목', 'C16', { kind: 'number' }),
      f('itemKaraoke', '노래방기기대여', '품목', 'C17', { kind: 'number' }),
      f('itemChampagne', '샴페인 타워', '품목', 'L12', { kind: 'number' }),
      f('itemBanner', '현수막', '품목', 'L13', { kind: 'number' }),
      f('itemBannerNote', '현수막 비고', '품목', 'O13'),
      f('buffetAdult', '뷔페 대인', '뷔페', 'C23', { kind: 'multiline' }),
      f('buffetChild', '뷔페 소인', '뷔페', 'E23', { kind: 'multiline' }),
      f('buffetGuests', '뷔페 인원', '뷔페', 'G23'),
      f('contractYear', '계약일 · 년', '계약', 'C37'),
      f('contractMonth', '계약일 · 월', '계약', 'F37'),
      f('contractDay', '계약일 · 일', '계약', 'I37'),
      f('contractWeekday', '계약일 · 요일', '계약', 'L37'),
      f('manager', '담당자', '계약', 'C38'),
      back('rulesDeposit', '규정면 계약금', 'B7', { replaceAmount: true, hint: '규정 1항의 계약금 금액' }),
      back('rulesCustomer', '규정면 고객님', 'C20'),
      back('rulesManager', '규정면 담당자', 'G20'),
    ],
  },
];

export const CONTRACT_GROUPS: ContractGroup[] = ['행사', '주최자', '계약금', '품목', '뷔페', '준비사항', '계약', '규정면'];

export function contractTemplate(id: ContractTemplateId): ContractTemplate {
  return CONTRACT_TEMPLATES.find((t) => t.id === id)!;
}

export function templateForEvent(t: EventType): ContractTemplateId {
  return CONTRACT_TEMPLATES.find((x) => x.eventTypes.includes(t))?.id ?? 'banquet';
}

const WD = ['일', '월', '화', '수', '목', '금', '토'];
const pad = (n: number) => String(n).padStart(2, '0');

/** 홀 이름을 계약서 표기(룸 없이)로: 러블리룸 → 러블리 */
function hallLabel(b: Booking): string {
  if (b.eventType === 'catering') return b.location ?? '출장';
  if (b.hallId === 'whole') return '알로하&러블리';
  return (hallById(b.hallId)?.name ?? '').replace(/룸$/, '');
}

function eventName(b: Booking): string {
  const h = b.honorees;
  switch (b.eventType) {
    case 'wedding':
      return `${h.primary} ♥ ${h.secondary ?? ''} 결혼식`;
    case 'dol':
      return `${h.primary} ${h.detail || '첫돌'}`;
    default:
      return b.calendarTitle?.trim() || calendarName(b.eventType, h);
  }
}

function money(n: number) {
  return n.toLocaleString('ko-KR');
}

/** 예약에서 바로 채울 수 있는 칸. 담당자 이름과 계약일은 발행하는 사람·날짜로 */
export function contractAutoValues(id: ContractTemplateId, b: Booking, opts: { manager?: string; today: string }): Record<string, string> {
  const [y, m, d] = b.date.split('-').map(Number);
  const [hh, mm] = b.time.split(':').map(Number);
  const end = hh + 3; // 홀 이용 3시간 (1부 12:00~15:00 · 2부 17:00~20:00)
  const wd = WD[new Date(Date.UTC(y, m - 1, d)).getUTCDay()];
  const [ty, tm, td] = opts.today.split('-').map(Number);
  const twd = WD[new Date(Date.UTC(ty, tm - 1, td)).getUTCDay()];
  const totals = b.quote ? calcQuote(b.quote) : null;
  const depositPay = b.payments.find((p) => p.kind === 'deposit');
  const deposit = depositPay?.amount ?? totals?.deposit ?? 0;
  const depositDate = depositPay?.paidAt?.slice(5, 10) ?? b.transferNotice?.at.slice(5, 10);
  const depositor = b.transferNotice?.depositor || b.customer.name;
  const food = b.quote?.lines.find((l) => /식대|뷔페|buffet/i.test(`${l.category} ${l.label}`) && l.unitPrice > 10000);
  const manager = opts.manager || b.manager?.name || '';
  const v: Record<string, string> = {
    eventDate: `${String(y).slice(2)} 년  ${m} 월  ${d} 일  ${wd}요일  ${hh} 시 ${pad(mm)} 분  ~  ${end} 시 ${pad(mm)} 분`,
    hall: hallLabel(b),
    eventName: eventName(b),
    guests: `${b.guests}명`,
    deposit: !deposit ? '' : contractTemplate(id).fields.find((x) => x.key === 'deposit')?.kind === 'number' ? String(deposit) : `${money(deposit)}원`,
    depositMemo: depositPay && depositDate ? `${Number(depositDate.slice(0, 2))}/${Number(depositDate.slice(3, 5))} ${depositor}` : '',
    contractYear: String(ty).slice(2),
    contractMonth: String(tm),
    contractDay: String(td),
    contractWeekday: twd,
    contractDate: `${ty}년      ${tm}월      ${td}일`,
    manager,
    rulesDeposit: deposit ? money(deposit) : '',
    rulesCustomer: b.customer.name,
    rulesManager: manager,
  };
  if (food) v.buffetAdult = `대인\n${money(food.unitPrice)}`;
  // 주최자: 문의하신 분을 첫 줄에. 웨딩은 신랑·신부 이름을 칸에 맞게
  if (id === 'wedding') {
    v.host1Name = b.honorees.primary;
    v.host2Name = b.honorees.secondary ?? '';
    const isBride = b.customer.name && b.customer.name === b.honorees.secondary;
    v[isBride ? 'host2Phone' : 'host1Phone'] = b.customer.phone;
    v.host1Email = b.customer.email;
  } else {
    v.host1Name = b.customer.name;
    v.host1Phone = b.customer.phone;
    if (id !== 'dol') v.host1Email = b.customer.email;
  }
  if (id === 'banquet') v.buffetGuests = `${b.guests}명`;
  // 양식에 없는 칸은 빼기
  const keys = new Set(contractTemplate(id).fields.map((x) => x.key));
  return Object.fromEntries(Object.entries(v).filter(([k]) => keys.has(k)));
}

/** 두 판 사이 바뀐 칸 */
export function contractDiff(id: ContractTemplateId, before: Record<string, string>, after: Record<string, string>): ContractChange['items'] {
  return contractTemplate(id)
    .fields.filter((x) => (before[x.key] ?? '').trim() !== (after[x.key] ?? '').trim())
    .map((x) => ({ key: x.key, label: x.label, before: before[x.key] ?? '', after: after[x.key] ?? '' }));
}

export function latestContract(b: Booking): ContractVersion | undefined {
  const v = b.contract?.versions;
  return v?.length ? v[v.length - 1] : undefined;
}

export const CHANNEL_LABEL: Record<ContractChange['channel'], string> = { phone: '전화', kakao: '카톡', sms: '문자', email: '메일', visit: '방문' };
