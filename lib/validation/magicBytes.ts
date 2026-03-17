/**
 * Magic bytes validation for uploaded files.
 *
 * Validates that the binary signature of a file matches its declared extension.
 * Prevents file type spoofing (e.g. .exe renamed to .edf).
 *
 * Usage:
 *   const header = buffer.slice(0, 8)
 *   const result = validateMagicBytes(header, 'study.edf')
 *   if (!result.valid) return NextResponse.json({ error: result.reason }, { status: 400 })
 */

export interface MagicBytesResult {
  valid: boolean
  reason?: string
}

interface Signature {
  /** Expected bytes at the given offset */
  bytes: number[]
  offset: number
}

/**
 * Known magic byte signatures per allowed extension.
 * EDF/BDF: Standard EDF+ header starts with "0       " (ASCII 0x30 + 7 spaces).
 * ZIP: Local file header PK\x03\x04.
 */
const SIGNATURES: Record<string, Signature[]> = {
  edf: [{ bytes: [0x30, 0x20, 0x20, 0x20, 0x20, 0x20, 0x20, 0x20], offset: 0 }],
  bdf: [{ bytes: [0x30, 0x20, 0x20, 0x20, 0x20, 0x20, 0x20, 0x20], offset: 0 }],
  zip: [{ bytes: [0x50, 0x4B, 0x03, 0x04], offset: 0 }],
}

const MIN_BUFFER_SIZE = 4

/**
 * Validates the magic bytes of a file buffer against its declared extension.
 *
 * @param buffer - At least the first 8 bytes of the file
 * @param filename - Original filename including extension
 */
export function validateMagicBytes(buffer: Buffer, filename: string): MagicBytesResult {
  const ext = filename.split('.').pop()?.toLowerCase() ?? ''

  const sigs = SIGNATURES[ext]
  if (!sigs) {
    return { valid: false, reason: `Extension .${ext} not allowed` }
  }

  if (buffer.length < MIN_BUFFER_SIZE) {
    return { valid: false, reason: `File header too short (${buffer.length} bytes, min ${MIN_BUFFER_SIZE})` }
  }

  for (const sig of sigs) {
    const slice = buffer.slice(sig.offset, sig.offset + sig.bytes.length)
    if (sig.bytes.length <= slice.length && sig.bytes.every((b, i) => slice[i] === b)) {
      return { valid: true }
    }
  }

  return { valid: false, reason: `Invalid file signature for .${ext}` }
}
