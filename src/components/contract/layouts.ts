// 계약서 4종을 우리 디자인 시스템 문서로 그릴 때의 구성 — 엑셀 양식의 항목·문구를 그대로 옮겼습니다.
// 칸 값은 shared/contract.ts 의 필드 키로 읽고, 키가 없는 줄은 양식에 인쇄된 고정 문구입니다.
import type { ContractTemplateId } from '@shared/types';

export interface DocItem {
  label: string;
  /** 양식에 인쇄된 설명 */
  desc?: string;
  /** 금액 칸 (필드 키) */
  amount?: string;
  /** 금액 자리에 인쇄된 고정 문구 */
  amountText?: string;
  /** 정가 → 적용가 처럼 두 번째 금액 칸 */
  actual?: string;
  /** 비고 칸 (필드 키) */
  note?: string;
  noteText?: string;
}

export interface DocTable {
  title: string;
  /** 공급가 · VAT 10% · 합계 열 (웨딩 ITEM 표) */
  vat?: boolean;
  rows: DocItem[];
  foot?: string[];
}

export interface DocHost {
  label: string;
  name: string;
  phone?: string;
  email?: string;
  en?: string;
  cashReceipt?: string;
}

export interface DocLayout {
  overline: string;
  title: string;
  info: { label: string; key: string; when?: boolean; wide?: boolean }[];
  hosts: DocHost[];
  /** 주최자 줄과 따로 보이는 E-mail 칸 */
  email?: string;
  address: string[];
  guarantee?: string[];
  depositNote?: string;
  tables: DocTable[];
  /** 여러 표를 나란히 */
  tablesSideBySide?: boolean;
  tableFoot?: string;
  vendors?: { title: string; rows: { label: string; key?: string }[]; note: string };
  drinks: { label: string; price: string }[];
  drinksNote?: string;
  buffet: { childAge: string; guestsKey?: string; notes: string[] };
  side: { title: string; lines: string[] }[];
  notesKey?: string;
  /** 앞면 '행사규정' (시기 → 내용) */
  rules: [string, string][];
  /** 위약금 기준 금액 (양식 문구: 정상가 총 · 정상금액) */
  rulesBase: string;
  rulesNote?: string;
  /** 뒷면 1항의 예약금 반환 문구 */
  clause1Refund: string;
  /** 뒷면 12항 (백일 전 이벤트) */
  clause12: boolean;
}

const PARKING = ['본 건물 이용 시 2시간 30분 무료', '행사 차량 3대 무료 주차 (본 건물 이용 시)', '제1·2 공영주차장 이용 시 2시간 무료'];
const VENDOR_NOTE = '외부 업체는 조기 마감될 수 있습니다. 직접 업체 문의 후 진행하시기 바랍니다. (본인 준비)';
const REFUND_7 = '예약금은 계약 후 7일 이후 반환되지 않습니다.';
/** 앞면 행사규정의 위약금 단계 — 기준 금액(정상가 총액 · 정상 금액)은 rulesBase 로 표 아래에 적습니다 */
const tiers: [string, string][] = [
  ['행사일로부터 90일 전 취소 시', '10% 위약금 배상'],
  ['행사일로부터 30일 전 취소 시', '30% 위약금 배상'],
  ['행사일로부터 10일 전 취소 시', '50% 위약금 배상'],
];

export const DOC_LAYOUTS: Record<ContractTemplateId, DocLayout> = {
  dol: {
    overline: 'FIRST BIRTHDAY CONTRACT',
    title: '돌잔치 계약서',
    info: [
      { label: '행사 일시', key: 'eventDate', when: true },
      { label: '장소', key: 'hall' },
      { label: '행사명', key: 'eventName' },
      { label: '보증 인원', key: 'guests' },
    ],
    hosts: [
      { label: '아빠', name: 'host1Name', phone: 'host1Phone' },
      { label: '엄마', name: 'host2Name', phone: 'host2Phone' },
    ],
    address: ['address', 'address2'],
    guarantee: ['보증은 대인 기준으로 미달 시 100% 지급합니다.', '보증 인원에 소인은 별도입니다.'],
    depositNote: '입금 후 반드시 문자 주세요!',
    tables: [
      {
        title: '품목',
        rows: [
          {
            label: '돌상 패키지 (홀 대관료 포함)',
            desc: '모조 떡·모조 케이크 · 성장 동영상 제작 및 모바일 초대장 · 돌잡이 용품 / 이벤트 응모권 · 포토테이블 세팅 · 웰컴보드 · 전문 사회 MC · 헬륨 풍선 데코레이션 (포토) · 케이크 토퍼',
            amount: 'packagePrice',
          },
        ],
        foot: ['부가세 10% 별도입니다.'],
      },
    ],
    vendors: {
      title: '협력 업체 (선택 사항)',
      rows: [
        { label: '스냅 촬영', key: 'vendorSnap' },
        { label: 'Hair & Make-up', key: 'vendorHair' },
        { label: '의상', key: 'vendorDress' },
        { label: '답례품', key: 'vendorGift' },
        { label: '이벤트 선물', key: 'vendorEvent' },
      ],
      note: VENDOR_NOTE,
    },
    drinks: [
      { label: '주류 (병소주 · 병맥주)', price: '각 6,000원' },
      { label: '캔음료 · 하늘보리', price: '각 3,000원' },
    ],
    buffet: { childAge: '5세 ~ 초등 3학년', notes: ['식대 부가세 10% 포함, 봉사료 5% 별도입니다.'] },
    side: [
      { title: '이벤트 할인 내역', lines: ['당일 계약 식대 2,000원 할인', '계약 후기 & 댓글 이벤트 작성 시 5,000원 할인 (2주일 이내)'] },
      { title: '안내', lines: ['포토테이블 사진 5×7 사이즈 6장 인화해 오세요!', '주차는 본 건물 이용 시 주인공 차량 무료 가능합니다.'] },
    ],
    rules: [['계약 후 1일 이내', '계약금 반환 (이후 반환 불가)'], ...tiers],
    rulesBase: '정상가 총액',
    clause1Refund: REFUND_7,
    clause12: true,
  },
  birthday: {
    overline: 'BANQUET CONTRACT',
    title: '생신 · 연회 계약서',
    info: [
      { label: '행사 일시', key: 'eventDate', when: true },
      { label: '장소', key: 'hall' },
      { label: '행사명', key: 'eventName' },
      { label: '보증 인원', key: 'guests' },
    ],
    hosts: [
      { label: '주최자', name: 'host1Name', phone: 'host1Phone', email: 'host1Email' },
      { label: '주최자 2', name: 'host2Name', cashReceipt: 'cashReceipt' },
    ],
    address: ['address', 'address2'],
    depositNote: '예약금은 반환되지 않습니다.',
    tablesSideBySide: true,
    tables: [
      {
        title: '품목',
        rows: [
          { label: '홀 대관료', amount: 'itemRental', note: 'itemRentalNote' },
          { label: '생신상 (기본)', desc: '떡 모조 / 케이크 생물', amount: 'itemTable', note: 'itemTableNote' },
          { label: '떡 · 과일 (생물)', amount: 'itemFruit' },
          { label: '사회자', amount: 'itemMc' },
          { label: '현수막', amount: 'itemBanner', note: 'itemBannerNote' },
          { label: '헌주상', amount: 'itemToast' },
          { label: '모바일 초대장', amount: 'itemInvite', note: 'itemInviteNote' },
          { label: '포토테이블', amount: 'itemPhoto' },
        ],
      },
      {
        title: '추가 옵션',
        rows: [
          { label: '밴드 1인', desc: '진행 + 노래방 기계', amount: 'itemBand1' },
          { label: '밴드 2인', desc: '진행 + 노래방 기계 + 국악인', amount: 'itemBand2' },
          { label: '노래방', amount: 'itemKaraoke' },
          { label: '사진 · 의상 · 메이크업', amountText: '', noteText: '엔젤 협력 이용 가능' },
          { label: '답례품', amountText: '' },
          { label: '외부 밴드 반입비', amountText: '100,000원' },
        ],
        foot: ['추가 옵션 사항은 별도 추가 사항입니다. 개별 신청 또는 예약실로 문의 주세요. 약 1달 전 신청 시 진행이 원활합니다.'],
      },
    ],
    tableFoot: 'VAT 별도입니다.',
    drinks: [
      { label: '주류 (소주 · 맥주)', price: '6,000원' },
      { label: '캔음료 · 하늘보리 등', price: '3,000원' },
    ],
    drinksNote: '이용 시 별도 추후 계산합니다.',
    buffet: { childAge: '5세 ~ 초등 3학년', notes: ['보증 인원에 소인은 별도입니다.', '계절에 따라 메뉴는 변경될 수 있습니다.', '미달 시 (성인 기준) 100% 계산', '부가세 10% 포함, 봉사료 5% 별도'] },
    side: [{ title: '주차 안내', lines: ['본 건물 이용 시 2시간 30분 무료', '행사 차량 3대 무료 주차 (본 건물 이용 시)', '장기1 · 장기2 공영주차장 이용 시 2시간 무료'] }],
    rules: [['계약일로부터 1일 이내 해지 시', '계약금 반환 (이후 반환 불가)'], ...tiers, ['행사 전날 · 당일 취소 시', '100% 위약금 배상']],
    rulesBase: '정상가 총액',
    clause1Refund: REFUND_7,
    clause12: false,
  },
  wedding: {
    overline: 'WEDDING CONTRACT',
    title: '웨딩 계약서',
    info: [
      { label: '행사 일시', key: 'eventDate', when: true },
      { label: '장소', key: 'hall' },
      { label: '행사명', key: 'eventName' },
      { label: '보증 인원', key: 'guests' },
    ],
    hosts: [
      { label: '신랑', name: 'host1Name', phone: 'host1Phone', en: 'host1En' },
      { label: '신부', name: 'host2Name', phone: 'host2Phone', en: 'host2En' },
    ],
    email: 'host1Email',
    address: ['address'],
    depositNote: '예약금은 반환되지 않습니다.',
    tables: [
      {
        title: '웨딩 아이템',
        vat: true,
        rows: [
          { label: '웨딩 패키지', desc: '조화 꽃장식 · 버진로드 · 빔프로젝트 · 음향 시설 · 혼인서약서 · 성혼선언문 · 혼구 용품', amount: 'itemPackage' },
          { label: '생화 장식', desc: '생화 꽃길 · 메인 장식 · 테이블 꽃장식 등', amount: 'itemFlower' },
          { label: '웨딩 전문 사회자', desc: '사전 컨택하여 식순 안내 및 준비', amount: 'itemMc' },
          { label: '생화 부케', desc: '디자인 선택 가능', amount: 'itemBouquet' },
          { label: '포토 배너', desc: '필수 포토존 세팅', amount: 'itemBanner' },
          { label: '케이크 & 와인', desc: '수제 1단 케이크 & 와인 1병', amount: 'itemCake' },
        ],
      },
    ],
    vendors: {
      title: '협력 업체 (선택 사항)',
      rows: [{ label: '스냅' }, { label: '드레스' }, { label: '헤어 & 메이크업' }],
      note: VENDOR_NOTE,
    },
    drinks: [
      { label: '주류 (소주 · 맥주)', price: '6,000원' },
      { label: '캔음료 · 하늘보리 등', price: '3,000원' },
      { label: '테이블 기본 세팅', price: '포함' },
    ],
    drinksNote: '와인·복분자 등 다른 주류 상담 가능합니다. (개인 주류 반입은 금지합니다.)',
    buffet: {
      childAge: '5세 ~ 11세',
      notes: [
        '보증 인원 대인 기준, 소인 (5 ~ 10세)',
        '계절에 따라 메뉴는 변경될 수 있습니다.',
        '뷔페 보증 인원은 20% 여유 음식 준비',
        '미달 시 (성인 기준) 100% 계산',
        '식음료 부가세 포함, 봉사료 5% 별도',
      ],
    },
    side: [{ title: '주차 안내', lines: PARKING }],
    notesKey: 'notes',
    rules: [['예약일로부터 1일 이내 해지 시', '예약금 반환 (이후 반환 불가)'], ...tiers],
    rulesBase: '정상 금액',
    rulesNote: '행사장은 10분 전 입장 가능합니다. 마감 시간은 계약 시간과 동일합니다.',
    clause1Refund: '예약금은 계약일로부터 7일 이내 취소 시 100% 환불, 7일 이후 취소 시 환불 불가합니다.',
    clause12: true,
  },
  banquet: {
    overline: 'BANQUET CONTRACT',
    title: '연회 계약서',
    info: [
      { label: '행사 일시', key: 'eventDate', when: true, wide: true },
      { label: '장소', key: 'hall' },
      { label: '행사명', key: 'eventName' },
      { label: '좌석 수', key: 'seats' },
      { label: '보증 인원', key: 'guests' },
    ],
    hosts: [
      { label: '담당자', name: 'host1Name', phone: 'host1Phone', email: 'host1Email' },
      { label: '담당자 2', name: 'host2Name', phone: 'host2Phone' },
    ],
    address: ['address'],
    tablesSideBySide: true,
    tables: [
      {
        title: '품목',
        rows: [
          { label: '대관료', desc: '빔프로젝트 · 단상 · 마이크 (VAT 포함)', amount: 'itemRental', actual: 'itemRentalActual' },
          { label: '레크리에이션', amount: 'itemRecreation' },
          { label: '밴드 1인조', amount: 'itemBand1' },
          { label: '밴드 2인조', amount: 'itemBand2' },
          { label: '밴드 + 레크리에이션', amount: 'itemBandRec' },
          { label: '노래방 기기 대여', amount: 'itemKaraoke' },
        ],
        foot: ['레크리에이션 · 밴드는 이용 시 최소 3주 전 선택하셔야 원활한 진행이 가능합니다.', '당일 현금 결제 시 / 이체·카드 결제 시 부가세 별도'],
      },
      {
        title: '품목',
        rows: [
          { label: '샴페인 타워', amount: 'itemChampagne' },
          { label: '현수막', amount: 'itemBanner', note: 'itemBannerNote' },
        ],
      },
    ],
    drinks: [
      { label: '주류 (소주 · 맥주)', price: '6,000원' },
      { label: '캔음료 · 하늘보리 등', price: '3,000원' },
      { label: '생맥주 · 음료', price: '디스펜서 무제한' },
    ],
    drinksNote: '테이블 기본 세팅 · 와인·복분자 등 다른 주류 상담 가능합니다. (개인 주류 반입은 금지합니다.)',
    buffet: {
      childAge: '5세 ~ 10세',
      guestsKey: 'buffetGuests',
      notes: ['식대 부가세 포함', '식·주류·음료 봉사료 5% 별도', '계절에 따라 메뉴는 변경될 수 있습니다.', '미달 시 (성인 기준) 100% 계산'],
    },
    side: [{ title: '주차 안내', lines: PARKING }],
    rules: [['다음 달 행사', '계약금 환불 불가'], ...tiers],
    rulesBase: '정상 금액',
    clause1Refund: REFUND_7,
    clause12: true,
  },
};

/** 뒷면 '행사 계약 규정' 4항의 위약금 표 */
export const CLAUSE4_TABLE: [string, string][] = [
  ['행사 예정일 30일 전까지 취소', '10%'],
  ['20일 전까지 (29 ~ 20일) 취소', '20%'],
  ['10일 전까지 (19 ~ 10일) 취소', '30%'],
  ['9 ~ 2일 전 취소', '50%'],
  ['1일 전 취소', '70%'],
  ['행사 당일 취소', '100%'],
];

/** 뒷면 2 ~ 11항 (1·4·12항은 문서에서 따로 그림) — 양식 문구 그대로, 띄어쓰기만 다듬었습니다 */
export const CLAUSES: Record<number, string> = {
  2: '행사비는 행사 종료 후 지불하되 지불 보증한 인원은 지불 보증된 인원보다 적은 인원의 서비스를 받았을지라도 보증된 인원은 물론 기타 비용에 대해서도 지불하셔야 합니다.',
  3: '최저 행사 인원수에 변동이 생기는 경우 행사 주최자는 늦어도 행사가 시작되기 일주일 전에 당사로 그 변동 사항을 알려 주셔야 하며, 알려 주지 못함으로 인하여 발생하는 문제는 행사 주최자가 책임을 지게 됩니다. 단, 계약상의 보증 인원수보다 하향 조정은 불가합니다.',
  5: '행사일, 행사 장소 변경은 행사일 30일 전까지 가능하고 이후 변경할 수 없습니다.',
  6: '불가항력 또는 기타 당사의 책임 없는 사유로 인하여 행사 장소를 사용할 수 없게 된 경우에는 당사는 행사 주최자에게 다른 장소를 대체해 드릴 수 있는 권리를 갖습니다. 이에 행사 주최자께서 대체된 장소를 원하지 않으시는 경우 행사 주최자께서는 예약을 취소하실 수 있으며, 이때 이미 지불된 계약금은 전액 환불하여 드립니다. 또한 행사 주최자께서는 일절 손해배상 청구를 할 수 없습니다.',
  7: '행사 주최자는 임의대로 연회장에 식음료를 반입할 수 없으며, 당사 측의 동의 없이 당사 내부에 어떠한 물건도 진열할 수 없습니다.',
  8: '행사 주최자께서는 예정된 행사 장소에서 명시한 폐회 시간까지 행사 주최자의 손님, 피초청인 그리고 기타 참석하신 분들이 퇴장하도록 하시는 데 동의하십니다. 아울러 행사 주최자께서는 폐회 시간을 지키지 않은 이유로 당사에서 청구하는 기타 초과 비용 또는 초과 근무 수당 등을 지불하시는 데 동의합니다.',
  9: '행사 주최자께서는 행사에 참여하시는 행사 주최자의 손님 그리고 행사 주최자 자신으로 인하여 당사의 재산, 기물에 발생된 모든 손실 및 파손에 대한 보상 책임을 지며 당사는 이에 대한 보수 및 대체 비용을 최종 청구 금액에 포함시킬 수 있습니다.',
  10: '행사 주최자께서는 계약하신 시간까지만 연회장을 이용하실 수 있으며 예약하신 시간 이상의 경우에는 주최 측의 동의 없이 행사장을 임의로 철수하는 데 동의합니다.',
  11: '취소 시 시식 인원은 지불해 주셔야 합니다.',
};
