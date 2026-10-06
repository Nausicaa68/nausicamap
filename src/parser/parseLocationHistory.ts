import type { ExtractionResult, InvalidCounts } from '../types/location'
import { validateCandidate } from '../validation/validation'
import { genericFormat } from './formats/generic'
import { googleTimelineDeviceFormat } from './formats/googleTimelineDevice'
import { googleTimelineIosFormat } from './formats/googleTimelineIos'
import type { LocationFormat } from './formats/locationFormat'

export const KNOWN_FORMATS: readonly LocationFormat[] = [
  googleTimelineDeviceFormat,
  googleTimelineIosFormat,
  genericFormat,
]

export function parseLocationHistory(
  data: unknown,
  formats: readonly LocationFormat[] = KNOWN_FORMATS,
): ExtractionResult {
  let result: ExtractionResult | undefined
  let recognizedFormatId: string | undefined
  for (const format of formats) {
    if (!format.matches(data)) continue
    recognizedFormatId ??= format.id
    result = extractWithFormat(data, format)
    if (result.candidateCount > 0) break
  }
  result ??= emptyResult('unknown')
  result.recognizedFormatId = recognizedFormatId ?? result.formatId
  return result
}

export function isTraversableRoot(data: unknown): data is object {
  return typeof data === 'object' && data !== null
}

function extractWithFormat(data: unknown, format: LocationFormat): ExtractionResult {
  const result = emptyResult(format.id)
  for (const candidate of format.candidates(data)) {
    result.candidateCount++
    const validation = validateCandidate(candidate)
    if (validation.valid) {
      result.points.push(validation.point)
    } else {
      result.invalidCount++
      result.invalidByReason[validation.reason]++
    }
  }
  return result
}

function emptyResult(formatId: string): ExtractionResult {
  return { formatId, recognizedFormatId: formatId, points: [], candidateCount: 0, invalidCount: 0, invalidByReason: emptyInvalidCounts() }
}

function emptyInvalidCounts(): InvalidCounts {
  return { missing: 0, 'not-a-number': 0, 'out-of-range': 0 }
}
