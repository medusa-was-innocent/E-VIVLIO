const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const NAME_KEY = "yard-listener-name";

export function makeRoomCode(): string {
  let code = "";
  const bytes = new Uint8Array(6);
  if (typeof crypto !== "undefined" && crypto.getRandomValues) {
    crypto.getRandomValues(bytes);
  } else {
    for (let i = 0; i < 6; i++) bytes[i] = Math.floor(Math.random() * 256);
  }
  for (let i = 0; i < 6; i++) code += ALPHABET[bytes[i]! % ALPHABET.length];
  return code;
}

export function normalizeCode(raw: string): string | null {
  const cleaned = raw
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .replace(/0/g, "O")
    .replace(/1/g, "L")
    .replace(/I/g, "L");
  if (cleaned.length !== 6) return null;
  if (![...cleaned].every((c) => ALPHABET.includes(c))) return null;
  return cleaned;
}

export function p2pRoomId(code: string): string {
  return `yard-${code}`;
}

export function loadName(): string {
  if (typeof window === "undefined") return "";
  try {
    return localStorage.getItem(NAME_KEY)?.trim() ?? "";
  } catch {
    return "";
  }
}

export function saveName(name: string) {
  try {
    localStorage.setItem(NAME_KEY, name.trim().slice(0, 24));
  } catch {
    // private mode
  }
}

export function displayName(name: string, fallback = "Listener"): string {
  const trimmed = name.trim().slice(0, 24);
  return trimmed || fallback;
}
