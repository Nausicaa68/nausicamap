import * as L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { t } from '../i18n/i18n'
import type { Track } from '../timeline/track'
import type { LocationPoint } from '../types/location'
import { buildPopupContent } from './popup'
import { TrackLayer, type TrackView } from './trackLayer'

const OSM_TILE_URL = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png'
const OSM_ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a> contributors'

const BATCH_SIZE = 2_000
const SINGLE_POINT_ZOOM = 15
const MAX_FIT_ZOOM = 16

const ZOOM_STYLES: readonly { minZoom: number; style: L.CircleMarkerOptions }[] = [
  { minZoom: 15, style: { radius: 7, stroke: true, color: '#ffffff', weight: 2, fillColor: '#1e3a8a', fillOpacity: 1 } },
  { minZoom: 12, style: { radius: 5.5, stroke: true, color: '#ffffff', weight: 1.5, fillColor: '#1e3a8a', fillOpacity: 0.95 } },
  { minZoom: 8, style: { radius: 4.5, stroke: true, color: '#ffffff', weight: 1, fillColor: '#1e40af', fillOpacity: 0.9 } },
  { minZoom: 0, style: { radius: 3, stroke: false, fillColor: '#2563eb', fillOpacity: 0.65 } },
]

const SELECTION_STYLE: L.CircleMarkerOptions = {
  radius: 11,
  stroke: true,
  color: '#f97316',
  weight: 3,
  fill: false,
  interactive: false,
}

function styleForZoom(zoom: number): L.CircleMarkerOptions {
  const match = ZOOM_STYLES.find((entry) => zoom >= entry.minZoom)
  return (match ?? ZOOM_STYLES[ZOOM_STYLES.length - 1])?.style ?? {}
}

export type RenderProgressListener = (rendered: number, total: number) => void

export interface ShowPointsOptions {
  fit?: boolean
  covered?: { right?: number; bottom?: number }
  onProgress?: RenderProgressListener
}

export class LocationMap {
  private readonly map: L.Map
  private readonly renderer = L.canvas({ padding: 0.5, tolerance: 4 })
  private readonly pointsLayer = L.featureGroup()
  private pointByMarker = new WeakMap<L.Layer, LocationPoint>()
  private renderGeneration = 0
  private pointStyle: L.CircleMarkerOptions
  private readonly selection: L.CircleMarker
  private readonly trackLayer = new TrackLayer()
  private readonly tileLayer: L.TileLayer
  private zoomControl: L.Control.Zoom

  constructor(container: HTMLElement) {
    this.map = L.map(container, {
      center: [20, 0],
      zoom: 2,
      minZoom: 2,
      worldCopyJump: true,
      preferCanvas: true,
      zoomControl: false,
    })
    this.zoomControl = this.createZoomControl().addTo(this.map)

    this.tileLayer = L.tileLayer(OSM_TILE_URL, {
      maxZoom: 19,
      attribution: OSM_ATTRIBUTION,
      crossOrigin: 'anonymous',
    }).addTo(this.map)

    this.pointStyle = styleForZoom(this.map.getZoom())
    this.selection = L.circleMarker([0, 0], { ...SELECTION_STYLE, renderer: this.renderer })

    this.pointsLayer.addTo(this.map)
    this.pointsLayer.on('click', (event) => this.openPointPopup(event))
    this.map.on('zoomend', () => this.updatePointStyle())
    this.map.on('popupclose', () => this.selection.remove())
  }

  async showPoints(points: readonly LocationPoint[], options: ShowPointsOptions = {}): Promise<boolean> {
    const { fit = true, covered, onProgress } = options
    const generation = this.clear()
    if (fit) this.fitToPoints(points, covered)

    for (let start = 0; start < points.length; start += BATCH_SIZE) {
      if (generation !== this.renderGeneration) return false
      this.addBatch(points, start, Math.min(start + BATCH_SIZE, points.length))
      onProgress?.(Math.min(start + BATCH_SIZE, points.length), points.length)
      await nextFrame()
    }
    return generation === this.renderGeneration
  }

  clear(): number {
    this.renderGeneration++
    this.map.closePopup()
    this.pointsLayer.clearLayers()
    this.pointByMarker = new WeakMap()
    return this.renderGeneration
  }

  setPointsVisible(visible: boolean): void {
    if (visible && !this.map.hasLayer(this.pointsLayer)) this.pointsLayer.addTo(this.map)
    if (!visible && this.map.hasLayer(this.pointsLayer)) {
      this.map.closePopup()
      this.pointsLayer.remove()
    }
  }

  setTrack(track: Track): void {
    this.trackLayer.setTrack(track)
  }

  setTrackView(view: TrackView | null): void {
    if (!view) {
      this.trackLayer.remove()
      return
    }
    if (!this.map.hasLayer(this.trackLayer)) this.trackLayer.addTo(this.map)
    this.trackLayer.setView(view)
  }

  refreshLocale(): void {
    this.map.closePopup()
    this.zoomControl.remove()
    this.zoomControl = this.createZoomControl().addTo(this.map)
    this.map.getContainer().setAttribute('aria-label', t().map.ariaLabel)
  }

  private createZoomControl(): L.Control.Zoom {
    return L.control.zoom({ zoomInTitle: t().map.zoomIn, zoomOutTitle: t().map.zoomOut })
  }

  get container(): HTMLElement {
    return this.map.getContainer()
  }

  waitForTiles(timeoutMs: number): Promise<void> {
    if (!this.tileLayer.isLoading()) return Promise.resolve()
    return new Promise((resolve) => {
      const done = (): void => {
        window.clearTimeout(timer)
        this.tileLayer.off('load', done)
        resolve()
      }
      const timer = window.setTimeout(done, timeoutMs)
      this.tileLayer.on('load', done)
    })
  }

  refreshSize(): void {
    this.map.invalidateSize()
  }

  private addBatch(points: readonly LocationPoint[], start: number, end: number): void {
    for (let i = start; i < end; i++) {
      const point = points[i]
      if (!point) continue
      const marker = L.circleMarker([point.latitude, point.longitude], {
        ...this.pointStyle,
        renderer: this.renderer,
      })
      this.pointByMarker.set(marker, point)
      this.pointsLayer.addLayer(marker)
    }
  }

  private updatePointStyle(): void {
    const style = styleForZoom(this.map.getZoom())
    if (style === this.pointStyle) return
    this.pointStyle = style
    this.pointsLayer.eachLayer((layer) => {
      if (layer instanceof L.CircleMarker) layer.setStyle(style)
    })
  }

  fitToPoints(points: readonly LocationPoint[], covered: { right?: number; bottom?: number } = {}): void {
    const bounds = computeBounds(points)
    if (!bounds) return
    if (bounds.getNorthEast().equals(bounds.getSouthWest())) {
      this.map.setView(bounds.getCenter(), SINGLE_POINT_ZOOM)
    } else {
      this.map.fitBounds(bounds, {
        paddingTopLeft: [32, 32],
        paddingBottomRight: [32 + (covered.right ?? 0), 32 + (covered.bottom ?? 0)],
        maxZoom: MAX_FIT_ZOOM,
      })
    }
  }

  private openPointPopup(event: L.LeafletEvent): void {
    const marker: unknown = event.propagatedFrom
    if (!(marker instanceof L.CircleMarker)) return
    const point = this.pointByMarker.get(marker)
    if (!point) return
    L.popup({ closeButton: true, autoPan: true, maxWidth: 380, minWidth: 300, maxHeight: 420 })
      .setLatLng(marker.getLatLng())
      .setContent(buildPopupContent(point))
      .openOn(this.map)
    this.selection.setLatLng(marker.getLatLng()).addTo(this.map)
  }
}

export function computeBounds(points: readonly LocationPoint[]): L.LatLngBounds | null {
  if (points.length === 0) return null
  let south = Infinity
  let west = Infinity
  let north = -Infinity
  let east = -Infinity
  for (const { latitude, longitude } of points) {
    if (latitude < south) south = latitude
    if (latitude > north) north = latitude
    if (longitude < west) west = longitude
    if (longitude > east) east = longitude
  }
  return L.latLngBounds([south, west], [north, east])
}

function nextFrame(): Promise<void> {
  return new Promise((resolve) => requestAnimationFrame(() => resolve()))
}
