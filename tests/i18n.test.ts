import indexHtml from '../index.html?raw'
import { afterEach, describe, expect, it } from 'vitest'
import { parseAttributeList } from '../src/i18n/dom'
import { LOCALES, currentLocale, intlLocale, lookup, setLocale, t } from '../src/i18n/i18n'
import { describeMovementType } from '../src/i18n/labels'
import { buildSections } from '../src/map/popup'
import { formatDuration, formatPercent, formatPositions } from '../src/ui/format'
import { fr } from '../src/i18n/locales/fr'

function shape(value: unknown, prefix = ''): string[] {
  if (typeof value !== 'object' || value === null) return [`${prefix}:${typeof value}`]
  return Object.entries(value).flatMap(([key, child]) => shape(child, prefix ? `${prefix}.${key}` : key))
}

function htmlKeys(): string[] {
  const html = indexHtml.replace(/<!--[\s\S]*?-->/g, '')
  const keys = [...html.matchAll(/data-i18n(?:-html)?="([^"]+)"/g)].map((match) => match[1] ?? '')
  for (const match of html.matchAll(/data-i18n-attr="([^"]+)"/g)) {
    keys.push(...parseAttributeList(match[1] ?? '').map(([, key]) => key))
  }
  return keys
}

afterEach(() => setLocale('en'))

describe('dictionaries', () => {
  it('English is the default language, followed by French and Japanese', () => {
    expect(LOCALES.map((locale) => locale.code)).toEqual(['en', 'fr', 'ja'])
    expect(currentLocale().code).toBe('en')
  })

  it('every language has exactly the same keys as English', () => {
    const reference = shape(LOCALES[0]?.messages).sort()
    for (const locale of LOCALES) expect(shape(locale.messages).sort(), locale.code).toEqual(reference)
  })

  it('every key used in index.html exists in every language', () => {
    const keys = htmlKeys()
    expect(keys.length).toBeGreaterThan(40)
    for (const locale of LOCALES) {
      for (const key of keys) expect(lookup(key, locale.messages), `${locale.code} › ${key}`).toBeTypeOf('string')
    }
  })
})

describe('language switching', () => {
  it('switches texts, numbers and translated codes', () => {
    expect(t().panel.title).toBe('Display')
    expect(describeMovementType('IN_TRAIN')).toBe('By train')
    expect(formatDuration(52 * 3_600_000)).toBe('2 d 4 h')
    expect(formatPercent(0.92)).toBe('92%')
    expect(formatPositions(1)).toBe('1 position')

    setLocale('fr')
    expect(intlLocale()).toBe('fr-FR')
    expect(t()).toBe(fr)
    expect(t().panel.title).toBe(fr.panel.title)
    expect(describeMovementType('IN_TRAIN')).toBe(fr.codes.movement.IN_TRAIN)
    expect(formatDuration(52 * 3_600_000)).toBe(fr.units.days(2, 4))
    expect(formatPercent(0.92)).toBe(fr.units.percent('92'))
  })

  it('translates popup content', () => {
    const point = { latitude: 1, longitude: 2, kind: 'visit' as const, visit: { semanticType: 'HOME' } }
    const text = () => buildSections(point).flatMap((section) => [section.title ?? '', ...section.rows.flat()]).join(' | ')
    expect(text()).toContain('Home')
    setLocale('fr')
    expect(text()).toContain(fr.codes.place.HOME)
    setLocale('ja')
    expect(text()).toContain('自宅')
  })

  it('switches to Japanese: texts, durations and dates', () => {
    setLocale('ja')
    expect(intlLocale()).toBe('ja-JP')
    expect(t().panel.title).toBe('表示')
    expect(describeMovementType('IN_TRAIN')).toBe('電車')
    expect(formatDuration(185 * 60_000)).toBe('3 時間 5 分')
    expect(formatDuration(52 * 3_600_000)).toBe('2 日 4 時間')
    expect(formatPositions(105)).toBe('105 件の位置')
  })

  it('ignores an unknown language', () => {
    setLocale('xx')
    expect(currentLocale().code).toBe('en')
  })
})
