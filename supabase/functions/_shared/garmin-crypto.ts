function fromBase64(value: string): Uint8Array {
  return Uint8Array.from(atob(value), c => c.charCodeAt(0));
}

function toBase64(bytes: Uint8Array): string {
  return btoa(String.fromCharCode(...bytes));
}

async function importKey(keyBase64: string): Promise<CryptoKey> {
  const raw = fromBase64(keyBase64);
  if (raw.length !== 32) throw new Error("GARMIN_TOKEN_KEY must be 32 bytes, base64 encoded");
  return crypto.subtle.importKey("raw", raw, "AES-GCM", false, ["encrypt", "decrypt"]);
}

export async function encryptToken(plain: string, keyBase64: string): Promise<string> {
  const key = await importKey(keyBase64);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const cipher = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, new TextEncoder().encode(plain));
  return `${toBase64(iv)}.${toBase64(new Uint8Array(cipher))}`;
}

export async function decryptToken(stored: string, keyBase64: string): Promise<string> {
  const [iv, cipher] = stored.split(".");
  if (!iv || !cipher) throw new Error("Malformed encrypted token");
  const key = await importKey(keyBase64);
  const plain = await crypto.subtle.decrypt({ name: "AES-GCM", iv: fromBase64(iv) }, key, fromBase64(cipher));
  return new TextDecoder().decode(plain);
}

export async function sha256Hex(value: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest), b => b.toString(16).padStart(2, "0")).join("");
}
