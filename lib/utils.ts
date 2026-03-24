import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// calculate MD5 checksum for a given string (or file content)
// we use Node's built-in crypto module which is available in a Next.js environment
export function computeMd5(data: string): string {
  const { createHash } = require("crypto")
  return createHash("md5").update(data, "utf8").digest("hex")
}

export function formatFileSize(bytes: number | null): string {
  if (!bytes || bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i]
}
