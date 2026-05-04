import { randomBytes, createCipheriv, createDecipheriv } from "crypto";
import CryptoJS from "crypto-js";

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY;

if (!ENCRYPTION_KEY) {
  throw new Error(
    "ENCRYPTION_KEY environment variable is not set. Server cannot start.",
  );
}

if (ENCRYPTION_KEY.length !== 64) {
  throw new Error(
    "ENCRYPTION_KEY must be a 64-character hex string (32 bytes for AES-256).",
  );
}

const KEY = Buffer.from(ENCRYPTION_KEY, "hex");

// Optional fallback keys for data encrypted with rotated keys.
// Populate ENCRYPTION_KEY_V1 (and V2, V3…) in Vercel env when rotating keys.
// Each must be a 64-char hex string.
const FALLBACK_KEYS: Buffer[] = (
  [
    process.env.ENCRYPTION_KEY_V1,
    process.env.ENCRYPTION_KEY_V2,
    process.env.ENCRYPTION_KEY_V3,
  ].filter((k): k is string => typeof k === "string" && k.length === 64)
).map((k) => Buffer.from(k, "hex"));

function tryGcmDecrypt(key: Buffer, ivHex: string, tagHex: string, ctHex: string): string | null {
  try {
    const decipher = createDecipheriv("aes-256-gcm", key, Buffer.from(ivHex, "hex"));
    decipher.setAuthTag(Buffer.from(tagHex, "hex"));
    return decipher.update(Buffer.from(ctHex, "hex")).toString("utf8") + decipher.final("utf8");
  } catch {
    return null;
  }
}

/**
 * Encrypts text using AES-256-GCM (authenticated encryption).
 * Format: ENC:<iv_hex>:<tag_hex>:<ciphertext_hex>
 */
export function encrypt(text: string): string {
  if (!text || text.startsWith("ENC:")) return text;

  const iv = randomBytes(12); // 96-bit IV — recommended for GCM
  const cipher = createCipheriv("aes-256-gcm", KEY, iv);
  const encrypted = Buffer.concat([
    cipher.update(text, "utf8"),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag(); // 128-bit authentication tag

  return `ENC:${iv.toString("hex")}:${tag.toString("hex")}:${encrypted.toString("hex")}`;
}

/**
 * Decrypts text. Supports:
 *   - GCM format:    ENC:<iv>:<tag>:<ciphertext>  (AES-256-GCM, current)
 *   - Legacy format: ENC:<base64>                 (CryptoJS ECB — read-only)
 *
 * If the primary key fails (key rotation), tries ENCRYPTION_KEY_V1/V2/V3 in order.
 */
export function decrypt(text: string): string {
  if (!text || !text.startsWith("ENC:")) return text;

  const parts = text.split(":");

  // GCM format: ENC:<iv>:<tag>:<ciphertext> → 4 parts
  if (parts.length === 4) {
    const [, ivHex, tagHex, ctHex] = parts;

    // Try primary key first
    const primary = tryGcmDecrypt(KEY, ivHex, tagHex, ctHex);
    if (primary !== null) return primary;

    // Try fallback keys (for data encrypted before key rotation)
    for (const fallbackKey of FALLBACK_KEYS) {
      const result = tryGcmDecrypt(fallbackKey, ivHex, tagHex, ctHex);
      if (result !== null) return result;
    }

    console.error("[decrypt] AES-GCM decryption failed with all keys — possible key mismatch");
    return text;
  }

  // Legacy CryptoJS format: ENC:<base64> → 2 parts
  if (parts.length === 2) {
    try {
      const bytes = CryptoJS.AES.decrypt(parts[1], ENCRYPTION_KEY!);
      return bytes.toString(CryptoJS.enc.Utf8) || text;
    } catch {
      console.error("[decrypt] Legacy CryptoJS decryption failed");
      return text;
    }
  }

  return text;
}
