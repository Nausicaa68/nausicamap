import { describe, expect, it } from 'vitest'
import { parseLocationHistory } from '../src/parser/parseLocationHistory'

describe('parseLocationHistory', () => {
  it('recognises standard latitude/longitude', () => {
    const result = parseLocationHistory([{ latitude: 35.17, longitude: 136.88 }])
    expect(result.points).toEqual([{ latitude: 35.17, longitude: 136.88 }])
    expect(result.invalidCount).toBe(0)
  })

  it('recognises lat/lng', () => {
    const result = parseLocationHistory({ lat: 35.17, lng: 136.88 })
    expect(result.points).toEqual([{ latitude: 35.17, longitude: 136.88 }])
  })

  it('recognises lat/lon', () => {
    const result = parseLocationHistory([{ lat: -33.86, lon: 151.21 }])
    expect(result.points).toEqual([{ latitude: -33.86, longitude: 151.21 }])
  })

  it('converts latitudeE7/longitudeE7', () => {
    const result = parseLocationHistory([{ latitudeE7: 351_700_000, longitudeE7: 1_368_800_000 }])
    expect(result.points).toHaveLength(1)
    expect(result.points[0]?.latitude).toBeCloseTo(35.17, 10)
    expect(result.points[0]?.longitude).toBeCloseTo(136.88, 10)
  })

  it('accepts coordinates written as numeric strings', () => {
    const result = parseLocationHistory([{ lat: '35.17', lng: '136.88' }])
    expect(result.points).toEqual([{ latitude: 35.17, longitude: 136.88 }])
  })

  it('finds positions in nested structures, in document order', () => {
    const data = {
      meta: { source: 'test' },
      days: [
        { visits: [{ place: { location: { lat: 1, lng: 2 } } }] },
        { segments: [[{ latitude: 3, longitude: 4 }], { deeper: { latitudeE7: 50_000_000, longitudeE7: 60_000_000 } }] },
      ],
    }
    const result = parseLocationHistory(data)
    expect(result.points.map((p) => [p.latitude, p.longitude])).toEqual([
      [1, 2],
      [3, 4],
      [5, 6],
    ])
  })

  it('skips out-of-range coordinates without blocking the others', () => {
    const result = parseLocationHistory([
      { lat: 35.1, lng: 136.9 },
      { lat: 91, lng: 136.9 },
      { lat: 35.1, lng: -181 },
      { latitudeE7: 950_000_000, longitudeE7: 0 },
    ])
    expect(result.points).toHaveLength(1)
    expect(result.candidateCount).toBe(4)
    expect(result.invalidCount).toBe(3)
    expect(result.invalidByReason['out-of-range']).toBe(3)
  })

  it('counts incomplete or non-numeric entries as skipped', () => {
    const result = parseLocationHistory([
      { latitude: 35.1 },
      { lat: 'abc', lng: 136 },
      { lat: null, lng: 136 },
      { lat: true, lng: 136 },
    ])
    expect(result.points).toHaveLength(0)
    expect(result.invalidByReason).toEqual({ missing: 2, 'not-a-number': 2, 'out-of-range': 0 })
  })

  it('prefers a complete pair over a partial one (lat + lon)', () => {
    const result = parseLocationHistory([{ lat: 10, lon: 20 }])
    expect(result.points).toEqual([{ latitude: 10, longitude: 20 }])
    expect(result.invalidCount).toBe(0)
  })

  it('returns zero candidates for a JSON without positions', () => {
    const result = parseLocationHistory({ users: [{ name: 'Alice', age: 30 }], tags: ['a', 'b'] })
    expect(result.points).toHaveLength(0)
    expect(result.candidateCount).toBe(0)
  })

  it('extracts the date and accuracy when present', () => {
    const result = parseLocationHistory([
      { lat: 1, lng: 2, timestamp: '2024-05-01T10:00:00Z', accuracy: 12 },
      { lat: 1, lng: 2, timestampMs: '1714557600000' },
      { lat: 1, lng: 2, time: 1714557600 },
      { lat: 1, lng: 2, timestamp: 'not a date' },
    ])
    const expected = new Date('2024-05-01T10:00:00Z')
    expect(result.points[0]?.timestamp).toEqual(expected)
    expect(result.points[0]?.accuracy).toBe(12)
    expect(result.points[1]?.timestamp).toEqual(expected)
    expect(result.points[2]?.timestamp).toEqual(expected)
    expect(result.points[3]?.timestamp).toBeUndefined()
  })

  it('handles very deep nesting without a stack overflow', () => {
    let nested: unknown = { lat: 1, lng: 2 }
    for (let i = 0; i < 50_000; i++) nested = { child: nested }
    expect(parseLocationHistory(nested).points).toHaveLength(1)
  })
})
