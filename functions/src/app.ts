import { initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { setGlobalOptions } from 'firebase-functions/v2';
import { defineString } from 'firebase-functions/params';

/** 서울 리전 — Firestore 데이터베이스도 asia-northeast3(서울)에 만들어야 트리거가 동작합니다. */
export const REGION = 'asia-northeast3';
export const TIME_ZONE = 'Asia/Seoul';

setGlobalOptions({ region: REGION, maxInstances: 10 });

initializeApp();
export const db = getFirestore();
// shared/ops 가 만드는 객체에는 undefined 필드가 있을 수 있어 무시하도록 설정
db.settings({ ignoreUndefinedProperties: true });

/** 메일 속 “내 행사 페이지” 링크의 기준 주소 (예: https://angelsday.web.app) — 배포 시 입력 */
export const PUBLIC_BASE_URL = defineString('PUBLIC_BASE_URL', {
  default: '',
  description: '고객 관리 URL 기준 주소 (예: https://angelsday.web.app 또는 커스텀 도메인)',
});

export function baseUrl(): string {
  const v = PUBLIC_BASE_URL.value();
  if (v) return v.replace(/\/$/, '');
  return `https://${process.env.GCLOUD_PROJECT ?? 'localhost'}.web.app`;
}
