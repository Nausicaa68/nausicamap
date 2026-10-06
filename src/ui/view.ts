import { t } from '../i18n/i18n'
import type { AnalysisFailure, AnalysisStage, AnalysisSuccess, InvalidCounts } from '../types/location'
import { formatCount, formatPositions } from './format'

export interface ViewElements {
  topbar: HTMLElement
  homeButton: HTMLButtonElement
  landing: HTMLElement
  backToMapButton: HTMLButtonElement
  mapView: HTMLElement
  map: HTMLElement
  dropzone: HTMLElement
  fileInput: HTMLInputElement
  chooseFileButton: HTMLButtonElement
  demoButton: HTMLButtonElement
  changeFileButton: HTMLButtonElement
  summaryFilename: HTMLElement
  summaryCount: HTMLElement
  status: HTMLElement
  statusTitle: HTMLElement
  statusDetail: HTMLElement
  statusClose: HTMLButtonElement
  photoButton: HTMLButtonElement
}

export function getViewElements(): ViewElements {
  return {
    topbar: byId('topbar', HTMLElement),
    homeButton: byId('home-button', HTMLButtonElement),
    landing: byId('landing', HTMLElement),
    backToMapButton: byId('back-to-map-button', HTMLButtonElement),
    mapView: byId('map-view', HTMLElement),
    map: byId('map', HTMLElement),
    dropzone: byId('dropzone', HTMLElement),
    fileInput: byId('file-input', HTMLInputElement),
    chooseFileButton: byId('choose-file-button', HTMLButtonElement),
    demoButton: byId('demo-button', HTMLButtonElement),
    changeFileButton: byId('change-file-button', HTMLButtonElement),
    summaryFilename: byId('summary-filename', HTMLElement),
    summaryCount: byId('summary-count', HTMLElement),
    status: byId('status', HTMLElement),
    statusTitle: byId('status-title', HTMLElement),
    statusDetail: byId('status-detail', HTMLElement),
    statusClose: byId('status-close', HTMLButtonElement),
    photoButton: byId('photo-button', HTMLButtonElement),
  }
}

function byId<T extends HTMLElement>(id: string, type: new () => T): T {
  const element = document.getElementById(id)
  if (!(element instanceof type)) throw new Error(`Element #${id} not found in index.html.`)
  return element
}

export function showMapView(view: ViewElements, fileName: string): void {
  view.landing.hidden = true
  view.topbar.hidden = false
  view.mapView.hidden = false
  view.summaryFilename.textContent = fileName
}

export function showLanding(view: ViewElements, canReturnToMap: boolean): void {
  view.mapView.hidden = true
  view.topbar.hidden = true
  view.landing.hidden = false
  view.backToMapButton.hidden = !canReturnToMap
  view.landing.scrollTop = 0
}

export function renderSummaryCount(view: ViewElements, visible: number, total: number): void {
  view.summaryCount.textContent =
    visible === total ? formatPositions(total) : t().summary.filtered(formatCount(visible), formatPositions(total))
}

export type StatusKind = 'progress' | 'success' | 'warning' | 'error'

export interface StatusMessage {
  kind: StatusKind
  title: string
  detail?: string
}

export type StatusBuilder = () => StatusMessage

let autoHideTimer: number | undefined
let currentStatus: StatusBuilder | undefined

export function showStatus(view: ViewElements, build: StatusBuilder, autoHideMs?: number): void {
  window.clearTimeout(autoHideTimer)
  currentStatus = build
  renderStatus(view, build())
  if (autoHideMs) autoHideTimer = window.setTimeout(() => hideStatus(view), autoHideMs)
}

export function refreshStatus(view: ViewElements): void {
  if (currentStatus && !view.status.hidden) renderStatus(view, currentStatus())
}

export function hideStatus(view: ViewElements): void {
  window.clearTimeout(autoHideTimer)
  currentStatus = undefined
  view.status.hidden = true
}

function renderStatus(view: ViewElements, message: StatusMessage): void {
  view.status.dataset.kind = message.kind
  view.status.setAttribute('role', message.kind === 'error' ? 'alert' : 'status')
  view.statusTitle.textContent = message.title
  view.statusDetail.textContent = message.detail ?? ''
  view.statusDetail.hidden = !message.detail
  view.statusClose.hidden = message.kind === 'progress'
  view.status.hidden = false
}

export function stageMessage(stage: AnalysisStage, fileName: string): StatusMessage {
  return { kind: 'progress', title: t().status[stage], detail: fileName }
}

export function errorMessage(failure: AnalysisFailure): StatusMessage {
  const texts = t().errors
  const lines = [texts[failure.code].message]
  if (failure.code === 'UNRECOGNIZED_STRUCTURE' && failure.detail) lines.push(texts.rootType(failure.detail))
  else if (failure.code === 'INVALID_COORDINATES' && failure.invalidCount) lines.push(texts.allInvalid(failure.invalidCount))
  else if (failure.detail) lines.push(failure.detail)
  return { kind: 'error', title: texts[failure.code].title, detail: lines.join('\n') }
}

export function renderingMessage(rendered: number, total: number): StatusMessage {
  const percent = total === 0 ? 100 : Math.round((rendered / total) * 100)
  return {
    kind: 'progress',
    title: t().status.found(formatPositions(total), total),
    detail: t().status.rendering(percent),
  }
}

export function successMessage(outcome: AnalysisSuccess): StatusMessage {
  const texts = t().status
  const validCount = outcome.points.length
  const { invalidCount } = outcome
  const formats = t().formats as Record<string, string>
  const lines = [
    texts.format(formats[outcome.formatId] ?? t().formats.unknown),
    texts.valid(formatPositions(validCount), validCount),
  ]
  if (invalidCount > 0) {
    lines.push(texts.ignored(formatCount(invalidCount), invalidCount))
    const breakdown = describeInvalid(outcome.invalidByReason)
    if (breakdown) lines.push(breakdown)
  }
  return {
    kind: invalidCount > 0 ? 'warning' : 'success',
    title: texts.successTitle,
    detail: lines.join('\n'),
  }
}

function describeInvalid(invalid: InvalidCounts): string {
  const texts = t().status
  const parts: string[] = []
  const outOfRange = invalid['out-of-range']
  const notANumber = invalid['not-a-number']
  if (outOfRange > 0) parts.push(texts.outOfRange(formatCount(outOfRange), outOfRange))
  if (notANumber > 0) parts.push(texts.notANumber(formatCount(notANumber), notANumber))
  if (invalid.missing > 0) parts.push(texts.missing(formatCount(invalid.missing), invalid.missing))
  return parts.length > 0 ? `(${parts.join(', ')})` : ''
}
