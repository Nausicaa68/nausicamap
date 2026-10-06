import type { RawLocationCandidate } from '../../types/location'
import { DEFAULT_EXTRACTORS, type LocationExtractor } from '../extractors'
import type { JsonRecord } from '../values'
import type { LocationFormat } from './locationFormat'

export function createGenericFormat(
  extractors: readonly LocationExtractor[] = DEFAULT_EXTRACTORS,
): LocationFormat {
  return {
    id: 'generic',
    matches: (data) => typeof data === 'object' && data !== null,
    candidates: (data) => findCandidates(data, extractors),
  }
}

export const genericFormat = createGenericFormat()

export function* findCandidates(
  data: unknown,
  extractors: readonly LocationExtractor[],
): Generator<RawLocationCandidate> {
  const stack: unknown[] = [data]

  while (stack.length > 0) {
    const node = stack.pop()
    if (typeof node !== 'object' || node === null) continue

    const children: readonly unknown[] = Array.isArray(node) ? node : Object.values(node)

    if (!Array.isArray(node)) {
      const candidate = extractCandidate(node as JsonRecord, extractors)
      if (candidate) yield candidate
    }

    for (let i = children.length - 1; i >= 0; i--) {
      const child = children[i]
      if (typeof child === 'object' && child !== null) stack.push(child)
    }
  }
}

function extractCandidate(
  record: JsonRecord,
  extractors: readonly LocationExtractor[],
): RawLocationCandidate | null {
  let partial: RawLocationCandidate | null = null
  for (const extract of extractors) {
    const candidate = extract(record)
    if (!candidate) continue
    if (candidate.latitude !== undefined && candidate.longitude !== undefined) return candidate
    partial ??= candidate
  }
  return partial
}
