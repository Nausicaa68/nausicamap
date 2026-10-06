import { t } from '../i18n/i18n'
import {
  describeDetectedActivity,
  describeKind,
  describeFrequentPlace,
  describeMovementType,
  describePlaceType,
  describePositionSource,
} from '../i18n/labels'
import type { KnownPlace, LocationPoint, MovementInfo, PlaceStats, TripInfo, VisitInfo } from '../types/location'
import {
  durationBetween,
  formatCount,
  formatDate,
  formatDateTime,
  formatDistance,
  formatDuration,
  formatKilometers,
  formatMeters,
  formatPercent,
  formatSpeed,
} from '../ui/format'

type Row = [label: string, value: string]

interface ExternalLink {
  href: string
  text: string
  title: string
}

interface Section {
  title?: string
  rows: Row[]
  link?: ExternalLink
}

const MIN_DETECTED_CONFIDENCE = 0.05
const MAX_DETECTED_ACTIVITIES = 3

export function buildPopupContent(point: LocationPoint): HTMLElement {
  const container = document.createElement('div')
  container.className = 'point-popup'

  const title = document.createElement('p')
  title.className = 'point-popup__title'
  title.textContent = point.kind ? describeKind(point.kind) : t().popup.position
  container.append(title)

  for (const section of buildSections(point)) {
    if (section.rows.length > 0 || section.link) container.append(renderSection(section))
  }
  return container
}

export function buildSections(point: LocationPoint): Section[] {
  const texts = t().popup
  const sections: Section[] = [{ rows: headerRows(point) }]
  if (point.frequentPlaceLabel !== undefined || point.kind === 'frequent-place') {
    sections.push(frequentPlaceSection(point))
  }
  if (point.visit) sections.push(visitSection(point.visit, point.kind === 'visit'))
  if (point.movement) sections.push(movementSection(point.movement, point.kind))
  if (point.kind === 'raw-signal') sections.push(measurementSection(point))
  if (point.trip) sections.push(tripSection(point.trip))
  if (point.note) sections.push({ title: texts.note, rows: [[texts.noteText, point.note]] })
  sections.push({
    rows: [[texts.coordinates, `${point.latitude.toFixed(5)}, ${point.longitude.toFixed(5)}`]],
  })
  return sections
}

function headerRows(point: LocationPoint): Row[] {
  const texts = t().popup
  const rows: Row[] = []
  const detailedElsewhere = point.kind === 'visit' || point.kind === 'activity-start' || point.kind === 'activity-end'
  if (point.timestamp && !detailedElsewhere) {
    const label = point.kind === 'parking' ? texts.parkedFrom : texts.date
    rows.push([label, formatDateTime(point.timestamp, point.utcOffsetMinutes)])
  }
  if (!point.kind && point.accuracy !== undefined) rows.push([texts.accuracy, `± ${formatMeters(point.accuracy)}`])
  return rows
}

function visitSection(visit: VisitInfo, isThePlace: boolean): Section {
  const texts = t().popup
  const rows: Row[] = [[texts.placeType, describePlaceType(visit.semanticType)]]
  if (visit.hierarchyLevel !== undefined && visit.hierarchyLevel > 0) {
    rows.push([texts.location, texts.insideLargerPlace])
  }
  if (visit.start) rows.push([texts.arrival, formatDateTime(visit.start, visit.startUtcOffsetMinutes)])
  if (visit.end) rows.push([texts.departure, formatDateTime(visit.end, visit.endUtcOffsetMinutes ?? visit.startUtcOffsetMinutes)])
  const duration = durationBetween(visit.start, visit.end)
  if (duration !== undefined) rows.push([texts.timeSpent, formatDuration(duration)])
  if (visit.probability !== undefined) rows.push([texts.visitCertainty, formatPercent(visit.probability)])
  if (visit.placeProbability !== undefined) {
    rows.push([texts.placeCertainty, formatPercent(visit.placeProbability)])
  }

  if (visit.stats) rows.push(...placeStatsRows(visit.stats))

  return {
    title: isThePlace ? texts.visitTitle : texts.duringVisit,
    rows,
    link: googleMapsPlaceLink(visit),
  }
}

function movementSection(movement: MovementInfo, kind: LocationPoint['kind']): Section {
  const texts = t().popup
  const isTheMovement = kind === 'activity-start' || kind === 'activity-end' || kind === 'parking'
  const rows: Row[] = []

  const transport = describeMovementType(movement.type)
  rows.push([
    texts.transport,
    movement.typeProbability !== undefined
      ? texts.withCertainty(transport, formatPercent(movement.typeProbability))
      : transport,
  ])
  if (movement.start) rows.push([texts.start, formatDateTime(movement.start, movement.startUtcOffsetMinutes)])
  if (movement.end) {
    rows.push([texts.end, formatDateTime(movement.end, movement.endUtcOffsetMinutes ?? movement.startUtcOffsetMinutes)])
  }
  const duration = durationBetween(movement.start, movement.end)
  if (duration !== undefined) rows.push([texts.tripDuration, formatDuration(duration)])
  if (movement.distanceMeters !== undefined) {
    rows.push([texts.distance, formatDistance(movement.distanceMeters)])
    if (duration && duration >= 60_000) {
      rows.push([texts.averageSpeed, formatSpeed(movement.distanceMeters / (duration / 1000))])
    }
  }
  if (movement.probability !== undefined) rows.push([texts.movementCertainty, formatPercent(movement.probability)])
  if (movement.parkingStart && kind !== 'parking') {
    rows.push([
      texts.parking,
      texts.parkedAt(formatDateTime(movement.parkingStart, movement.endUtcOffsetMinutes ?? movement.startUtcOffsetMinutes)),
    ])
  }

  return { title: isTheMovement ? texts.movementTitle : texts.duringMovement, rows }
}

function measurementSection(point: LocationPoint): Section {
  const texts = t().popup
  const rows: Row[] = []
  if (point.accuracy !== undefined) rows.push([texts.accuracy, `± ${formatMeters(point.accuracy)}`])
  if (point.source) rows.push([texts.measuredWith, describePositionSource(point.source)])
  const measuredByGps = point.source === 'GPS'
  if (point.altitude !== undefined && (point.altitude !== 0 || measuredByGps)) {
    rows.push([texts.altitude, formatMeters(point.altitude)])
  }
  if (point.speed !== undefined && (point.speed > 0 || measuredByGps)) {
    rows.push([texts.instantSpeed, formatSpeed(point.speed)])
  }
  if (point.wifiNetworkCount !== undefined) {
    rows.push([texts.wifiNetworks, formatCount(point.wifiNetworkCount)])
  }
  const activities = (point.detectedActivities ?? [])
    .filter((activity) => activity.confidence >= MIN_DETECTED_CONFIDENCE)
    .slice(0, MAX_DETECTED_ACTIVITIES)
    .map((activity) => `${describeDetectedActivity(activity.type)} (${formatPercent(activity.confidence)})`)
  if (activities.length > 0) rows.push([texts.detectedActivity, activities.join('\n')])
  return { title: texts.measurementTitle, rows }
}

function placeStatsRows(stats: PlaceStats): Row[] {
  const texts = t().popup
  const rows: Row[] = [[texts.visitsOfPlace, texts.visitsTotal(formatCount(stats.visitCount))]]
  if (stats.totalDurationMs > 0) rows.push([texts.totalTime, formatDuration(stats.totalDurationMs)])
  if (stats.visitCount > 1 && stats.firstVisit && stats.lastVisit) {
    rows.push([texts.firstLastVisit, `${formatDate(stats.firstVisit)} → ${formatDate(stats.lastVisit)}`])
  }
  return rows
}

function frequentPlaceSection(point: LocationPoint): Section {
  const texts = t().popup
  const rows: Row[] = [
    [texts.frequentPlace, describeFrequentPlace(point.frequentPlaceLabel)],
    [texts.frequentOrigin, texts.frequentOriginText],
  ]
  const place: KnownPlace | undefined = point.knownPlace
  if (place?.semanticType) rows.push([texts.placeType, describePlaceType(place.semanticType)])
  if (place) rows.push(...placeStatsRows(place.stats))
  return { rows, link: place ? googleMapsPlaceLink(place) : undefined }
}

function tripSection(trip: TripInfo): Section {
  const texts = t().popup
  const rows: Row[] = []
  if (trip.start && trip.end) {
    rows.push([
      texts.tripPeriod,
      `${formatDate(trip.start, trip.startUtcOffsetMinutes)} → ${formatDate(trip.end, trip.startUtcOffsetMinutes)}`,
    ])
  }
  const duration = durationBetween(trip.start, trip.end)
  if (duration !== undefined) rows.push([texts.journeyDuration, formatDuration(duration)])
  if (trip.destinationCount > 0) rows.push([texts.destinations, formatCount(trip.destinationCount)])
  if (trip.distanceFromOriginKm !== undefined) {
    rows.push([texts.maxDistance, formatKilometers(trip.distanceFromOriginKm)])
  }
  return { title: texts.tripTitle, rows }
}

function googleMapsPlaceLink(place: Pick<VisitInfo, 'placeId' | 'placeLocation'>): ExternalLink | undefined {
  if (!place.placeId || !place.placeLocation) return undefined
  const params = new URLSearchParams({
    api: '1',
    query: `${place.placeLocation.latitude},${place.placeLocation.longitude}`,
    query_place_id: place.placeId,
  })
  return {
    href: `https://www.google.com/maps/search/?${params.toString()}`,
    text: t().popup.mapsLink,
    title: t().popup.mapsLinkTitle,
  }
}

function renderSection(section: Section): HTMLElement {
  const element = document.createElement('section')
  element.className = 'point-popup__section'

  if (section.title) {
    const heading = document.createElement('p')
    heading.className = 'point-popup__heading'
    heading.textContent = section.title
    element.append(heading)
  }

  if (section.rows.length > 0) {
    const list = document.createElement('dl')
    for (const [label, value] of section.rows) {
      const term = document.createElement('dt')
      term.textContent = label
      const description = document.createElement('dd')
      description.textContent = value
      list.append(term, description)
    }
    element.append(list)
  }

  if (section.link) {
    const link = document.createElement('a')
    link.className = 'point-popup__link'
    link.href = section.link.href
    link.textContent = section.link.text
    link.title = section.link.title
    link.target = '_blank'
    link.rel = 'noopener noreferrer'
    element.append(link)
  }
  return element
}
