---
version: 1.0
name: Angelsday-design-system
description: 김포 장기역 스카이라운지의 프라이빗 파티하우스 ‘엔젤스데이’의 고객 여정 웹을 위한 디자인 시스템. 순백(`#ffffff`)의 캔버스 위에 웜 블랙 잉크(`#141210`)가 글과 결정을 맡고, 단 하나의 브랜드 광채인 **Angels Gold**(`#b8924a`)는 로고·D-day 숫자·진행 단계·포커스처럼 ‘특별한 순간’에만 아껴 씁니다. 헤드라인은 Noto Serif KR 400으로 잡지 같은 품격을, 숫자는 Cormorant Garamond로 초대장 같은 우아함을, 본문은 Pretendard로 모바일 가독성을 책임집니다. 시그니처는 고객이 ‘지금 어디쯤 왔는지’ 한눈에 보는 6단계 Journey Stepper와 “이몽룡님과 성춘향님의 행복한 웨딩까지 D-86” D-day 히어로. 깊이는 헤어라인으로만 만들고, 그림자는 화면 위에 떠 있는 오버레이에만 씁니다.

colors:
  gold: "#b8924a"
  gold-deep: "#8c6b2e"
  gold-light: "#d9bf85"
  gold-pale: "#f7f1e3"
  gold-active: "#9c7a38"
  gradient-gold: "linear-gradient(135deg, #8c6b2e 0%, #e2c985 48%, #a8823c 100%)"
  ink: "#141210"
  ink-soft: "#2b2723"
  ink-active: "#000000"
  body: "#4a453e"
  body-strong: "#141210"
  muted: "#7d766b"
  muted-soft: "#a9a297"
  on-ink: "#ffffff"
  on-ink-muted: "#bdb5a6"
  on-gold: "#141210"
  canvas: "#ffffff"
  canvas-soft: "#faf8f3"
  surface-card: "#ffffff"
  surface-strong: "#f2ede3"
  surface-ink: "#141210"
  hairline: "#ece6da"
  hairline-soft: "#f4f0e8"
  hairline-strong: "#d9d0bf"
  hairline-gold: "#e3d3ad"
  status-confirmed: "#141210"
  status-pending: "#b8924a"
  status-promo: "#8e3b46"
  status-blocked: "#a9a297"
  event-wedding: "#f3ead3"
  event-wedding-ink: "#6e5321"
  event-dol: "#f6e3de"
  event-dol-ink: "#8a4b3e"
  event-birthday: "#e6ecdd"
  event-birthday-ink: "#4f6340"
  event-corporate: "#e1e6ec"
  event-corporate-ink: "#3f5166"
  event-catering: "#efe6da"
  event-catering-ink: "#6b5640"
  semantic-success: "#2f7a55"
  semantic-success-pale: "#e7f2ec"
  semantic-error: "#b3261e"
  semantic-error-pale: "#fbeae8"
  semantic-warning: "#a86a12"
  semantic-warning-pale: "#fbf1df"
  holiday: "#b3261e"
  saturday: "#3f5a7a"

typography:
  display-mega:
    fontFamily: "'Noto Serif KR', 'Nanum Myeongjo', serif"
    fontSize: 56px
    fontWeight: 400
    lineHeight: 1.22
    letterSpacing: -0.035em
  display-lg:
    fontFamily: "'Noto Serif KR', serif"
    fontSize: 36px
    fontWeight: 400
    lineHeight: 1.3
    letterSpacing: -0.025em
  display-md:
    fontFamily: "'Noto Serif KR', serif"
    fontSize: 28px
    fontWeight: 400
    lineHeight: 1.35
    letterSpacing: -0.02em
  display-sm:
    fontFamily: "'Noto Serif KR', serif"
    fontSize: 22px
    fontWeight: 500
    lineHeight: 1.4
    letterSpacing: -0.015em
  dday-numeral:
    fontFamily: "'Cormorant Garamond', serif"
    fontSize: 112px
    fontWeight: 500
    lineHeight: 0.95
    letterSpacing: -0.03em
    fontFeatureSettings: "'lnum' 1"
  numeral:
    fontFamily: "'Cormorant Garamond', serif"
    fontWeight: 500
    letterSpacing: -0.02em
    fontFeatureSettings: "'lnum' 1"
  overline:
    fontFamily: "'Cinzel', 'Cormorant Garamond', serif"
    fontSize: 12px
    fontWeight: 500
    lineHeight: 1.4
    letterSpacing: 0.2em
    textTransform: uppercase
  title-md:
    fontFamily: "'Pretendard Variable', Pretendard, -apple-system, 'Apple SD Gothic Neo', sans-serif"
    fontSize: 18px
    fontWeight: 600
    lineHeight: 1.45
  title-sm:
    fontFamily: "'Pretendard Variable', sans-serif"
    fontSize: 16px
    fontWeight: 600
    lineHeight: 1.45
  body-md:
    fontFamily: "'Pretendard Variable', sans-serif"
    fontSize: 16px
    fontWeight: 400
    lineHeight: 1.65
    letterSpacing: -0.01em
  body-sm:
    fontFamily: "'Pretendard Variable', sans-serif"
    fontSize: 14px
    fontWeight: 400
    lineHeight: 1.6
  caption:
    fontFamily: "'Pretendard Variable', sans-serif"
    fontSize: 13px
    fontWeight: 400
    lineHeight: 1.5
  label:
    fontFamily: "'Pretendard Variable', sans-serif"
    fontSize: 12px
    fontWeight: 600
    lineHeight: 1.4
  price:
    fontFamily: "'Pretendard Variable', sans-serif"
    fontWeight: 600
    fontVariantNumeric: tabular-nums
  button:
    fontFamily: "'Pretendard Variable', sans-serif"
    fontSize: 15px
    fontWeight: 600
    lineHeight: 1.0
  nav-link:
    fontFamily: "'Pretendard Variable', sans-serif"
    fontSize: 15px
    fontWeight: 500
    lineHeight: 1.4

rounded:
  none: 0px
  xs: 4px
  sm: 6px
  md: 8px
  lg: 12px
  xl: 16px
  2xl: 24px
  pill: 9999px

spacing:
  xxs: 4px
  xs: 8px
  sm: 12px
  base: 16px
  md: 20px
  lg: 24px
  xl: 32px
  xxl: 48px
  section: 80px
  gutter-mobile: 16px
  gutter-tablet: 24px
  gutter-desktop: 32px

elevation:
  shadow-overlay: "0 16px 40px rgba(20, 18, 16, 0.14), 0 2px 8px rgba(20, 18, 16, 0.06)"
  shadow-fab: "0 10px 24px rgba(20, 18, 16, 0.22)"

components:
  top-nav:
    backgroundColor: "rgba(255, 255, 255, 0.92)"
    textColor: "{colors.ink}"
    typography: "{typography.nav-link}"
    height: "56px (mobile) / 68px (desktop)"
    border: "1px solid {colors.hairline}"
  button-primary:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.on-ink}"
    typography: "{typography.button}"
    rounded: "{rounded.md}"
    padding: 0 22px
    height: 48px
  button-primary-active:
    backgroundColor: "{colors.ink-soft}"
    textColor: "{colors.on-ink}"
  button-gold:
    backgroundColor: "{colors.gold}"
    textColor: "{colors.on-gold}"
    typography: "{typography.button}"
    rounded: "{rounded.md}"
    height: 48px
  button-gold-active:
    backgroundColor: "{colors.gold-active}"
    textColor: "#ffffff"
  button-secondary:
    backgroundColor: "{colors.surface-card}"
    textColor: "{colors.ink}"
    border: "1px solid {colors.hairline-strong}"
    rounded: "{rounded.md}"
    height: 48px
  button-ghost:
    backgroundColor: transparent
    textColor: "{colors.ink}"
  button-on-ink:
    backgroundColor: transparent
    textColor: "{colors.on-ink}"
    border: "1px solid rgba(255, 255, 255, 0.28)"
  button-sizes:
    sm: 36px
    md: 48px
    lg: 56px
  land-hero:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.on-ink}"
    typography: "{typography.display-mega}"
    minHeight: "min(86svh, 760px)"
    overlay: "linear-gradient(180deg, rgba(20,18,16,.05) 0%, rgba(20,18,16,.35) 45%, rgba(20,18,16,.85) 100%)"
  dday-hero:
    backgroundColor: "linear-gradient(180deg, #fffdf8 0%, #ffffff 100%)"
    textColor: "{colors.ink}"
    headline: "{typography.display-md}"
    numeral: "{typography.dday-numeral}"
  journey-stepper:
    dot: 31px
    done: "{colors.gradient-gold}"
    current: "{colors.ink} + gold ring rgba(184,146,74,.2)"
    todo: "{colors.surface-card} + {colors.hairline-strong}"
  card:
    backgroundColor: "{colors.surface-card}"
    border: "1px solid {colors.hairline}"
    rounded: "{rounded.lg}"
    padding: "20px (mobile) / 24px"
  card-ink:
    backgroundColor: "{colors.surface-ink}"
    textColor: "{colors.on-ink-muted}"
    rounded: "{rounded.lg}"
  card-gold:
    backgroundColor: "{colors.gold-pale}"
    border: "1px solid {colors.hairline-gold}"
  option-card:
    backgroundColor: "{colors.surface-card}"
    border: "1px solid {colors.hairline-strong}"
    rounded: "{rounded.lg}"
    padding: 16px
    selected: "{colors.gold-pale} + 1px {colors.gold} ring"
  text-input:
    backgroundColor: "{colors.surface-card}"
    textColor: "{colors.ink}"
    fontSize: 16px
    rounded: "{rounded.md}"
    height: 50px
    focus: "{colors.gold} border + 3px rgba(184,146,74,.18) ring"
  chip:
    height: 38px
    rounded: "{rounded.pill}"
    border: "1px solid {colors.hairline-strong}"
    active: "{colors.ink} background, {colors.on-ink} text"
  badge:
    height: 22px
    rounded: "{rounded.xs}"
    typography: "11px / 700"
  event-badge:
    backgroundColor: "{colors.event-*}"
    textColor: "{colors.event-*-ink}"
  status-pill:
    height: 28px
    rounded: "{rounded.pill}"
    leftRule: "3px solid currentColor"
  calendar-cell:
    minHeight: "64px (mobile) / 128px (desktop)"
    eventChip: "{rounded.sm}, 3px status rule"
  quote-document:
    backgroundColor: "#ffffff"
    headRule: "2px solid {colors.ink}"
    depositBox: "{colors.ink}"
    pdfWidth: 760px
  task-status:
    todo: "{colors.surface-strong} / {colors.muted}"
    doing: "{colors.gold-pale} / {colors.gold-deep}"
    done: "{colors.ink} / {colors.gold-light}"
  chat-fab:
    backgroundColor: "{colors.ink}"
    height: 56px
    rounded: "{rounded.pill}"
    shadow: "{elevation.shadow-fab}"
  sheet:
    backgroundColor: "#ffffff"
    rounded: "24px 24px 0 0 (mobile) / 24px (desktop)"
    shadow: "{elevation.shadow-overlay}"
  footer:
    backgroundColor: "{colors.surface-ink}"
    textColor: "{colors.on-ink-muted}"
    typography: "{typography.caption}"
  admin-sidebar:
    backgroundColor: "{colors.surface-ink}"
    width: 248px
    activeIndicator: "{colors.gold}"
---

## Overview

엔젤스데이 디자인 시스템은 **고객이 휴대폰 한 화면으로 문의부터 행사 사진까지 따라가는 여정**을 위해 만들었습니다. 바탕은 순백의 캔버스(`{colors.canvas}` — #ffffff), 글과 결정은 웜 블랙 잉크(`{colors.ink}` — #141210), 그리고 단 하나의 브랜드 광채는 로고에서 가져온 **Angels Gold**(`{colors.gold}` — #b8924a)입니다. 골드는 ‘특별한 순간’을 표시할 때만 씁니다. D-day 숫자, 완료된 단계, 선택된 옵션, 포커스 링이 그 예입니다.

헤드라인은 **Noto Serif KR 400**으로 청첩장·초대장 같은 품격을 냅니다. 숫자(D-day, 금액, 단계 번호)는 **Cormorant Garamond**의 라이닝 숫자로, 영문 라벨(SCHEDULE, CURRENT STEP)은 로고 워드마크와 같은 계열인 **Cinzel**로 씁니다. 본문과 UI는 **Pretendard**로 모바일 가독성을 지킵니다.

시그니처는 두 가지입니다. 하나는 6단계 **Journey Stepper**(필요사항 → 견적·결제 → 결제 완료 → 준비 → 행사일 → 사진)이고, 다른 하나는 고객 이름을 금빛으로 강조하는 **D-day 히어로**(“이몽룡님과 성춘향님의 행복한 웨딩까지 **D-86**”)입니다.

**Key Characteristics:**
- 바탕은 언제나 순백. 섹션 구분이 필요할 때만 아이보리 밴드(`{colors.canvas-soft}`)를 씁니다.
- 주요 CTA는 **잉크 블랙**, 골드 버튼은 사진 위·다크 카드 위의 강조 CTA에만 씁니다.
- 디스플레이는 세리프 400. 굵기로 위계를 만들지 않고 크기와 여백으로 만듭니다.
- 숫자는 Cormorant 라이닝 숫자. 금액·D-day·단계 번호가 초대장처럼 보입니다.
- 행사 종류는 다섯 가지 파스텔(웨딩·돌잔치·생신연·기업행사·케이터링)로만 구분하고, 이 색은 배지에만 씁니다.
- 깊이는 헤어라인으로 만들고, 그림자는 떠 있는 오버레이(챗봇 버튼, 바텀시트, 토스트)에만 씁니다.
- 모바일 우선. 화면에 남는 고정 요소는 상단 내비게이션 하나뿐이고, 하단에는 꼭 필요한 행동 바만 둡니다.

## Colors

### Brand & Accent
- **Angels Gold** (`{colors.gold}` — #b8924a): 로고 모노그램, 완료 단계, 선택 상태, 포커스 링, 큰 숫자. 흰 바탕 대비 2.9:1이라 **큰 글자·장식 전용**입니다.
- **Gold Deep** (`{colors.gold-deep}` — #8c6b2e): 본문 크기의 골드 텍스트(오버라인, 가격 힌트). 흰 바탕 대비 4.9:1(AA).
- **Gold Light** (`{colors.gold-light}` — #d9bf85): 잉크 배경 위의 골드(다크 카드 라벨, 토스트 점, 스위치 손잡이).
- **Gold Pale** (`{colors.gold-pale}` — #f7f1e3): 선택된 옵션 카드, 안내 콜아웃, 메모 박스.
- **Gold Active** (`{colors.gold-active}` — #9c7a38): 골드 버튼 press.
- **Gold Gradient** (`{colors.gradient-gold}`): 로고·D-day 숫자·완료 단계 점·진행 바. 면적이 작은 곳에만 씁니다.

### Ink
- **Ink** (`{colors.ink}` — #141210): 헤드라인, 주요 CTA, 현재 단계, 다크 카드.
- **Ink Soft** (`{colors.ink-soft}` — #2b2723): 잉크 버튼 hover, 다크 카드 안쪽 면.

### Surface
- **Canvas** (`{colors.canvas}` — #ffffff): 페이지 바닥.
- **Canvas Soft** (`{colors.canvas-soft}` — #faf8f3): 아이보리 섹션 밴드, 표 머리, 대기 상태 카드.
- **Surface Card** (`{colors.surface-card}` — #ffffff): 카드. 아이보리 밴드 위에서 살짝 떠 보입니다.
- **Surface Strong** (`{colors.surface-strong}` — #f2ede3): 기본 배지, 비활성 칩, 진행 바 트랙.
- **Surface Ink** (`{colors.surface-ink}` — #141210): 피처드 카드, 영수증, 푸터, 관리자 사이드바.

### Hairlines
- **Hairline** (`{colors.hairline}` — #ece6da): 카드 테두리, 구분선.
- **Hairline Soft** (`{colors.hairline-soft}` — #f4f0e8): 리스트 행 구분.
- **Hairline Strong** (`{colors.hairline-strong}` — #d9d0bf): 입력창, 보조 버튼, 칩.
- **Hairline Gold** (`{colors.hairline-gold}` — #e3d3ad): 골드 틴트 카드의 테두리, 예약 가능한 시간 슬롯.

### Text
- **Ink** (`{colors.ink}`): 제목, 강조 본문.
- **Body** (`{colors.body}` — #4a453e): 기본 본문.
- **Muted** (`{colors.muted}` — #7d766b): 보조 설명, 캡션.
- **Muted Soft** (`{colors.muted-soft}` — #a9a297): 플레이스홀더, 지난 날짜.
- **On Ink** (`{colors.on-ink}` — #ffffff) / **On Ink Muted** (`{colors.on-ink-muted}` — #bdb5a6): 잉크 배경 위 글자.
- **On Gold** (`{colors.on-gold}` — #141210): 골드 버튼 위 글자는 흰색이 아니라 잉크.

### Event Pastels (시그니처 · 행사 종류 배지 전용)
- **Wedding** (`{colors.event-wedding}` #f3ead3 / ink #6e5321): 샴페인.
- **Dol** (`{colors.event-dol}` #f6e3de / ink #8a4b3e): 블러쉬.
- **Birthday** (`{colors.event-birthday}` #e6ecdd / ink #4f6340): 세이지.
- **Corporate** (`{colors.event-corporate}` #e1e6ec / ink #3f5166): 미스트.
- **Catering** (`{colors.event-catering}` #efe6da / ink #6b5640): 샌드.

이 다섯 색은 `EventBadge`에서만 씁니다. 버튼, 배경, 차트 같은 시스템 UI 색으로 쓰지 않습니다.

### Calendar Status
- **계약 확정** (`{colors.status-confirmed}` — #141210): 왼쪽 3px 잉크 선 + 웜 그레이 면.
- **예약 문의중** (`{colors.status-pending}` — #b8924a): 골드 선 + 골드 페일 면.
- **프로모션일** (`{colors.status-promo}` — #8e3b46): 와인 레드. 할인율 배지와 날짜 칸 상단 그라데이션.
- **휴무·마감** (`{colors.status-blocked}` — #a9a297): 사선 패턴.
- **일요일·공휴일** `{colors.holiday}` #b3261e, **토요일** `{colors.saturday}` #3f5a7a.

### Semantic
- **Success** (`{colors.semantic-success}` — #2f7a55 / pale #e7f2ec): 완료, 답변 완료.
- **Error** (`{colors.semantic-error}` — #b3261e / pale #fbeae8): 입력 오류, 취소.
- **Warning** (`{colors.semantic-warning}` — #a86a12 / pale #fbf1df): 데모 안내, 주의.

## Typography

### Font Family
- **Noto Serif KR** — 디스플레이(한글 헤드라인). Google Fonts, 400/500/600.
- **Cormorant Garamond** — 숫자 전용(D-day, 금액, 단계 번호, 캘린더 날짜). `font-feature-settings: 'lnum' 1`로 라이닝 숫자를 씁니다(기본은 올드스타일).
- **Cinzel** — 영문 대문자 오버라인(SCHEDULE, CURRENT STEP, RECEIPT). 로고 워드마크와 같은 계열입니다.
- **Pretendard Variable** — 본문·UI. 동적 서브셋(woff2)으로 필요한 글자만 내려받습니다.

### Hierarchy

| Token | Size (mobile → desktop) | Weight | Line Height | Letter Spacing | Use |
|---|---|---|---|---|---|
| `{typography.display-mega}` | 34 → 44 → 56px | 400 | 1.22 | -0.03 ~ -0.035em | 랜딩 히어로 h1 |
| `{typography.display-lg}` | 28 → 32 → 36px | 400 | 1.3 | -0.025em | 섹션 제목 |
| `{typography.display-md}` | 23 → 26 → 28px | 400 | 1.35 | -0.02em | 단계 제목, 상세 제목 |
| `{typography.display-sm}` | 19 → 22px | 500 | 1.4 | -0.015em | 카드 제목, 콜아웃 |
| `{typography.dday-numeral}` | 76 → 112px | 500 | 0.95 | -0.03em | D-day |
| `{typography.overline}` | 12px | 500 | 1.4 | 0.2em, 대문자 | 섹션 라벨 |
| `{typography.title-md}` | 18px | 600 | 1.45 | 0 | 컴포넌트 제목 |
| `{typography.title-sm}` | 16px | 600 | 1.45 | 0 | 리스트 제목 |
| `{typography.body-md}` | 16px | 400 | 1.65 | -0.01em | 기본 본문 |
| `{typography.body-sm}` | 14px | 400 | 1.6 | 0 | 카드 본문 |
| `{typography.caption}` | 13px | 400 | 1.5 | 0 | 보조 설명 |
| `{typography.label}` | 12px | 600 | 1.4 | 0 | 필드·항목 라벨 |
| `{typography.button}` | 15px | 600 | 1.0 | -0.01em | 버튼 |
| `{typography.nav-link}` | 15px | 500 | 1.4 | 0 | 상단 메뉴 |

### Principles
- **디스플레이는 세리프 400.** 품격은 굵기가 아니라 크기와 여백에서 나옵니다.
- **한글은 `word-break: keep-all`.** 단어 중간에서 줄이 바뀌지 않게 합니다.
- **금액은 `tabular-nums`, 큰 숫자는 Cormorant 라이닝.** 견적서 합계와 D-day는 세리프 숫자로, 표의 단가는 Pretendard 고정폭 숫자로 씁니다.
- **입력창 글자는 16px 이상.** iOS 자동 확대를 막습니다.

### Note on Font Substitutes
Noto Serif KR이 없으면 Nanum Myeongjo, AppleMyungjo 순서로 대체합니다. Pretendard가 없으면 Apple SD Gothic Neo와 Noto Sans KR이 대신합니다. html2canvas로 만드는 PDF 견적서는 OpenType 라이닝 숫자를 그리지 못해서, PDF 총액만 Pretendard로 표시합니다.

## Layout

### Spacing System
- **Base unit:** 4px.
- **Tokens:** `{spacing.xxs}` 4 · `{spacing.xs}` 8 · `{spacing.sm}` 12 · `{spacing.base}` 16 · `{spacing.md}` 20 · `{spacing.lg}` 24 · `{spacing.xl}` 32 · `{spacing.xxl}` 48 · `{spacing.section}` 80px.
- **Section padding:** 56px(mobile) → 80px(desktop).
- **Gutter:** 16px(mobile) · 24px(tablet) · 32px(desktop).

### Grid & Container
- 최대 콘텐츠 폭은 1200px, 문의·결제 같은 폼 화면은 760px(`.container--narrow`)입니다.
- 카드 그리드: 1열 → 2열(640px~) → 3열(1024px~).
- 고객 행사 페이지: 모바일 1열 / 데스크톱은 본문 + 340px 사이드(예약 정보·기록·메일·도움말).
- 관리자: 248px 잉크 사이드바 + 콘텐츠. 모바일에서는 상단 바와 가로 스크롤 탭으로 바뀝니다.

### Whitespace Philosophy
청첩장처럼 숨 쉴 여백을 줍니다. 한 화면에는 한 가지 결정만 둡니다. 그래서 STEP 1 필요사항은 섹션별로 한 장씩(1/N) 넘기고, 문의 폼은 번호가 붙은 질문 블록으로 나눕니다.

## Elevation & Depth

| Level | Treatment | Use |
|---|---|---|
| Flat (canvas) | `{colors.canvas}` | 페이지 바닥 |
| Band | `{colors.canvas-soft}` | 섹션 구분 |
| Card | `{colors.surface-card}` + 1px `{colors.hairline}` | 콘텐츠 카드 |
| Featured | `{colors.surface-ink}` | 다음 할 일 콜아웃, 영수증, 견적 요약, 도움말 |
| Overlay | `{elevation.shadow-overlay}` | 바텀시트, 모달, 토스트, 챗봇 패널 |
| FAB | `{elevation.shadow-fab}` | 상담하기 버튼 |

### Decorative Depth
- **골드 그라데이션 숫자**: D-day와 단계 번호에 쓰는 유일한 장식 그라데이션입니다.
- **모노그램 워터마크**: D-day 히어로 오른쪽에 9% 불투명도의 AD 리본을 깝니다.
- **사진 그림자**: 랜딩 히어로 사진 위에 아래로 짙어지는 잉크 그라데이션을 깔아 흰 글씨 대비를 확보합니다.

## Shapes

### Border Radius Scale

| Token | Value | Use |
|---|---|---|
| `{rounded.none}` | 0px | PDF 견적서 |
| `{rounded.xs}` | 4px | 배지, 홀 코드 |
| `{rounded.sm}` | 6px | 작은 버튼, 캘린더 일정 칩 |
| `{rounded.md}` | 8px | 버튼, 입력창, 토스트 |
| `{rounded.lg}` | 12px | 카드, 옵션 카드, 사진 |
| `{rounded.xl}` | 16px | 큰 사진, 히어로 미리보기 |
| `{rounded.2xl}` | 24px | 바텀시트, 챗봇 패널 |
| `{rounded.pill}` | 9999px | 칩, 상태 pill, 챗봇 버튼 |

## Components

### Top Navigation
**`top-nav`** — 반투명 흰 배경(blur)과 하단 헤어라인을 씁니다. 높이는 56px(mobile) / 68px(desktop)입니다. 왼쪽에 가로형 잉크 로고, 가운데에 메뉴(대관 가능일 · 홀 소개 · 행사 안내 · 갤러리 · 오시는 길 · 내 행사 조회), 오른쪽에 ‘문의하기’ 잉크 버튼을 둡니다. 1024px 미만에서는 햄버거 메뉴를 열면 세리프 22px 링크 목록과 전화·카카오톡 버튼이 나옵니다.

### Buttons
- **`button-primary`** — 잉크 배경과 흰 글자, 48px, 8px 라운드. 화면마다 가장 중요한 한 가지 행동(문의 접수, 예약금 결제, 필요사항 제출)에 씁니다.
- **`button-gold`** — 골드 배경과 잉크 글자. 사진 위 히어로 CTA(대관 가능일 확인)와 다크 카드 안의 CTA(챗봇 상담)에만 씁니다.
- **`button-secondary`** — 흰 배경에 strong 헤어라인. 조정 요청, PDF 다운로드 같은 보조 행동에 씁니다.
- **`button-ghost`** — 배경 없이 글자만. 단계 이동, 닫기에 씁니다.
- **`button-on-ink`** — 투명 배경에 흰 테두리. 잉크 배경과 사진 위에서 씁니다.
- 크기는 `sm` 36px · 기본 48px · `lg` 56px입니다. 모바일 주요 행동은 `lg`와 `block`(전체 폭)을 씁니다.

### Hero & D-day Hero
- **`land-hero`** — 엔젤스데이 사진 3장이 6초마다 교차하는 전체 폭 슬라이드입니다. 아래에서 짙어지는 잉크 그림자 위에 Cinzel 오버라인, 세리프 헤드라인, 골드 + on-ink 버튼을 놓습니다.
- **`dday-hero`** (시그니처) — 고객 행사 페이지 맨 위에 둡니다. 순서는 행사 영문 오버라인 + 이벤트 배지, 그 아래 헤드라인(고객 이름은 `{colors.gold-deep}`로 강조), Cormorant 76~112px 골드 그라데이션 D-day, 날짜·시간·홀·인원 메타, 잉크 pill “CURRENT STEP · STEP 4 준비 사항 확인”입니다. 행사일이 지나면 “까지”를 뺀 헤드라인과 D+N을 씁니다.

### Journey Stepper (시그니처)
**`stepper`** — 6칸 그리드와 가운데를 지나는 1px 트랙, 진행된 만큼 채워지는 골드 그라데이션 바로 이루어집니다. 점은 31px입니다.
- 완료: 골드 그라데이션 점과 ✓
- 현재: 잉크 점, 골드 숫자, 5px 골드 링
- 예정: 흰 점, strong 헤어라인, 회색 숫자
- 라벨은 모바일에서 짧은 이름(필요사항·견적·결제…), 데스크톱에서 전체 이름을 씁니다. 각 단계를 누르면 그 단계 화면(완료 요약 / 진행 중 작업 / 예정 미리보기)을 봅니다.

### Cards
- **`card`** — 흰 면, 1px 헤어라인, 12px 라운드, 20/24px 패딩.
- **`card--soft`** — 아이보리 면. 요약과 대기 상태에 씁니다.
- **`card--gold`** — 골드 페일 면. 잔금 안내, 강조 정보에 씁니다.
- **`card--ink`** — 잉크 면. 도움말, 피처드 CTA에 씁니다.
- **`callout`** — ‘지금 할 일’ 안내. 고객 차례는 잉크(`callout--ink`), 엔젤스데이 차례는 골드 페일로 표시합니다.

### Calendar
**`mcal`** — 7열 그리드입니다. 셀 사이 1px 헤어라인을 그리드 gap으로 그립니다.
- **모바일**: 64px 셀에 날짜와 상태 점(최대 4개)만 둡니다. 날짜를 누르면 아래에 홀 × 시간대 슬롯 표가 열립니다.
- **데스크톱**: 128px 셀에 일정 칩을 둡니다. 칩은 시간, 행사명 2줄(예: ‘김진명&이진향 웨딩’), 홀 코드, 상태 순서이고 최대 3개 + “+n건”입니다.
- 공휴일 이름, 프로모션 할인율 배지, 오늘은 잉크 원, 선택은 2px 잉크 테두리로 표시합니다.
- 슬롯(`slot`): 예약 가능은 골드 헤어라인 + “런치 1부 · 문의 →”, 마감은 취소선 시간 + 상태로 표시합니다.

### Quote Document
**`quote-doc`** — 화면과 PDF에 같은 마크업을 씁니다.
- 머리: ESTIMATE 오버라인, 세리프 ‘견적서’, 발행일·유효기간, 오른쪽 가로형 로고, 2px 잉크 하단선
- 본문: 행사 정보 2열 → 카테고리(골드 딥 소문자 라벨)별 품목표(단가·수량·금액, tabular-nums) → 소계 → 할인(와인 레드, 할인율 볼드) → 총액(1px 잉크 상단선, Cormorant 28px) → 예약금(잉크 박스)·잔금(아이보리 박스) → 플래너 메모(골드 페일)
- PDF는 760px 폭으로 따로 렌더링해 A4에 담습니다.

### Forms & Option Cards
- **`text-input`** — 50px, 16px 글자, strong 헤어라인. 포커스 시 골드 테두리와 3px 골드 링이 생깁니다.
- **`option-card`** — 큰 선택지(행사 종류, 홀, 뷔페 코스, 꽃장식)에 씁니다. 제목, 설명, 골드 딥 가격 힌트(“1인 59,000원”, “+120만원”)와 오른쪽 위 체크 원으로 구성합니다. 선택하면 골드 페일 면, 골드 테두리, 잉크 체크 원이 됩니다.
- **`chip`** — 작은 선택지(컬러 톤, 좌석 배치)에 씁니다. 38px pill이고, 선택(`chip--gold-active`)은 골드 페일 면입니다.
- **`counter`** — 인원 입력. −/+ 50px 버튼과 가운데 숫자칸이며, 50명 이상은 5명씩 늘고 줄어듭니다.
- **`switch`** — 44×26 트랙. 켜면 잉크 트랙에 골드 손잡이가 됩니다.
- **`check`** — 22px 사각 체크. 체크되면 잉크 면에 골드 체크 표시가 나옵니다.

### Chips / Badges / Status Pills
- **`badge`** — 22px, 4px 라운드, 11px/700. 변형은 `--ink`, `--gold`, `--outline`, `--success`, `--error`, `--warning`, `--event-*`입니다.
- **`status-pill`** — 28px pill, 왼쪽 3px 상태선. 계약 확정, 예약 문의중, 프로모션일, 휴무·마감입니다.
- **예약 비밀번호** — Pretendard 700, 자간 0.08~0.12em, tabular-nums. 접수 완료 화면에서는 잉크 박스에 30px로 크게 보여줍니다.

### Checklist / Prep Tasks / Timeline
- **`task-status`** — 엔젤스데이 준비 항목. 준비 예정(서피스), 진행 중(골드 페일), 완료(잉크 + 골드 라이트)로 구분합니다.
- **고객 체크리스트** — 체크박스, 제목, 설명, 마감일(D-n)로 구성합니다. 기한이 지나면 마감일을 오류 색으로, 완료하면 취소선과 완료 시각으로 표시합니다.
- **`timeline`** — 1px 세로선과 11px 원. 원 색은 고객(골드), 엔젤스데이(잉크), 시스템(헤어라인)으로 나뉩니다. 문의부터 모든 변경이 기록됩니다.

### Chat Concierge
- **`chat-fab`** — 56px 잉크 pill. 왼쪽에 골드 모노그램 원, 오른쪽에 ‘상담하기’. 하단 행동 바가 있는 화면(문의, 행사 페이지)에서는 52px 원형으로 줄어 92px 위로 올라갑니다.
- **`chat-panel`** — 모바일은 86vh 바텀시트, 데스크톱은 400px 플로팅 패널입니다. 봇 말풍선은 흰 면에 헤어라인, 내 말풍선은 잉크입니다. 빠른 질문 칩(지금 어떤 단계예요? · 환불 규정 · 주차 안내 · 상담원 연결)을 두고, 상담원 연결이 필요하면 전화·카카오톡 버튼을 보여줍니다.

### CTA Band / Footer
- **`cta-band`** — 모노그램, “원하시는 날짜가 있으신가요?”, 담당자 안내, 버튼 3개(문의 · 전화 · 카카오톡)를 가운데 정렬로 둡니다. 모바일에서는 버튼이 전체 폭으로 쌓입니다.
- **`footer`** — 잉크 면에 흰 로고. 3열(소개 · CUSTOMER CENTER · LOCATION)과 하단 사업자 정보·디자인 시스템·관리자 링크로 구성합니다.

### Admin Surfaces
- 사이드바는 248px 잉크 면입니다. 활성 메뉴는 왼쪽 3px 골드 선과 잉크 소프트 면으로 표시합니다.
- KPI 타일: 첫 타일(예상 매출)은 잉크 피처드, 나머지는 흰 카드이고 숫자는 Cormorant입니다.
- 단계별 파이프라인: 단계마다 인원과 예상 매출을 골드 그라데이션 막대로 보여줍니다.
- 고객 상세는 탭 9개(개요·필요사항·견적·결제·준비 리스트·고객 체크리스트·사진·기록·메일)로 구성합니다.
- ‘고객 화면 보기’는 단계별로 고객 화면을 바로 열고 예약 비밀번호를 복사할 수 있습니다.

### Logo System
- **레이아웃**: 가로형(헤더·견적서), 세로형(스플래시·OG 이미지), 모노그램(파비콘·워터마크·챗봇), 워드마크
- **변형**: `ink`(흰 바탕 기본 — 골드 모노그램 + 잉크 워드마크), `gold`(밝은 사진 위 장식), `white`(잉크 바탕), `black`(단색 인쇄)
- 모노그램은 엔젤스데이.com 원본 로고의 AD 리본을 벡터화했고, 워드마크는 Cinzel로 다시 조판했습니다. 파일은 `public/brand/`, 코드는 `<Logo layout variant height />`입니다.
- 최소 크기는 가로형 28px, 모노그램 16px입니다. 주변 여백은 모노그램 폭의 1/4 이상 둡니다.

## Do's and Don'ts

### Do
- 바탕은 순백으로 두고, 섹션 구분은 아이보리 밴드와 헤어라인으로 합니다.
- 화면마다 잉크 primary 버튼은 하나만 둡니다.
- 골드는 ‘특별한 순간’에만 씁니다. D-day, 완료 단계, 선택 상태, 포커스, 로고가 해당합니다.
- 작은 골드 글자는 `{colors.gold-deep}`으로 씁니다(AA 대비).
- 고객에게는 지금 단계와 다음 할 일을 한 문장으로 먼저 말합니다(`callout`).
- 금액은 견적서·결제·요약에서 같은 숫자 서식(원, tabular-nums)으로 씁니다.
- 행사 종류는 항상 `EventBadge` 파스텔로 표시합니다.

### Don't
- 골드를 큰 면적의 배경색이나 본문 글자색(#b8924a)으로 쓰지 않습니다.
- 세리프 디스플레이를 700 이상으로 굵게 만들지 않습니다.
- 카드에 그림자를 넣지 않습니다. 그림자는 오버레이 전용입니다.
- 이벤트 파스텔을 버튼, 차트, 상태 색으로 쓰지 않습니다.
- 모바일에서 화면 위쪽에 고정 요소를 여러 겹 쌓지 않습니다(상단 내비 하나만).
- 한 화면에 필요사항 전체를 펼치지 않습니다. 섹션 단위로 나눕니다.

## Responsive Behavior

### Breakpoints

| Name | Width | Key Changes |
|---|---|---|
| Mobile | < 640px | 디스플레이 34/28/23px, D-day 76px, 카드 1열, 캘린더 점 모드, 바텀시트, 하단 행동 바, 챗봇 원형 |
| Tablet | 640–1024px | 디스플레이 44/32/26px, D-day 112px, 카드 2열, 폼 2열 |
| Desktop | 1024–1280px | 디스플레이 56/36/28px, 상단 메뉴 펼침, 캘린더 일정 칩, 행사 페이지 사이드 열, 관리자 사이드바 |
| Wide | > 1280px | 콘텐츠 최대 1200px |

### Touch Targets
- 주요 버튼은 48px(기본)·56px(lg)입니다. 입력창 50px, 칩 38px, 캘린더 셀 최소 64px입니다.
- 입력 글자 16px로 iOS 자동 확대를 막습니다.
- 하단 고정 바는 `env(safe-area-inset-bottom)`만큼 여백을 더합니다.

### Collapsing Strategy
- 상단 메뉴는 1024px 미만에서 햄버거 메뉴로 바뀝니다.
- 캘린더는 모바일에서 일정 칩 대신 상태 점으로 보여주고, 날짜를 누르면 아래에 상세가 열립니다.
- 행사 페이지 사이드 열(예약 정보·기록·메일·도움말)은 모바일에서 본문 아래로 내려갑니다.
- 관리자 사이드바는 모바일에서 상단 바와 가로 스크롤 탭이 되고, 표는 카드 목록으로 바뀝니다.
- 사진 묶음은 모바일에서 가로로 넘기는 스냅 스트립이 됩니다.

## Iteration Guide

1. 토큰은 `src/styles/tokens.css`가 단일 원천입니다. 값을 바꾸면 이 문서의 YAML도 함께 고칩니다.
2. 버튼과 입력창은 `{rounded.md}`, 카드는 `{rounded.lg}`, 시트는 `{rounded.2xl}`입니다.
3. 새 컴포넌트는 `components.css`(기본 부품) / `patterns.css`(캘린더·견적서·챗봇 같은 복합 패턴) / `customer.css` / `landing.css` / `admin.css` 중 쓰임새에 맞는 파일에 둡니다.
4. 색은 토큰 변수로만 씁니다(`var(--color-…)`). hex를 직접 쓰지 않습니다.
5. 행사 종류를 추가할 때는 `shared/eventTypes.ts`(필요사항 스키마)와 이벤트 파스텔 토큰, 가격표를 함께 추가합니다.
6. 화면을 바꾼 뒤에는 390px과 1280px에서 스크린샷으로 확인합니다.
7. 골드는 아껴 씁니다. 한 화면에서 골드가 눈에 띄는 곳은 두세 군데면 충분합니다.

## Known Gaps

- 다크 모드는 정의하지 않았습니다. 브랜드 캔버스는 순백입니다.
- 로고 모노그램은 원본 래스터(317px)를 벡터화해서, 아주 큰 크기에서는 리본 가장자리가 약간 거칠 수 있습니다. 원본 벡터 파일이 생기면 교체하세요.
- 이메일 템플릿은 메일 클라이언트 호환을 위해 시스템 폰트와 인라인 스타일만 쓰므로 웹과 서체가 다릅니다.
- 애니메이션 타이밍(히어로 6초 전환, 시트 320ms)은 `--ease-out` 하나로만 정의되어 있습니다.
- 가격·환불 규정·공휴일 데이터는 예시 값이며 디자인 시스템 범위 밖입니다.
