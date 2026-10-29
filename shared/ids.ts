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
