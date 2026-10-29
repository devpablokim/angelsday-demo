# 🔐 Firebase 비공개 키(JSON) 보관 위치

**이 폴더에 넣으세요 →** `.secrets/firebase-service-account.json`

이 폴더의 파일은 `.gitignore` 로 제외되어 **GitHub 에 올라가지 않습니다** (이 README 만 예외).
`*service-account*.json`, `*-firebase-adminsdk-*.json` 이름의 파일도 저장소 어디에 있든 무시됩니다.

---

## 1. 이 키는 무엇인가요?

Firebase **서비스 계정 비공개 키**입니다. 프로젝트의 모든 데이터에 관리자 권한으로 접근할 수 있는 열쇠예요.

받는 곳: **Firebase 콘솔 → ⚙️ 프로젝트 설정 → 서비스 계정 → "새 비공개 키 생성"** → JSON 파일 다운로드
→ 파일 이름을 `firebase-service-account.json` 으로 바꿔 이 폴더에 넣습니다.

## 2. 어디에 쓰이나요? (필요한 곳 / 필요 없는 곳)

| 용도 | 키 필요? | 설명 |
|---|---|---|
| 로컬 관리 스크립트 | ✅ 필요 | 관리자 지정(`npm run admin:set`), 초기 설정 저장(`npm run seed`) — `functions/scripts/` |
| GitHub Actions 배포 | ✅ 필요 | 파일이 아닌 **저장소 시크릿** `FIREBASE_SERVICE_ACCOUNT` 에 JSON 내용을 붙여넣기 |
| 클라우드 세션(Claude Code)에서 배포 | ✅ 필요 | 파일 업로드 대신 **환경 변수**로 등록 (아래 4번) |
| 브라우저(웹앱) | ❌ 불필요 | 웹은 `.env.local` 의 `VITE_FIREBASE_*` **공개 설정값**만 사용합니다. 비공개 키를 웹 코드에 절대 넣지 마세요 |
| Cloud Functions 실행 | ❌ 불필요 | 배포된 함수는 Google 이 기본 서비스 계정으로 자동 인증합니다 |

## 3. 로컬에서 사용하기

```bash
# 기본 위치(.secrets/firebase-service-account.json)에 두었다면 그대로 실행됩니다
cd functions
npm run admin:set -- owner@angelsday.kr
```

다른 위치에 두었다면 경로를 환경 변수로 알려주세요.

```bash
export GOOGLE_APPLICATION_CREDENTIALS="$HOME/keys/angelsday-firebase.json"
```

## 4. 클라우드 세션(Claude Code on the web)에서 쓰기

이 프로젝트를 다루는 Claude Code 세션은 원격 컨테이너에서 실행되고, 컨테이너는 세션이 끝나면 사라집니다.
그래서 **파일을 올려두는 대신 환경 설정에 비밀 값으로 등록**합니다.

1. 세션 제목 표시줄의 **클라우드 환경 메뉴 → Edit(편집)** 을 엽니다.
2. **Network secrets**(앱 버전에 따라 **API credentials**) 항목이 있으면 그곳에, 없으면 **환경 변수**로 추가합니다.
   - 이름: `FIREBASE_SERVICE_ACCOUNT`
   - 값: JSON 파일 **내용 전체**
3. **새 세션**부터 적용됩니다. 스크립트(`functions/scripts/_admin.mjs`)는 `FIREBASE_SERVICE_ACCOUNT` 를 가장 먼저 읽습니다.

> 배포하려면 해당 환경의 네트워크 정책이 Firebase/Google API 호스트(`*.googleapis.com`, `firebase.googleapis.com` 등)로의 접속을 허용해야 합니다.

## 5. 절대 하지 말 것

- ❌ 키 내용을 **채팅창에 붙여넣기** (Claude 포함 어떤 대화에도)
- ❌ 커밋 · 이메일 · 메신저로 공유
- ❌ 웹 코드(`src/`)나 `.env.local` 에 넣기

## 6. 키가 노출되었다면

1. [Google Cloud 콘솔 → IAM 및 관리자 → 서비스 계정](https://console.cloud.google.com/iam-admin/serviceaccounts) 에서 해당 서비스 계정의 **키를 즉시 삭제**합니다.
2. Firebase 콘솔에서 **새 비공개 키를 생성**해 이 폴더와 GitHub 시크릿을 교체합니다.
