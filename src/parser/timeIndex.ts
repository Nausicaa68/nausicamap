const MAX_OVERLAP_SCAN = 8

interface Interval<T> {
  start: number
  end: number
  value: T
}

export class IntervalIndex<T> {
  private readonly intervals: Interval<T>[] = []
  private sorted = true

  add(start: Date | undefined, end: Date | undefined, value: T): void {
    if (!start || !end || end < start) return
    const interval = { start: start.getTime(), end: end.getTime(), value }
    const last = this.intervals[this.intervals.length - 1]
    if (last && interval.start < last.start) this.sorted = false
    this.intervals.push(interval)
  }

  find(date: Date | undefined): T | undefined {
    if (!date || this.intervals.length === 0) return undefined
    this.ensureSorted()
    const time = date.getTime()
    let i = lastIndexStartingBefore(this.intervals, time)
    for (let scanned = 0; i >= 0 && scanned < MAX_OVERLAP_SCAN; i--, scanned++) {
      const interval = this.intervals[i]
      if (interval && interval.end >= time) return interval.value
    }
    return undefined
  }

  private ensureSorted(): void {
    if (this.sorted) return
    this.intervals.sort((a, b) => a.start - b.start)
    this.sorted = true
  }
}

interface Instant<T> {
  start: number
  value: T
}

export class NearestIndex<T> {
  private readonly instants: Instant<T>[] = []
  private sorted = true

  add(date: Date | undefined, value: T): void {
    if (!date) return
    const instant = { start: date.getTime(), value }
    const last = this.instants[this.instants.length - 1]
    if (last && instant.start < last.start) this.sorted = false
    this.instants.push(instant)
  }

  find(date: Date | undefined, toleranceMs: number): T | undefined {
    if (!date || this.instants.length === 0) return undefined
    if (!this.sorted) {
      this.instants.sort((a, b) => a.start - b.start)
      this.sorted = true
    }
    const time = date.getTime()
    const before = lastIndexStartingBefore(this.instants, time)
    let best: Instant<T> | undefined
    for (const candidate of [this.instants[before], this.instants[before + 1]]) {
      if (candidate && (!best || Math.abs(candidate.start - time) < Math.abs(best.start - time))) {
        best = candidate
      }
    }
    return best && Math.abs(best.start - time) <= toleranceMs ? best.value : undefined
  }
}

function lastIndexStartingBefore(items: readonly { start: number }[], time: number): number {
  let low = 0
  let high = items.length
  while (low < high) {
    const middle = (low + high) >>> 1
    if ((items[middle]?.start ?? Infinity) <= time) low = middle + 1
    else high = middle
  }
  return low - 1
}
