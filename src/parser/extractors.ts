import type { RawLocationCandidate } from '../types/location'
import { toCoordinateNumber } from '../validation/validation'
import { asNonNegativeNumber, toDate, type JsonRecord } from './values'

export type LocationExtractor = (record: JsonRecord) => RawLocationCandidate | null

interface CoordinateKeys {
  latitudeKey: string
  longitudeKey: string
  divisor?: number
}

export const COORDINATE_KEY_PAIRS: readonly CoordinateKeys[] = [
  { latitudeKey: 'latitude', longitudeKey: 'longitude' },
  { latitudeKey: 'lat', longitudeKey: 'lng' },
  { latitudeKey: 'lat', longitudeKey: 'lon' },
  { latitudeKey: 'latitudeE7', longitudeKey: 'longitudeE7', divisor: 10_000_000 },
]

const TIMESTAMP_KEYS = ['timestamp', 'time', 'datetime', 'date', 'timestampMs'] as const
const ACCURACY_KEYS = ['accuracy', 'accuracyMeters'] as const

export function createKeyPairExtractor({
  latitudeKey,
  longitudeKey,
  divisor = 1,
}: CoordinateKeys): LocationExtractor {
  return (record) => {
    const hasLatitude = Object.hasOwn(record, latitudeKey)
    const hasLongitude = Object.hasOwn(record, longitudeKey)
    if (!hasLatitude && !hasLongitude) return null

    return {
      latitude: scale(record[latitudeKey], divisor),
      longitude: scale(record[longitudeKey], divisor),
      timestamp: readTimestamp(record),
      accuracy: readAccuracy(record),
    }
  }
}

export const DEFAULT_EXTRACTORS: readonly LocationExtractor[] =
  COORDINATE_KEY_PAIRS.map(createKeyPairExtractor)

function scale(value: unknown, divisor: number): unknown {
  if (divisor === 1) return value
  const numeric = toCoordinateNumber(value)
  return numeric === undefined ? undefined : numeric / divisor
}

export function readTimestamp(record: JsonRecord): Date | undefined {
  for (const key of TIMESTAMP_KEYS) {
    const date = toDate(record[key])
    if (date) return date
  }
  return undefined
}

function readAccuracy(record: JsonRecord): number | undefined {
  for (const key of ACCURACY_KEYS) {
    const value = asNonNegativeNumber(record[key])
    if (value !== undefined) return value
  }
  return undefined
}
