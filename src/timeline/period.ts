import type { LocationPoint } from '../types/location'

export interface Period {
  start: number
  end: number
}

const DAY_MS = 86_400_000

export function dataPeriod(points: readonly LocationPoint[]): Period | undefined {
  let start = Infinity
  let end = -Infinity
  for (const point of points) {
    if (!point.timestamp) continue
    const time = point.timestamp.getTime()
    const until = point.endTimestamp?.getTime() ?? time
    if (time < start) start = time
    if (until > end) end = until
  }
  return start <= end ? { start, end } : undefined
}

export function filterByPeriod(points: readonly LocationPoint[], period: Period): LocationPoint[] {
  return points.filter((point) => {
    if (!point.timestamp) return false
    const from = point.timestamp.getTime()
    const until = point.endTimestamp?.getTime() ?? from
    return until >= period.start && from <= period.end
  })
}

export function periodFromDateInputs(from: string, to: string): Period | undefined {
  const start = parseLocalDate(from)
  const endDay = parseLocalDate(to)
  if (start === undefined || endDay === undefined) return undefined
  const end = endOfLocalDay(endDay)
  return end >= start ? { start, end } : undefined
}

export function toDateInputValue(time: number): string {
  const date = new Date(time)
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${date.getFullYear()}-${month}-${day}`
}

function parseLocalDate(value: string): number | undefined {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value)
  if (!match) return undefined
  const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]))
  return Number.isNaN(date.getTime()) ? undefined : date.getTime()
}

function endOfLocalDay(startOfDay: number): number {
  const next = new Date(startOfDay)
  next.setDate(next.getDate() + 1)
  return (Number.isNaN(next.getTime()) ? startOfDay + DAY_MS : next.getTime()) - 1
}
