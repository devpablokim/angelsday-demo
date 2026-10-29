// 로컬 관리 스크립트 공통 — 서비스 계정 비공개 키(JSON)로 Firebase Admin SDK 초기화
// 키를 찾는 순서:
//   1) FIREBASE_SERVICE_ACCOUNT 환경변수 (JSON 내용 자체 — CI 시크릿 / 클라우드 세션 환경변수용)
//   2) GOOGLE_APPLICATION_CREDENTIALS 환경변수 (JSON 파일 경로)
//   3) <repo>/.secrets/firebase-service-account.json (로컬 기본 위치, git 제외)
import { cert, initializeApp } from 'firebase-admin/app';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const DEFAULT_KEY = resolve(here, '../../.secrets/firebase-service-account.json');

export function initAdmin() {
  if (process.env.FIREBASE_SERVICE_ACCOUNT) {
    const sa = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
    initializeApp({ credential: cert(sa), projectId: sa.project_id });
    return sa.project_id;
  }
  const keyPath = process.env.GOOGLE_APPLICATION_CREDENTIALS || DEFAULT_KEY;
  if (!existsSync(keyPath)) {
    console.error(`\n✗ 서비스 계정 키를 찾을 수 없어요: ${keyPath}`);
    console.error('  .secrets/README.md 를 참고해 키(JSON)를 .secrets/firebase-service-account.json 에 두세요.\n');
    process.exit(1);
  }
  const sa = JSON.parse(readFileSync(keyPath, 'utf8'));
  initializeApp({ credential: cert(sa), projectId: sa.project_id });
  return sa.project_id;
}
