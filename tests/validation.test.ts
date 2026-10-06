import { describe, expect, it } from 'vitest'
import { isValidLatitude, isValidLongitude, validateCandidate } from '../src/validation/validation'

describe('isValidLatitude / isValidLongitude', () => {
  it('accepts the inclusive bounds', () => {
    expect(isValidLatitude(-90)).toBe(true)
    expect(isValidLatitude(90)).toBe(true)
    expect(isValidLongitude(-180)).toBe(true)
    expect(isValidLongitude(180)).toBe(true)
  })

  it('rejects out-of-range or non-finite values', () => {
    expect(isValidLatitude(90.0001)).toBe(false)
    expect(isValidLatitude(-91)).toBe(false)
    expect(isValidLongitude(180.5)).toBe(false)
    expect(isValidLongitude(-200)).toBe(false)
    expect(isValidLatitude(Number.NaN)).toBe(false)
    expect(isValidLongitude(Number.POSITIVE_INFINITY)).toBe(false)
  })
})

describe('validateCandidate', () => {
  it('produces a LocationPoint for valid coordinates', () => {
    expect(validateCandidate({ latitude: 35.17, longitude: 136.88 })).toEqual({
      valid: true,
      point: { latitude: 35.17, longitude: 136.88 },
    })
  })

  it('keeps the date and accuracy', () => {
    const timestamp = new Date('2024-01-01T00:00:00Z')
    const result = validateCandidate({ latitude: 0, longitude: 0, timestamp, accuracy: 5 })
    expect(result).toEqual({ valid: true, point: { latitude: 0, longitude: 0, timestamp, accuracy: 5 } })
  })

  it('distinguishes rejection reasons', () => {
    expect(validateCandidate({ latitude: undefined, longitude: 136 })).toEqual({ valid: false, reason: 'missing' })
    expect(validateCandidate({ latitude: 'x', longitude: 136 })).toEqual({ valid: false, reason: 'not-a-number' })
    expect(validateCandidate({ latitude: {}, longitude: 136 })).toEqual({ valid: false, reason: 'not-a-number' })
    expect(validateCandidate({ latitude: 100, longitude: 136 })).toEqual({ valid: false, reason: 'out-of-range' })
    expect(validateCandidate({ latitude: 10, longitude: 190 })).toEqual({ valid: false, reason: 'out-of-range' })
  })
})
