/**
 * Extract a patient reference from a PDF filename.
 *
 * Tries several common naming conventions used by sleep study labs:
 *   - PAT-2026-001_rapport.pdf    → "PAT-2026-001"
 *   - REF_42_dupont.pdf           → "REF_42"
 *   - 2024-DUPONT-rapport.pdf     → "2024-DUPONT"
 *   - rapport_patient_A12B.pdf    → "A12B"
 *   - A12B.pdf                    → "A12B"
 *
 * Returns null when no recognisable pattern is found.
 */

const PATTERNS: RegExp[] = [
  // PAT-2026-001 / REF-2026-001 style
  /\b((?:PAT|REF|ID|ETU|ETUDE)[-_]\d{2,}[-_][A-Z0-9]+)\b/i,
  // Pure alphanumeric code between separators: A12B, 20240523, etc.
  /(?:^|[-_ ])([A-Z]{1,4}\d{2,}(?:[-_][A-Z0-9]+)?)/i,
  // Year-NAME style: 2024-DUPONT
  /\b(\d{4}[-_][A-Z]{2,}(?:[-_][A-Z0-9]*)?)\b/i,
  // Short code at start of filename (e.g. "A12B_rapport")
  /^([A-Z0-9]{3,12})[-_ ]/i,
]

export function extractPatientRef(filename: string): string | null {
  // Strip extension
  const stem = filename.replace(/\.[^.]+$/, '')

  for (const pattern of PATTERNS) {
    const match = stem.match(pattern)
    if (match?.[1]) {
      return match[1].toUpperCase()
    }
  }

  return null
}
