/**
 * BATCH 1 — Tâche 1.2 : Magic bytes validation
 *
 * Teste la fonction validateMagicBytes() de lib/validation/magicBytes.ts
 * Aucun mock nécessaire — fonction pure sur Buffer.
 */

import { describe, it, expect } from 'vitest'
import { validateMagicBytes } from '@/lib/validation/magicBytes'

describe('validateMagicBytes — EDF (études sommeil)', () => {
  it('accepte un vrai fichier EDF (header "0       ")', () => {
    // Standard EDF : commence par "0       " (chiffre zéro + 7 espaces)
    const realEdf = Buffer.from('0       ', 'ascii')
    const result = validateMagicBytes(realEdf, 'study.edf')
    expect(result.valid).toBe(true)
  })

  it('accepte un fichier BDF (même header EDF)', () => {
    const realBdf = Buffer.from('0       ', 'ascii')
    const result = validateMagicBytes(realBdf, 'polysomnographie.bdf')
    expect(result.valid).toBe(true)
  })

  it('rejette un fichier .exe renommé en .edf (header MZ)', () => {
    // Windows PE/EXE commence par "MZ" (0x4D 0x5A)
    const fakeEdf = Buffer.from([0x4D, 0x5A, 0x90, 0x00, 0x03, 0x00, 0x00, 0x00])
    const result = validateMagicBytes(fakeEdf, 'study.edf')
    expect(result.valid).toBe(false)
    expect(result.reason).toMatch(/Invalid file signature/)
  })

  it('rejette un fichier PDF renommé en .edf', () => {
    // PDF commence par "%PDF"
    const fakePdf = Buffer.from('%PDF-1.4\n', 'ascii')
    const result = validateMagicBytes(fakePdf, 'study.edf')
    expect(result.valid).toBe(false)
    expect(result.reason).toMatch(/Invalid file signature/)
  })

  it('rejette un fichier JPEG renommé en .edf (header FF D8 FF)', () => {
    const fakeJpeg = Buffer.from([0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10, 0x4A, 0x46])
    const result = validateMagicBytes(fakeJpeg, 'study.edf')
    expect(result.valid).toBe(false)
  })
})

describe('validateMagicBytes — ZIP (archives PSG)', () => {
  it('accepte un fichier ZIP valide (header PK\\x03\\x04)', () => {
    // ZIP local file header signature
    const realZip = Buffer.from([0x50, 0x4B, 0x03, 0x04, 0x14, 0x00, 0x00, 0x00])
    const result = validateMagicBytes(realZip, 'archive.zip')
    expect(result.valid).toBe(true)
  })

  it('rejette un .exe renommé en .zip', () => {
    const fakeZip = Buffer.from([0x4D, 0x5A, 0x90, 0x00])
    const result = validateMagicBytes(fakeZip, 'study.zip')
    expect(result.valid).toBe(false)
  })
})

describe('validateMagicBytes — Extensions non autorisées', () => {
  it('rejette une extension non listée (.php)', () => {
    const anyBuffer = Buffer.from('<?php echo "hello"; ?>')
    const result = validateMagicBytes(anyBuffer, 'shell.php')
    expect(result.valid).toBe(false)
    expect(result.reason).toMatch(/Extension .php not allowed/)
  })

  it('rejette une extension .exe directement', () => {
    const exeBuffer = Buffer.from([0x4D, 0x5A])
    const result = validateMagicBytes(exeBuffer, 'malware.exe')
    expect(result.valid).toBe(false)
    expect(result.reason).toMatch(/Extension .exe not allowed/)
  })
})

describe('validateMagicBytes — Edge cases', () => {
  it('rejette un buffer trop court (< 4 bytes)', () => {
    const tooShort = Buffer.from([0x50, 0x4B]) // Seulement 2 bytes
    const result = validateMagicBytes(tooShort, 'file.zip')
    expect(result.valid).toBe(false)
    expect(result.reason).toMatch(/too short/)
  })

  it('est insensible à la casse de l\'extension', () => {
    const realZip = Buffer.from([0x50, 0x4B, 0x03, 0x04, 0x14, 0x00, 0x00, 0x00])
    expect(validateMagicBytes(realZip, 'file.ZIP').valid).toBe(true)
    expect(validateMagicBytes(realZip, 'file.Zip').valid).toBe(true)
  })
})
