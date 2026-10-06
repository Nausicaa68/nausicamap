import { describe, expect, it } from 'vitest'
import { describeDetectedActivity, describeMovementType, describePlaceType } from '../src/i18n/labels'
import { buildSections } from '../src/map/popup'
import { formatDateTime, formatDistance, formatDuration, formatUtcOffset } from '../src/ui/format'
import type { LocationPoint } from '../src/types/location'

function allText(point: LocationPoint): string {
  return buildSections(point)
    .flatMap((section) => [section.title ?? '', ...section.rows.flat(), section.link?.text ?? ''])
    .join(' | ')
}

describe('code labels', () => {
  it('turns known codes into plain words', () => {
    expect(describeMovementType('IN_PASSENGER_VEHICLE')).toBe('By car')
    expect(describeMovementType('IN_SUBWAY')).toBe('By metro')
    expect(describePlaceType('INFERRED_HOME')).toBe('Home (inferred by Google)')
    expect(describeDetectedActivity('IN_RAIL_VEHICLE')).toBe('On a train, tram or metro')
  })

  it('makes an unknown code readable instead of showing it raw', () => {
    expect(describeMovementType('IN_HOVERCRAFT')).toBe('Hovercraft')
    expect(describeDetectedActivity('SOME_NEW_TYPE')).toBe('Some new type')
    expect(describeMovementType(undefined)).toBe('Unknown means of transport')
  })
})

describe('formatting', () => {
  it('formats durations', () => {
    expect(formatDuration(45 * 60_000)).toBe('45 min')
    expect(formatDuration(185 * 60_000)).toBe('3 h 05')
    expect(formatDuration(52 * 3600_000)).toBe('2 d 4 h')
  })

  it('formats distances and time zones', () => {
    expect(formatDistance(850)).toBe('850 m')
    expect(formatDistance(12_345)).toBe('12.3 km')
    expect(formatUtcOffset(540)).toBe('UTC+9')
    expect(formatUtcOffset(-270)).toBe('UTC−4:30')
  })

  it('shows the local time of the place when the offset is known', () => {
    const date = new Date('2024-05-01T03:00:00Z')
    expect(formatDateTime(date, 540)).toContain('12:00')
    expect(formatDateTime(date, 540)).toContain('UTC+9')
  })
})

describe('popup content', () => {
  it('describes a journey start in plain words, without raw codes', () => {
    const text = allText({
      latitude: 35.17,
      longitude: 136.9,
      kind: 'activity-start',
      movement: {
        type: 'IN_PASSENGER_VEHICLE',
        typeProbability: 0.92,
        probability: 0.8,
        distanceMeters: 30_000,
        start: new Date('2024-05-01T10:00:00Z'),
        end: new Date('2024-05-01T10:30:00Z'),
      },
    })
    expect(text).toContain('By car (certainty 92%)')
    expect(text).toContain('30 km')
    expect(text).toContain('30 min')
    expect(text).toContain('60 km/h')
    expect(text).not.toContain('IN_PASSENGER_VEHICLE')
  })

  it('describes a visit with its statistics and a link to the place', () => {
    const text = allText({
      latitude: 35.17,
      longitude: 136.9,
      kind: 'visit',
      visit: {
        placeId: 'abc',
        placeLocation: { latitude: 35.17, longitude: 136.9 },
        semanticType: 'HOME',
        hierarchyLevel: 1,
        start: new Date('2024-05-01T10:00:00Z'),
        end: new Date('2024-05-01T13:00:00Z'),
        stats: { visitCount: 85, totalDurationMs: 50 * 3600_000 },
      },
    })
    expect(text).toContain('Home')
    expect(text).toContain('Inside a larger place')
    expect(text).toContain('3 h')
    expect(text).toContain('85 in total')
    expect(text).toContain('Google Maps')
    expect(text).not.toContain('HOME')
  })

  it('describes a raw measurement', () => {
    const text = allText({
      latitude: 35.17,
      longitude: 136.9,
      kind: 'raw-signal',
      accuracy: 20,
      source: 'CELL',
      speed: 10,
      wifiNetworkCount: 12,
      detectedActivities: [
        { type: 'STILL', confidence: 0.9 },
        { type: 'TILTING', confidence: 0.02 },
      ],
    })
    expect(text).toContain('Mobile phone antennas')
    expect(text).toContain('36 km/h')
    expect(text).toContain('Still (90%)')
    expect(text).not.toContain('tilted')
  })

  it('hides altitude and speed reported as 0 when they were not measured (non-GPS)', () => {
    const text = allText({ latitude: 1, longitude: 2, kind: 'raw-signal', source: 'WIFI', altitude: 0, speed: 0 })
    expect(text).not.toContain('Altitude')
    expect(text).not.toContain('speed')
    expect(text).toContain('Nearby Wi-Fi networks')
  })
})
