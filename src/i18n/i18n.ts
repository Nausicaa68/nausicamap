import { en, type Messages } from './locales/en'
import { fr } from './locales/fr'
import { ja } from './locales/ja'

export interface LocaleDefinition {
  code: string
  name: string
  shortName: string
  intl: string
  messages: Messages
}

export const LOCALES: readonly LocaleDefinition[] = [
  { code: 'en', name: 'English', shortName: 'EN', intl: 'en-GB', messages: en },
  { code: 'fr', name: 'Français', shortName: 'FR', intl: 'fr-FR', messages: fr },
  { code: 'ja', name: '日本語', shortName: 'JA', intl: 'ja-JP', messages: ja },
]

const DEFAULT_LOCALE = LOCALES[0] as LocaleDefinition
const STORAGE_KEY = 'nausicamap.locale'

let current: LocaleDefinition = findLocale(readStoredLocale()) ?? DEFAULT_LOCALE
const listeners = new Set<() => void>()

export function t(): Messages {
  return current.messages
}

export function currentLocale(): LocaleDefinition {
  return current
}

export function intlLocale(): string {
  return current.intl
}

export function setLocale(code: string): void {
  const next = findLocale(code)
  if (!next || next === current) return
  current = next
  storeLocale(next.code)
  for (const listener of listeners) listener()
}

export function onLocaleChange(listener: () => void): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function lookup(key: string, messages: Messages = current.messages): string | undefined {
  let value: unknown = messages
  for (const part of key.split('.')) {
    if (typeof value !== 'object' || value === null) return undefined
    value = (value as Record<string, unknown>)[part]
  }
  return typeof value === 'string' ? value : undefined
}

function findLocale(code: string | undefined): LocaleDefinition | undefined {
  return code ? LOCALES.find((locale) => locale.code === code) : undefined
}

function readStoredLocale(): string | undefined {
  try {
    return globalThis.localStorage?.getItem(STORAGE_KEY) ?? undefined
  } catch {
    return undefined
  }
}

function storeLocale(code: string): void {
  try {
    globalThis.localStorage?.setItem(STORAGE_KEY, code)
  } catch {
  }
}
