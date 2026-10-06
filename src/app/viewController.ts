import type { LocationMap, RenderProgressListener } from '../map/map'
import { captureMap, type PhotoCaption } from '../photo/capture'
import { dataPeriod, filterByPeriod, periodFromDateInputs, type Period } from '../timeline/period'
import { TimelapsePlayer, type PlayerState } from '../timeline/timelapse'
import { buildTrack, type Track } from '../timeline/track'
import type { LocationPoint } from '../types/location'
import { Controls } from '../ui/controls'
import { t } from '../i18n/i18n'
import { formatDate, formatDateTime, formatPositions } from '../ui/format'

const PERIOD_DEBOUNCE_MS = 250
const TRAIL_SECONDS = 2.5
const PHOTO_TILE_TIMEOUT_MS = 4_000

export class ViewController {
  private readonly controls: Controls
  private readonly player: TimelapsePlayer
  private allPoints: readonly LocationPoint[] = []
  private visiblePoints: readonly LocationPoint[] = []
  private fullPeriod: Period | undefined
  private track: Track = { entries: [] }
  private periodTimer: number | undefined

  constructor(
    private readonly map: LocationMap,
    private readonly onVisibleCountChange: (visible: number, total: number) => void,
  ) {
    this.player = new TimelapsePlayer((state) => this.onPlayerChange(state))
    this.controls = new Controls({
      onTrajectoriesChange: () => this.updateModes(),
      onTimelapseChange: (enabled) => {
        this.updateModes()
        if (enabled) this.player.play()
        else this.player.pause()
      },
      onPeriodChange: () => this.schedulePeriodUpdate(),
      onFitPeriod: () => this.map.fitToPoints(this.visiblePoints, this.controls.coveredArea()),
      onResetPeriod: () => {
        this.controls.resetPeriod(this.fullPeriod)
        this.schedulePeriodUpdate()
      },
      onPlayToggle: () => this.player.toggle(),
      onSeek: (fraction) => {
        const { start, end } = this.player.current
        this.player.seek(start + fraction * (end - start))
      },
      onSpeedChange: (msPerSecond) => this.player.setSpeed(msPerSecond),
    })
  }

  get hasData(): boolean {
    return this.allPoints.length > 0
  }

  pause(): void {
    this.player.pause()
  }

  onShown(): void {
    this.map.refreshSize()
  }

  refreshLocale(): void {
    this.controls.refreshLocale()
    this.updatePeriodInfo(this.selectedPeriod())
    this.onVisibleCountChange(this.visiblePoints.length, this.allPoints.length)
    this.map.refreshLocale()
  }

  async load(points: readonly LocationPoint[], onProgress?: RenderProgressListener): Promise<boolean> {
    this.player.pause()
    this.allPoints = points
    this.fullPeriod = dataPeriod(points)
    this.controls.resetPeriod(this.fullPeriod)
    return this.applyPeriod({ fit: true, onProgress })
  }

  async capturePhoto(siteName: string, siteUrl?: string, icon?: CanvasImageSource): Promise<Blob> {
    await this.map.waitForTiles(PHOTO_TILE_TIMEOUT_MS)
    const details: string[] = []
    if (this.controls.timelapseEnabled) {
      details.push(t().photo.captionTimelapse(formatDateTime(new Date(this.player.current.cursor))))
    }
    if (siteUrl) details.push(siteUrl.replace(/^https?:\/\//, ''))
    const caption: PhotoCaption = {
      title: siteName,
      subtitle: this.photoSubtitle(),
      details,
      attribution: '© OpenStreetMap contributors',
      icon,
    }
    return captureMap(this.map.container, caption)
  }

  private photoSubtitle(): string {
    const texts = t().photo
    const positions = formatPositions(this.visiblePoints.length)
    const covered = dataPeriod(this.visiblePoints)
    if (!covered) return texts.captionPositions(positions)
    const from = formatDate(new Date(covered.start))
    const to = formatDate(new Date(covered.end))
    return from === to ? texts.captionDay(positions, from) : texts.captionRange(positions, from, to)
  }

  private schedulePeriodUpdate(): void {
    window.clearTimeout(this.periodTimer)
    this.periodTimer = window.setTimeout(() => {
      void this.applyPeriod({ fit: false })
    }, PERIOD_DEBOUNCE_MS)
  }

  private async applyPeriod(options: { fit: boolean; onProgress?: RenderProgressListener }): Promise<boolean> {
    const period = this.selectedPeriod()
    this.visiblePoints = period ? filterByPeriod(this.allPoints, period) : this.allPoints
    this.track = buildTrack(this.visiblePoints)
    this.map.setTrack(this.track)
    this.loadPlayer(period, options.fit)
    this.updatePeriodInfo(period)
    this.onVisibleCountChange(this.visiblePoints.length, this.allPoints.length)
    this.updateModes()
    return this.map.showPoints(this.visiblePoints, { ...options, covered: this.controls.coveredArea() })
  }

  private selectedPeriod(): Period | undefined {
    const inputs = this.controls.periodInputs
    if (!inputs.enabled) return undefined
    return periodFromDateInputs(inputs.from, inputs.to)
  }

  private loadPlayer(period: Period | undefined, reset: boolean): void {
    const covered = dataPeriod(this.visiblePoints)
    if (!covered) return
    const start = period ? Math.max(period.start, covered.start) : covered.start
    const end = period ? Math.min(period.end, covered.end) : covered.end
    this.player.load({ start, end: Math.max(end, start) }, this.track.entries.map((entry) => entry.time), reset)
  }

  private updatePeriodInfo(period: Period | undefined): void {
    const texts = t().panel
    const inputs = this.controls.periodInputs
    if (inputs.enabled && !period) {
      this.controls.setPeriodInfo(texts.invalidDates, true)
      return
    }
    const count = this.visiblePoints.length
    if (count === 0) {
      this.controls.setPeriodInfo(texts.noPositions, true)
      return
    }
    const positions = formatPositions(count)
    const covered = dataPeriod(this.visiblePoints)
    this.controls.setPeriodInfo(
      covered
        ? texts.rangeInfo(positions, formatDate(new Date(covered.start)), formatDate(new Date(covered.end)))
        : positions,
    )
  }

  private updateModes(): void {
    const trajectories = this.controls.trajectoriesEnabled
    const timelapse = this.controls.timelapseEnabled
    this.map.setPointsVisible(!timelapse)
    this.controls.showLegend(trajectories)
    this.controls.showPlayer(timelapse)
    if (!timelapse) this.player.pause()
    this.renderTrack()
  }

  private onPlayerChange(state: Readonly<PlayerState>): void {
    this.controls.renderPlayer(state)
    if (this.controls.timelapseEnabled) this.renderTrack()
  }

  private renderTrack(): void {
    const trajectories = this.controls.trajectoriesEnabled
    const timelapse = this.controls.timelapseEnabled
    if (!trajectories && !timelapse) {
      this.map.setTrackView(null)
      return
    }
    const state = this.player.current
    this.map.setTrackView({
      showLines: trajectories,
      showDots: timelapse,
      cursor: timelapse ? state.cursor : null,
      trailMs: state.msPerSecond * TRAIL_SECONDS,
    })
  }
}
