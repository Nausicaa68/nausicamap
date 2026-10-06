import type { Period } from './period'

const HOUR_MS = 3_600_000
const DAY_MS = 24 * HOUR_MS

export interface SpeedOption {
  id: 'hour' | 'sixHours' | 'day' | 'week' | 'month' | 'sixMonths' | 'year'
  msPerSecond: number
}

export const SPEED_OPTIONS: readonly SpeedOption[] = [
  { id: 'hour', msPerSecond: HOUR_MS },
  { id: 'sixHours', msPerSecond: 6 * HOUR_MS },
  { id: 'day', msPerSecond: DAY_MS },
  { id: 'week', msPerSecond: 7 * DAY_MS },
  { id: 'month', msPerSecond: 30 * DAY_MS },
  { id: 'sixMonths', msPerSecond: 182 * DAY_MS },
  { id: 'year', msPerSecond: 365 * DAY_MS },
]

export const MAX_IDLE_SECONDS = 1.5
const LEAD_SECONDS = 0.3
const TARGET_DURATION_SECONDS = 45

export function defaultSpeed(spanMs: number): number {
  const ideal = Math.max(spanMs, HOUR_MS) / TARGET_DURATION_SECONDS
  let best = SPEED_OPTIONS[0]?.msPerSecond ?? DAY_MS
  for (const option of SPEED_OPTIONS) {
    if (Math.abs(Math.log(option.msPerSecond / ideal)) < Math.abs(Math.log(best / ideal))) best = option.msPerSecond
  }
  return best
}

export function advanceCursor(
  cursor: number,
  elapsedMs: number,
  msPerSecond: number,
  eventTimes: readonly number[],
  end: number,
): number {
  const next = cursor + (elapsedMs / 1000) * msPerSecond
  const nextEvent = eventTimes[firstIndexAfter(eventTimes, cursor)]
  if (nextEvent === undefined) return Math.min(next, end)
  if (nextEvent > next && (nextEvent - cursor) / msPerSecond > MAX_IDLE_SECONDS) {
    return Math.min(Math.max(next, nextEvent - LEAD_SECONDS * msPerSecond), end)
  }
  return Math.min(next, end)
}

function firstIndexAfter(times: readonly number[], time: number): number {
  let low = 0
  let high = times.length
  while (low < high) {
    const middle = (low + high) >>> 1
    if ((times[middle] ?? Infinity) <= time) low = middle + 1
    else high = middle
  }
  return low
}

export interface PlayerState {
  start: number
  end: number
  cursor: number
  playing: boolean
  msPerSecond: number
}

export class TimelapsePlayer {
  private state: PlayerState = { start: 0, end: 0, cursor: 0, playing: false, msPerSecond: DAY_MS }
  private eventTimes: readonly number[] = []
  private frameId: number | undefined
  private lastFrameTime: number | undefined
  private speedChosen = false

  constructor(private readonly onChange: (state: Readonly<PlayerState>) => void) {}

  get current(): Readonly<PlayerState> {
    return this.state
  }

  load(period: Period, eventTimes: readonly number[], reset = false): void {
    this.eventTimes = eventTimes
    if (reset) this.speedChosen = false
    const cursorInside = this.state.cursor >= period.start && this.state.cursor <= period.end
    this.state = {
      ...this.state,
      start: period.start,
      end: period.end,
      cursor: cursorInside && !reset ? this.state.cursor : period.start,
      msPerSecond: this.speedChosen ? this.state.msPerSecond : defaultSpeed(period.end - period.start),
    }
    this.notify()
  }

  play(): void {
    if (this.state.playing) return
    if (this.state.cursor >= this.state.end) this.state.cursor = this.state.start
    this.state.playing = true
    this.lastFrameTime = undefined
    this.frameId = requestAnimationFrame((time) => this.tick(time))
    this.notify()
  }

  pause(): void {
    if (this.frameId !== undefined) cancelAnimationFrame(this.frameId)
    this.frameId = undefined
    if (!this.state.playing) return
    this.state.playing = false
    this.notify()
  }

  toggle(): void {
    if (this.state.playing) this.pause()
    else this.play()
  }

  seek(time: number): void {
    this.state.cursor = Math.min(Math.max(time, this.state.start), this.state.end)
    this.notify()
  }

  setSpeed(msPerSecond: number): void {
    this.speedChosen = true
    this.state.msPerSecond = msPerSecond
    this.notify()
  }

  private tick(frameTime: number): void {
    const elapsed = this.lastFrameTime === undefined ? 0 : Math.min(frameTime - this.lastFrameTime, 250)
    this.lastFrameTime = frameTime
    const { cursor, msPerSecond, end } = this.state
    this.state.cursor = advanceCursor(cursor, elapsed, msPerSecond, this.eventTimes, end)
    if (this.state.cursor >= end) {
      this.state.playing = false
      this.frameId = undefined
    } else {
      this.frameId = requestAnimationFrame((time) => this.tick(time))
    }
    this.notify()
  }

  private notify(): void {
    this.onChange(this.state)
  }
}
