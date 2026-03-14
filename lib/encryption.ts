import CryptoJS from 'crypto-js'

const SECRET_KEY = process.env.ENCRYPTION_KEY

if (!SECRET_KEY) {
  throw new Error('ENCRYPTION_KEY environment variable is not set. Server cannot start without encryption key.')
}

const getSecret = () => SECRET_KEY

export function encrypt(text: string): string {
  if (!text) return text
  // Don't double encrypt
  if (text.startsWith('ENC:')) return text

  const encrypted = CryptoJS.AES.encrypt(text, getSecret()).toString()
  return `ENC:${encrypted}`
}

export function decrypt(text: string): string {
  if (!text) return text
  // Only decrypt if it has the prefix
  if (!text.startsWith('ENC:')) return text

  try {
    const encryptedText = text.replace('ENC:', '')
    const bytes = CryptoJS.AES.decrypt(encryptedText, getSecret())
    const originalText = bytes.toString(CryptoJS.enc.Utf8)
    return originalText || text // return original if decryption failed (e.g., changed key)
  } catch (error) {
    console.error('Failed to decrypt text', error)
    return text
  }
}
