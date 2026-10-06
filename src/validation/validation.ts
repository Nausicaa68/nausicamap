import type {
  InvalidReason,
  LocationMetadata,
  LocationPoint,
  RawLocationCandidate,
} from '../types/location'

export const LATITUDE_MIN = -90
export const LATITUDE_MAX = 90
export const LONGITUDE_MIN = -180
export const LONGITUDE_MAX = 180

export type ValidationResult =
  | { valid: true; point: LocationPoint }
  | { valid: false; reason: InvalidReason }

export function isValidLatitude(value: number): boolean {
  return Number.isFinite(value) && value >= LATITUDE_MIN && value <= LATITUDE_MAX
}

export function isValidLongitude(value: number): boolean {
  return Number.isFinite(value) && value >= LONGITUDE_MIN && value <= LONGITUDE_MAX
}

export function toCoordinateNumber(value: unknown): number | undefined {
  if (value === undefined || value === null) return undefined
  if (typeof value === 'number') return value
  if (typeof value === 'string' && value.trim() !== '') return Number(value)
  return Number.NaN
}

export function validateCandidate(candidate: RawLocationCandidate): ValidationResult {
  const latitude = toCoordinateNumber(candidate.latitude)
  const longitude = toCoordinateNumber(candidate.longitude)

  if (latitude === undefined || longitude === undefined) {
    return { valid: false, reason: 'missing' }
  }
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    return { valid: false, reason: 'not-a-number' }
  }
  if (!isValidLatitude(latitude) || !isValidLongitude(longitude)) {
    return { valid: false, reason: 'out-of-range' }
  }

  return { valid: true, point: { latitude, longitude, ...definedMetadata(candidate) } }
}

function definedMetadata(candidate: RawLocationCandidate): LocationMetadata {
  const { latitude, longitude, ...metadata } = candidate
  const defined: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(metadata)) {
    if (value !== undefined) defined[key] = value
  }
  return defined as LocationMetadata
}
