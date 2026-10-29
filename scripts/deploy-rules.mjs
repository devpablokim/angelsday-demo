#!/usr/bin/env node
/**
 * Firestore · Storage 보안 규칙 배포 (Firebase Rules REST API) — firebase CLI 없이 서비스 계정 키로 배포합니다.
 *   node scripts/deploy-rules.mjs
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { accessToken, api, projectId, root } from './_gcp.mjs';

const RULES = 'https://firebaserules.googleapis.com/v1';

async function main() {
  const P = projectId();
  const call = api(await accessToken());
  const { releases = [] } = await call('GET', `${RULES}/projects/${P}/releases`);
  const firebaseJson = JSON.parse(readFileSync(join(root, 'firebase.json'), 'utf8'));
  const targets = [
    { file: firebaseJson.firestore.rules, release: 'cloud.firestore' },
    { file: firebaseJson.storage.rules, release: releases.map((r) => r.name.split('/releases/')[1]).find((n) => n.startsWith('firebase.storage/')) },
  ];
  for (const t of targets) {
    if (!t.release) {
      console.log(`- ${t.file}: 배포할 release 가 없어요 (Storage 가 켜져 있는지 확인하세요)`);
      continue;
    }
    const ruleset = await call('POST', `${RULES}/projects/${P}/rulesets`, { source: { files: [{ name: t.file, content: readFileSync(join(root, t.file), 'utf8') }] } });
    const name = `projects/${P}/releases/${t.release}`;
    const exists = releases.some((r) => r.name === name);
    if (exists) await call('PATCH', `${RULES}/${name}`, { release: { name, rulesetName: ruleset.name } });
    else await call('POST', `${RULES}/projects/${P}/releases`, { name, rulesetName: ruleset.name });
    console.log(`✔ ${t.file} → ${t.release}`);
  }
}

main().catch((e) => {
  console.error(`✖ ${e.message}`);
  process.exit(1);
});
