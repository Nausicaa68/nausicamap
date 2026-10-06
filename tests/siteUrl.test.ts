import { describe, expect, it } from 'vitest'
import { publicSiteUrl } from '../src/photo/save'

describe('public site address', () => {
  const location = (hostname: string, protocol = 'https:', pathname = '/nausicamap/') => ({
    protocol,
    hostname,
    host: hostname,
    pathname,
  })

  it('is known once the site is published', () => {
    expect(publicSiteUrl(location('user.github.io'))).toBe('https://user.github.io/nausicamap/')
  })

  it('is absent when running locally', () => {
    expect(publicSiteUrl(location('localhost', 'http:', '/'))).toBeUndefined()
    expect(publicSiteUrl(location('127.0.0.1', 'http:', '/'))).toBeUndefined()
    expect(publicSiteUrl(location('', 'file:', '/index.html'))).toBeUndefined()
  })
})
