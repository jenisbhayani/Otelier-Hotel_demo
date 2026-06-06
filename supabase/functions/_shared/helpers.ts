/** Shared parsing helpers for Hotelbeds Content / Booking API payloads. */

export function contentString(value: unknown): string {
  if (value == null) return ''
  if (typeof value === 'string') return value
  if (typeof value === 'object' && value !== null && 'content' in value) {
    return String((value as { content?: unknown }).content ?? '')
  }
  return String(value)
}

export function parseAmount(value: unknown): number {
  const n = Number(value)
  return Number.isFinite(n) ? n : 0
}
