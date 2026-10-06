export class FileReadError extends Error {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options)
    this.name = 'FileReadError'
  }
}

export type JsonParseResult =
  | { ok: true; data: unknown }
  | { ok: false; detail: string }

export async function readFileText(file: Blob): Promise<string> {
  try {
    return await file.text()
  } catch (error) {
    throw new FileReadError(describeError(error), { cause: error })
  }
}

export function parseJsonText(text: string): JsonParseResult {
  const source = text.charCodeAt(0) === 0xfeff ? text.slice(1) : text
  try {
    return { ok: true, data: JSON.parse(source) as unknown }
  } catch (error) {
    return { ok: false, detail: describeError(error) }
  }
}

function describeError(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}
