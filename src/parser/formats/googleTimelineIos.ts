import type { RawLocationCandidate } from '../../types/location'
import { asArray, asRecord, asString, toDate, utcOffsetFromIsoString, type JsonRecord } from '../values'
import { readTimeline } from './googleTimelineDevice'
import type { LocationFormat } from './locationFormat'

const DETECTION_SAMPLE = 50
const SEGMENT_KEYS = ['visit', 'activity', 'timelinePath', 'timelineMemory'] as const

export const googleTimelineIosFormat: LocationFormat = {
  id: 'google-timeline-ios',
  matches: (data) => Array.isArray(data) && data.slice(0, DETECTION_SAMPLE).some(isIosSegment),
  candidates: (data) => readIosTimeline(data),
}

function isIosSegment(entry: unknown): boolean {
  const segment = asRecord(entry)
  return segment !== undefined && 'startTime' in segment && SEGMENT_KEYS.some((key) => key in segment)
}

function* readIosTimeline(data: unknown): Generator<RawLocationCandidate> {
  const semanticSegments = asArray(data).map((entry) => normalizeSegment(asRecord(entry)))
  yield* readTimeline({ semanticSegments })
}

export function normalizeSegment(segment: JsonRecord | undefined): JsonRecord | undefined {
  if (!segment) return undefined
  const start = toDate(segment.startTime)
  const normalized: JsonRecord = {
    startTime: segment.startTime,
    endTime: segment.endTime,
    startTimeTimezoneUtcOffsetMinutes: utcOffsetFromIsoString(segment.startTime),
    endTimeTimezoneUtcOffsetMinutes: utcOffsetFromIsoString(segment.endTime),
  }

  const visit = asRecord(segment.visit)
  if (visit) {
    const top = asRecord(visit.topCandidate)
    normalized.visit = {
      hierarchyLevel: toNumber(visit.hierarchyLevel),
      probability: toNumber(visit.probability),
      topCandidate: top && {
        placeId: asString(top.placeID) ?? asString(top.placeId),
        semanticType: toCode(top.semanticType),
        probability: toNumber(top.probability),
        placeLocation: { latLng: top.placeLocation },
      },
    }
  }

  const activity = asRecord(segment.activity)
  if (activity) {
    const top = asRecord(activity.topCandidate)
    normalized.activity = {
      start: { latLng: activity.start },
      end: { latLng: activity.end },
      distanceMeters: toNumber(activity.distanceMeters),
      probability: toNumber(activity.probability),
      topCandidate: top && { type: toCode(top.type), probability: toNumber(top.probability) },
    }
  }

  const path = asArray(segment.timelinePath)
  if (path.length > 0) {
    normalized.timelinePath = path.map((entry) => {
      const point = asRecord(entry)
      const offsetMinutes = toNumber(point?.durationMinutesOffsetFromStartTime)
      const time = start && offsetMinutes !== undefined ? start.getTime() + offsetMinutes * 60_000 : undefined
      return { point: point?.point, time }
    })
  }

  const memory = asRecord(segment.timelineMemory)
  if (memory) {
    const trip = asRecord(memory.trip) ?? memory
    const isTrip = 'destinations' in trip || 'distanceFromOriginKms' in trip
    normalized.timelineMemory = {
      trip: isTrip
        ? { destinations: asArray(trip.destinations), distanceFromOriginKms: toNumber(trip.distanceFromOriginKms) }
        : undefined,
      note: asRecord(memory.note),
    }
  }

  return normalized
}

function toNumber(value: unknown): number | undefined {
  if (typeof value === 'number') return Number.isFinite(value) ? value : undefined
  if (typeof value !== 'string' || value.trim() === '') return undefined
  const number = Number(value)
  return Number.isFinite(number) ? number : undefined
}

function toCode(value: unknown): string | undefined {
  const text = asString(value)?.trim()
  return text ? text.toUpperCase().replace(/[\s-]+/g, '_') : undefined
}
