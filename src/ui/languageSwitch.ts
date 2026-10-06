import { LOCALES, currentLocale, onLocaleChange, setLocale, t } from '../i18n/i18n'

const MAX_BUTTONS = 3

export function mountLanguageSwitches(): void {
  const containers = [...document.querySelectorAll<HTMLElement>('[data-language-switch]')]
  const render = (): void => {
    for (const container of containers) renderSwitch(container)
  }
  render()
  onLocaleChange(render)
}

function renderSwitch(container: HTMLElement): void {
  container.replaceChildren(LOCALES.length > MAX_BUTTONS ? languageSelect() : languageButtons())
}

function languageButtons(): HTMLElement {
  const group = document.createElement('div')
  group.className = 'language-switch'
  group.setAttribute('role', 'group')
  group.setAttribute('aria-label', t().language.label)
  for (const locale of LOCALES) {
    const button = document.createElement('button')
    button.type = 'button'
    button.className = 'language-switch__option'
    button.textContent = locale.shortName
    button.lang = locale.code
    button.title = locale.name
    button.setAttribute('aria-pressed', String(locale === currentLocale()))
    button.addEventListener('click', () => setLocale(locale.code))
    group.append(button)
  }
  return group
}

function languageSelect(): HTMLElement {
  const select = document.createElement('select')
  select.className = 'language-switch language-switch--select'
  select.setAttribute('aria-label', t().language.label)
  for (const locale of LOCALES) {
    const option = document.createElement('option')
    option.value = locale.code
    option.textContent = `${locale.shortName} · ${locale.name}`
    option.selected = locale === currentLocale()
    select.append(option)
  }
  select.addEventListener('change', () => setLocale(select.value))
  return select
}
