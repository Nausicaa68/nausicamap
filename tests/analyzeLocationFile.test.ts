import { describe, expect, it } from 'vitest'
import { analyzeLocationFile } from '../src/analysis/analyzeLocationFile'
import type { AnalysisStage } from '../src/types/location'

function jsonFile(content: string, name = 'history.json'): File {
  return new File([content], name, { type: 'application/json' })
}

describe('analyzeLocationFile', () => {
  it('succeeds and counts skipped entries', async () => {
    const stages: AnalysisStage[] = []
    const outcome = await analyzeLocationFile(
      jsonFile(JSON.stringify([{ lat: 35.1, lng: 136.9 }, { lat: 35.2, lng: 137 }, { lat: 200, lng: 0 }])),
      (stage) => stages.push(stage),
    )
    expect(outcome.ok).toBe(true)
    if (!outcome.ok) return
    expect(outcome.points).toHaveLength(2)
    expect(outcome.invalidCount).toBe(1)
    expect(stages).toEqual(['reading', 'parsing', 'extracting'])
  })

  it('accepts a file starting with a UTF-8 BOM', async () => {
    const outcome = await analyzeLocationFile(jsonFile('﻿[{"lat":1,"lng":2}]'))
    expect(outcome.ok).toBe(true)
  })

  it.each([
    ['{ "lat": 35.1, ', 'INVALID_JSON'],
    ['42', 'UNRECOGNIZED_STRUCTURE'],
    ['"text"', 'UNRECOGNIZED_STRUCTURE'],
    ['null', 'UNRECOGNIZED_STRUCTURE'],
    ['[]', 'NO_POSITIONS'],
    ['{ "name": "no position" }', 'NO_POSITIONS'],
    ['{ "rawSignals": [], "userLocationProfile": {} }', 'EMPTY_TIMELINE'],
    ['{ "semanticSegments": [], "rawSignals": [] }', 'EMPTY_TIMELINE'],
    ['{ "userLocationProfile": { "frequentPlaces": [] } }', 'EMPTY_TIMELINE'],
    ['[{ "lat": 95, "lng": 0 }, { "lat": 0, "lng": 500 }]', 'INVALID_COORDINATES'],
  ])('classifies %s as %s', async (content, expectedCode) => {
    const outcome = await analyzeLocationFile(jsonFile(content))
    expect(outcome.ok).toBe(false)
    if (outcome.ok) return
    expect(outcome.code).toBe(expectedCode)
  })

  it('reports an unreadable file', async () => {
    const unreadable = jsonFile('[]')
    Object.defineProperty(unreadable, 'text', {
      value: () => Promise.reject(new Error('NotReadableError')),
    })
    const outcome = await analyzeLocationFile(unreadable)
    expect(outcome.ok).toBe(false)
    if (outcome.ok) return
    expect(outcome.code).toBe('UNREADABLE_FILE')
  })
})
