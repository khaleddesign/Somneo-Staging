import { randomBytes, createCipheriv, createDecipheriv } from 'crypto'
import CryptoJS from 'crypto-js'

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY

if (!ENCRYPTION_KEY) {
  throw new Error('ENCRYPTION_KEY environment variable is not set. Server cannot start.')
}

if (ENCRYPTION_KEY.length !== 64) {
  throw new Error('ENCRYPTION_KEY must be a 64-character hex string (32 bytes for AES-256).')
}

const KEY = Buffer.from(ENCRYPTION_KEY, 'hex')

/**
 * Encrypts text using AES-256-GCM (authenticated encryption).
 * Format: ENC:<iv_hex>:<tag_hex>:<ciphertext_hex>
 */
export function encrypt(text: string): string {
  if (!text || text.startsWith('ENC:')) return text

  const iv = randomBytes(12) // 96-bit IV — recommended for GCM
  const cipher = createCipheriv('aes-256-gcm', KEY, iv)
  const encrypted = Buffer.concat([cipher.update(text, 'utf8'), cipher.final()])
  const tag = cipher.getAuthTag() // 128-bit authentication tag

  return `ENC:${iv.toString('hex')}:${tag.toString('hex')}:${encrypted.toString('hex')}`
}

/**
 * Decrypts text.
 * Supports both:
 *   - New format: ENC:<iv>:<tag>:<ciphertext>  (AES-256-GCM)
 *   - Legacy format: ENC:<base64>              (CryptoJS ECB — read-only, migration path)
 */
export function decrypt(text: string): string {
  if (!text || !text.startsWith('ENC:')) return text

  const parts = text.split(':')

  // New GCM format: ENC:<iv>:<tag>:<ciphertext> → 4 parts
  if (parts.length === 4) {
    try {
      const [, ivHex, tagHex, ctHex] = parts
      const decipher = createDecipheriv('aes-256-gcm', KEY, Buffer.from(ivHex, 'hex'))
      decipher.setAuthTag(Buffer.from(tagHex, 'hex'))
      return decipher.update(Buffer.from(ctHex, 'hex')).toString('utf8') + decipher.final('utf8')
    } catch {
      console.error('[decrypt] AES-GCM decryption failed (integrity check or key mismatch)')
      return text
    }
  }

  // Legacy CryptoJS format: ENC:<base64> → 2 parts
  // Kept only for backward-compatible reads of existing DB records.
  // On next write, data will be re-encrypted with GCM.
  if (parts.length === 2) {
    try {
      const bytes = CryptoJS.AES.decrypt(parts[1], ENCRYPTION_KEY!)
      return bytes.toString(CryptoJS.enc.Utf8) || text
    } catch {
      console.error('[decrypt] Legacy CryptoJS decryption failed')
      return text
    }
  }

  return text
}
