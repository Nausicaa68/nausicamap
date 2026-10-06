export type LocationKind =
  | 'path'
  | 'visit'
  | 'activity-start'
  | 'activity-end'
  | 'parking'
  | 'raw-signal'
  | 'frequent-place'

export interface PlaceStats {
  visitCount: number
  totalDurationMs: number
  firstVisit?: Date
  lastVisit?: Date
}

export interface KnownPlace {
  placeId: string
  placeLocation?: { latitude: number; longitude: number }
  semanticType?: string
  stats: PlaceStats
}

export interface VisitInfo {
  start?: Date
  end?: Date
  startUtcOffsetMinutes?: number
  endUtcOffsetMinutes?: number
  placeId?: string
  placeLocation?: { latitude: number; longitude: number }
  semanticType?: string
  probability?: number
  placeProbability?: number
  hierarchyLevel?: number
  stats?: PlaceStats
}

export interface MovementInfo {
  start?: Date
  end?: Date
  startUtcOffsetMinutes?: number
  endUtcOffsetMinutes?: number
  type?: string
  typeProbability?: number
  probability?: number
  distanceMeters?: number
  parkingStart?: Date
}

export interface TripInfo {
  start?: Date
  end?: Date
  startUtcOffsetMinutes?: number
  destinationCount: number
  distanceFromOriginKm?: number
}

export interface DetectedActivity {
  type: string
  confidence: number
}

export interface LocationMetadata {
  kind?: LocationKind
  timestamp?: Date
  endTimestamp?: Date
  utcOffsetMinutes?: number
  accuracy?: number
  altitude?: number
  speed?: number
  source?: string
  visit?: VisitInfo
  movement?: MovementInfo
  trip?: TripInfo
  detectedActivities?: readonly DetectedActivity[]
  wifiNetworkCount?: number
  frequentPlaceLabel?: string
  knownPlace?: KnownPlace
  note?: string
}

export interface LocationPoint extends LocationMetadata {
  latitude: number
  longitude: number
}

export interface RawLocationCandidate extends LocationMetadata {
  latitude: unknown
  longitude: unknown
}

export type InvalidReason = 'missing' | 'not-a-number' | 'out-of-range'

export type InvalidCounts = Record<InvalidReason, number>

export interface ExtractionResult {
  formatId: string
  recognizedFormatId: string
  points: LocationPoint[]
  candidateCount: number
  invalidCount: number
  invalidByReason: InvalidCounts
}

export type AnalysisErrorCode =
  | 'UNREADABLE_FILE'
  | 'INVALID_JSON'
  | 'UNRECOGNIZED_STRUCTURE'
  | 'NO_POSITIONS'
  | 'EMPTY_TIMELINE'
  | 'INVALID_COORDINATES'

export interface AnalysisSuccess {
  ok: true
  fileName: string
  formatId: string
  points: LocationPoint[]
  invalidCount: number
  invalidByReason: InvalidCounts
}

export interface AnalysisFailure {
  ok: false
  fileName: string
  code: AnalysisErrorCode
  detail?: string
  invalidCount?: number
}

export type AnalysisOutcome = AnalysisSuccess | AnalysisFailure

export type AnalysisStage = 'reading' | 'parsing' | 'extracting'
