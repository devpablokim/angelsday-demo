// 서비스 계정 키 → Google OAuth 액세스 토큰 (외부 라이브러리 없이)
import { createSign } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

export const root = resolve(new URL('..', import.meta.url).pathname);

export function loadKey() {
  if (process.env.FIREBASE_SERVICE_ACCOUNT) return JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
  const p = process.env.GOOGLE_APPLICATION_CREDENTIALS ?? join(root, '.secrets/firebase-service-account.json');
  if (!existsSync(p)) throw new Error(`서비스 계정 키를 찾을 수 없어요: ${p}`);
  return JSON.parse(readFileSync(p, 'utf8'));
}

export async function accessToken(key = loadKey()) {
  const b64 = (o) => Buffer.from(typeof o === 'string' ? o : JSON.stringify(o)).toString('base64url');
  const now = Math.floor(Date.now() / 1000);
  const claims = { iss: key.client_email, scope: 'https://www.googleapis.com/auth/cloud-platform https://www.googleapis.com/auth/firebase', aud: key.token_uri, iat: now, exp: now + 3600 };
  const unsigned = `${b64({ alg: 'RS256', typ: 'JWT' })}.${b64(claims)}`;
  const sig = createSign('RSA-SHA256').update(unsigned).sign(key.private_key, 'base64url');
  const res = await fetch(key.token_uri, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion: `${unsigned}.${sig}` }),
  });
  if (!res.ok) throw new Error(`토큰 발급 실패: ${res.status} ${await res.text()}`);
  return (await res.json()).access_token;
}

export function api(token) {
  return async (method, url, body) => {
    const res = await fetch(url, { method, headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: body ? JSON.stringify(body) : undefined });
    const text = await res.text();
    if (!res.ok) throw new Error(`${method} ${url} → ${res.status} ${text}`);
    return text ? JSON.parse(text) : {};
  };
}

export function projectId() {
  return JSON.parse(readFileSync(join(root, '.firebaserc'), 'utf8')).projects.default;
}
