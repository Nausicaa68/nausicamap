import { intlLocale, t } from '../i18n/i18n'

const formatterCache = new Map<string, Intl.NumberFormat | Intl.DateTimeFormat>()

function numberFormat(maximumFractionDigits: number): Intl.NumberFormat {
  const key = `n|${intlLocale()}|${maximumFractionDigits}`
  let format = formatterCache.get(key)
  if (!format) {
    format = new Intl.NumberFormat(intlLocale(), { maximumFractionDigits })
    formatterCache.set(key, format)
  }
  return format as Intl.NumberFormat
}

function dateFormat(withTime: boolean, utc: boolean): Intl.DateTimeFormat {
  const key = `d|${intlLocale()}|${withTime}|${utc}`
  let format = formatterCache.get(key)
  if (!format) {
    format = new Intl.DateTimeFormat(intlLocale(), {
      dateStyle: 'medium',
      ...(withTime ? { timeStyle: 'short' } : {}),
      ...(utc ? { timeZone: 'UTC' } : {}),
    })
    formatterCache.set(key, format)
  }
  return format as Intl.DateTimeFormat
}

export function formatDateTime(date: Date, utcOffsetMinutes?: number): string {
  if (utcOffsetMinutes === undefined) return dateFormat(true, false).format(date)
  const shifted = new Date(date.getTime() + utcOffsetMinutes * 60_000)
  const text = dateFormat(true, true).format(shifted)
  const viewerOffset = -date.getTimezoneOffset()
  return utcOffsetMinutes === viewerOffset ? text : `${text} (${formatUtcOffset(utcOffsetMinutes)})`
}

export function formatDate(date: Date, utcOffsetMinutes?: number): string {
  if (utcOffsetMinutes === undefined) return dateFormat(false, false).format(date)
  return dateFormat(false, true).format(new Date(date.getTime() + utcOffsetMinutes * 60_000))
}

export function formatUtcOffset(minutes: number): string {
  const sign = minutes < 0 ? '−' : '+'
  const absolute = Math.abs(minutes)
  const hours = Math.floor(absolute / 60)
  const rest = absolute % 60
  return `UTC${sign}${hours}${rest ? `:${String(rest).padStart(2, '0')}` : ''}`
}

export function formatDuration(milliseconds: number): string {
  const units = t().units
  const totalMinutes = Math.round(milliseconds / 60_000)
  if (totalMinutes < 1) return units.lessThanMinute
  if (totalMinutes < 60) return units.minutes(totalMinutes)
  const totalHours = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60
  if (totalHours < 24) return units.hours(totalHours, minutes ? String(minutes).padStart(2, '0') : '')
  return units.days(Math.floor(totalHours / 24), totalHours % 24)
}

export function formatDistance(meters: number): string {
  return meters < 1000 ? `${numberFormat(0).format(meters)} m` : `${numberFormat(1).format(meters / 1000)} km`
}

export function formatKilometers(kilometers: number): string {
  return `${numberFormat(0).format(kilometers)} km`
}

export function formatSpeed(metersPerSecond: number): string {
  return `${numberFormat(1).format(metersPerSecond * 3.6)} km/h`
}

export function formatMeters(meters: number): string {
  return `${numberFormat(0).format(meters)} m`
}

export function formatPercent(probability: number): string {
  return t().units.percent(numberFormat(0).format(probability * 100))
}

export function formatCount(count: number): string {
  return numberFormat(0).format(count)
}

export function formatPositions(count: number): string {
  return t().summary.positions(formatCount(count), count)
}

export function durationBetween(start: Date | undefined, end: Date | undefined): number | undefined {
  if (!start || !end) return undefined
  const duration = end.getTime() - start.getTime()
  return duration >= 0 ? duration : undefined
}
