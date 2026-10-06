import { intlLocale, t } from '../i18n/i18n'
import { describeTransportFamily } from '../i18n/labels'
import { FAMILY_COLORS } from '../map/trackLayer'
import { toDateInputValue, type Period } from '../timeline/period'
import { SPEED_OPTIONS, type PlayerState } from '../timeline/timelapse'
import { TRANSPORT_FAMILIES } from '../timeline/track'

export interface ControlHandlers {
  onTrajectoriesChange(enabled: boolean): void
  onTimelapseChange(enabled: boolean): void
  onPeriodChange(): void
  onFitPeriod(): void
  onResetPeriod(): void
  onPlayToggle(): void
  onSeek(fraction: number): void
  onSpeedChange(msPerSecond: number): void
}

export interface PeriodInputs {
  enabled: boolean
  from: string
  to: string
}

const SLIDER_MAX = 1000
const COMPACT_WIDTH = 640

export class Controls {
  private readonly panelToggle = element('panel-toggle', HTMLButtonElement)
  private readonly panelBody = element('panel-body', HTMLElement)
  private readonly trajectories = element('mode-trajectories', HTMLInputElement)
  private readonly timelapse = element('mode-timelapse', HTMLInputElement)
  private readonly periodEnabled = element('period-enabled', HTMLInputElement)
  private readonly periodFields = element('period-fields', HTMLElement)
  private readonly periodFrom = element('period-from', HTMLInputElement)
  private readonly periodTo = element('period-to', HTMLInputElement)
  private readonly periodInfo = element('period-info', HTMLElement)
  private readonly periodFit = element('period-fit', HTMLButtonElement)
  private readonly periodReset = element('period-reset', HTMLButtonElement)
  private readonly legend = element('legend', HTMLElement)
  private readonly legendList = element('legend-list', HTMLElement)
  private readonly player = element('player', HTMLElement)
  private readonly playButton = element('player-play', HTMLButtonElement)
  private readonly slider = element('player-slider', HTMLInputElement)
  private readonly playerDate = element('player-date', HTMLElement)
  private readonly speed = element('player-speed', HTMLSelectElement)
  private sliderDragging = false
  private lastPlayerState: Readonly<PlayerState> | undefined

  constructor(private readonly handlers: ControlHandlers) {
    this.buildLegend()
    this.buildSpeedOptions()
    this.setPanelOpen(window.innerWidth > COMPACT_WIDTH)
    this.bindEvents()
  }

  get trajectoriesEnabled(): boolean {
    return this.trajectories.checked
  }

  get timelapseEnabled(): boolean {
    return this.timelapse.checked
  }

  get periodInputs(): PeriodInputs {
    return { enabled: this.periodEnabled.checked, from: this.periodFrom.value, to: this.periodTo.value }
  }

  resetPeriod(fullPeriod: Period | undefined, enabled = false): void {
    const min = fullPeriod ? toDateInputValue(fullPeriod.start) : ''
    const max = fullPeriod ? toDateInputValue(fullPeriod.end) : ''
    for (const input of [this.periodFrom, this.periodTo]) {
      input.min = min
      input.max = max
    }
    this.periodFrom.value = min
    this.periodTo.value = max
    this.periodEnabled.checked = enabled
    this.periodEnabled.disabled = !fullPeriod
    this.updatePeriodFieldsState()
  }

  coveredArea(): { right: number; bottom: number } {
    const panel = this.panelToggle.closest('.panel')
    const panelOpen = this.panelToggle.getAttribute('aria-expanded') === 'true'
    const wide = window.innerWidth > COMPACT_WIDTH
    return {
      right: panel instanceof HTMLElement && panelOpen && wide ? panel.offsetWidth + 12 : 0,
      bottom: this.player.hidden ? 0 : this.player.offsetHeight + 28,
    }
  }

  setPeriodInfo(text: string, isWarning = false): void {
    this.periodInfo.textContent = text
    this.periodInfo.classList.toggle('panel__info--warning', isWarning)
  }

  showLegend(visible: boolean): void {
    this.legend.hidden = !visible
  }

  showPlayer(visible: boolean): void {
    this.player.hidden = !visible
    document.body.classList.toggle('has-player', visible)
  }

  refreshLocale(): void {
    this.buildLegend()
    this.buildSpeedOptions()
    if (this.lastPlayerState) this.renderPlayer(this.lastPlayerState)
  }

  renderPlayer(state: Readonly<PlayerState>): void {
    this.lastPlayerState = state
    const span = state.end - state.start
    if (!this.sliderDragging) {
      const fraction = span > 0 ? (state.cursor - state.start) / span : 0
      this.slider.value = String(Math.round(fraction * SLIDER_MAX))
    }
    this.playerDate.textContent = new Date(state.cursor).toLocaleString(intlLocale(), {
      dateStyle: 'medium',
      timeStyle: 'short',
    })
    this.playButton.textContent = state.playing ? '❚❚' : '▶'
    this.playButton.setAttribute('aria-label', state.playing ? t().player.pause : t().player.play)
    this.speed.value = String(state.msPerSecond)
  }

  private bindEvents(): void {
    this.panelToggle.addEventListener('click', () => {
      this.setPanelOpen(this.panelToggle.getAttribute('aria-expanded') !== 'true')
    })
    this.trajectories.addEventListener('change', () => this.handlers.onTrajectoriesChange(this.trajectories.checked))
    this.timelapse.addEventListener('change', () => this.handlers.onTimelapseChange(this.timelapse.checked))

    this.periodEnabled.addEventListener('change', () => {
      this.updatePeriodFieldsState()
      this.handlers.onPeriodChange()
    })
    for (const input of [this.periodFrom, this.periodTo]) {
      input.addEventListener('change', () => {
        this.periodEnabled.checked = true
        this.updatePeriodFieldsState()
        this.handlers.onPeriodChange()
      })
    }
    this.periodFit.addEventListener('click', () => this.handlers.onFitPeriod())
    this.periodReset.addEventListener('click', () => this.handlers.onResetPeriod())

    this.playButton.addEventListener('click', () => this.handlers.onPlayToggle())
    this.slider.addEventListener('input', () => {
      this.sliderDragging = true
      this.handlers.onSeek(Number(this.slider.value) / SLIDER_MAX)
    })
    this.slider.addEventListener('change', () => {
      this.sliderDragging = false
    })
    this.speed.addEventListener('change', () => this.handlers.onSpeedChange(Number(this.speed.value)))

    document.addEventListener('keydown', (event) => {
      const target = event.target
      const typing = target instanceof HTMLInputElement || target instanceof HTMLSelectElement
      if (event.code === 'Space' && !this.player.hidden && !typing) {
        event.preventDefault()
        this.handlers.onPlayToggle()
      }
    })
  }

  private updatePeriodFieldsState(): void {
    this.periodFields.classList.toggle('period--inactive', !this.periodEnabled.checked)
  }

  private setPanelOpen(open: boolean): void {
    this.panelToggle.setAttribute('aria-expanded', String(open))
    this.panelBody.hidden = !open
  }

  private buildLegend(): void {
    this.legendList.replaceChildren()
    for (const family of TRANSPORT_FAMILIES) {
      const item = document.createElement('li')
      const swatch = document.createElement('span')
      swatch.className = `legend__swatch${family === 'air' ? ' legend__swatch--dashed' : ''}`
      swatch.style.setProperty('--swatch-color', FAMILY_COLORS[family])
      const label = document.createElement('span')
      label.textContent = describeTransportFamily(family)
      item.append(swatch, label)
      this.legendList.append(item)
    }
  }

  private buildSpeedOptions(): void {
    const selected = this.speed.value
    this.speed.replaceChildren()
    for (const option of SPEED_OPTIONS) {
      const element = document.createElement('option')
      element.value = String(option.msPerSecond)
      element.textContent = t().player.speeds[option.id]
      this.speed.append(element)
    }
    if (selected) this.speed.value = selected
  }
}

function element<T extends HTMLElement>(id: string, type: new () => T): T {
  const found = document.getElementById(id)
  if (!(found instanceof type)) throw new Error(`Element #${id} not found in index.html.`)
  return found
}
