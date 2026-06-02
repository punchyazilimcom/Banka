/**
 * PIN güvenliği: PIN asla düz metin saklanmaz. Salt + SHA-256 hash
 * localStorage'da tutulur. (Mobilde biyometrik + secure store ile sarmalanır.)
 */
const KEY = 'gtt.pin.hash';
const SALT_KEY = 'gtt.pin.salt';

async function sha256Hex(input: string): Promise<string> {
  const data = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

function randomSalt(): string {
  const a = crypto.getRandomValues(new Uint8Array(16));
  return [...a].map((b) => b.toString(16).padStart(2, '0')).join('');
}

export function hasPin(): boolean {
  return !!localStorage.getItem(KEY);
}

export async function setPin(pin: string): Promise<void> {
  const salt = randomSalt();
  const hash = await sha256Hex(salt + pin);
  localStorage.setItem(SALT_KEY, salt);
  localStorage.setItem(KEY, hash);
}

export async function verifyPin(pin: string): Promise<boolean> {
  const salt = localStorage.getItem(SALT_KEY);
  const stored = localStorage.getItem(KEY);
  if (!salt || !stored) return false;
  const hash = await sha256Hex(salt + pin);
  return hash === stored;
}

export function clearPin(): void {
  localStorage.removeItem(KEY);
  localStorage.removeItem(SALT_KEY);
}
