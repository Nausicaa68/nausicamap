import type { LocationPoint } from '../types/location'

export type TransportFamily = 'walk' | 'bike' | 'road' | 'rail' | 'air' | 'water' | 'other'

export const TRANSPORT_FAMILIES: readonly TransportFamily[] = ['walk', 'bike', 'road', 'rail', 'air', 'water', 'other']

const FAMILY_BY_TYPE: Record<string, TransportFamily> = {
  WALKING: 'walk',
  RUNNING: 'walk',
  HIKING: 'walk',
  ON_FOOT: 'walk',
  SNOWSHOEING: 'walk',
  IN_WHEELCHAIR: 'walk',
  CYCLING: 'bike',
  ON_BICYCLE: 'bike',
  IN_PASSENGER_VEHICLE: 'road',
  IN_VEHICLE: 'road',
  IN_ROAD_VEHICLE: 'road',
  IN_TAXI: 'road',
  IN_BUS: 'road',
  MOTORCYCLING: 'road',
  IN_TRAIN: 'rail',
  IN_TRAM: 'rail',
  IN_SUBWAY: 'rail',
  IN_FUNICULAR: 'rail',
  IN_CABLECAR: 'rail',
  IN_GONDOLA_LIFT: 'rail',
  FLYING: 'air',
  IN_FERRY: 'water',
  SAILING: 'water',
  KAYAKING: 'water',
  ROWING: 'water',
}

export function transportFamily(type: string | undefined): TransportFamily {
  return (type && FAMILY_BY_TYPE[type]) || 'other'
}

export interface TrackEntry {
  time: number
  latitude: number
  longitude: number
  family?: TransportFamily
  breakBefore: boolean
}

export interface Track {
  entries: TrackEntry[]
}

export const MAX_GAP_MS = 12 * 3_600_000

export function buildTrack(points: readonly LocationPoint[], maxGapMs = MAX_GAP_MS): Track {
  const entries: TrackEntry[] = []
  for (const point of points) {
    if (!point.timestamp) continue
    const family = point.movement ? transportFamily(point.movement.type) : undefined
    const base = { latitude: point.latitude, longitude: point.longitude, family, breakBefore: false }
    entries.push({ ...base, time: point.timestamp.getTime() })
    if (point.endTimestamp && point.endTimestamp > point.timestamp) {
      entries.push({ ...base, time: point.endTimestamp.getTime() })
    }
  }

  entries.sort((a, b) => a.time - b.time)
  const deduplicated = removeDuplicates(entries)
  for (let i = 1; i < deduplicated.length; i++) {
    const current = deduplicated[i]
    const previous = deduplicated[i - 1]
    if (current && previous) current.breakBefore = current.time - previous.time > maxGapMs
  }
  return { entries: deduplicated }
}

export function segmentFamily(entries: readonly TrackEntry[], index: number): TransportFamily {
  return entries[index]?.family ?? entries[index - 1]?.family ?? 'other'
}

export function lastIndexAtOrBefore(entries: readonly TrackEntry[], time: number): number {
  let low = 0
  let high = entries.length
  while (low < high) {
    const middle = (low + high) >>> 1
    if ((entries[middle]?.time ?? Infinity) <= time) low = middle + 1
    else high = middle
  }
  return low - 1
}

function removeDuplicates(entries: TrackEntry[]): TrackEntry[] {
  const result: TrackEntry[] = []
  for (const entry of entries) {
    const last = result[result.length - 1]
    const duplicate =
      last && last.time === entry.time && last.latitude === entry.latitude && last.longitude === entry.longitude
    if (!duplicate) result.push(entry)
  }
  return result
}
