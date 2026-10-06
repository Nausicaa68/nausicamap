import * as L from 'leaflet'
import { lastIndexAtOrBefore, segmentFamily, type Track, type TransportFamily } from '../timeline/track'

export const FAMILY_COLORS: Record<TransportFamily, string> = {
  walk: '#16a34a',
  bike: '#0891b2',
  road: '#ea580c',
  rail: '#7c3aed',
  air: '#dc2626',
  water: '#2563eb',
  other: '#475569',
}

export interface TrackView {
  showLines: boolean
  showDots: boolean
  cursor: number | null
  trailMs: number
}

const PANE_NAME = 'trackPane'
const PADDING = 0.25
const ARROW_MIN_LENGTH = 30
const ARROW_SPACING = 140
const MAX_ARROWS_PER_SEGMENT = 12
const ARROW_SIZE = 11
const FADED_ALPHA = 0.28
const HEAD_COLOR = '#f97316'
const DOT_COLOR = '#1e3a8a'

export class TrackLayer extends L.Layer {
  private leafletMap: L.Map | undefined
  private canvas: HTMLCanvasElement | undefined
  private track: Track = { entries: [] }
  private view: TrackView = { showLines: true, showDots: false, cursor: null, trailMs: 0 }
  private xs = new Float64Array(0)
  private ys = new Float64Array(0)
  private width = 0
  private height = 0

  override onAdd(map: L.Map): this {
    this.leafletMap = map
    const pane = map.getPane(PANE_NAME) ?? map.createPane(PANE_NAME)
    pane.style.zIndex = '350'
    pane.style.pointerEvents = 'none'
    this.canvas = L.DomUtil.create('canvas', 'track-layer', pane)
    map.on('moveend zoomend resize viewreset', this.reset, this)
    map.on('zoomstart', this.hide, this)
    this.reset()
    return this
  }

  override onRemove(map: L.Map): this {
    map.off('moveend zoomend resize viewreset', this.reset, this)
    map.off('zoomstart', this.hide, this)
    this.canvas?.remove()
    this.canvas = undefined
    this.leafletMap = undefined
    return this
  }

  setTrack(track: Track): void {
    this.track = track
    this.project()
    this.draw()
  }

  setView(view: TrackView): void {
    this.view = view
    this.draw()
  }

  private hide(): void {
    if (this.canvas) this.canvas.style.visibility = 'hidden'
  }

  private reset(): void {
    const map = this.leafletMap
    const canvas = this.canvas
    if (!map || !canvas) return
    const size = map.getSize()
    const topLeft = map.containerPointToLayerPoint([-size.x * PADDING, -size.y * PADDING])
    this.width = Math.round(size.x * (1 + 2 * PADDING))
    this.height = Math.round(size.y * (1 + 2 * PADDING))
    const ratio = window.devicePixelRatio || 1
    canvas.width = Math.round(this.width * ratio)
    canvas.height = Math.round(this.height * ratio)
    canvas.style.width = `${this.width}px`
    canvas.style.height = `${this.height}px`
    canvas.style.visibility = 'visible'
    L.DomUtil.setPosition(canvas, topLeft)
    this.project()
    this.draw()
  }

  private project(): void {
    const map = this.leafletMap
    const canvas = this.canvas
    if (!map || !canvas) return
    const origin = L.DomUtil.getPosition(canvas)
    const { entries } = this.track
    this.xs = new Float64Array(entries.length)
    this.ys = new Float64Array(entries.length)
    for (let i = 0; i < entries.length; i++) {
      const entry = entries[i]
      if (!entry) continue
      const point = map.latLngToLayerPoint([entry.latitude, entry.longitude])
      this.xs[i] = point.x - origin.x
      this.ys[i] = point.y - origin.y
    }
  }

  private draw(): void {
    const canvas = this.canvas
    const context = canvas?.getContext('2d')
    if (!canvas || !context) return
    const ratio = canvas.width / Math.max(this.width, 1)
    context.setTransform(ratio, 0, 0, ratio, 0, 0)
    context.clearRect(0, 0, this.width, this.height)

    const { entries } = this.track
    if (entries.length === 0) return
    const { cursor, trailMs, showLines, showDots } = this.view
    const last = cursor === null ? entries.length - 1 : lastIndexAtOrBefore(entries, cursor)
    if (last < 0) return
    const recentFrom = cursor === null ? -Infinity : cursor - trailMs

    if (showLines) {
      this.drawLines(context, last, recentFrom, false)
      this.drawLines(context, last, recentFrom, true)
    }
    if (showDots) this.drawDots(context, last, recentFrom)
    if (cursor !== null) this.drawHead(context, last, cursor)
  }

  private drawLines(context: CanvasRenderingContext2D, last: number, recentFrom: number, recent: boolean): void {
    const { entries } = this.track
    const segments: number[] = []
    for (let i = 1; i <= last; i++) {
      const entry = entries[i]
      if (!entry || entry.breakBefore || entry.time >= recentFrom !== recent) continue
      if (this.isVisibleSegment(i)) segments.push(i)
    }
    if (segments.length === 0) return

    context.save()
    context.globalAlpha = recent ? 1 : FADED_ALPHA
    context.lineCap = 'round'
    context.lineJoin = 'round'

    context.strokeStyle = '#ffffff'
    context.lineWidth = recent ? 5.5 : 4
    context.beginPath()
    for (const i of segments) this.addSegmentPath(context, i)
    context.stroke()

    for (const [family, color] of Object.entries(FAMILY_COLORS) as [TransportFamily, string][]) {
      const ofFamily = segments.filter((i) => segmentFamily(entries, i) === family)
      if (ofFamily.length === 0) continue
      context.strokeStyle = color
      context.lineWidth = recent ? 3 : 2
      context.setLineDash(family === 'air' ? [8, 7] : [])
      context.beginPath()
      for (const i of ofFamily) this.addSegmentPath(context, i)
      context.stroke()
      context.setLineDash([])
      if (recent) this.drawArrows(context, ofFamily, color)
    }
    context.restore()
  }

  private drawArrows(context: CanvasRenderingContext2D, segments: readonly number[], color: string): void {
    context.beginPath()
    for (const i of segments) {
      const [x0, y0, x1, y1] = this.segmentCoordinates(i)
      const dx = x1 - x0
      const dy = y1 - y0
      const length = Math.hypot(dx, dy)
      if (length < ARROW_MIN_LENGTH) continue
      const angle = Math.atan2(dy, dx)
      const count = Math.min(Math.max(1, Math.floor(length / ARROW_SPACING)), MAX_ARROWS_PER_SEGMENT)
      for (let k = 0; k < count; k++) {
        const t = (k + 0.5) / count
        const x = x0 + dx * t
        const y = y0 + dy * t
        if (x < -ARROW_SIZE || y < -ARROW_SIZE || x > this.width + ARROW_SIZE || y > this.height + ARROW_SIZE) continue
        this.addArrowPath(context, x + Math.cos(angle) * ARROW_SIZE * 0.5, y + Math.sin(angle) * ARROW_SIZE * 0.5, angle)
      }
    }
    context.fillStyle = color
    context.strokeStyle = '#ffffff'
    context.lineWidth = 2
    context.lineJoin = 'round'
    context.stroke()
    context.fill()
  }

  private addArrowPath(context: CanvasRenderingContext2D, tipX: number, tipY: number, angle: number): void {
    const back = ARROW_SIZE
    const wing = 0.55
    context.moveTo(tipX, tipY)
    context.lineTo(tipX - back * Math.cos(angle - wing), tipY - back * Math.sin(angle - wing))
    context.lineTo(tipX - back * 0.55 * Math.cos(angle), tipY - back * 0.55 * Math.sin(angle))
    context.lineTo(tipX - back * Math.cos(angle + wing), tipY - back * Math.sin(angle + wing))
    context.closePath()
  }

  private drawDots(context: CanvasRenderingContext2D, last: number, recentFrom: number): void {
    const { entries } = this.track
    for (const recent of [false, true]) {
      context.beginPath()
      const radius = recent ? 3.5 : 2.5
      for (let i = 0; i <= last; i++) {
        const entry = entries[i]
        if (!entry || entry.time >= recentFrom !== recent) continue
        const x = this.xs[i] ?? 0
        const y = this.ys[i] ?? 0
        if (x < -5 || y < -5 || x > this.width + 5 || y > this.height + 5) continue
        context.moveTo(x + radius, y)
        context.arc(x, y, radius, 0, Math.PI * 2)
      }
      context.globalAlpha = recent ? 1 : 0.45
      context.fillStyle = DOT_COLOR
      if (recent) {
        context.strokeStyle = '#ffffff'
        context.lineWidth = 1
        context.stroke()
      }
      context.fill()
    }
    context.globalAlpha = 1
  }

  private drawHead(context: CanvasRenderingContext2D, last: number, cursor: number): void {
    const { entries } = this.track
    let x = this.xs[last] ?? 0
    let y = this.ys[last] ?? 0
    const current = entries[last]
    const next = entries[last + 1]
    if (current && next && !next.breakBefore && next.time > current.time) {
      const [, , nextX, nextY] = this.segmentCoordinates(last + 1)
      const fraction = Math.min(Math.max((cursor - current.time) / (next.time - current.time), 0), 1)
      x += (nextX - x) * fraction
      y += (nextY - y) * fraction
    }
    context.beginPath()
    context.arc(x, y, 13, 0, Math.PI * 2)
    context.fillStyle = 'rgba(249, 115, 22, 0.25)'
    context.fill()
    context.beginPath()
    context.arc(x, y, 7, 0, Math.PI * 2)
    context.fillStyle = HEAD_COLOR
    context.strokeStyle = '#ffffff'
    context.lineWidth = 2.5
    context.fill()
    context.stroke()
  }

  private addSegmentPath(context: CanvasRenderingContext2D, index: number): void {
    const [x0, y0, x1, y1] = this.segmentCoordinates(index)
    context.moveTo(x0, y0)
    context.lineTo(x1, y1)
  }

  private segmentCoordinates(index: number): [number, number, number, number] {
    const x0 = this.xs[index - 1] ?? 0
    const y0 = this.ys[index - 1] ?? 0
    let x1 = this.xs[index] ?? 0
    const y1 = this.ys[index] ?? 0
    const from = this.track.entries[index - 1]
    const to = this.track.entries[index]
    const map = this.leafletMap
    if (from && to && map && Math.abs(to.longitude - from.longitude) > 180) {
      const shift = to.longitude > from.longitude ? -360 : 360
      const wrapped = map.latLngToLayerPoint([to.latitude, to.longitude + shift])
      const origin = this.canvas ? L.DomUtil.getPosition(this.canvas) : L.point(0, 0)
      x1 = wrapped.x - origin.x
    }
    return [x0, y0, x1, y1]
  }

  private isVisibleSegment(index: number): boolean {
    const [x0, y0, x1, y1] = this.segmentCoordinates(index)
    return !(
      (x0 < 0 && x1 < 0) ||
      (y0 < 0 && y1 < 0) ||
      (x0 > this.width && x1 > this.width) ||
      (y0 > this.height && y1 > this.height)
    )
  }
}
