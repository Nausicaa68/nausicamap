import type { RawLocationCandidate } from '../../types/location'

export interface LocationFormat {
  id: string
  matches(data: unknown): boolean
  candidates(data: unknown): Iterable<RawLocationCandidate>
}
