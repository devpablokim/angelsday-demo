import { ddayLabel, formatDate, todayKST, won } from './dates';
import { eventConfig } from './eventTypes';
import { calcQuote, paidAmount } from './quote';
import { computeStep, nextAction, STEPS } from './steps';
import type { Booking } from './types';
import { hallName, HALLS, VENUE } from './venue';

export interface FaqEntry {
  id: string;
  q: string;
  keywords: string[];
  a: string;
}

/** 챗봇 FAQ — Claude 시스템 프롬프트와 오프라인 응답에 함께 쓰입니다. 운영 정책에 맞게 수정하세요. */
export const FAQ: FaqEntry[] = [
  {
    id: 'process',
    q: '예약은 어떤 순서로 진행되나요?',
    keywords: ['순서', '절차', '진행', '어떻게', '과정', '단계'],
    a: '① 필요사항 작성 → ② 견적 확인 및 예약금 결제 → ③ 결제 완료(예약 확정) → ④ 준비 사항 확인 → ⑤ 행복한 행사일 → ⑥ 행사 사진 확인 순서로 진행돼요. 모든 단계는 고객님 전용 페이지에서 확인할 수 있어요.',
  },
  {
    id: 'deposit',
    q: '예약금은 얼마인가요?',
    keywords: ['예약금', '계약금', '선금', '결제'],
    a: '예약금은 견적 총액의 20%예요(견적서에 금액이 표시돼요). 예약금 결제 시점에 날짜와 홀이 확정되고, 잔금은 행사 당일 현장에서 결제해요.',
  },
  {
    id: 'refund',
    q: '취소·환불 규정이 궁금해요',
    keywords: ['환불', '취소', '위약', '변경', '연기'],
    a: '행사 90일 전까지 취소 시 예약금 전액 환불, 89~30일 전 50% 환불, 29일 이내 취소 시 환불이 어려워요. 날짜 변경은 1회 무료로 도와드리며(행사 30일 전까지, 가능한 날짜 기준) 담당 플래너와 상의해 주세요.',
  },
  {
    id: 'guests',
    q: '인원이 바뀌면 어떻게 하나요?',
    keywords: ['인원', '하객', '명', '늘', '줄', '보증'],
    a: '최종 인원은 행사 7일 전까지 알려주세요. 보증 인원 기준으로 식자재가 준비되며, 보증 인원보다 적게 오셔도 보증 인원만큼 비용이 발생해요. 늘어나는 경우 좌석 수 안에서 추가할 수 있어요.',
  },
  {
    id: 'halls',
    q: '홀은 몇 명까지 가능한가요?',
    keywords: ['홀', '룸', '수용', '좌석', '러블리', '알로하', '벨리타', '시아', '크기'],
    a: HALLS.filter((h) => h.id !== 'whole')
      .map((h) => `${h.name} 보증 ${h.guaranteed}명 · 좌석 ${h.seats}석`)
      .join(' / ') + ' / 200명 이상은 400평 전관을 4시간 단독으로 이용할 수 있어요.',
  },
  {
    id: 'menu',
    q: '음식은 어떤 메뉴가 나오나요?',
    keywords: ['메뉴', '음식', '뷔페', '식사', '요리', '스테이크', '초밥'],
    a: '호텔 출신 셰프가 한식·중식·일식·양식 뷔페를 즉석 조리해요. 프리미엄 코스는 120여 가지, 시그니처 코스는 그릴 스테이크·초밥·생선회 시스 코너가 더해져요.',
  },
  {
    id: 'tasting',
    q: '메뉴 시식이 가능한가요?',
    keywords: ['시식', '맛보', '테이스팅'],
    a: '예약 확정 후 웨딩·대형 행사는 2인 메뉴 시식이 가능해요. 준비 단계에서 시식 일정을 안내드려요.',
  },
  {
    id: 'parking',
    q: '주차는 어떻게 하나요?',
    keywords: ['주차', '차', '자동차', '발렛'],
    a: `${VENUE.parking}.`,
  },
  {
    id: 'location',
    q: '위치가 어디인가요?',
    keywords: ['위치', '주소', '오시는', '찾아', '지하철', '장기역', '어디'],
    a: `${VENUE.address} (${VENUE.addressShort})예요.`,
  },
  {
    id: 'flowers',
    q: '꽃장식을 바꿀 수 있나요?',
    keywords: ['꽃', '플라워', '장식', '생화', '컬러'],
    a: '꽃장식은 스탠다드·프리미엄·시그니처 구성 중 선택하고 컬러 톤을 정할 수 있어요. 행사 30일 전까지 변경 가능하며, 준비 단계에서 디자인 시안을 공유드려요.',
  },
  {
    id: 'photos',
    q: '행사 사진은 언제 받나요?',
    keywords: ['사진', '스냅', '앨범', '원본', '촬영'],
    a: '행사 당일 잔금 결제가 완료되면 보정 사진이 고객님 페이지의 STEP 6에 공개돼요. 보통 행사 후 2~3주가 걸리고, 원본 앨범 다운로드 링크도 함께 드려요.',
  },
  {
    id: 'outside',
    q: '외부 음식·주류 반입이 되나요?',
    keywords: ['반입', '외부', '콜키지', '술', '주류', '케이크'],
    a: '주류는 콜키지(기본 10병)로 반입할 수 있어요. 외부 음식은 위생 관리상 어렵지만, 케이크·떡처럼 완제품은 상담 후 가능해요.',
  },
  {
    id: 'catering',
    q: '출장뷔페는 어디까지 오나요?',
    keywords: ['출장', '케이터링', '배달', '지역'],
    a: '수도권 전 지역에 출장이 가능하고 그 외 지역은 상담 후 진행해요. 풀 뷔페(셰프 동행), 핑거푸드, 도시락, 홈파티 박스로 구성할 수 있어요.',
  },
  {
    id: 'tax',
    q: '세금계산서 발행이 되나요?',
    keywords: ['세금계산서', '계산서', '영수증', '증빙', '현금영수증'],
    a: '네, 세금계산서와 현금영수증 모두 발행해요. 필요사항의 정산 정보에 사업자등록번호를 남겨주세요.',
  },
  {
    id: 'human',
    q: '상담원과 직접 이야기하고 싶어요',
    keywords: ['상담원', '사람', '직원', '전화', '연결', '카톡', '카카오'],
    a: `담당 플래너와 직접 상담하시려면 전화 ${VENUE.phone} 또는 카카오톡 채널로 연락 주세요. 영업시간 내 빠르게 답변드려요.`,
  },
];

export interface ChatContext {
  booking?: Booking;
}

/** 예약 정보를 챗봇이 참고할 수 있는 짧은 텍스트로 */
export function bookingContextText(b: Booking, today = todayKST()): string {
  const cfg = eventConfig(b.eventType);
  const step = computeStep(b, today);
  const lines = [
    `행사 종류: ${cfg.label}`,
    `고객명: ${b.customer.name}`,
    `일시: ${formatDate(b.date)} ${b.time} (${ddayLabel(b.date, today)})`,
    `장소: ${b.eventType === 'catering' ? b.location ?? '출장' : hallName(b.hallId)}`,
    `인원: ${b.guests}명`,
    `현재 단계: STEP ${step} ${STEPS[step - 1].title}`,
    `다음 할 일: ${nextAction(b, today).title}`,
  ];
  if (b.quote) {
    const t = calcQuote(b.quote);
    lines.push(`견적 총액: ${won(t.total)} (할인 ${b.quote.discountRate}%), 예약금 ${won(t.deposit)}, 견적 상태: ${b.quote.status}`);
  }
  const paid = paidAmount(b);
  if (paid) lines.push(`결제 완료 금액: ${won(paid)}`);
  const open = b.checklist.filter((c) => !c.done);
  if (open.length) lines.push(`미완료 체크리스트: ${open.map((c) => `${c.title}(${c.dueDate})`).join(', ')}`);
  return lines.join('\n');
}

/** 네트워크 없이 동작하는 키워드 기반 응답 (데모 모드 · Claude 호출 실패 시 대체) */
export function localBotReply(message: string, ctx: ChatContext = {}): { text: string; escalate?: boolean } {
  const m = message.replace(/\s+/g, '');
  const b = ctx.booking;
  const today = todayKST();
  if (b && /(단계|지금|현재|뭐해|할일|다음)/.test(m)) {
    const step = computeStep(b, today);
    const na = nextAction(b, today);
    return { text: `지금은 STEP ${step} '${STEPS[step - 1].title}' 단계예요. ${na.title} — ${na.desc}` };
  }
  if (b && /(디데이|d-|며칠|언제|날짜)/i.test(m)) {
    return { text: `${formatDate(b.date)} ${b.time}에 진행돼요. 오늘 기준 ${ddayLabel(b.date, today)}예요.` };
  }
  if (b && /(견적|금액|얼마|총액)/.test(m) && b.quote && b.quote.status !== 'draft') {
    const t = calcQuote(b.quote);
    return { text: `보내드린 견적 총액은 ${won(t.total)}이고(할인 ${b.quote.discountRate}% 적용), 예약금은 ${won(t.deposit)}, 잔금은 ${won(t.balance)}이에요. STEP 2에서 PDF로 내려받을 수 있어요.` };
  }
  let best: { e: FaqEntry; score: number } | undefined;
  for (const e of FAQ) {
    const score = e.keywords.reduce((s, k) => (m.includes(k) ? s + k.length : s), 0);
    if (score > 0 && (!best || score > best.score)) best = { e, score };
  }
  if (best) return { text: best.e.a, escalate: best.e.id === 'human' };
  return {
    text: `정확한 답변을 위해 담당 플래너에게 연결해 드릴게요. 전화 ${VENUE.phone} 또는 카카오톡으로 문의해 주세요. 자주 묻는 질문: 예약금, 환불 규정, 인원 변경, 주차, 메뉴 시식`,
    escalate: true,
  };
}

/** Claude 시스템 프롬프트 (정적 · 캐시 대상) */
export function staticSystemPrompt(): string {
  const faq = FAQ.map((f) => `Q. ${f.q}\nA. ${f.a}`).join('\n\n');
  const halls = HALLS.map((h) => `- ${h.name}(${h.nameEn}): 보증 ${h.guaranteed}명, 좌석 ${h.seats}석. ${h.desc}. 추천: ${h.bestFor}`).join('\n');
  const steps = STEPS.map((s) => `STEP ${s.no} ${s.title}: ${s.about}`).join('\n');
  return `당신은 김포의 프라이빗 연회장 '${VENUE.name}'의 고객 상담 컨시어지입니다.
고객은 주로 모바일에서 자신의 행사 관리 페이지를 보며 질문합니다.

[응답 원칙]
- 한국어 존댓말(해요체)로, 따뜻하고 품위 있게 답합니다. 3~5문장 이내로 짧게, 필요하면 줄바꿈으로 정리합니다.
- 아래 정보와 [고객 예약 정보]에 있는 내용만 사실로 말합니다. 모르는 가격·일정·정책은 추측하지 말고 담당 플래너 연결(전화 ${VENUE.phone}, 카카오톡)을 안내합니다.
- 결제·환불·일정 변경을 확정하거나 약속하지 않습니다. 안내만 하고, 확정은 담당 플래너가 한다고 말합니다.
- 고객이 해야 할 다음 행동이 있으면 페이지의 어느 STEP에서 할 수 있는지 알려줍니다.
- 내부·시스템 XML 태그는 응답에 포함하지 않습니다.

[엔젤스데이 소개]
- ${VENUE.address} · ${VENUE.addressShort}
- 2014년부터 스몰웨딩, 돌잔치, 생신연, 기업행사·송년회, 출장뷔페·케이터링을 진행해 왔습니다.
- 호텔 출신 셰프의 즉석 조리 뷔페, 프리미엄 120여 가지 메뉴, 자연채광 가득한 스카이라운지 프라이빗 룸.

[홀]
${halls}

[진행 단계]
${steps}

[자주 묻는 질문]
${faq}`;
}
