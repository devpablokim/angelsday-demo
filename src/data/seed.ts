// 데모 데이터 — 오늘 날짜를 기준으로 6단계 전체를 둘러볼 수 있는 고객들을 만듭니다.
import { DEFAULT_CATALOG } from '@shared/catalog';
import { addDays, kstDateTime, todayKST, weekday } from '@shared/dates';
import { backfillEmails } from '@shared/emailRules';
import { uid } from '@shared/ids';
import * as ops from '@shared/ops';
import { calcQuote, draftQuote } from '@shared/quote';
import type { Booking, CalendarEntry, Requirements } from '@shared/types';

const MANAGER = { name: '김지은 플래너', phone: '010-7113-4005' };

/** 기준일 이후(포함) 처음 오는 요일 */
function nextDow(d: string, dow: number): string {
  let x = d;
  while (weekday(x) !== dow) x = addDays(x, 1);
  return x;
}

function when(today: string, dayOffset: number, hour = 10, minute = 0): Date {
  return new Date(kstDateTime(addDays(today, dayOffset), hour, minute));
}

const GALLERY = [
  'https://www.xn--2n1b810a6lcv2bcza.com/thum_img/angelfd/2026/432ff5141757eec230a1b823be5e1d49_water__c1_w350_h280.jpg',
  'https://www.xn--2n1b810a6lcv2bcza.com/thum_img/angelfd/2026/db98f2fb55491f31ae673e81a9a23c67_water__c1_w350_h280.jpg',
  'https://www.xn--2n1b810a6lcv2bcza.com/thum_img/angelfd/2026/8241e0ec79029d2c9564f4006a9ca4ab_water__c1_w350_h280.jpg',
  'https://www.xn--2n1b810a6lcv2bcza.com/thum_img/angelfd/2026/5f6c89458025acaa69d61aa7c4874565_water__c1_w350_h280.jpg',
  'https://www.xn--2n1b810a6lcv2bcza.com/thum_img/angelfd/2026/93df8887a1c8678353d5a00789af9113_water__c1_w350_h280.jpg',
  'https://www.xn--2n1b810a6lcv2bcza.com/thum_img/angelfd/2026/b34afca79154ebea38c7774362cfe1df_water__c1_w350_h280.jpg',
];

export const DEMO_IDS = {
  wedding: 'demo-wedding-mongryong',
  dol: 'demo-dol-hayun',
  birthday: 'demo-birthday-youngja',
  corporate: 'demo-corporate-hangang',
  catering: 'demo-catering-church',
  photos: 'demo-wedding-photos',
  today: 'demo-corporate-today',
  dolSoon: 'demo-dol-seojun',
} as const;

function make(id: string, input: ops.InquiryInput, createdAt: Date): Booking {
  const b = ops.at(createdAt, () => ops.createBooking(input));
  return { ...b, id, manager: MANAGER };
}

function submit(b: Booking, req: Requirements, t: Date): Booking {
  return ops.at(t, () => ops.submitRequirements(b, { ...b.requirements, ...req }));
}

function quote(b: Booking, t: Date, tweak?: (q: ReturnType<typeof draftQuote>) => void): Booking {
  return ops.at(t, () => {
    const q = draftQuote(b, DEFAULT_CATALOG, undefined, todayKST(t));
    tweak?.(q);
    return ops.sendQuote(b, q);
  });
}

function pay(b: Booking, t: Date, method: 'card' | 'transfer' | 'kakaopay' = 'card'): Booking {
  return ops.at(t, () => ops.addPayment(b, 'deposit', calcQuote(b.quote!).deposit, method));
}

function progress(b: Booking, doneCount: number, doingCount: number, t: Date, notes: Record<number, string> = {}): Booking {
  let x = b;
  b.prepTasks.forEach((task, i) => {
    if (i < doneCount) x = ops.at(t, () => ops.setTaskStatus(x, task.id, 'done', notes[i]));
    else if (i < doneCount + doingCount) x = ops.at(t, () => ops.setTaskStatus(x, task.id, 'doing', notes[i]));
  });
  return x;
}

function checkFirst(b: Booking, n: number, t: Date): Booking {
  let x = b;
  b.checklist.slice(0, n).forEach((c) => {
    x = ops.at(t, () => ops.toggleChecklist(x, c.id, true));
  });
  return x;
}

export function buildSeed(now: Date = new Date()): { bookings: Booking[]; calendar: CalendarEntry[] } {
  const T = todayKST(now);
  const base = typeof location !== 'undefined' ? location.origin : 'https://angelsday.example';
  const list: Booking[] = [];

  // 1) STEP 4 — 이몽룡 ♥ 성춘향 스몰웨딩 (준비 중)
  {
    const date = nextDow(addDays(T, 84), 6);
    let b = make(
      DEMO_IDS.wedding,
      {
        eventType: 'wedding',
        date,
        time: '13:30',
        hallId: 'lovely',
        guests: 100,
        customer: { name: '성춘향', phone: '010-1234-5678', email: 'chunhyang@example.com' },
        honoreeValues: { groom: '이몽룡', bride: '성춘향' },
        memo: '양가 부모님 포함 100명 정도 예상해요. 자연광 예쁜 홀이면 좋겠어요.',
      },
      when(T, -40, 21, 12),
    );
    b = submit(b, { hallId: 'lovely', guestsAdult: 100, guestsKids: 8, ceremonyParts: ['paebaek'], bridalRoom: true, flowerTier: 'standard', flowerTone: 'white-green', flowerNote: '작약과 수국 위주의 내추럴한 느낌', menuTier: 'premium', drinks: 'alcohol', cake: true, tasting: true, snap: 'basic', mc: true, singer: false, officiant: 'none', video: 'play', gifts: 'ricecake', requests: '신부 할머님께서 휠체어를 이용하세요. 동선을 넉넉히 부탁드려요.' }, when(T, -39, 22, 40));
    b = quote(b, when(T, -38, 14, 0));
    b = ops.at(when(T, -37, 9, 30), () => ops.requestAdjust(b, '꽃장식을 프리미엄으로 올리고 애프터파티를 추가하면 얼마가 되나요? 가능하면 얼리버드 할인도 받고 싶어요.'));
    b = submit(b, { ...b.requirements, flowerTier: 'premium', ceremonyParts: ['paebaek', 'afterparty'] }, when(T, -37, 9, 40));
    b = quote(b, when(T, -36, 11, 0), (q) => {
      q.discountRate = 7;
      q.discountLabel = '얼리버드 (예식 3개월 전 확정)';
      q.memo = '프리미엄 꽃장식과 애프터파티를 반영하고 얼리버드 7%를 적용했어요. 신부 할머님 동선은 휠체어 전용 통로로 준비하겠습니다.';
    });
    b = pay(b, when(T, -34, 20, 15), 'card');
    b = ops.at(when(T, -34, 20, 20), () => ops.startPrep(b));
    b = progress(b, 2, 2, when(T, -10, 15), { 1: '하객 동선과 휠체어 통로 반영한 배치도를 공유드렸어요.', 2: '작약·수국 중심 시안 2종 준비 중', 3: '시식 가능 일정: 다음 주 화·목 오후' });
    b = checkFirst(b, 2, when(T, -6, 21));
    b = ops.at(when(T, -6, 21, 5), () => ops.addChecklist(b, '부케 · 부토니에 색감 결정', addDays(date, -21), 'customer'));
    list.push(b);
  }

  // 2) STEP 2 — 김하윤 돌잔치 (견적 도착, 결제 대기)
  {
    const date = nextDow(addDays(T, 38), 6);
    let b = make(
      DEMO_IDS.dol,
      { eventType: 'dol', date, time: '11:00', hallId: 'aloha', guests: 60, customer: { name: '김민지', phone: '010-2345-6789', email: 'minji@example.com' }, honoreeValues: { baby: '김하윤', babyBirth: addDays(date, -365) } },
      when(T, -5, 13, 5),
    );
    b = submit(b, { hallId: 'aloha', guestsAdult: 60, guestsKids: 12, dolsang: 'greenery', theme: 'ivory', doljabi: true, mc: true, video: 'make', menuTier: 'premium', drinks: 'soft', snap: 'snap', gifts: 'cookie', requests: '아이 낮잠 시간이 있어 11시 시작이 좋아요.' }, when(T, -4, 22, 30));
    b = quote(b, when(T, -3, 16, 20), (q) => {
      q.memo = '그리너리 돌상과 성장 영상 제작을 포함했어요. 포토존 촬영은 무료로 진행돼요.';
    });
    list.push(b);
  }

  // 3) STEP 2 — 박영자님 칠순 (필요사항 제출, 견적 작성 대기)
  {
    const date = nextDow(addDays(T, 23), 6);
    let b = make(
      DEMO_IDS.birthday,
      { eventType: 'birthday', date, time: '11:00', hallId: 'bellita', guests: 45, customer: { name: '정우성', phone: '010-3456-7890', email: 'woosung@example.com' }, honoreeValues: { honoree: '박영자', milestone: '칠순' } },
      when(T, -2, 19, 0),
    );
    b = submit(b, { hallId: 'bellita', guestsAdult: 45, guestsKids: 6, tableStyle: 'traditional', flower: 'premium', banner: true, mc: true, performance: 'gugak', video: 'play', menuTier: 'signature', drinks: 'alcohol', softMenu: true, snap: true, familyPhoto: true, gifts: 'ricecake', requests: '어머니께서 국악을 좋아하세요. 가족 영상은 직접 만들어서 드릴게요.' }, when(T, -1, 23, 10));
    list.push(b);
  }

  // 4) STEP 3 — (주)한강테크 송년회 (결제 완료)
  {
    const date = nextDow(addDays(T, 50), 5);
    let b = make(
      DEMO_IDS.corporate,
      { eventType: 'corporate', date, time: '18:00', hallId: 'sia', guests: 42, customer: { name: '최현우 (총무팀)', phone: '010-4567-8901', email: 'hw.choi@hangang-tech.example' }, honoreeValues: { company: '(주)한강테크', eventName: '2026 송년회', eventKind: 'yearend' } },
      when(T, -12, 10, 30),
    );
    b = submit(b, { hallId: 'sia', guestsAdult: 42, seating: 'banquet', av: ['projector', 'sound'], mc: true, performance: 'none', deco: 'banner', menuTier: 'premium', drinks: 'alcohol', coffeeBreak: false, snap: true, taxInvoice: true, bizNo: '123-45-67890', billingEmail: 'account@hangang-tech.example', requests: '시상식 순서가 있어 무대 앞 공간이 필요해요.' }, when(T, -11, 15, 0));
    b = quote(b, when(T, -10, 11, 0), (q) => {
      q.memo = '평일 할인 10%를 적용했어요. 세금계산서는 행사 후 발행됩니다.';
    });
    b = pay(b, when(T, -1, 16, 40), 'transfer');
    list.push(b);
  }

  // 5) STEP 1 — 김포중앙교회 출장뷔페 (방금 문의)
  {
    const date = nextDow(addDays(T, 10), 0);
    let b = make(
      DEMO_IDS.catering,
      {
        eventType: 'catering',
        date,
        time: '12:00',
        guests: 150,
        customer: { name: '한지수 (행정실)', phone: '010-5678-9012', email: 'office@gimpo-church.example' },
        honoreeValues: { organization: '김포중앙교회', eventName: '창립 30주년 기념 행사', location: '경기도 김포시 김포한강9로 (교회 본당 친교실)' },
        memo: '예배 후 친교실에서 점심 식사로 진행하려고 합니다.',
      },
      new Date(now.getTime() - 2 * 3600 * 1000),
    );
    b = ops.saveRequirements(b, { ...b.requirements, venueType: 'institution', serviceType: 'full' });
    list.push(b);
  }

  // 6) STEP 6 — 최준호 ♥ 한지민 웨딩 (사진 공개)
  {
    const date = nextDow(addDays(T, -24), 6);
    let b = make(
      DEMO_IDS.photos,
      { eventType: 'wedding', date, time: '13:30', hallId: 'aloha', guests: 120, customer: { name: '한지민', phone: '010-6789-0123', email: 'jimin@example.com' }, honoreeValues: { groom: '최준호', bride: '한지민' } },
      new Date(kstDateTime(addDays(date, -120), 14)),
    );
    b = submit(b, { hallId: 'aloha', guestsAdult: 120, guestsKids: 10, ceremonyParts: ['paebaek'], bridalRoom: true, flowerTier: 'premium', flowerTone: 'blush', menuTier: 'signature', drinks: 'alcohol', cake: true, snap: 'premium', weddingVideo: true, mc: true, singer: true, officiant: 'none', video: 'play', gifts: 'cookie' }, new Date(kstDateTime(addDays(date, -118), 21)));
    b = quote(b, new Date(kstDateTime(addDays(date, -117), 11)), (q) => {
      q.discountRate = 7;
      q.discountLabel = '얼리버드 (4개월 전 확정)';
    });
    b = pay(b, new Date(kstDateTime(addDays(date, -115), 20)), 'card');
    b = ops.at(new Date(kstDateTime(addDays(date, -115), 20, 10)), () => ops.startPrep(b));
    b = progress(b, 99, 0, new Date(kstDateTime(addDays(date, -1), 18)));
    b = checkFirst(b, 99, new Date(kstDateTime(addDays(date, -2), 21)));
    const balance = calcQuote(b.quote!).balance;
    b = ops.at(new Date(kstDateTime(date, 16, 30)), () => ops.addPayment(b, 'balance', balance, 'card', 'admin', '행사 당일 현장 결제'));
    b = { ...b, photos: GALLERY.map((url, i) => ({ id: uid('ph'), url, caption: ['본식 입장', '버진로드', '양가 인사', '피로연', '포토 테이블', '단체 사진'][i] })), photoAlbumUrl: 'https://photos.example.com/angelsday/choi-han' };
    b = ops.at(when(T, -3, 15), () => ops.releasePhotos(b, true));
    list.push(b);
  }

  // 7) STEP 5 — 오늘 행사: (주)김포바이오 VIP 만찬
  {
    const date = T;
    let b = make(
      DEMO_IDS.today,
      { eventType: 'corporate', date, time: '18:00', hallId: 'aloha', guests: 80, customer: { name: '오세린 (대외협력팀)', phone: '010-7890-1234', email: 'serin.oh@gimpobio.example' }, honoreeValues: { company: '(주)김포바이오', eventName: 'VIP 고객 초청 만찬', eventKind: 'dinner' } },
      when(T, -45, 11),
    );
    b = submit(b, { hallId: 'aloha', guestsAdult: 80, seating: 'banquet', av: ['projector', 'sound', 'stage'], mc: true, performance: 'band', deco: 'photowall', menuTier: 'signature', drinks: 'alcohol', snap: true, taxInvoice: true, bizNo: '234-56-78901' }, when(T, -44, 17));
    b = quote(b, when(T, -43, 10));
    b = pay(b, when(T, -40, 14), 'transfer');
    b = ops.at(when(T, -40, 14, 5), () => ops.startPrep(b));
    b = progress(b, 99, 0, when(T, 0, 9));
    b = checkFirst(b, 99, when(T, -1, 18));
    list.push(b);
  }

  // 8) STEP 4 — 박서준 돌잔치 (D-3 임박)
  {
    const date = addDays(T, 3);
    let b = make(
      DEMO_IDS.dolSoon,
      { eventType: 'dol', date, time: '13:30', hallId: 'sia', guests: 30, customer: { name: '이수아', phone: '010-8901-2345', email: 'sua@example.com' }, honoreeValues: { baby: '박서준', babyBirth: addDays(date, -366) } },
      when(T, -50, 20),
    );
    b = submit(b, { hallId: 'sia', guestsAdult: 30, guestsKids: 6, dolsang: 'hanok', theme: 'green', doljabi: true, mc: false, video: 'play', menuTier: 'standard', drinks: 'soft', snap: 'snap', gifts: 'ricecake' }, when(T, -49, 21));
    b = quote(b, when(T, -48, 11));
    b = pay(b, when(T, -46, 19), 'kakaopay');
    b = ops.at(when(T, -46, 19, 5), () => ops.startPrep(b));
    b = progress(b, 3, 1, when(T, -2, 14), { 3: '돌잡이 소품과 한옥 포토존 소품 준비 중이에요.' });
    b = checkFirst(b, 2, when(T, -3, 22));
    list.push(b);
  }

  const bookings = list.map((b) => backfillEmails(b, base, now));

  const calendar: CalendarEntry[] = [];
  // 평일 프로모션일 (다음 4주 화·수)
  for (let w = 1; w <= 6; w++) {
    const tue = nextDow(addDays(T, w * 7 - 6), 2);
    calendar.push({ id: uid('cal'), date: tue, status: 'promo', title: '평일 프로모션', discountRate: 15, note: '평일 런치 15% 특가' });
  }
  // 외부(전화) 예약 · 휴무
  const ext = [
    { off: 12, dow: 6, time: '11:00', hallId: 'lovely' as const, title: '돌잔치', status: 'confirmed' as const },
    { off: 12, dow: 6, time: '18:00', hallId: 'aloha' as const, title: '기업행사', status: 'confirmed' as const },
    { off: 19, dow: 0, time: '11:00', hallId: 'bellita' as const, title: '생신연', status: 'pending' as const },
    { off: 26, dow: 6, time: '13:30', hallId: 'whole' as const, title: '웨딩', status: 'confirmed' as const },
    { off: 33, dow: 6, time: '11:00', hallId: 'sia' as const, title: '돌잔치', status: 'confirmed' as const },
    { off: 33, dow: 6, time: '13:30', hallId: 'lovely' as const, title: '웨딩', status: 'pending' as const },
    { off: 40, dow: 0, time: '18:00', hallId: 'aloha' as const, title: '기업행사', status: 'confirmed' as const },
    { off: 5, dow: 5, time: '18:00', hallId: 'lovely' as const, title: '기업행사', status: 'confirmed' as const },
    { off: 54, dow: 5, time: '18:00', hallId: 'aloha' as const, title: '송년회', status: 'confirmed' as const },
    { off: 61, dow: 5, time: '18:00', hallId: 'lovely' as const, title: '송년회', status: 'pending' as const },
  ];
  for (const e of ext) calendar.push({ id: uid('cal'), date: nextDow(addDays(T, e.off), e.dow), time: e.time, hallId: e.hallId, title: e.title, status: e.status, note: '전화 예약 (관리자 등록)' });
  calendar.push({ id: uid('cal'), date: nextDow(addDays(T, 70), 1), status: 'blocked', title: '정기 휴무 · 시설 점검', note: '전관 휴무' });

  return { bookings, calendar };
}
