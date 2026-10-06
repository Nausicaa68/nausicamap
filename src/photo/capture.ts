export interface PhotoCaption {
  title: string
  subtitle?: string
  details?: readonly string[]
  attribution: string
  icon?: CanvasImageSource
}

const MAX_SCALE = 2
const MAP_BACKGROUND = '#dfe3e8'
const FONT_FAMILY = "system-ui, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif"

export class PhotoCaptureError extends Error {
  constructor(
    message: string,
    readonly reason: 'tainted' | 'encoding',
  ) {
    super(message)
    this.name = 'PhotoCaptureError'
  }
}

export async function captureMap(container: HTMLElement, caption: PhotoCaption): Promise<Blob> {
  const bounds = container.getBoundingClientRect()
  const width = Math.round(bounds.width)
  const height = Math.round(bounds.height)
  const scale = Math.min(window.devicePixelRatio || 1, MAX_SCALE)

  const canvas = document.createElement('canvas')
  canvas.width = Math.round(width * scale)
  canvas.height = Math.round(height * scale)
  const context = canvas.getContext('2d')
  if (!context) throw new PhotoCaptureError('Canvas is not available in this browser.', 'encoding')
  context.scale(scale, scale)

  context.fillStyle = MAP_BACKGROUND
  context.fillRect(0, 0, width, height)
  drawTiles(context, container, bounds)
  drawLayerCanvases(context, container, bounds)
  drawCaption(context, width, height, caption)

  return toPngBlob(canvas)
}

function drawTiles(context: CanvasRenderingContext2D, container: HTMLElement, bounds: DOMRect): void {
  for (const tile of container.querySelectorAll<HTMLImageElement>('.leaflet-tile-pane img.leaflet-tile')) {
    if (!tile.complete || tile.naturalWidth === 0) continue
    const style = getComputedStyle(tile)
    if (style.visibility === 'hidden' || style.display === 'none') continue
    const rect = tile.getBoundingClientRect()
    context.globalAlpha = Number.parseFloat(style.opacity) || 1
    context.drawImage(tile, rect.left - bounds.left, rect.top - bounds.top, rect.width, rect.height)
  }
  context.globalAlpha = 1
}

function drawLayerCanvases(context: CanvasRenderingContext2D, container: HTMLElement, bounds: DOMRect): void {
  const canvases = [...container.querySelectorAll<HTMLCanvasElement>('.leaflet-map-pane canvas')]
    .filter((layer) => getComputedStyle(layer).visibility !== 'hidden' && layer.width > 0)
    .sort((a, b) => paneZIndex(a) - paneZIndex(b))
  for (const layer of canvases) {
    const rect = layer.getBoundingClientRect()
    context.drawImage(layer, rect.left - bounds.left, rect.top - bounds.top, rect.width, rect.height)
  }
}

function paneZIndex(element: HTMLElement): number {
  const pane = element.closest<HTMLElement>('.leaflet-pane:not(.leaflet-map-pane)')
  return pane ? Number.parseInt(getComputedStyle(pane).zIndex, 10) || 0 : 0
}

function drawCaption(context: CanvasRenderingContext2D, width: number, height: number, caption: PhotoCaption): void {
  const margin = 14
  const padding = 12
  const line = (text: string, weight: number, size: number, color: string, height: number) => ({
    text,
    font: `${weight} ${size}px ${FONT_FAMILY}`,
    size,
    color,
    height,
  })
  const lines = [line(caption.title, 700, 18, '#111827', 24)]
  if (caption.subtitle) lines.push(line(caption.subtitle, 500, 13, '#374151', 19))
  for (const detail of caption.details ?? []) lines.push(line(detail, 400, 12, '#6b7280', 17))

  const iconSpace = 26
  const maxTextWidth = Math.max(width - 2 * margin - 2 * padding - iconSpace, 80)
  let textWidth = 0
  for (const entry of lines) {
    context.font = entry.font
    entry.text = fitText(context, entry.text, maxTextWidth)
    textWidth = Math.max(textWidth, context.measureText(entry.text).width)
  }
  const boxWidth = textWidth + iconSpace + 2 * padding
  const boxHeight = lines.reduce((sum, entry) => sum + entry.height, 0) + 2 * padding - 4
  const boxX = margin
  const boxY = height - margin - boxHeight - 18

  context.save()
  context.shadowColor = 'rgba(15, 23, 42, 0.25)'
  context.shadowBlur = 12
  context.shadowOffsetY = 2
  context.fillStyle = 'rgba(255, 255, 255, 0.94)'
  roundedRect(context, boxX, boxY, boxWidth, boxHeight, 10)
  context.fill()
  context.restore()

  if (caption.icon) context.drawImage(caption.icon, boxX + padding - 3, boxY + padding - 2, 22, 22)
  else drawPinIcon(context, boxX + padding + 8, boxY + padding + 11)

  let y = boxY + padding
  context.textBaseline = 'top'
  for (const entry of lines) {
    context.font = entry.font
    context.fillStyle = entry.color
    context.fillText(entry.text, boxX + padding + iconSpace, y + (entry.height - entry.size) / 2)
    y += entry.height
  }

  context.font = `400 11px ${FONT_FAMILY}`
  const attribution = fitText(context, caption.attribution, width - 2 * margin)
  const attributionWidth = context.measureText(attribution).width + 12
  context.fillStyle = 'rgba(255, 255, 255, 0.85)'
  context.fillRect(width - attributionWidth, height - 18, attributionWidth, 18)
  context.fillStyle = '#374151'
  context.textBaseline = 'middle'
  context.fillText(attribution, width - attributionWidth + 6, height - 9)
}

function drawPinIcon(context: CanvasRenderingContext2D, x: number, y: number): void {
  context.save()
  context.fillStyle = '#1d4ed8'
  context.strokeStyle = '#ffffff'
  context.lineWidth = 2
  context.beginPath()
  context.arc(x, y - 3, 7, Math.PI, 0)
  context.lineTo(x, y + 9)
  context.closePath()
  context.fill()
  context.stroke()
  context.beginPath()
  context.arc(x, y - 3, 2.6, 0, Math.PI * 2)
  context.fillStyle = '#ffffff'
  context.fill()
  context.restore()
}

function fitText(context: CanvasRenderingContext2D, text: string, maxWidth: number): string {
  if (context.measureText(text).width <= maxWidth) return text
  let shortened = text
  while (shortened.length > 1 && context.measureText(`${shortened}…`).width > maxWidth) {
    shortened = shortened.slice(0, -1)
  }
  return `${shortened.trimEnd()}…`
}

function roundedRect(context: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number): void {
  context.beginPath()
  context.moveTo(x + r, y)
  context.arcTo(x + w, y, x + w, y + h, r)
  context.arcTo(x + w, y + h, x, y + h, r)
  context.arcTo(x, y + h, x, y, r)
  context.arcTo(x, y, x + w, y, r)
  context.closePath()
}

function toPngBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    try {
      canvas.toBlob((blob) => {
        if (blob) resolve(blob)
        else reject(new PhotoCaptureError('The browser could not encode the image.', 'encoding'))
      }, 'image/png')
    } catch (error) {
      const tainted = error instanceof DOMException && error.name === 'SecurityError'
      reject(
        tainted
          ? new PhotoCaptureError('The map background cannot be included in the image.', 'tainted')
          : error,
      )
    }
  })
}
