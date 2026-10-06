import { currentLocale, lookup, t } from './i18n'

export function translateDocument(root: ParentNode = document): void {
  for (const element of root.querySelectorAll<HTMLElement>('[data-i18n]')) {
    const text = translated(element.dataset.i18n)
    if (text !== undefined) element.textContent = text
  }
  for (const element of root.querySelectorAll<HTMLElement>('[data-i18n-html]')) {
    const html = translated(element.dataset.i18nHtml)
    if (html !== undefined) element.innerHTML = html
  }
  for (const element of root.querySelectorAll<HTMLElement>('[data-i18n-attr]')) {
    for (const [attribute, key] of parseAttributeList(element.dataset.i18nAttr ?? '')) {
      const text = translated(key)
      if (text !== undefined) element.setAttribute(attribute, text)
    }
  }

  document.documentElement.lang = currentLocale().code
  document.title = t().meta.title
  document.querySelector('meta[name="description"]')?.setAttribute('content', t().meta.description)
}

export function parseAttributeList(value: string): [string, string][] {
  return value
    .split(';')
    .map((pair) => pair.split(':').map((part) => part.trim()))
    .filter((pair): pair is [string, string] => pair.length === 2 && Boolean(pair[0]) && Boolean(pair[1]))
}

function translated(key: string | undefined): string | undefined {
  if (!key) return undefined
  const text = lookup(key)
  if (text === undefined) console.warn(`Missing translation: ${key}`)
  return text
}
