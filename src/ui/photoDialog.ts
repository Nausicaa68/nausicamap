import { t } from '../i18n/i18n'
import { canCopyImage, copyImage, downloadBlob } from '../photo/save'

export class PhotoDialog {
  private readonly dialog = element('photo-dialog', HTMLDialogElement)
  private readonly preview = element('photo-preview', HTMLImageElement)
  private readonly downloadButton = element('photo-download', HTMLButtonElement)
  private readonly copyButton = element('photo-copy', HTMLButtonElement)
  private readonly status = element('photo-status', HTMLElement)
  private file: File | undefined
  private previewUrl: string | undefined

  constructor() {
    element('photo-close', HTMLButtonElement).addEventListener('click', () => this.dialog.close())
    this.dialog.addEventListener('close', () => this.release())
    this.dialog.addEventListener('click', (event) => {
      if (event.target === this.dialog) this.dialog.close()
    })
    this.downloadButton.addEventListener('click', () => this.download())
    this.copyButton.addEventListener('click', () => void this.copy())
  }

  open(blob: Blob, fileName: string): void {
    this.release()
    this.file = new File([blob], fileName, { type: blob.type })
    this.previewUrl = URL.createObjectURL(blob)
    this.preview.src = this.previewUrl
    this.setStatus('')

    this.copyButton.hidden = !canCopyImage()

    this.dialog.showModal()
  }

  private download(): void {
    if (!this.file) return
    downloadBlob(this.file, this.file.name)
    this.setStatus(t().photo.downloaded(this.file.name))
  }

  private async copy(): Promise<void> {
    if (!this.file) return
    try {
      await copyImage(this.file)
      this.setStatus(t().photo.copied)
    } catch {
      this.setStatus(t().photo.copyRefused, true)
    }
  }

  private setStatus(text: string, isError = false): void {
    this.status.textContent = text
    this.status.classList.toggle('photo-dialog__status--error', isError)
  }

  private release(): void {
    if (this.previewUrl) URL.revokeObjectURL(this.previewUrl)
    this.previewUrl = undefined
  }
}

function element<T extends HTMLElement>(id: string, type: new () => T): T {
  const found = document.getElementById(id)
  if (!(found instanceof type)) throw new Error(`Element #${id} not found in index.html.`)
  return found
}
