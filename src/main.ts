import './style.css'
import demoTimeline from '../examples/demo-timeline.json?raw'
import { analyzeLocationFile } from './analysis/analyzeLocationFile'
import { ViewController } from './app/viewController'
import { translateDocument } from './i18n/dom'
import { onLocaleChange, t } from './i18n/i18n'
import { LocationMap } from './map/map'
import { PhotoCaptureError } from './photo/capture'
import { publicSiteUrl } from './photo/save'
import { toDateInputValue } from './timeline/period'
import { mountLanguageSwitches } from './ui/languageSwitch'
import { PhotoDialog } from './ui/photoDialog'
import {
  errorMessage,
  getViewElements,
  hideStatus,
  refreshStatus,
  renderSummaryCount,
  renderingMessage,
  showLanding,
  showMapView,
  showStatus,
  stageMessage,
  successMessage,
} from './ui/view'

const SITE_NAME = 'NausicaMap'

const photoIcon = new Image()
photoIcon.src = `${import.meta.env.BASE_URL}favicon.svg`

const view = getViewElements()
const photoDialog = new PhotoDialog()
let viewController: ViewController | null = null
let currentRun = 0
let summary = { visible: 0, total: 0 }

async function handleFile(file: File): Promise<void> {
  const run = ++currentRun
  const isCurrent = (): boolean => run === currentRun

  const outcome = await analyzeLocationFile(file, (stage) => {
    if (isCurrent()) showStatus(view, () => stageMessage(stage, file.name))
  })
  if (!isCurrent()) return

  if (!outcome.ok) {
    showStatus(view, () => errorMessage(outcome))
    return
  }

  showMapView(view, outcome.fileName)
  const controller = getOrCreateController()
  controller.onShown()

  const completed = await controller.load(outcome.points, (rendered, total) => {
    if (isCurrent()) showStatus(view, () => renderingMessage(rendered, total))
  })
  if (!completed || !isCurrent()) return

  const success = (): ReturnType<typeof successMessage> => successMessage(outcome)
  showStatus(view, success, success().kind === 'success' ? 5_000 : undefined)
}

function getOrCreateController(): ViewController {
  viewController ??= new ViewController(new LocationMap(view.map), (visible, total) => {
    summary = { visible, total }
    renderSummaryCount(view, visible, total)
  })
  return viewController
}

function goHome(): void {
  viewController?.pause()
  hideStatus(view)
  showLanding(view, viewController?.hasData ?? false)
}

function backToMap(): void {
  if (!viewController?.hasData) return
  view.landing.hidden = true
  view.topbar.hidden = false
  view.mapView.hidden = false
  viewController.onShown()
}

async function takePhoto(): Promise<void> {
  if (!viewController) return
  const siteUrl = publicSiteUrl(window.location)
  view.photoButton.disabled = true
  showStatus(view, () => ({ kind: 'progress', title: t().status.photoPreparing, detail: t().status.photoPreparingDetail }))
  try {
    const icon = photoIcon.complete && photoIcon.naturalWidth > 0 ? photoIcon : undefined
    const blob = await viewController.capturePhoto(SITE_NAME, siteUrl, icon)
    hideStatus(view)
    const fileName = `nausicamap-${toDateInputValue(Date.now())}.png`
    photoDialog.open(blob, fileName)
  } catch (error) {
    showStatus(view, () => ({ kind: 'error', title: t().status.photoFailed, detail: photoErrorDetail(error) }))
  } finally {
    view.photoButton.disabled = false
  }
}

function photoErrorDetail(error: unknown): string {
  if (error instanceof PhotoCaptureError) {
    return error.reason === 'tainted' ? t().status.photoTainted : t().status.photoEncoding
  }
  return error instanceof Error ? error.message : String(error)
}

function applyLocale(): void {
  translateDocument()
  refreshStatus(view)
  if (viewController) {
    viewController.refreshLocale()
    renderSummaryCount(view, summary.visible, summary.total)
  }
}

function openFilePicker(): void {
  view.fileInput.click()
}

function handleUnexpectedError(error: unknown): void {
  console.error('Unexpected error while processing the file:', error)
  showStatus(view, () => ({
    kind: 'error',
    title: t().status.unexpected,
    detail: error instanceof Error ? error.message : String(error),
  }))
}

function processFile(file: File | undefined): void {
  if (!file) return
  handleFile(file).catch(handleUnexpectedError)
}

translateDocument()
mountLanguageSwitches()
onLocaleChange(applyLocale)

view.homeButton.addEventListener('click', goHome)
view.backToMapButton.addEventListener('click', backToMap)

view.chooseFileButton.addEventListener('click', openFilePicker)
view.demoButton.addEventListener('click', () => {
  processFile(new File([demoTimeline], t().landing.demoFileName, { type: 'application/json' }))
})
view.changeFileButton.addEventListener('click', openFilePicker)
view.statusClose.addEventListener('click', () => hideStatus(view))
view.photoButton.addEventListener('click', () => void takePhoto())

view.fileInput.addEventListener('change', () => {
  processFile(view.fileInput.files?.[0])
  view.fileInput.value = ''
})

let dragDepth = 0

window.addEventListener('dragenter', (event) => {
  if (!hasFiles(event)) return
  event.preventDefault()
  dragDepth++
  document.body.classList.add('is-dragging')
})

window.addEventListener('dragleave', (event) => {
  if (!hasFiles(event)) return
  dragDepth = Math.max(0, dragDepth - 1)
  if (dragDepth === 0) document.body.classList.remove('is-dragging')
})

window.addEventListener('dragover', (event) => {
  if (hasFiles(event)) event.preventDefault()
})

window.addEventListener('drop', (event) => {
  if (!hasFiles(event)) return
  event.preventDefault()
  dragDepth = 0
  document.body.classList.remove('is-dragging')
  processFile(event.dataTransfer?.files[0])
})

function hasFiles(event: DragEvent): boolean {
  return event.dataTransfer?.types.includes('Files') ?? false
}
