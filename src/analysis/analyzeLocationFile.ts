import { FileReadError, parseJsonText, readFileText } from '../file/readFile'
import { isTraversableRoot, parseLocationHistory } from '../parser/parseLocationHistory'
import type {
  AnalysisErrorCode,
  AnalysisFailure,
  AnalysisOutcome,
  AnalysisStage,
} from '../types/location'

export type StageListener = (stage: AnalysisStage) => void

export async function analyzeLocationFile(
  file: File,
  onStage: StageListener = () => {},
): Promise<AnalysisOutcome> {
  const parsed = await readAndParse(file, onStage)
  if (!parsed.ok) return parsed

  onStage('extracting')
  await yieldToBrowser()
  return analyzeJsonData(parsed.data, file.name)
}

async function readAndParse(
  file: File,
  onStage: StageListener,
): Promise<{ ok: true; data: unknown } | AnalysisFailure> {
  onStage('reading')
  await yieldToBrowser()
  let text: string
  try {
    text = await readFileText(file)
  } catch (error) {
    if (error instanceof FileReadError) return failure(file.name, 'UNREADABLE_FILE', error.message)
    throw error
  }

  onStage('parsing')
  await yieldToBrowser()
  const parsed = parseJsonText(text)
  return parsed.ok ? parsed : failure(file.name, 'INVALID_JSON', parsed.detail)
}

export function analyzeJsonData(data: unknown, fileName: string): AnalysisOutcome {
  if (!isTraversableRoot(data)) {
    return failure(fileName, 'UNRECOGNIZED_STRUCTURE', describeType(data))
  }

  const extraction = parseLocationHistory(data)

  if (extraction.candidateCount === 0) {
    const emptyTimeline = extraction.recognizedFormatId === 'google-timeline-device'
    return failure(fileName, emptyTimeline ? 'EMPTY_TIMELINE' : 'NO_POSITIONS')
  }
  if (extraction.points.length === 0) {
    return { ...failure(fileName, 'INVALID_COORDINATES'), invalidCount: extraction.invalidCount }
  }

  return {
    ok: true,
    fileName,
    formatId: extraction.formatId,
    points: extraction.points,
    invalidCount: extraction.invalidCount,
    invalidByReason: extraction.invalidByReason,
  }
}

function failure(fileName: string, code: AnalysisErrorCode, detail?: string): AnalysisFailure {
  const result: AnalysisFailure = { ok: false, fileName, code }
  if (detail) result.detail = detail
  return result
}

function describeType(value: unknown): string {
  return value === null ? 'null' : typeof value
}

function yieldToBrowser(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 0))
}
