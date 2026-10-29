# 엔젤스데이 · ANGELSDAY — 고객 여정 & 운영 관리 웹

문의부터 행사 사진까지, **고객은 자기 행사 페이지 하나만 보면** 지금 어디까지 왔고 다음에 무엇을 하면 되는지 알 수 있고,
**운영자는 관리자 페이지에서** 견적서 생성 · 준비 리스트 · 단계별 고객 현황 · 예상 매출을 관리합니다.

- 행사 종류: 스몰웨딩 · 돌잔치 · 생신연 · 기업행사&송년회 · 출장뷔페&케이터링
- 고객 관리 URL: `/my/{토큰}` — 예) “이몽룡님과 성춘향님의 행복한 웨딩까지 **D-86**”
- 모바일 우선 반응형 · 화이트 + 골드 + 블랙 디자인 시스템 ([DESIGN.md](./DESIGN.md), 배포 시 `/design-system/`)
- TypeScript (React 19 + Vite) · Firebase (Hosting · Firestore · Auth · Functions · Storage)

---

## 1. 바로 실행해 보기 (데모 모드)

Firebase 없이 브라우저 저장소(localStorage)에 샘플 데이터로 전체 흐름이 동작합니다.

```bash
npm install
npm run dev
```

http://localhost:5173 을 열고 아래 데모 고객 페이지를 둘러보세요. (데이터는 오늘 날짜 기준으로 생성됩니다)

| 단계 | 데모 고객 | URL |
|---|---|---|
| STEP 1 필요사항 작성 | 김포중앙교회 출장뷔페 | `/my/demo-catering-church` |
| STEP 2 견적 작성 대기 | 박영자님 칠순 | `/my/demo-birthday-youngja` |
| STEP 2 견적 도착 · 결제 대기 | 김하윤 첫돌 | `/my/demo-dol-hayun` |
| STEP 3 결제 완료 | (주)한강테크 송년회 | `/my/demo-corporate-hangang` |
| STEP 4 준비 사항 확인 | 이몽룡 ♥ 성춘향 웨딩 | `/my/demo-wedding-mongryong` |
| STEP 4 (D-3 임박) | 박서준 첫돌 | `/my/demo-dol-seojun` |
| STEP 5 행복한 행사일 (오늘) | (주)김포바이오 VIP 만찬 | `/my/demo-corporate-today` |
| STEP 6 행사 사진 확인 | 최준호 ♥ 한지민 웨딩 | `/my/demo-wedding-photos` |

- **관리자**: `/admin` — 데모 비밀번호 `angels2026` (`.env.local` 의 `VITE_ADMIN_DEMO_PASSCODE` 로 변경)
- 관리자와 고객 페이지를 **두 탭**에 띄워 두면 견적 발송 · 결제 · 준비 상태 변경이 실시간으로 반영됩니다.
- 데모 데이터 초기화: 관리자 > 설정 > 데모 데이터 초기화

---

## 2. 화면 구성

### 고객용 (모바일 우선)

| 경로 | 화면 | 주요 기능 |
|---|---|---|
| `/` | 홈 | 행사 종류 5가지, 4개 홀(러블리·알로하·벨리타·시아), 6단계 진행 과정 안내 |
| `/calendar` | 대관 가능일 확인 | 월 달력 · 홀 필터 · 계약 확정/예약 문의중/프로모션일 표시 · 날짜 선택 시 홀×시간대 가용성 → 바로 문의 |
| `/inquiry` | 예약 문의 | 행사 종류별 필수 정보(신랑·신부 / 아기 / 주인공 / 회사·행사명 / 장소) 입력 → 고객 관리 URL 발급 |
| `/my/{토큰}` | 내 행사 페이지 | D-day 헤드라인, 6단계 스테퍼, 지금 할 일, 단계별 화면, 기록 타임라인, 받은 메일, 상담 챗봇 |
| `/my/{토큰}/pay` | 예약금 결제 | 결제 수단 선택 · 환불 규정 동의 (기본 MOCK 결제 — 아래 7번) |

**6단계**

1. **필요사항 작성** — 홀, 인원, 꽃장식, 식사, 폐백·애프터파티, 스냅 촬영 등 (행사 종류별 맞춤 항목, 자동 저장)
2. **견적 확인 및 결제** — 할인율이 적용된 견적서(PDF 다운로드) → “이대로 진행(예약금 결제)” 또는 “조정 요청”
3. **결제 완료** — 영수증 · 예약 확정
4. **준비 사항 확인** — 엔젤스데이 준비 현황(실시간) + 고객 체크리스트 + 모든 기록
5. **행복한 행사일** — 타임테이블 · 오시는 길 · 주차 · 담당 매니저 · 잔금 안내
6. **행사 사진 확인** — 잔금 결제 완료 후 사진 공개 · 원본 앨범 링크

### 관리자용 (`/admin`)

- **대시보드** — 단계별 고객 수, 예상 매출(견적 총액 또는 필요사항 기반 추정), 확정 매출, 수금액, 오늘 할 일
- **고객 관리** — 고객별 현재 STEP · D-day · 예상 매출, 상세(필요사항 / 견적 작성·PDF·발송 / 결제 / 준비 리스트 / 체크리스트 / 사진 / 기록 / 메일)
- **캘린더** — 전화·외부 예약, 휴무, 프로모션일(할인율) 등록
- **가격표** — 항목별 단가, 홀 대관료, 할인 프리셋, 예약금 비율
- **메일 자동화** — 규칙별 on/off, 발송 예정 미리보기, 지금 발송 실행

---

## 3. 폴더 구조

```
.
├── DESIGN.md                    # 엔젤스데이 디자인 시스템 (토큰 · 컴포넌트 · 반응형 규칙)
├── public/
│   ├── brand/                   # 로고 SVG (가로형/세로형 × 골드·잉크·블랙·화이트, 모노그램)
│   └── design-system/           # 디자인 시스템 시각화 페이지 (배포 시 /design-system/)
├── shared/                      # 웹 + Cloud Functions 공용 도메인 코드 (DOM 의존성 없음)
│   ├── types.ts                 # Booking · Quote · PrepTask · CalendarEntry …
│   ├── eventTypes.ts            # 행사 종류별 입력 항목(필요사항 스키마) · 헤드라인 문구
│   ├── catalog.ts               # 기본 가격표 ⚠️ 예시 가격
│   ├── quote.ts                 # 필요사항 → 견적 자동 구성 · 할인 · 예약금 계산 · 예상 매출
│   ├── steps.ts                 # 6단계 정의 · 현재 단계 계산 · “지금 할 일”
│   ├── ops.ts                   # 예약 상태 변경 순수 함수 (모든 변경은 타임라인에 기록)
│   ├── prepTemplates.ts         # 행사별 준비 리스트 · 고객 체크리스트 · 당일 타임테이블 템플릿
│   ├── emailRules.ts            # 자동 메일 규칙 · 발송 계획 · HTML 메일 템플릿
│   ├── calendar.ts              # 공개 캘린더 변환(개인정보 제외) · 홀×시간대 가용성
│   ├── chatFaq.ts               # 챗봇 FAQ · 시스템 프롬프트 · 오프라인 응답 ⚠️ 정책 예시
│   ├── venue.ts                 # 주소 · 연락처 · 홀 · 시간대 · 공휴일
│   ├── dates.ts · ids.ts
├── src/                         # 웹앱 (React + TypeScript)
│   ├── brand/                   # <Logo /> 컴포넌트
│   ├── components/              # 스테퍼 · D-day 히어로 · 달력 · 견적서 · 챗봇 · 폼 필드
│   ├── data/                    # DataStore 인터페이스 · demoStore · firebaseStore · 시드 데이터
│   ├── pages/customer/          # 고객 화면
│   ├── pages/admin/             # 관리자 화면
│   └── styles/                  # tokens.css (디자인 토큰 원천) · components · patterns
├── functions/                   # Cloud Functions (TypeScript, Node 22, 서울 리전)
│   ├── src/                     # bookings · scheduler · mail · payments · chat
│   └── scripts/                 # set-admin.mjs (관리자 지정) · seed-firestore.mjs (초기 설정)
├── firestore.rules · storage.rules · firestore.indexes.json · firebase.json
├── .secrets/README.md           # 🔐 Firebase 비공개 키 보관 위치
└── .github/workflows/deploy.yml # 수동 실행 배포 워크플로
```

화면은 `src/data/store.ts` 의 `DataStore` 인터페이스만 사용합니다. `VITE_DATA_MODE=demo` 면 localStorage,
`firebase` 면 Firestore · Functions 로 같은 화면이 동작합니다.

### 데이터 모델 (Firestore)

| 컬렉션 | 내용 | 읽기 / 쓰기 |
|---|---|---|
| `bookings/{토큰}` | 예약 1건 = 고객 1명의 모든 정보 (필요사항 · 견적 · 결제 · 준비 · 체크리스트 · 사진 · 타임라인 · 메일 기록) | 토큰을 아는 사람만 조회, 목록은 관리자. 고객은 허용된 필드만 수정 |
| `calendar/{id}` | 공개 일정 (행사 종류 · 홀 · 시간 · 상태만, 이름·연락처·토큰 없음) | 누구나 읽기, 관리자 · Functions 쓰기 |
| `settings/catalog` | 가격표 | 누구나 읽기, 관리자 쓰기 |
| `settings/emailRules` | 자동 메일 규칙 on/off | 누구나 읽기, 관리자 쓰기 |
| `mail/{id}` | 메일 발송 큐 (Trigger Email 확장) | 서버 전용 |
| `emailSent/{예약}__{규칙}` | 중복 발송 방지 마커 | 서버 전용 |

> 고객 관리 URL의 토큰은 22자 난수(약 110bit)이고 **링크 자체가 열쇠**입니다. 고객에게만 전달하세요.

---

## 4. 자동 메일

행동 직후 보내는 **이벤트 메일**은 예약 문서가 바뀔 때(`onBookingWritten`), **일정 기준 메일**은 매일 오전 10시(KST, `scheduledEmails`)에 발송됩니다.
관리자 > 메일 자동화에서 규칙별로 끄고 켤 수 있고, 고객 상세 > 메일 탭에서 발송 예정일을 미리 볼 수 있습니다.

| 규칙 | 발송 시점 | 조건 |
|---|---|---|
| 문의 접수 · 고객 관리 링크 안내 | 문의 직후 | — |
| 필요사항 작성 리마인드 | 문의 +2일 10:00 | 아직 STEP 1 |
| 견적서 도착 알림 | 견적 발송 직후 | — |
| 견적 확인 후속 안내 | 견적 발송 +3일 | 결제 전 · 조정 요청 없음 |
| 조정 요청 답변 알림 | 답변 등록 직후 | — |
| 예약 확정 · 예약금 영수증 | 결제 직후 | — |
| D-60 / D-30 / D-14 / D-7 / D-1 안내 | 행사일 기준 10:00 | 예약 확정 후 · 행사 전 (예약 이전 시점은 건너뜀) |
| 감사 인사 · 잔금 · 사진 안내 | 행사 +1일 | 예약 확정 |
| 행사 사진 공개 알림 | 사진 공개 직후 | — |
| 후기 요청 | 사진 공개 +5일 | 사진 공개됨 |

발송 시점이 7일 넘게 지난 메일은 보내지 않고, 같은 규칙은 고객당 한 번만 발송됩니다(관리자 수동 발송 제외).
메일 문구는 `shared/emailRules.ts` 의 `renderEmail()` 에서 수정합니다.

---

## 5. 상담 챗봇

- **데모 모드**: `shared/chatFaq.ts` 의 FAQ 키워드 응답 (네트워크 불필요)
- **Firebase 모드**: Cloud Function `chat` 이 **Claude API** (`claude-opus-5-5`)로 답변합니다.
  - 고객 예약 정보는 클라이언트가 보낸 값이 아니라 **서버가 Firestore 에서 직접 읽어** 프롬프트에 넣습니다.
  - 상담 답변은 짧아서 `effort: low` 로 호출합니다.
  - **서버 측 폴백(server-side fallback, `fallbacks: "default"`)을 켜 두었습니다.** 정책상 거절이 나오면 API 가 권장 모델로 자동 재시도합니다. 원하지 않으면 `functions/src/chat.ts` 에서 `betas`·`fallbacks` 두 줄을 지우세요.
  - 정적 안내(FAQ·홀·단계)는 프롬프트 캐시 대상으로 두었습니다. 내용이 짧으면 최소 캐시 길이에 못 미쳐 캐시되지 않을 수 있습니다(동작에는 영향 없음).
  - API 오류 · 거절 · 키 미설정 시 FAQ 응답으로 자동 대체됩니다.

---

## 6. Firebase 배포하기

### 6-1. 프로젝트 준비 (최초 1회)

1. [Firebase 콘솔](https://console.firebase.google.com)에서 프로젝트 생성 → **Blaze(종량제) 요금제**로 전환 (Functions · 스케줄러 · 외부 API 호출에 필요)
2. **Firestore Database** 생성 — 위치 **`asia-northeast3 (서울)`** (Functions 리전과 같아야 트리거가 동작)
3. **Authentication** → 로그인 방법 → **이메일/비밀번호** 사용 설정 → 관리자 계정 추가
4. **Storage** 시작 (행사 사진 업로드용)
5. 프로젝트 설정 → 내 앱 → **웹 앱 추가** → SDK 설정값 복사

### 6-2. 로컬 설정

```bash
npm install -g firebase-tools
firebase login
cp .firebaserc.example .firebaserc      # "your-firebase-project-id" 를 실제 프로젝트 ID 로
cp .env.example .env.local              # VITE_DATA_MODE=firebase, VITE_FIREBASE_* 값 입력
cd functions && npm install && cd ..
```

### 6-3. 비밀 값 · 파라미터

```bash
firebase functions:secrets:set ANTHROPIC_API_KEY     # 챗봇용 Claude API 키 (프롬프트에 입력, 파일 저장 X)
```

첫 배포 때 CLI 가 `PUBLIC_BASE_URL`(메일 링크 기준 주소, 예: `https://<프로젝트ID>.web.app`)을 물어봅니다.
`functions/.env.<프로젝트ID>` 에 저장되며 나중에 바꿀 수 있습니다.

### 6-4. 배포

```bash
npm run build
firebase deploy
```

웹사이트 주소는 **https://angelsday.web.app** 입니다 (`firebase.json` 의 `hosting.site: "angelsday"`, 프로젝트 `angelsday-9ff6f`).

Hosting 만 배포하려면 서비스 계정 키로 동작하는 스크립트를 쓸 수 있어요.
기본 `firebase-adminsdk` 서비스 계정은 Service Usage 조회 권한이 없어 `firebase deploy` 가 403 으로 멈추는데,
이 스크립트는 Hosting REST API 를 직접 호출하므로 그 권한이 필요 없습니다.

```bash
npm run build
npm run deploy:hosting
```

Functions · Firestore 규칙까지 `firebase deploy` 로 올리려면 Google Cloud 콘솔 → IAM 에서 이 서비스 계정에
**편집자(Editor)** 와 **서비스 계정 사용자(Service Account User)** 역할을 추가하거나, 프로젝트 소유자 계정으로 `firebase login` 후 배포하세요.

### 6-5. 관리자 지정 · 초기 설정

```bash
cd functions
npm run admin:set -- owner@angelsday.kr   # 6-1 에서 만든 관리자 이메일 (서비스 계정 키 필요 ↓)
npm run seed                              # settings/catalog · settings/emailRules 초기 문서 저장
```

### 6-6. 메일 발송 설정 (Trigger Email 확장 프로그램)

Functions 는 `mail` 컬렉션에 메일 문서를 쓰고, Firebase 공식 확장 프로그램이 SMTP 로 실제 발송합니다.

1. Firebase 콘솔 → **Extensions** → **Trigger Email from Firestore** 설치
2. 설정: *Email documents collection* = `mail`, *SMTP connection URI* = 사용하는 메일 서비스의 SMTP 주소
   (예: 네이버 웍스 · Gmail(앱 비밀번호) · SendGrid 등), *Default FROM* = `엔젤스데이 <noreply@도메인>`
3. 테스트: 데모 고객으로 문의를 남기면 `mail` 문서가 생기고 `delivery.state` 가 `SUCCESS` 가 됩니다.

### 6-7. GitHub Actions 로 배포 (선택)

`.github/workflows/deploy.yml` — Actions 탭에서 **수동 실행**합니다.
저장소 Secrets 에 `FIREBASE_SERVICE_ACCOUNT`(키 JSON 내용), Variables 에 `FIREBASE_PROJECT_ID` 와 `VITE_*` 값을 넣으세요. (파일 상단 주석 참고)

---

## 🔐 Firebase 비공개 키(JSON)는 어디에?

**`.secrets/firebase-service-account.json`** 에 두세요. 이 폴더는 git 에서 제외되어 커밋되지 않습니다.
자세한 내용은 [`.secrets/README.md`](./.secrets/README.md).

| 사용처 | 넣는 곳 |
|---|---|
| 로컬 관리 스크립트 (관리자 지정 · 초기 설정) | `.secrets/firebase-service-account.json` (또는 `GOOGLE_APPLICATION_CREDENTIALS=<경로>`) |
| GitHub Actions 배포 | 저장소 Secret **`FIREBASE_SERVICE_ACCOUNT`** 에 JSON 내용 붙여넣기 |
| Claude Code 클라우드 세션에서 배포 | 세션 제목 표시줄의 클라우드 환경 메뉴 → Edit → **Network secrets**(또는 API credentials), 없으면 환경 변수 **`FIREBASE_SERVICE_ACCOUNT`** = JSON 내용 (새 세션부터 적용) |
| 웹 브라우저 · Cloud Functions 실행 | **필요 없음** — 웹은 공개 설정값(`VITE_FIREBASE_*`)만, 함수는 기본 서비스 계정으로 자동 인증 |

⚠️ 키 내용을 채팅창 · 커밋 · 메신저에 붙여넣지 마세요. 노출되면 GCP IAM 에서 키를 삭제하고 새로 발급하세요.

---

## 7. 결제 (PG 연동 TODO)

현재 예약금 결제는 **MOCK** 입니다 (실제 돈이 오가지 않음).

- 데모 모드: 브라우저에서 결제 완료로 기록
- Firebase 모드: Cloud Function `payDeposit` 이 **서버에 저장된 견적서로 금액을 다시 계산**한 뒤 `confirmWithProvider()` 를 호출합니다.
  기본값(`PAYMENT_PROVIDER=mock`)은 바로 승인합니다.

실제 PG(예: 토스페이먼츠) 연동 순서 — `functions/src/payments.ts` 의 `confirmWithProvider()` 주석 참고:

1. `firebase functions:secrets:set TOSS_SECRET_KEY` 후 `payDeposit` 에 secret 연결
2. 결제 페이지(`src/pages/customer/PaymentPage.tsx`)에 결제위젯 연동 → `paymentKey` 를 `payDeposit` 에 전달
3. `confirmWithProvider()` 에서 승인 API 호출 · 금액 검증 → `PAYMENT_PROVIDER=toss`

잔금은 행사 당일 현장 결제를 가정하며, 관리자 > 고객 상세 > 결제에서 기록합니다.

---

## 8. ⚠️ 운영 전에 꼭 바꿔야 할 예시 값

아래 값은 **데모용 예시**입니다. 실제 운영 정책으로 수정하세요.

| 항목 | 위치 |
|---|---|
| 항목별 가격 · 홀 대관료 · 할인 프리셋 · 예약금 비율(20%) · 견적 유효기간 | 관리자 > 가격표 (기본값: `shared/catalog.ts`) |
| 환불 · 취소 규정, 인원 변경, 시식 등 챗봇 답변 | `shared/chatFaq.ts` (`FAQ`) |
| 결제 페이지의 환불 규정 문구 | `src/pages/customer/PaymentPage.tsx` |
| 홀 보증 인원 · 좌석 (홈페이지 기준), 시간대(11:00 · 13:30 · 18:00), 주차 안내 | `shared/venue.ts` |
| 공휴일 (2026–2027) — 매년 갱신 | `shared/venue.ts` `HOLIDAYS` |
| 준비 리스트 · 고객 체크리스트 · 당일 타임테이블 템플릿 | `shared/prepTemplates.ts` |
| 카카오톡 채널 URL | `.env.local` `VITE_KAKAO_CHANNEL_URL` |
| 담당 플래너 이름 · 연락처 (데모) | `src/data/seed.ts` / 관리자 > 고객 상세 |

---

## 9. 디자인 시스템 · 반응형

- **[DESIGN.md](./DESIGN.md)** — 색상 · 타이포그래피 · 간격 · 라운드 · 컴포넌트 · Do/Don't · 반응형 규칙
- 토큰 원천: `src/styles/tokens.css` (DESIGN.md YAML 과 1:1)
- 시각화 페이지: `public/design-system/` → 배포 후 `https://<도메인>/design-system/`
- 로고: `public/brand/*.svg`, 컴포넌트 `<Logo layout variant />` — 원본 로고의 AD 리본 모노그램을 벡터화하고 워드마크를 Cinzel 세리프로 재조판
- 모바일(< 640px) 우선 설계: 바텀시트 · 큰 터치 영역(최소 44px) · 달력은 점 표시 후 날짜 탭 시 상세, 데스크톱(≥ 900px)에서는 일정 칩 표시

---

## 10. 개발 명령

```bash
npm run dev             # 개발 서버 (데모 모드)
npm run typecheck       # 타입 검사
npm run build           # 프로덕션 빌드 → dist/
npm run build:preview   # 해시 라우팅 · 상대 경로 정적 빌드 → dist-preview/ (정적 호스팅 미리보기용)
cd functions && npm run build    # Functions 빌드 (shared/ 포함)
cd functions && npm run serve    # Firebase 에뮬레이터
```
