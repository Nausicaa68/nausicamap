import { describe, expect, it } from 'vitest'
import { dataPeriod, filterByPeriod, periodFromDateInputs, toDateInputValue } from '../src/timeline/period'
import { MAX_IDLE_SECONDS, advanceCursor, defaultSpeed } from '../src/timeline/timelapse'
import { buildTrack, lastIndexAtOrBefore, segmentFamily, transportFamily } from '../src/timeline/track'
import type { LocationPoint, MovementInfo } from '../src/types/location'

const HOUR = 3_600_000
const DAY = 24 * HOUR
const at = (iso: string): Date => new Date(iso)

function point(iso: string | undefined, extra: Partial<LocationPoint> = {}): LocationPoint {
  return { latitude: 35, longitude: 136, ...(iso ? { timestamp: at(iso) } : {}), ...extra }
}

describe('period', () => {
  const points = [
    point('2024-05-01T08:00:00Z'),
    point('2024-05-03T08:00:00Z', { endTimestamp: at('2024-05-05T08:00:00Z') }),
    point('2024-06-01T08:00:00Z'),
    point(undefined, { kind: 'frequent-place' }),
  ]

  it('computes the covered period, including the end of visits', () => {
    expect(dataPeriod(points)).toEqual({
      start: at('2024-05-01T08:00:00Z').getTime(),
      end: at('2024-06-01T08:00:00Z').getTime(),
    })
    expect(dataPeriod([point(undefined)])).toBeUndefined()
  })

  it('filters by period: overlapping visits, undated points excluded', () => {
    const period = { start: at('2024-05-04T00:00:00Z').getTime(), end: at('2024-05-31T00:00:00Z').getTime() }
    expect(filterByPeriod(points, period)).toEqual([points[1]])
  })

  it('converts date fields into a period (whole days, inclusive bounds)', () => {
    const period = periodFromDateInputs('2024-05-01', '2024-05-02')
    expect(period).toBeDefined()
    expect(new Date(period?.start ?? 0).getHours()).toBe(0)
    expect((period?.end ?? 0) - (period?.start ?? 0)).toBe(2 * DAY - 1)
    expect(toDateInputValue(period?.start ?? 0)).toBe('2024-05-01')
  })

  it('rejects invalid or reversed dates', () => {
    expect(periodFromDateInputs('2024-05-03', '2024-05-01')).toBeUndefined()
    expect(periodFromDateInputs('', '2024-05-01')).toBeUndefined()
    expect(periodFromDateInputs('2024-13-45', '2024-05-01')).toBeUndefined()
  })
})

describe('track', () => {
  const train: MovementInfo = { type: 'IN_TRAIN' }

  it('sorts chronologically and adds the end of visits', () => {
    const track = buildTrack([
      point('2024-05-01T12:00:00Z', { longitude: 137, movement: train }),
      point('2024-05-01T08:00:00Z', { endTimestamp: at('2024-05-01T11:00:00Z') }),
      point(undefined),
    ])
    expect(track.entries.map((e) => new Date(e.time).toISOString())).toEqual([
      '2024-05-01T08:00:00.000Z',
      '2024-05-01T11:00:00.000Z',
      '2024-05-01T12:00:00.000Z',
    ])
    expect(segmentFamily(track.entries, 2)).toBe('rail')
  })

  it('breaks the track after a long gap without data', () => {
    const track = buildTrack([point('2024-05-01T08:00:00Z'), point('2024-05-01T09:00:00Z'), point('2024-05-03T09:00:00Z')])
    expect(track.entries.map((e) => e.breakBefore)).toEqual([false, false, true])
  })

  it('removes exact duplicates', () => {
    const track = buildTrack([point('2024-05-01T08:00:00Z'), point('2024-05-01T08:00:00Z')])
    expect(track.entries).toHaveLength(1)
  })

  it('groups means of transport into families', () => {
    expect(transportFamily('IN_BUS')).toBe('road')
    expect(transportFamily('IN_SUBWAY')).toBe('rail')
    expect(transportFamily('FLYING')).toBe('air')
    expect(transportFamily('WALKING')).toBe('walk')
    expect(transportFamily('SOMETHING_NEW')).toBe('other')
    expect(transportFamily(undefined)).toBe('other')
  })

  it('finds the last step before a given time', () => {
    const track = buildTrack([point('2024-05-01T08:00:00Z'), point('2024-05-01T09:00:00Z')])
    expect(lastIndexAtOrBefore(track.entries, at('2024-05-01T07:00:00Z').getTime())).toBe(-1)
    expect(lastIndexAtOrBefore(track.entries, at('2024-05-01T08:30:00Z').getTime())).toBe(0)
    expect(lastIndexAtOrBefore(track.entries, at('2024-05-02T00:00:00Z').getTime())).toBe(1)
  })
})

describe('timelapse', () => {
  const events = [0, HOUR, 2 * HOUR, 30 * DAY]

  it('advances at the chosen speed', () => {
    expect(advanceCursor(0, 500, HOUR, events, 40 * DAY)).toBe(HOUR / 2)
  })

  it('skips long periods without data', () => {
    const cursor = advanceCursor(2 * HOUR, 16, HOUR, events, 40 * DAY)
    expect(cursor).toBeGreaterThan(29 * DAY)
    expect(cursor).toBeLessThan(30 * DAY)
  })

  it('does not skip a short gap', () => {
    const shortGap = MAX_IDLE_SECONDS * HOUR * 0.5
    expect(advanceCursor(0, 16, HOUR, [0, shortGap], DAY)).toBeCloseTo((16 / 1000) * HOUR)
  })

  it('stops at the end of the period', () => {
    expect(advanceCursor(39 * DAY, 10_000, 30 * DAY, events, 40 * DAY)).toBe(40 * DAY)
  })

  it('picks a speed suited to the length of the period', () => {
    expect(defaultSpeed(2 * DAY)).toBe(HOUR)
    expect(defaultSpeed(365 * DAY)).toBe(7 * DAY)
    expect(defaultSpeed(10 * 365 * DAY)).toBe(182 * DAY)
  })
})
