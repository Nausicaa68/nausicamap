import { describe, expect, it } from 'vitest'
import { parseLocationHistory } from '../src/parser/parseLocationHistory'
import { parseLatLngString, utcOffsetFromIsoString } from '../src/parser/values'

const timeline = {
  semanticSegments: [
    {
      startTime: '2024-05-01T08:00:00.000+09:00',
      endTime: '2024-05-01T10:00:00.000+09:00',
      timelinePath: [
        { point: '35.1709000°, 136.8815000°', time: '2024-05-01T08:05:00.000+09:00' },
        { point: '35.1702000°, 136.9085000°', time: '2024-05-01T09:30:00.000+09:00' },
      ],
    },
    {
      startTime: '2024-05-01T09:00:00.000+09:00',
      endTime: '2024-05-01T12:00:00.000+09:00',
      startTimeTimezoneUtcOffsetMinutes: 540,
      endTimeTimezoneUtcOffsetMinutes: 540,
      visit: {
        hierarchyLevel: 1,
        probability: 0.9,
        topCandidate: {
          placeId: 'example-place',
          semanticType: 'WORK',
          probability: 0.8,
          placeLocation: { latLng: '35.1702°, 136.9085°' },
        },
      },
    },
    {
      startTime: '2024-05-01T12:00:00.000+09:00',
      endTime: '2024-05-01T12:30:00.000+09:00',
      startTimeTimezoneUtcOffsetMinutes: 540,
      endTimeTimezoneUtcOffsetMinutes: 540,
      activity: {
        start: { latLng: '35.1702°, 136.9085°' },
        end: { latLng: '-33.8688°, 151.2093°' },
        distanceMeters: 6000,
        probability: 0.7,
        topCandidate: { type: 'CYCLING', probability: 0.85 },
        parking: { location: { latLng: '35.1760°, 136.9150°' }, startTime: '2024-05-01T12:25:00.000+09:00' },
      },
    },
    {
      startTime: '2024-05-01T12:00:00.000+09:00',
      endTime: '2024-05-01T14:00:00.000+09:00',
      timelinePath: [{ point: '35.1708°, 136.9093°', time: '2024-05-01T12:10:00.000+09:00' }],
    },
    {
      startTime: '2024-05-01T13:00:00.000+09:00',
      endTime: '2024-05-01T15:00:00.000+09:00',
      startTimeTimezoneUtcOffsetMinutes: 540,
      visit: {
        topCandidate: { placeId: 'example-place', semanticType: 'WORK', placeLocation: { latLng: '35.1702°, 136.9085°' } },
      },
    },
    {
      startTime: '2024-05-01T00:00:00.000+09:00',
      endTime: '2024-05-03T00:00:00.000+09:00',
      startTimeTimezoneUtcOffsetMinutes: 540,
      timelineMemory: { trip: { distanceFromOriginKms: 362, destinations: [{}, {}] } },
    },
    {
      startTime: '2024-05-01T00:00:00.000+09:00',
      endTime: '2024-05-02T00:00:00.000+09:00',
      timelineMemory: { note: { note: 'Test day' } },
    },
  ],
  rawSignals: [
    {
      position: {
        LatLng: '35.6812°, 139.7671°',
        accuracyMeters: 25,
        altitudeMeters: 540,
        speedMetersPerSecond: 2.5,
        source: 'WIFI',
        timestamp: '2024-05-01T13:00:00.000+09:00',
      },
    },
    {
      activityRecord: {
        probableActivities: [
          { type: 'TILTING', confidence: 0.1 },
          { type: 'STILL', confidence: 0.9 },
        ],
        timestamp: '2024-05-01T13:01:00.000+09:00',
      },
    },
    { wifiScan: { deliveryTime: '2024-05-01T13:00:00.000+09:00', devicesRecords: [{ mac: 1 }, { mac: 2 }, { mac: 3 }] } },
    { position: { LatLng: '95.0000°, 137.0000°', timestamp: '2024-05-01T13:05:00.000+09:00' } },
  ],
  userLocationProfile: {
    frequentPlaces: [
      { placeId: 'example-home', placeLocation: '34.7025°, 135.4959°', label: 'HOME' },
      { placeId: 'other-id', placeLocation: '35.1702°, 136.9085°' },
    ],
  },
}

describe('Google Maps Timeline format (Android export)', () => {
  const result = parseLocationHistory(timeline)
  const [pathA, pathB, visit, start, end, parking, pathC, secondVisit, raw, frequent, frequentVisited] = result.points

  it('is detected as such', () => {
    expect(result.formatId).toBe('google-timeline-device')
  })

  it('extracts every kind of position', () => {
    expect(result.points.map((p) => p.kind)).toEqual([
      'path',
      'path',
      'visit',
      'activity-start',
      'activity-end',
      'parking',
      'path',
      'visit',
      'raw-signal',
      'frequent-place',
      'frequent-place',
    ])
  })

  it('reads "lat°, lng°" coordinates, including negative ones', () => {
    expect(pathA).toMatchObject({ latitude: 35.1709, longitude: 136.8815 })
    expect(end).toMatchObject({ latitude: -33.8688, longitude: 151.2093 })
  })

  it('describes the visit (type, confidence, duration, time zone, place location)', () => {
    expect(visit?.visit).toMatchObject({
      placeId: 'example-place',
      placeLocation: { latitude: 35.1702, longitude: 136.9085 },
      semanticType: 'WORK',
      probability: 0.9,
      placeProbability: 0.8,
      hierarchyLevel: 1,
      start: new Date('2024-05-01T00:00:00Z'),
      end: new Date('2024-05-01T03:00:00Z'),
    })
    expect(visit?.utcOffsetMinutes).toBe(540)
  })

  it('computes place statistics across the whole file', () => {
    expect(visit?.visit?.stats).toEqual({
      visitCount: 2,
      totalDurationMs: 5 * 3600_000,
      firstVisit: new Date('2024-05-01T00:00:00Z'),
      lastVisit: new Date('2024-05-01T04:00:00Z'),
    })
    expect(secondVisit?.visit?.stats).toBe(visit?.visit?.stats)
  })

  it('describes the journey and shares it between start, end and parking', () => {
    expect(start?.movement).toMatchObject({
      type: 'CYCLING',
      typeProbability: 0.85,
      probability: 0.7,
      distanceMeters: 6000,
      parkingStart: new Date('2024-05-01T03:25:00Z'),
    })
    expect(end?.movement).toBe(start?.movement)
    expect(parking?.movement).toBe(start?.movement)
    expect(end?.timestamp).toEqual(new Date('2024-05-01T03:30:00Z'))
  })

  it('links a path point to the ongoing visit or journey', () => {
    expect(pathA?.visit).toBeUndefined()
    expect(pathA?.movement).toBeUndefined()
    expect(pathB?.visit).toBe(visit?.visit)
    expect(pathC?.movement).toBe(start?.movement)
  })

  it('links every position to the trip and note of the period', () => {
    for (const point of [pathA, visit, start, raw]) {
      expect(point?.trip).toMatchObject({ destinationCount: 2, distanceFromOriginKm: 362 })
      expect(point?.note).toBe('Test day')
    }
  })

  it('enriches raw measurements (Wi-Fi, sensors, altitude, speed)', () => {
    expect(raw).toMatchObject({
      accuracy: 25,
      altitude: 540,
      speed: 2.5,
      source: 'WIFI',
      wifiNetworkCount: 3,
      utcOffsetMinutes: 540,
    })
    expect(raw?.detectedActivities?.map((a) => a.type)).toEqual(['STILL', 'TILTING'])
    expect(raw?.visit).toBe(secondVisit?.visit)
  })

  it('keeps the label of frequent places', () => {
    expect(frequent).toMatchObject({ frequentPlaceLabel: 'HOME' })
    expect(frequent?.timestamp).toBeUndefined()
    expect(frequent?.knownPlace).toBeUndefined()
  })

  it('links a frequent place to the visited place at the same location', () => {
    expect(frequentVisited?.knownPlace).toMatchObject({ placeId: 'example-place', semanticType: 'WORK' })
    expect(frequentVisited?.knownPlace?.stats).toBe(visit?.visit?.stats)
  })

  it('skips invalid positions without blocking the others', () => {
    expect(result.invalidCount).toBe(1)
    expect(result.invalidByReason['out-of-range']).toBe(1)
  })

  it('counts an unreadable or missing coordinate as skipped', () => {
    const broken = parseLocationHistory({
      semanticSegments: [{ timelinePath: [{ point: 'not coordinates' }, { time: '2024-01-01T00:00:00Z' }] }],
    })
    expect(broken.points).toHaveLength(0)
    expect(broken.invalidByReason).toEqual({ missing: 1, 'not-a-number': 1, 'out-of-range': 0 })
  })

  it('falls back to the generic format when the Google structure has no positions', () => {
    const mixed = parseLocationHistory({ semanticSegments: [], other: [{ lat: 1, lng: 2 }] })
    expect(mixed.points).toHaveLength(1)
    expect(mixed.formatId).toBe('generic')
  })

  it('recognises an empty Google export (nothing recorded on the phone)', () => {
    const empty = parseLocationHistory({ rawSignals: [], userLocationProfile: {} })
    expect(empty.candidateCount).toBe(0)
    expect(empty.recognizedFormatId).toBe('google-timeline-device')
  })
})

describe('parseLatLngString', () => {
  it.each([
    ['35.1709°, 136.8815°', 35.1709, 136.8815],
    ['35.1709,136.8815', 35.1709, 136.8815],
    ['geo:-33.8688,151.2093', -33.8688, 151.2093],
    ['  -1.5° , -70.25°  ', -1.5, -70.25],
  ])('reads "%s"', (input, latitude, longitude) => {
    expect(parseLatLngString(input)).toEqual({ latitude, longitude })
  })

  it('distinguishes a missing value from an unreadable one', () => {
    expect(parseLatLngString(undefined)).toEqual({ latitude: undefined, longitude: undefined })
    expect(parseLatLngString('abc')).toEqual({ latitude: Number.NaN, longitude: Number.NaN })
    expect(parseLatLngString(42)).toEqual({ latitude: Number.NaN, longitude: Number.NaN })
  })
})

describe('utcOffsetFromIsoString', () => {
  it.each([
    ['2024-05-01T10:00:00.000+09:00', 540],
    ['2024-05-01T10:00:00-05:00', -300],
    ['2024-05-01T10:00:00Z', 0],
    ['2024-05-01T10:00:00', undefined],
    ['2024-05-01', undefined],
  ])('%s → %s', (input, expected) => {
    expect(utcOffsetFromIsoString(input)).toBe(expected)
  })
})
