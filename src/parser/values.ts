export type JsonRecord = Record<string, unknown>

export function asRecord(value: unknown): JsonRecord | undefined {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    ? (value as JsonRecord)
    : undefined
}

export function asArray(value: unknown): readonly unknown[] {
  return Array.isArray(value) ? value : []
}

export function asString(value: unknown): string | undefined {
  return typeof value === 'string' && value !== '' ? value : undefined
}

export function asNonNegativeNumber(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 ? value : undefined
}

export function toDate(value: unknown): Date | undefined {
  let date: Date | undefined
  if (typeof value === 'number') {
    date = new Date(value < 1e11 ? value * 1000 : value)
  } else if (typeof value === 'string' && value.trim() !== '') {
    const numeric = Number(value)
    date = Number.isFinite(numeric) ? toDate(numeric) : new Date(value)
  }
  return date && !Number.isNaN(date.getTime()) ? date : undefined
}

export function parseLatLngString(value: unknown): { latitude: number | undefined; longitude: number | undefined } {
  if (value === undefined || value === null) return { latitude: undefined, longitude: undefined }
  const match = typeof value === 'string' ? LAT_LNG_PATTERN.exec(value) : null
  if (!match) return { latitude: Number.NaN, longitude: Number.NaN }
  return { latitude: Number(match[1]), longitude: Number(match[2]) }
}

const NUMBER = '([-+]?\\d+(?:\\.\\d+)?)'
const LAT_LNG_PATTERN = new RegExp(`^\\s*(?:geo:)?\\s*${NUMBER}\\s*°?\\s*,\\s*${NUMBER}\\s*°?\\s*$`, 'i')

export function asFiniteNumber(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined
}

export function asProbability(value: unknown): number | undefined {
  const number = asFiniteNumber(value)
  return number !== undefined && number >= 0 && number <= 1 ? number : undefined
}

export function utcOffsetFromIsoString(value: unknown): number | undefined {
  if (typeof value !== 'string') return undefined
  const match = /(?:([+-])(\d{2}):?(\d{2})|Z)$/.exec(value.trim())
  if (!match) return undefined
  if (!match[1]) return 0
  const minutes = Number(match[2]) * 60 + Number(match[3])
  return match[1] === '-' ? -minutes : minutes
}
