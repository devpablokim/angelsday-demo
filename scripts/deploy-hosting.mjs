#!/usr/bin/env node
/**
 * Firebase Hosting 배포 (REST API) — firebase CLI 없이 서비스 계정 키만으로 dist/ 를 배포합니다.
 *
 * firebase CLI 는 배포 전에 Service Usage API 로 서비스 활성화 여부를 확인하는데,
 * 기본 firebase-adminsdk 서비스 계정에는 그 권한이 없어 403 이 납니다. 이 스크립트는 그 단계를 건너뜁니다.
 *
 *   node scripts/deploy-hosting.mjs                # firebase.json 의 hosting.site 로 배포
 *   node scripts/deploy-hosting.mjs --site my-site --dir dist
 *
 * 인증: FIREBASE_SERVICE_ACCOUNT(JSON 내용) → GOOGLE_APPLICATION_CREDENTIALS(파일 경로) → .secrets/firebase-service-account.json
 * 프록시 환경에서는 NODE_USE_ENV_PROXY=1 로 실행하세요 (Node 22.21+).
 */
import { createHash } from 'node:crypto';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, resolve, sep } from 'node:path';
import { gzipSync } from 'node:zlib';
import { accessToken, api, root } from './_gcp.mjs';

const args = Object.fromEntries(process.argv.slice(2).reduce((acc, a, i, arr) => (a.startsWith('--') ? [...acc, [a.slice(2), arr[i + 1]]] : acc), []));
const firebaseJson = JSON.parse(readFileSync(join(root, 'firebase.json'), 'utf8'));
const hosting = firebaseJson.hosting;
const site = args.site ?? hosting.site;
const dir = resolve(root, args.dir ?? hosting.public);
const API = 'https://firebasehosting.googleapis.com/v1beta1';

function walk(d) {
  return readdirSync(d).flatMap((n) => {
    const p = join(d, n);
    return statSync(p).isDirectory() ? walk(p) : [p];
  });
}

/** firebase.json 의 hosting 설정 → Hosting REST API ServingConfig */
function servingConfig(h) {
  const cfg = {};
  const match = (x) => (x.regex ? { regex: x.regex } : { glob: x.source });
  if (h.headers) cfg.headers = h.headers.map((x) => ({ ...match(x), headers: Object.fromEntries(x.headers.map((y) => [y.key, y.value])) }));
  if (h.redirects) cfg.redirects = h.redirects.map((x) => ({ ...match(x), location: x.destination, statusCode: x.type ?? 301 }));
  if (h.rewrites) cfg.rewrites = h.rewrites.map((x) => ({ ...match(x), path: x.destination }));
  if (h.cleanUrls !== undefined) cfg.cleanUrls = h.cleanUrls;
  if (h.trailingSlash !== undefined) cfg.trailingSlashBehavior = h.trailingSlash ? 'ADD' : 'REMOVE';
  return cfg;
}

async function main() {
  if (!site) throw new Error('배포할 사이트가 없어요. firebase.json 의 hosting.site 또는 --site 를 지정하세요.');
  if (!existsSync(join(dir, 'index.html'))) throw new Error(`${dir}/index.html 이 없어요. 먼저 npm run build 를 실행하세요.`);
  const token = await accessToken();
  const call = api(token);

  const ignore = (rel) => rel.split('/').some((part) => part.startsWith('.')) || rel === 'firebase.json';
  const files = walk(dir)
    .map((abs) => ({ abs, rel: relative(dir, abs).split(sep).join('/') }))
    .filter((f) => !ignore(f.rel));
  const byHash = new Map();
  const manifest = {};
  for (const f of files) {
    const gz = gzipSync(readFileSync(f.abs), { level: 9 });
    const hash = createHash('sha256').update(gz).digest('hex');
    manifest[`/${f.rel}`] = hash;
    byHash.set(hash, gz);
  }
  console.log(`▶ ${site}: ${files.length}개 파일 배포 준비`);

  const version = await call('POST', `${API}/sites/${site}/versions`, { config: servingConfig(hosting) });
  const pop = await call('POST', `${API}/${version.name}:populateFiles`, { files: manifest });
  const required = pop.uploadRequiredHashes ?? [];
  console.log(`  업로드 필요 ${required.length}개`);
  let done = 0;
  const queue = [...required];
  await Promise.all(
    Array.from({ length: 8 }, async () => {
      for (let h = queue.shift(); h; h = queue.shift()) {
        const res = await fetch(`${pop.uploadUrl}/${h}`, { method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/octet-stream' }, body: byHash.get(h) });
        if (!res.ok) throw new Error(`업로드 실패 ${h}: ${res.status} ${await res.text()}`);
        done++;
      }
    }),
  );
  console.log(`  업로드 완료 ${done}개`);
  await call('PATCH', `${API}/${version.name}?update_mask=status`, { status: 'FINALIZED' });
  const release = await call('POST', `${API}/sites/${site}/releases?versionName=${encodeURIComponent(version.name)}`, { message: process.env.DEPLOY_MESSAGE ?? 'deploy-hosting.mjs' });
  console.log(`✔ 배포 완료: https://${site}.web.app  (${release.name})`);
}

main().catch((e) => {
  console.error(`✖ ${e.message}`);
  process.exit(1);
});
