// 관리자 지정: Firebase Auth 사용자에게 { admin: true } 커스텀 클레임을 부여합니다.
// 사용법:  cd functions && npm run admin:set -- owner@angelsday.kr        (해제: --revoke)
// 먼저 Firebase 콘솔 > Authentication 에서 해당 이메일/비밀번호 사용자를 만들어 두세요.
import { getAuth } from 'firebase-admin/auth';
import { initAdmin } from './_admin.mjs';

const email = process.argv.find((a) => a.includes('@'));
const revoke = process.argv.includes('--revoke');
if (!email) {
  console.error('사용법: npm run admin:set -- <email> [--revoke]');
  process.exit(1);
}
const project = initAdmin();
const auth = getAuth();
const user = await auth.getUserByEmail(email);
const claims = { ...(user.customClaims ?? {}), admin: !revoke };
await auth.setCustomUserClaims(user.uid, claims);
console.log(`✓ [${project}] ${email} → admin=${!revoke}. 관리자 페이지에서 다시 로그인하면 적용돼요.`);
