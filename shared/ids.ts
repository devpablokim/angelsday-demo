const ALPHABET = 'abcdefghijkmnpqrstuvwxyz23456789';

function randomBytes(n: number): Uint8Array {
  const arr = new Uint8Array(n);
  globalThis.crypto.getRandomValues(arr);
  return arr;
}

/** 고객 관리 URL 토큰 — 추측이 불가능하도록 22자 난수 (≈110bit) */
export function bookingToken(): string {
  return Array.from(randomBytes(22), (b) => ALPHABET[b % ALPHABET.length]).join('');
}

export function uid(prefix = 'id'): string {
  return `${prefix}_${Array.from(randomBytes(8), (b) => ALPHABET[b % ALPHABET.length]).join('')}`;
}

export function receiptNo(): string {
  const d = new Date();
  const ymd = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
  return `AD-${ymd}-${Array.from(randomBytes(4), (b) => (b % 10).toString()).join('')}`;
}

const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // 헷갈리는 0/O, 1/I 제외

/** 예약 비밀번호 — 8자리(≈40bit), 보기 쉽게 4자리씩 끊어 표시 */
export function accessCode(): string {
  const s = Array.from(randomBytes(8), (b) => CODE_ALPHABET[b % CODE_ALPHABET.length]).join('');
  return `${s.slice(0, 4)}-${s.slice(4)}`;
}

/** 입력값 정규화: 공백·하이픈 제거, 대문자 */
export function normalizeCode(input: string): string {
  return input.toUpperCase().replace(/[^A-Z0-9]/g, '');
}
