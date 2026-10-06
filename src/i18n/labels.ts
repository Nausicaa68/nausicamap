import type { TransportFamily } from '../timeline/track'
import type { LocationKind } from '../types/location'
import { t } from './i18n'

export function describeKind(kind: LocationKind): string {
  return t().popup.kinds[kind]
}

export function describeTransportFamily(family: TransportFamily): string {
  return t().transport[family]
}

export function describeMovementType(code: string | undefined): string {
  const codes = t().codes
  return describeCode(code, codes.movement, codes.movementUnknown)
}

export function describeDetectedActivity(code: string): string {
  const codes = t().codes
  return describeCode(code, codes.detected, codes.detectedUnknown)
}

export function describePlaceType(code: string | undefined): string {
  const codes = t().codes
  return describeCode(code, codes.place, codes.placeUnknown)
}

export function describeFrequentPlace(code: string | undefined): string {
  const codes = t().codes
  return describeCode(code, codes.frequent, codes.frequentUnknown)
}

export function describePositionSource(code: string | undefined): string {
  const codes = t().codes
  return describeCode(code, codes.source, codes.sourceUnknown)
}

function describeCode(code: string | undefined, labels: Record<string, string>, fallback: string): string {
  if (!code) return fallback
  const label = labels[code]
  if (label) return label
  const readable = code.replace(/^IN_/, '').replace(/_/g, ' ').toLowerCase()
  return readable.charAt(0).toUpperCase() + readable.slice(1)
}
