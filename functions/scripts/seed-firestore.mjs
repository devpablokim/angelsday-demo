// 초기 설정 문서 생성: settings/catalog(가격표), settings/emailRules(자동 메일 on/off)
// 사용법: cd functions && npm run seed            (이미 있으면 건너뜀, 덮어쓰기: -- --force)
import { getFirestore } from 'firebase-admin/firestore';
import { createRequire } from 'node:module';
import { initAdmin } from './_admin.mjs';

const require = createRequire(import.meta.url);
const { DEFAULT_CATALOG } = require('../lib/shared/catalog.js');
const { enabledMap } = require('../lib/shared/emailRules.js');

const force = process.argv.includes('--force');
const project = initAdmin();
const db = getFirestore();
db.settings({ ignoreUndefinedProperties: true });

for (const [path, data] of [
  ['settings/catalog', { ...DEFAULT_CATALOG, updatedAt: new Date().toISOString() }],
  ['settings/emailRules', { enabled: enabledMap() }],
]) {
  const ref = db.doc(path);
  if ((await ref.get()).exists && !force) {
    console.log(`- ${path} 이미 있음 (건너뜀)`);
    continue;
  }
  await ref.set(data);
  console.log(`✓ ${path} 저장`);
}
console.log(`완료 [${project}] — 가격은 데모용 예시값이에요. 관리자 > 가격표에서 실제 가격으로 바꿔 주세요.`);
