import type { LocationMetadata, RawLocationCandidate } from '../../types/location'
import {
  asArray,
  asFiniteNumber,
  asNonNegativeNumber,
  asRecord,
  asString,
  parseLatLngString,
  toDate,
  utcOffsetFromIsoString,
  type JsonRecord,
} from '../values'
import { buildTimelineIndex, findNearestPlace, readPeriod, type TimelineIndex } from './googleTimelineIndex'
import type { LocationFormat } from './locationFormat'

const WIFI_TOLERANCE_MS = 60_000
const ACTIVITY_RECORD_TOLERANCE_MS = 3 * 60_000
const FREQUENT_PLACE_MATCH_METERS = 100

export const googleTimelineDeviceFormat: LocationFormat = {
  id: 'google-timeline-device',
  matches: (data) => {
    const root = asRecord(data)
    return (
      root !== undefined &&
      (Array.isArray(root.semanticSegments) ||
        Array.isArray(root.rawSignals) ||
        asRecord(root.userLocationProfile) !== undefined)
    )
  },
  candidates: (data) => readTimeline(data),
}

export function* readTimeline(data: unknown): Generator<RawLocationCandidate> {
  const root = asRecord(data)
  if (!root) return
  const index = buildTimelineIndex(root)
  for (const segment of asArray(root.semanticSegments)) yield* readSegment(asRecord(segment), index)
  for (const signal of asArray(root.rawSignals)) yield* readRawSignal(asRecord(signal), index)
  yield* readFrequentPlaces(asRecord(root.userLocationProfile), index)
}

function* readSegment(segment: JsonRecord | undefined, index: TimelineIndex): Generator<RawLocationCandidate> {
  if (!segment) return
  const period = readPeriod(segment)

  for (const entry of asArray(segment.timelinePath)) {
    const pathPoint = asRecord(entry)
    if (pathPoint) {
      const time = toDate(pathPoint.time) ?? period.start
      yield candidate(pathPoint.point, { kind: 'path', timestamp: time, ...contextAt(time, index) })
    }
  }

  const visit = index.visitBySegment.get(segment)
  if (visit) {
    const placeLocation = asRecord(asRecord(asRecord(segment.visit)?.topCandidate)?.placeLocation)
    yield candidate(placeLocation?.latLng, {
      kind: 'visit',
      timestamp: period.start,
      endTimestamp: period.end,
      utcOffsetMinutes: period.startUtcOffsetMinutes,
      visit,
      ...tripAndNoteAt(period.start, index),
    })
  }

  const movement = index.movementBySegment.get(segment)
  const activity = asRecord(segment.activity)
  if (movement && activity) {
    yield candidate(asRecord(activity.start)?.latLng, {
      kind: 'activity-start',
      timestamp: period.start,
      utcOffsetMinutes: period.startUtcOffsetMinutes,
      movement,
      ...tripAndNoteAt(period.start, index),
    })
    yield candidate(asRecord(activity.end)?.latLng, {
      kind: 'activity-end',
      timestamp: period.end,
      utcOffsetMinutes: period.endUtcOffsetMinutes ?? period.startUtcOffsetMinutes,
      movement,
      ...tripAndNoteAt(period.end, index),
    })

    const parking = asRecord(activity.parking)
    if (parking) {
      yield candidate(asRecord(parking.location)?.latLng, {
        kind: 'parking',
        timestamp: movement.parkingStart,
        utcOffsetMinutes: period.endUtcOffsetMinutes ?? period.startUtcOffsetMinutes,
        movement,
        ...tripAndNoteAt(movement.parkingStart, index),
      })
    }
  }
}

function* readRawSignal(signal: JsonRecord | undefined, index: TimelineIndex): Generator<RawLocationCandidate> {
  const position = asRecord(signal?.position)
  if (!position) return
  const time = toDate(position.timestamp)
  const context = contextAt(time, index)
  yield candidate(position.LatLng ?? position.latLng, {
    kind: 'raw-signal',
    timestamp: time,
    accuracy: asNonNegativeNumber(position.accuracyMeters),
    altitude: asFiniteNumber(position.altitudeMeters),
    speed: asNonNegativeNumber(position.speedMetersPerSecond),
    source: asString(position.source),
    wifiNetworkCount: index.wifiScans.find(time, WIFI_TOLERANCE_MS),
    detectedActivities: index.activityRecords.find(time, ACTIVITY_RECORD_TOLERANCE_MS),
    ...context,
    utcOffsetMinutes: context.utcOffsetMinutes ?? utcOffsetFromIsoString(position.timestamp),
  })
}

function* readFrequentPlaces(profile: JsonRecord | undefined, index: TimelineIndex): Generator<RawLocationCandidate> {
  for (const entry of asArray(profile?.frequentPlaces)) {
    const place = asRecord(entry)
    if (!place) continue
    const { latitude, longitude } = parseLatLngString(place.placeLocation)
    const knownPlace =
      latitude !== undefined && longitude !== undefined && Number.isFinite(latitude) && Number.isFinite(longitude)
        ? findNearestPlace(index.placesById, latitude, longitude, FREQUENT_PLACE_MATCH_METERS)
        : undefined
    yield candidate(place.placeLocation, {
      kind: 'frequent-place',
      frequentPlaceLabel: asString(place.label),
      knownPlace,
    })
  }
}

function contextAt(time: Date | undefined, index: TimelineIndex): LocationMetadata {
  const movement = index.movementsByTime.find(time)
  const visit = movement ? undefined : index.visitsByTime.find(time)
  const tripAndNote = tripAndNoteAt(time, index)
  const utcOffsetMinutes =
    movement?.startUtcOffsetMinutes ?? visit?.startUtcOffsetMinutes ?? tripAndNote.trip?.startUtcOffsetMinutes
  return { movement, visit, utcOffsetMinutes, ...tripAndNote }
}

function tripAndNoteAt(time: Date | undefined, index: TimelineIndex): Pick<LocationMetadata, 'trip' | 'note'> {
  return { trip: index.tripsByTime.find(time), note: index.notesByTime.find(time) }
}

function candidate(latLng: unknown, metadata: LocationMetadata): RawLocationCandidate {
  return { ...parseLatLngString(latLng), ...metadata }
}
