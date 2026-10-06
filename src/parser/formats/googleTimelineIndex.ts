import type {
  DetectedActivity,
  KnownPlace,
  MovementInfo,
  PlaceStats,
  TripInfo,
  VisitInfo,
} from '../../types/location'
import { IntervalIndex, NearestIndex } from '../timeIndex'
import {
  asArray,
  asFiniteNumber,
  asProbability,
  asRecord,
  asString,
  parseLatLngString,
  toDate,
  type JsonRecord,
} from '../values'

export interface TimelineIndex {
  visitBySegment: WeakMap<JsonRecord, VisitInfo>
  movementBySegment: WeakMap<JsonRecord, MovementInfo>
  visitsByTime: IntervalIndex<VisitInfo>
  movementsByTime: IntervalIndex<MovementInfo>
  tripsByTime: IntervalIndex<TripInfo>
  notesByTime: IntervalIndex<string>
  wifiScans: NearestIndex<number>
  activityRecords: NearestIndex<readonly DetectedActivity[]>
  placesById: Map<string, KnownPlace>
}

export function buildTimelineIndex(root: JsonRecord): TimelineIndex {
  const index: TimelineIndex = {
    visitBySegment: new WeakMap(),
    movementBySegment: new WeakMap(),
    visitsByTime: new IntervalIndex(),
    movementsByTime: new IntervalIndex(),
    tripsByTime: new IntervalIndex(),
    notesByTime: new IntervalIndex(),
    wifiScans: new NearestIndex(),
    activityRecords: new NearestIndex(),
    placesById: new Map(),
  }

  for (const entry of asArray(root.semanticSegments)) {
    const segment = asRecord(entry)
    if (segment) indexSegment(segment, index)
  }
  for (const entry of asArray(root.rawSignals)) {
    const signal = asRecord(entry)
    if (signal) indexRawSignal(signal, index)
  }
  return index
}

function indexSegment(segment: JsonRecord, index: TimelineIndex): void {
  const period = readPeriod(segment)

  const visit = asRecord(segment.visit)
  if (visit) {
    const info = readVisit(visit, period, index.placesById)
    index.visitBySegment.set(segment, info)
    index.visitsByTime.add(period.start, period.end, info)
  }

  const activity = asRecord(segment.activity)
  if (activity) {
    const info = readMovement(activity, period)
    index.movementBySegment.set(segment, info)
    index.movementsByTime.add(period.start, period.end, info)
  }

  const memory = asRecord(segment.timelineMemory)
  const trip = asRecord(memory?.trip)
  if (trip) {
    index.tripsByTime.add(period.start, period.end, {
      start: period.start,
      end: period.end,
      startUtcOffsetMinutes: period.startUtcOffsetMinutes,
      destinationCount: asArray(trip.destinations).length,
      distanceFromOriginKm: asFiniteNumber(trip.distanceFromOriginKms),
    })
  }
  const note = asString(asRecord(memory?.note)?.note)?.trim()
  if (note) index.notesByTime.add(period.start, period.end, note)
}

interface Period {
  start?: Date
  end?: Date
  startUtcOffsetMinutes?: number
  endUtcOffsetMinutes?: number
}

export function readPeriod(segment: JsonRecord): Period {
  return {
    start: toDate(segment.startTime),
    end: toDate(segment.endTime),
    startUtcOffsetMinutes: asFiniteNumber(segment.startTimeTimezoneUtcOffsetMinutes),
    endUtcOffsetMinutes: asFiniteNumber(segment.endTimeTimezoneUtcOffsetMinutes),
  }
}

function readVisit(visit: JsonRecord, period: Period, placesById: Map<string, KnownPlace>): VisitInfo {
  const top = asRecord(visit.topCandidate)
  const info: VisitInfo = {
    ...period,
    placeId: asString(top?.placeId),
    placeLocation: readPlaceLocation(asRecord(top?.placeLocation)?.latLng),
    semanticType: asString(top?.semanticType),
    probability: asProbability(visit.probability),
    placeProbability: asProbability(top?.probability),
    hierarchyLevel: asFiniteNumber(visit.hierarchyLevel),
  }
  if (info.placeId) info.stats = recordPlaceVisit(placesById, info.placeId, info).stats
  return info
}

function readPlaceLocation(value: unknown): VisitInfo['placeLocation'] {
  const { latitude, longitude } = parseLatLngString(value)
  return latitude !== undefined && longitude !== undefined && Number.isFinite(latitude) && Number.isFinite(longitude)
    ? { latitude, longitude }
    : undefined
}

function recordPlaceVisit(placesById: Map<string, KnownPlace>, placeId: string, period: VisitInfo): KnownPlace {
  let place = placesById.get(placeId)
  if (!place) {
    place = { placeId, placeLocation: period.placeLocation, stats: { visitCount: 0, totalDurationMs: 0 } }
    placesById.set(placeId, place)
  }
  if (period.semanticType && period.semanticType !== 'UNKNOWN') place.semanticType = period.semanticType
  const stats: PlaceStats = place.stats
  stats.visitCount++
  if (period.start && period.end && period.end >= period.start) {
    stats.totalDurationMs += period.end.getTime() - period.start.getTime()
  }
  if (period.start && (!stats.firstVisit || period.start < stats.firstVisit)) stats.firstVisit = period.start
  if (period.start && (!stats.lastVisit || period.start > stats.lastVisit)) stats.lastVisit = period.start
  return place
}

export function findNearestPlace(
  placesById: ReadonlyMap<string, KnownPlace>,
  latitude: number,
  longitude: number,
  maxMeters: number,
): KnownPlace | undefined {
  let nearest: KnownPlace | undefined
  let nearestDistance = maxMeters
  for (const place of placesById.values()) {
    if (!place.placeLocation) continue
    const distance = distanceMeters(latitude, longitude, place.placeLocation.latitude, place.placeLocation.longitude)
    if (distance <= nearestDistance) {
      nearest = place
      nearestDistance = distance
    }
  }
  return nearest
}

function distanceMeters(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const toRadians = (degrees: number): number => (degrees * Math.PI) / 180
  const dLat = toRadians(lat2 - lat1)
  const dLng = toRadians(lng2 - lng1)
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) * Math.sin(dLng / 2) ** 2
  return 2 * 6_371_000 * Math.asin(Math.sqrt(h))
}

function readMovement(activity: JsonRecord, period: Period): MovementInfo {
  const top = asRecord(activity.topCandidate)
  return {
    ...period,
    type: asString(top?.type),
    typeProbability: asProbability(top?.probability),
    probability: asProbability(activity.probability),
    distanceMeters: asFiniteNumber(activity.distanceMeters),
    parkingStart: toDate(asRecord(activity.parking)?.startTime),
  }
}

function indexRawSignal(signal: JsonRecord, index: TimelineIndex): void {
  const wifi = asRecord(signal.wifiScan)
  if (wifi) index.wifiScans.add(toDate(wifi.deliveryTime), asArray(wifi.devicesRecords).length)

  const record = asRecord(signal.activityRecord)
  if (record) index.activityRecords.add(toDate(record.timestamp), readDetectedActivities(record))
}

function readDetectedActivities(record: JsonRecord): DetectedActivity[] {
  const activities: DetectedActivity[] = []
  for (const entry of asArray(record.probableActivities)) {
    const activity = asRecord(entry)
    const type = asString(activity?.type)
    const confidence = asProbability(activity?.confidence)
    if (type && confidence !== undefined) activities.push({ type, confidence })
  }
  return activities.sort((a, b) => b.confidence - a.confidence)
}
