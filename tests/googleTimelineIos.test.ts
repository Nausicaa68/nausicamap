import { describe, expect, it } from 'vitest'
import exampleText from '../examples/location-history.json?raw'
import { analyzeJsonData } from '../src/analysis/analyzeLocationFile'
import { parseLocationHistory } from '../src/parser/parseLocationHistory'

const timeline = [
  {
    endTime: '2024-05-01T10:00:00.000+09:00',
    startTime: '2024-05-01T08:00:00.000+09:00',
    visit: {
      hierarchyLevel: '0',
      topCandidate: {
        probability: '0.800000',
        semanticType: 'Inferred Home',
        placeID: 'example-place',
        placeLocation: 'geo:35.163900,136.958200',
      },
      probability: '0.900000',
    },
  },
  {
    endTime: '2024-05-01T10:30:00.000+09:00',
    startTime: '2024-05-01T10:00:00.000+09:00',
    activity: {
      probability: '0.990000',
      end: 'geo:35.170900,136.881500',
      topCandidate: { type: 'in passenger vehicle', probability: '0.850000' },
      distanceMeters: '60000.000000',
      start: 'geo:35.163900,136.958200',
    },
  },
  {
    endTime: '2024-05-01T10:30:00.000+09:00',
    startTime: '2024-05-01T10:00:00.000+09:00',
    timelinePath: [
      { point: 'geo:35.163900,136.958200', durationMinutesOffsetFromStartTime: '0' },
      { point: 'geo:35.170200,136.908500', durationMinutesOffsetFromStartTime: '15' },
      { point: 'geo:95.000000,136.000000', durationMinutesOffsetFromStartTime: '20' },
    ],
  },
  {
    endTime: '2024-05-02T00:00:00.000+09:00',
    startTime: '2024-05-01T00:00:00.000+09:00',
    timelineMemory: { destinations: [{ identifier: 'a' }, { identifier: 'b' }], distanceFromOriginKms: '62' },
  },
]

describe('Google Maps Timeline format (iPhone export)', () => {
  const result = parseLocationHistory(timeline)
  const [visit, start, end, pathA, pathB] = result.points

  it('is detected as such', () => {
    expect(result.formatId).toBe('google-timeline-ios')
  })

  it('extracts visits, journey starts, journey ends and path points', () => {
    expect(result.points.map((p) => p.kind)).toEqual(['visit', 'activity-start', 'activity-end', 'path', 'path'])
    expect(visit).toMatchObject({ latitude: 35.1639, longitude: 136.9582 })
    expect(end).toMatchObject({ latitude: 35.1709, longitude: 136.8815 })
  })

  it('converts numbers written as text and plain-word codes', () => {
    expect(visit?.visit).toMatchObject({
      placeId: 'example-place',
      semanticType: 'INFERRED_HOME',
      probability: 0.9,
      placeProbability: 0.8,
      hierarchyLevel: 0,
    })
    expect(start?.movement).toMatchObject({
      type: 'IN_PASSENGER_VEHICLE',
      typeProbability: 0.85,
      probability: 0.99,
      distanceMeters: 60_000,
    })
  })

  it('dates path points from the offset in minutes', () => {
    expect(pathA?.timestamp).toEqual(new Date('2024-05-01T01:00:00Z'))
    expect(pathB?.timestamp).toEqual(new Date('2024-05-01T01:15:00Z'))
    expect(pathB?.movement).toBe(start?.movement)
  })

  it('takes the local time from the time zone in the dates', () => {
    expect(visit?.utcOffsetMinutes).toBe(540)
    expect(pathB?.utcOffsetMinutes).toBe(540)
  })

  it('links every position to the trip of the period', () => {
    expect(visit?.trip).toMatchObject({ destinationCount: 2, distanceFromOriginKm: 62 })
  })

  it('skips invalid positions without blocking the others', () => {
    expect(result.invalidCount).toBe(1)
  })

  it('does not mistake a plain array of positions for an iPhone export', () => {
    const generic = parseLocationHistory([{ lat: 1, lng: 2 }])
    expect(generic.formatId).toBe('generic')
  })
})

describe('example file examples/location-history.json', () => {
  const outcome = analyzeJsonData(JSON.parse(exampleText), 'location-history.json')

  it('is read entirely, with no invalid entry, and lies in Nagoya', () => {
    expect(outcome.ok).toBe(true)
    if (!outcome.ok) return
    expect(outcome.formatId).toBe('google-timeline-ios')
    expect(outcome.invalidCount).toBe(0)
    expect(outcome.points.length).toBeGreaterThan(100)
    for (const point of outcome.points) {
      expect(point.latitude).toBeGreaterThan(35)
      expect(point.latitude).toBeLessThan(35.3)
      expect(point.longitude).toBeGreaterThan(136.8)
      expect(point.longitude).toBeLessThan(137.1)
      expect(point.utcOffsetMinutes).toBe(540)
    }
    const kinds = new Set(outcome.points.map((p) => p.kind))
    expect([...kinds].sort()).toEqual(['activity-end', 'activity-start', 'path', 'visit'])
    const types = new Set(outcome.points.map((p) => p.movement?.type).filter(Boolean))
    expect([...types].sort()).toEqual(['CYCLING', 'IN_PASSENGER_VEHICLE', 'IN_SUBWAY', 'IN_TRAIN', 'WALKING'])
  })
})
