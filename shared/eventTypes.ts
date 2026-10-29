import type { EventType, FieldValue, Honorees, Requirements } from './types';

export type FieldKind =
  | 'text'
  | 'tel'
  | 'email'
  | 'date'
  | 'time'
  | 'textarea'
  | 'select'
  | 'radio'
  | 'multi'
  | 'toggle'
  | 'counter'
  | 'hall';

export interface FieldOption {
  value: string;
  label: string;
  desc?: string;
  catalogKey?: string;
}

export interface FieldDef {
  key: string;
  label: string;
  kind: FieldKind;
  required?: boolean;
  hint?: string;
  placeholder?: string;
  options?: FieldOption[];
  /** toggle 이 켜지거나 counter 값이 있으면 이 가격 항목이 견적에 들어갑니다 */
  catalogKey?: string;
  min?: number;
  max?: number;
  suffix?: string;
  /** cards: 큰 선택 카드, chips: 작은 칩 */
  layout?: 'cards' | 'chips';
  showIf?: { key: string; equals: FieldValue };
  defaultValue?: FieldValue;
}

export interface SectionDef {
  id: string;
  title: string;
  desc?: string;
  fields: FieldDef[];
}

export interface EventTypeConfig {
  id: EventType;
  label: string;
  labelEn: string;
  /** 헤드라인 끝말: “…의 행복한 웨딩까지” */
  ddayNoun: string;
  /** 행사 당일 인사말: “오늘은 행복한 웨딩 날이에요” */
  dayGreeting: string;
  tagline: string;
  highlights: string[];
  guestRange: [number, number];
  defaultTime: string;
  usesHall: boolean;
  honoreeFields: FieldDef[];
  sections: SectionDef[];
}

// ── 공통 필드 ─────────────────────────────────────────
const hallField: FieldDef = { key: 'hallId', label: '진행 홀', kind: 'hall', required: true, hint: '문의하신 홀이 선택되어 있어요. 인원에 따라 다른 홀을 추천해 드릴 수 있어요.' };
const adults = (label = '성인 인원'): FieldDef => ({ key: 'guestsAdult', label, kind: 'counter', required: true, min: 1, max: 300, suffix: '명' });
const kids: FieldDef = { key: 'guestsKids', label: '소인 인원 (만 4~12세)', kind: 'counter', min: 0, max: 100, suffix: '명', hint: '만 3세 이하는 무료입니다.' };

const menuTier: FieldDef = {
  key: 'menuTier',
  label: '뷔페 코스',
  kind: 'radio',
  layout: 'cards',
  required: true,
  options: [
    { value: 'standard', label: '스탠다드 뷔페', desc: '한·중·일·양식 80여 가지 · 즉석 조리 코너', catalogKey: 'food_standard' },
    { value: 'premium', label: '프리미엄 뷔페', desc: '프리미엄 120여 가지 메뉴 · 호텔 출신 셰프 즉석 조리', catalogKey: 'food_premium' },
    { value: 'signature', label: '시그니처 뷔페', desc: '그릴 스테이크 · 초밥 · 생선회 시스 코너 + 계절 메뉴', catalogKey: 'food_signature' },
  ],
};

const drinks: FieldDef = {
  key: 'drinks',
  label: '음료 · 주류',
  kind: 'radio',
  layout: 'chips',
  required: true,
  defaultValue: 'soft',
  options: [
    { value: 'soft', label: '음료 무제한 (기본)', catalogKey: 'drink_soft' },
    { value: 'alcohol', label: '주류 무제한', desc: '맥주·소주·하우스 와인', catalogKey: 'drink_alcohol' },
    { value: 'corkage', label: '주류 반입 (콜키지)', catalogKey: 'drink_corkage' },
  ],
};

const allergy: FieldDef = { key: 'allergy', label: '알레르기 · 채식 하객', kind: 'textarea', placeholder: '예) 견과류 알레르기 2명, 채식 1명' };

const gifts: FieldDef = {
  key: 'gifts',
  label: '답례품',
  kind: 'radio',
  layout: 'chips',
  defaultValue: 'none',
  options: [
    { value: 'none', label: '준비 안 함' },
    { value: 'ricecake', label: '답례 떡 세트', catalogKey: 'gift_ricecake' },
    { value: 'cookie', label: '수제 쿠키 박스', catalogKey: 'gift_cookie' },
  ],
};

const notes: SectionDef = {
  id: 'notes',
  title: '그 밖의 요청사항',
  fields: [{ key: 'requests', label: '엔젤스데이에 전하고 싶은 말', kind: 'textarea', placeholder: '원하시는 분위기, 꼭 챙겨야 할 분, 걱정되는 점 등 무엇이든 적어 주세요.' }],
};

const videoField = (label: string): FieldDef => ({
  key: 'video',
  label,
  kind: 'radio',
  layout: 'chips',
  defaultValue: 'none',
  options: [
    { value: 'none', label: '없음' },
    { value: 'play', label: '준비한 영상 상영', catalogKey: 'av_video_play' },
    { value: 'make', label: '영상 제작 의뢰', catalogKey: 'av_video_make' },
  ],
});

const taxSection: SectionDef = {
  id: 'billing',
  title: '정산 정보',
  fields: [
    { key: 'taxInvoice', label: '세금계산서 발행', kind: 'toggle' },
    { key: 'bizNo', label: '사업자등록번호', kind: 'text', placeholder: '000-00-00000', showIf: { key: 'taxInvoice', equals: true } },
    { key: 'billingEmail', label: '계산서 수신 이메일', kind: 'email', showIf: { key: 'taxInvoice', equals: true } },
  ],
};

export const EVENT_TYPES: Record<EventType, EventTypeConfig> = {
  wedding: {
    id: 'wedding',
    label: '스몰웨딩',
    labelEn: 'SMALL WEDDING',
    ddayNoun: '웨딩',
    dayGreeting: '오늘은 두 분의 행복한 웨딩 날이에요',
    tagline: '도심 전망과 함께하는 프라이빗 웨딩',
    highlights: ['통창으로 펼쳐지는 스카이라운지 뷰와 자연채광', '50명~250명 규모의 맞춤형 웨딩 및 피로연', '200명 이상 행사 시 400평 전체 공간 4시간 단독 이용'],
    guestRange: [50, 250],
    defaultTime: '13:30',
    usesHall: true,
    honoreeFields: [
      { key: 'groom', label: '신랑 이름', kind: 'text', required: true, placeholder: '이몽룡' },
      { key: 'bride', label: '신부 이름', kind: 'text', required: true, placeholder: '성춘향' },
    ],
    sections: [
      {
        id: 'space',
        title: '예식 공간과 하객',
        fields: [
          hallField,
          adults('예상 성인 하객'),
          kids,
          {
            key: 'ceremonyParts',
            label: '본식 외 추가 진행',
            kind: 'multi',
            layout: 'cards',
            hint: '본식은 기본으로 포함돼요.',
            options: [
              { value: 'paebaek', label: '폐백', desc: '폐백실 · 폐백 음식 · 수모 진행', catalogKey: 'wed_paebaek' },
              { value: 'afterparty', label: '애프터파티', desc: '본식 후 2시간 · 핑거푸드와 음료 · DJ 음악', catalogKey: 'wed_afterparty' },
            ],
          },
          { key: 'bridalRoom', label: '신부대기실 · 메이크업&의상실', kind: 'toggle', catalogKey: 'wed_bridalroom', hint: '통창 자연채광과 풍성한 플라워 스타일링의 신부대기실', defaultValue: true },
        ],
      },
      {
        id: 'flower',
        title: '꽃장식',
        fields: [
          {
            key: 'flowerTier',
            label: '꽃장식 구성',
            kind: 'radio',
            layout: 'cards',
            required: true,
            options: [
              { value: 'standard', label: '스탠다드 생화', desc: '버진로드 · 포토테이블 · 테이블 센터피스', catalogKey: 'wed_flower_standard' },
              { value: 'premium', label: '프리미엄 생화', desc: '스탠다드 + 메인 아치 · 신부대기실 플라워', catalogKey: 'wed_flower_premium' },
              { value: 'signature', label: '시그니처 플라워', desc: '플로리스트 1:1 디자인 · 천장 행잉 장식', catalogKey: 'wed_flower_signature' },
            ],
          },
          {
            key: 'flowerTone',
            label: '컬러 톤',
            kind: 'radio',
            layout: 'chips',
            options: [
              { value: 'white-green', label: '화이트 & 그린' },
              { value: 'blush', label: '블러쉬 핑크' },
              { value: 'peach', label: '피치 & 코랄' },
              { value: 'classic-red', label: '클래식 레드' },
              { value: 'planner', label: '플래너 추천' },
            ],
          },
          { key: 'flowerNote', label: '원하시는 꽃·분위기', kind: 'text', placeholder: '예) 작약, 수국 위주의 내추럴한 느낌' },
        ],
      },
      {
        id: 'food',
        title: '식사',
        fields: [menuTier, drinks, { key: 'cake', label: '웨딩 케이크', kind: 'toggle', catalogKey: 'wed_cake' }, { key: 'tasting', label: '메뉴 시식 희망', kind: 'toggle', hint: '예약 확정 후 2인 시식 일정을 안내드려요.' }, allergy],
      },
      {
        id: 'photo',
        title: '촬영',
        fields: [
          {
            key: 'snap',
            label: '본식 스냅',
            kind: 'radio',
            layout: 'cards',
            defaultValue: 'none',
            options: [
              { value: 'none', label: '추가하지 않음', desc: '외부 작가와 진행하실 경우' },
              { value: 'basic', label: '본식 스냅 베이직', desc: '작가 1인 · 원본 전체 + 보정 30컷', catalogKey: 'photo_wed_basic' },
              { value: 'premium', label: '본식 스냅 프리미엄', desc: '작가 2인 · 원본 전체 + 보정 60컷 · 앨범', catalogKey: 'photo_wed_premium' },
            ],
          },
          { key: 'weddingVideo', label: '본식 하이라이트 영상', kind: 'toggle', catalogKey: 'photo_wed_video' },
        ],
      },
      {
        id: 'program',
        title: '진행 · 연출',
        fields: [
          { key: 'mc', label: '전문 사회자', kind: 'toggle', catalogKey: 'mc' },
          { key: 'singer', label: '축가 섭외', kind: 'toggle', catalogKey: 'singer' },
          {
            key: 'officiant',
            label: '주례',
            kind: 'radio',
            layout: 'chips',
            defaultValue: 'none',
            options: [
              { value: 'none', label: '주례 없는 예식' },
              { value: 'family', label: '지인·가족 주례' },
              { value: 'pro', label: '전문 주례 섭외', catalogKey: 'officiant' },
            ],
          },
          videoField('식전 영상'),
          gifts,
        ],
      },
      notes,
    ],
  },

  dol: {
    id: 'dol',
    label: '돌잔치',
    labelEn: 'FIRST BIRTHDAY',
    ddayNoun: '첫 생일 잔치',
    dayGreeting: '오늘은 아기의 소중한 첫 생일이에요',
    tagline: '첫 생일의 순간을 더욱 특별하게',
    highlights: ['자연채광이 가득한 리뉴얼 연회 공간', '그리너리 돌상과 감성 포토존이 어우러진 프라이빗 돌잔치', '15명~200명 규모 맞춤형 단독룸 운영'],
    guestRange: [15, 200],
    defaultTime: '11:00',
    usesHall: true,
    honoreeFields: [
      { key: 'baby', label: '아기 이름', kind: 'text', required: true, placeholder: '김하윤' },
      { key: 'babyBirth', label: '아기 생년월일', kind: 'date' },
    ],
    sections: [
      { id: 'space', title: '공간과 인원', fields: [hallField, adults(), kids] },
      {
        id: 'table',
        title: '돌상 · 연출',
        fields: [
          {
            key: 'dolsang',
            label: '돌상 스타일',
            kind: 'radio',
            layout: 'cards',
            required: true,
            options: [
              { value: 'greenery', label: '그리너리 돌상', desc: '엔젤스데이 시그니처 · 생화 그리너리 스타일링', catalogKey: 'dol_table_greenery' },
              { value: 'hanok', label: '전통 한상 돌상', desc: '한옥 포토존과 어울리는 전통 상차림', catalogKey: 'dol_table_traditional' },
              { value: 'premium', label: '프리미엄 테마 돌상', desc: '테마 기획 · 풍선·조형물 · 웰컴보드', catalogKey: 'dol_table_premium' },
            ],
          },
          {
            key: 'theme',
            label: '테마 컬러',
            kind: 'radio',
            layout: 'chips',
            options: [
              { value: 'ivory', label: '아이보리 & 골드' },
              { value: 'pastel', label: '파스텔' },
              { value: 'green', label: '그리너리' },
              { value: 'planner', label: '플래너 추천' },
            ],
          },
          { key: 'doljabi', label: '돌잡이 진행 (소품 포함)', kind: 'toggle', defaultValue: true, hint: '돌잡이 소품은 기본 제공돼요.' },
          { key: 'mc', label: '돌잔치 전문 사회자', kind: 'toggle', catalogKey: 'mc_dol' },
          videoField('성장 영상'),
        ],
      },
      { id: 'food', title: '식사', fields: [menuTier, drinks, allergy] },
      {
        id: 'photo',
        title: '촬영',
        fields: [
          {
            key: 'snap',
            label: '돌스냅',
            kind: 'radio',
            layout: 'cards',
            defaultValue: 'none',
            options: [
              { value: 'none', label: '추가하지 않음' },
              { value: 'snap', label: '돌스냅', desc: '작가 1인 · 2시간 · 보정 30컷', catalogKey: 'photo_dol' },
              { value: 'snapvideo', label: '돌스냅 + 하이라이트 영상', desc: '작가 2인 · 보정 40컷 · 1분 영상', catalogKey: 'photo_dol_video' },
            ],
          },
          gifts,
        ],
      },
      notes,
    ],
  },

  birthday: {
    id: 'birthday',
    label: '생신연',
    labelEn: 'BIRTHDAY BANQUET',
    ddayNoun: '잔치',
    dayGreeting: '오늘은 가족 모두가 함께하는 뜻깊은 날이에요',
    tagline: '소중한 분을 위한 품격 있는 가족연회',
    highlights: ['통창으로 펼쳐지는 스카이라운지 전망과 프라이빗 단독룸', '칠순 · 팔순 · 구순 · 생신연 · 가족모임 맞춤 진행', '정성껏 준비한 뷔페와 편안한 연회 공간'],
    guestRange: [20, 140],
    defaultTime: '11:00',
    usesHall: true,
    honoreeFields: [
      { key: 'honoree', label: '주인공 성함', kind: 'text', required: true, placeholder: '박영자' },
      {
        key: 'milestone',
        label: '어떤 잔치인가요?',
        kind: 'radio',
        layout: 'chips',
        required: true,
        defaultValue: '칠순',
        options: [
          { value: '환갑', label: '환갑 (61세)' },
          { value: '칠순', label: '칠순 (70세)' },
          { value: '팔순', label: '팔순 (80세)' },
          { value: '구순', label: '구순 (90세)' },
          { value: '생신연', label: '생신 · 가족모임' },
        ],
      },
    ],
    sections: [
      { id: 'space', title: '공간과 인원', fields: [hallField, adults(), kids] },
      {
        id: 'table',
        title: '상차림 · 장식',
        fields: [
          {
            key: 'tableStyle',
            label: '상차림',
            kind: 'radio',
            layout: 'cards',
            required: true,
            options: [
              { value: 'modern', label: '모던 테이블 세팅', desc: '플라워 센터피스와 케이크로 깔끔하게', catalogKey: 'bd_table_modern' },
              { value: 'traditional', label: '전통 고임상', desc: '과일·떡·한과 고임상 · 병풍 · 헌수 진행', catalogKey: 'bd_table_traditional' },
            ],
          },
          {
            key: 'flower',
            label: '꽃장식',
            kind: 'radio',
            layout: 'chips',
            defaultValue: 'basic',
            options: [
              { value: 'basic', label: '기본 테이블 플라워', catalogKey: 'bd_flower_basic' },
              { value: 'premium', label: '메인 포토월 플라워', catalogKey: 'bd_flower_premium' },
            ],
          },
          { key: 'banner', label: '축하 현수막 제작', kind: 'toggle', catalogKey: 'deco_banner' },
        ],
      },
      {
        id: 'program',
        title: '진행 · 공연',
        fields: [
          { key: 'mc', label: '전문 사회자 · 레크리에이션', kind: 'toggle', catalogKey: 'mc' },
          {
            key: 'performance',
            label: '축하 공연',
            kind: 'radio',
            layout: 'chips',
            defaultValue: 'none',
            options: [
              { value: 'none', label: '없음' },
              { value: 'gugak', label: '국악 공연', catalogKey: 'perf_gugak' },
              { value: 'band', label: '라이브 밴드', catalogKey: 'perf_band' },
            ],
          },
          videoField('가족 영상'),
        ],
      },
      { id: 'food', title: '식사', fields: [menuTier, drinks, { key: 'softMenu', label: '어르신을 위한 부드러운 메뉴 구성', kind: 'toggle', defaultValue: true }, allergy] },
      {
        id: 'photo',
        title: '촬영 · 답례',
        fields: [{ key: 'snap', label: '행사 스냅 촬영', kind: 'toggle', catalogKey: 'photo_event' }, { key: 'familyPhoto', label: '가족 단체 사진 (원판)', kind: 'toggle', catalogKey: 'photo_family' }, gifts],
      },
      notes,
    ],
  },

  corporate: {
    id: 'corporate',
    label: '기업행사 & 송년회',
    labelEn: 'CORPORATE EVENT',
    ddayNoun: '행사',
    dayGreeting: '오늘은 성공적인 행사의 날이에요',
    tagline: '고급스럽고 품위있는 단독홀',
    highlights: ['기업 행사에 따른 맞춤형 행사 기획', '취임식, 퇴임식, 송년회, 세미나, 워크샵 등 각종 기업행사', '20년 경력 파티디렉터의 맞춤형 행사 컨설팅'],
    guestRange: [20, 250],
    defaultTime: '18:00',
    usesHall: true,
    honoreeFields: [
      { key: 'company', label: '회사 · 기관명', kind: 'text', required: true, placeholder: '(주)한강테크' },
      { key: 'eventName', label: '행사명', kind: 'text', required: true, placeholder: '2026 송년회' },
      {
        key: 'eventKind',
        label: '행사 성격',
        kind: 'radio',
        layout: 'chips',
        defaultValue: 'yearend',
        options: [
          { value: 'yearend', label: '송년회 · 신년회' },
          { value: 'seminar', label: '세미나 · 워크숍' },
          { value: 'ceremony', label: '취임 · 퇴임 · 시상식' },
          { value: 'dinner', label: 'VIP 만찬 · 회식' },
          { value: 'etc', label: '기타' },
        ],
      },
    ],
    sections: [
      {
        id: 'space',
        title: '공간과 인원',
        fields: [
          hallField,
          adults('참석 인원'),
          {
            key: 'seating',
            label: '좌석 배치',
            kind: 'radio',
            layout: 'chips',
            required: true,
            defaultValue: 'banquet',
            options: [
              { value: 'banquet', label: '원탁 연회형' },
              { value: 'theater', label: '극장식' },
              { value: 'classroom', label: '강의식' },
              { value: 'standing', label: '스탠딩 칵테일' },
            ],
          },
        ],
      },
      {
        id: 'program',
        title: '장비 · 진행',
        fields: [
          {
            key: 'av',
            label: '음향 · 영상 장비',
            kind: 'multi',
            layout: 'chips',
            options: [
              { value: 'projector', label: '빔프로젝터 · 스크린', catalogKey: 'av_projector' },
              { value: 'sound', label: '무선마이크 · 음향', catalogKey: 'av_sound' },
              { value: 'stage', label: '무대 · 조명', catalogKey: 'av_stage' },
            ],
          },
          { key: 'mc', label: '전문 MC', kind: 'toggle', catalogKey: 'mc' },
          {
            key: 'performance',
            label: '공연',
            kind: 'radio',
            layout: 'chips',
            defaultValue: 'none',
            options: [
              { value: 'none', label: '없음' },
              { value: 'band', label: '라이브 밴드', catalogKey: 'perf_band' },
              { value: 'gugak', label: '국악 공연', catalogKey: 'perf_gugak' },
            ],
          },
          {
            key: 'deco',
            label: '현수막 · 포토월',
            kind: 'radio',
            layout: 'chips',
            defaultValue: 'none',
            options: [
              { value: 'none', label: '없음' },
              { value: 'banner', label: '현수막', catalogKey: 'deco_banner' },
              { value: 'photowall', label: '포토월', catalogKey: 'deco_photowall' },
            ],
          },
        ],
      },
      { id: 'food', title: '식사', fields: [menuTier, drinks, { key: 'coffeeBreak', label: '커피 브레이크 (세미나용)', kind: 'toggle', catalogKey: 'food_coffee_break' }, allergy] },
      { id: 'photo', title: '촬영', fields: [{ key: 'snap', label: '행사 기록 촬영', kind: 'toggle', catalogKey: 'photo_event' }] },
      taxSection,
      notes,
    ],
  },

  catering: {
    id: 'catering',
    label: '출장뷔페 & 케이터링',
    labelEn: 'CATERING',
    ddayNoun: '케이터링 행사',
    dayGreeting: '오늘은 엔젤스데이가 찾아가는 날이에요',
    tagline: '7,000건 이상의 행사 경험이 만든 프리미엄 케이터링',
    highlights: ['기업행사 · 정부기관 · 문화행사 · 웨딩 · 가족연회 진행', '20년 경력 파티디렉터의 맞춤형 행사 컨설팅', '케이터링부터 현장 운영까지 원스톱 서비스'],
    guestRange: [20, 1000],
    defaultTime: '12:00',
    usesHall: false,
    honoreeFields: [
      { key: 'organization', label: '단체 · 회사명', kind: 'text', required: true, placeholder: '김포중앙교회' },
      { key: 'eventName', label: '행사명', kind: 'text', required: true, placeholder: '창립 30주년 기념 행사' },
      { key: 'location', label: '행사 장소 (주소)', kind: 'text', required: true, placeholder: '경기도 김포시 …' },
    ],
    sections: [
      {
        id: 'place',
        title: '장소와 인원',
        fields: [
          { key: 'location', label: '행사 장소 (주소)', kind: 'text', required: true },
          {
            key: 'venueType',
            label: '장소 유형',
            kind: 'radio',
            layout: 'chips',
            required: true,
            options: [
              { value: 'office', label: '사무실 · 기업' },
              { value: 'institution', label: '교회 · 학교 · 기관' },
              { value: 'outdoor', label: '야외 · 캠핑장' },
              { value: 'home', label: '자택 홈파티' },
              { value: 'etc', label: '기타' },
            ],
          },
          adults('예상 인원'),
          {
            key: 'elevator',
            label: '반입 동선',
            kind: 'radio',
            layout: 'chips',
            defaultValue: 'elevator',
            options: [
              { value: 'elevator', label: '엘리베이터 있음' },
              { value: 'ground', label: '1층 · 지상' },
              { value: 'stairs', label: '계단 반입 필요' },
            ],
          },
          { key: 'parking', label: '행사장 앞 차량 진입 · 정차 가능', kind: 'toggle', defaultValue: true },
          { key: 'setupTime', label: '세팅 완료 희망 시각', kind: 'time', defaultValue: '11:00' },
        ],
      },
      {
        id: 'menu',
        title: '서비스 형태',
        fields: [
          {
            key: 'serviceType',
            label: '케이터링 구성',
            kind: 'radio',
            layout: 'cards',
            required: true,
            options: [
              { value: 'full', label: '풀 뷔페 (셰프 동행)', desc: '현장 즉석 조리 · 뷔페 라인 세팅 · 운영 인력', catalogKey: 'cat_full_buffet' },
              { value: 'finger', label: '핑거푸드 케이터링', desc: '카나페 · 샌드위치 · 디저트 · 음료 스탠딩', catalogKey: 'cat_finger' },
              { value: 'lunchbox', label: '프리미엄 도시락', desc: '세미나 · 행사용 개별 도시락', catalogKey: 'cat_lunchbox' },
              { value: 'homeparty', label: '홈파티 박스', desc: '4인 기준 플래터 세트 · 배송', catalogKey: 'cat_homeparty' },
            ],
          },
          drinks,
          allergy,
        ],
      },
      {
        id: 'equipment',
        title: '장비 · 인력',
        fields: [
          { key: 'tables', label: '테이블 · 의자 대여', kind: 'toggle', catalogKey: 'eq_tables' },
          { key: 'tents', label: '야외 텐트', kind: 'counter', catalogKey: 'eq_tent', min: 0, max: 20, suffix: '동' },
          { key: 'servers', label: '서빙 인력 추가', kind: 'counter', catalogKey: 'staff_server', min: 0, max: 30, suffix: '명', hint: '풀 뷔페에는 기본 운영 인력이 포함돼요.' },
        ],
      },
      taxSection,
      notes,
    ],
  },
};

export const EVENT_TYPE_LIST: EventType[] = ['wedding', 'dol', 'birthday', 'corporate', 'catering'];

export function eventConfig(t: EventType): EventTypeConfig {
  return EVENT_TYPES[t];
}

/** 주인공 표시 이름 — 리스트/관리자 화면용 */
export function honoreeLabel(t: EventType, h: Honorees): string {
  switch (t) {
    case 'wedding':
      return `${h.primary} ♥ ${h.secondary ?? ''}`;
    case 'dol':
      return `${h.primary} 첫돌`;
    case 'birthday':
      return `${h.primary}님 ${h.detail ?? '생신연'}`;
    default:
      return `${h.primary} ${h.detail ?? ''}`.trim();
  }
}

/** 캘린더용 행사명 — ‘김진명&이진향 웨딩’, ‘박진연 칠순연’, ‘오아시스13기 송년회’ */
export function calendarName(t: EventType, h: Honorees): string {
  switch (t) {
    case 'wedding':
      return `${h.primary}&${h.secondary ?? ''} 웨딩`;
    case 'dol':
      return `${h.primary} 돌잔치`;
    case 'birthday': {
      const m = h.detail || '생신연';
      return `${h.primary} ${m.endsWith('연') ? m : `${m}연`}`;
    }
    case 'corporate':
    case 'catering':
      return `${h.primary} ${h.detail ?? ''}`.trim();
  }
}

/** 고객 페이지 헤드라인. 강조할 이름은 [[ ]] 로 감쌉니다. */
export function headline(t: EventType, h: Honorees): string {
  switch (t) {
    case 'wedding':
      return `[[${h.primary}]]님과 [[${h.secondary ?? ''}]]님의\n행복한 웨딩까지`;
    case 'dol':
      return `[[${h.primary}]] 아기의\n소중한 첫 생일까지`;
    case 'birthday':
      return `[[${h.primary}]]님의\n뜻깊은 ${h.detail ?? '생신연'}까지`;
    case 'corporate':
      return `[[${h.primary}]]\n${h.detail ?? '행사'}까지`;
    case 'catering':
      return `[[${h.primary}]]\n${h.detail ?? '케이터링 행사'}까지`;
  }
}

export function headlinePlain(t: EventType, h: Honorees): string {
  return headline(t, h).replace(/\[\[|\]\]/g, '').replace(/\n/g, ' ');
}

/** 문의 폼 값 → Honorees */
export function honoreesFromForm(t: EventType, v: Requirements): Honorees {
  const s = (k: string) => String(v[k] ?? '').trim();
  switch (t) {
    case 'wedding':
      return { primary: s('groom'), secondary: s('bride') };
    case 'dol':
      return { primary: s('baby'), detail: '첫돌' };
    case 'birthday':
      return { primary: s('honoree'), detail: s('milestone') || '생신연' };
    case 'corporate':
      return { primary: s('company'), detail: s('eventName') };
    case 'catering':
      return { primary: s('organization'), detail: s('eventName') };
  }
}

export function allFields(t: EventType): FieldDef[] {
  return EVENT_TYPES[t].sections.flatMap((s) => s.fields);
}

export function isFieldVisible(f: FieldDef, values: Requirements): boolean {
  if (!f.showIf) return true;
  return values[f.showIf.key] === f.showIf.equals;
}

export function defaultRequirements(t: EventType): Requirements {
  const r: Requirements = {};
  for (const f of allFields(t)) if (f.defaultValue !== undefined) r[f.key] = f.defaultValue;
  return r;
}

export function missingRequired(t: EventType, values: Requirements): FieldDef[] {
  return allFields(t).filter((f) => {
    if (!f.required || !isFieldVisible(f, values)) return false;
    const v = values[f.key];
    if (v === undefined || v === null || v === '') return true;
    if (Array.isArray(v)) return v.length === 0;
    if (f.kind === 'counter') return Number(v) <= 0;
    return false;
  });
}

/** 선택된 값을 사람이 읽을 수 있는 문자열로 */
export function displayValue(f: FieldDef, v: FieldValue | undefined): string {
  if (v === undefined || v === '' || (Array.isArray(v) && v.length === 0)) return '—';
  if (f.kind === 'toggle') return v ? '예' : '아니요';
  if (f.kind === 'counter') return `${v}${f.suffix ?? ''}`;
  if (f.options) {
    const arr = Array.isArray(v) ? v : [String(v)];
    return arr.map((x) => f.options!.find((o) => o.value === x)?.label ?? x).join(', ');
  }
  return String(v);
}
