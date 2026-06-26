import log from 'electron-log/main'
import type {
  CreateMarkdownLibraryItemRequest,
  LibraryItemKind,
  LibraryListRequest,
  SparkListRequest
} from '../../shared/types'
import { isProviderId } from '../providers'

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const LIBRARY_KINDS = new Set<LibraryItemKind>([
  'markdown_doc',
  'image_asset',
  'file_asset',
  'code_asset',
  'web_capture'
])

export function sanitizeSparkListRequest(request: unknown): SparkListRequest {
  const input = recordFromUnknown(request)

  return {
    archived: Boolean(input.archived),
    query: typeof input.query === 'string' ? input.query : ''
  }
}

export function sanitizeLibraryListRequest(request: unknown): LibraryListRequest {
  const input = recordFromUnknown(request)
  const kind =
    typeof input.kind === 'string' && input.kind !== 'all' && LIBRARY_KINDS.has(input.kind as LibraryItemKind)
      ? (input.kind as LibraryItemKind)
      : 'all'

  return {
    archived: Boolean(input.archived),
    query: typeof input.query === 'string' ? input.query : '',
    kind
  }
}

export function sanitizeCreateMarkdownRequest(request: unknown): CreateMarkdownLibraryItemRequest {
  const input = recordFromUnknown(request)
  const source = recordFromUnknown(input.source)

  if (typeof source.sparkId === 'string' && source.sparkId !== '') {
    assertSparkId(source.sparkId)
  }

  if (typeof source.provider === 'string' && source.provider !== '' && !isProviderId(source.provider)) {
    throw new Error('Unsupported provider')
  }

  return {
    title: typeof input.title === 'string' ? input.title : undefined,
    markdown: typeof input.markdown === 'string' ? input.markdown : '',
    source:
      Object.keys(source).length > 0
        ? {
            sparkId: typeof source.sparkId === 'string' && source.sparkId !== '' ? source.sparkId : null,
            provider: isProviderId(source.provider) ? source.provider : null,
            url: typeof source.url === 'string' ? source.url : null,
            title: typeof source.title === 'string' ? source.title : null,
            capturedAt:
              typeof source.capturedAt === 'number' && Number.isFinite(source.capturedAt)
                ? source.capturedAt
                : undefined
          }
        : undefined
  }
}

export function assertString(value: unknown, message: string): asserts value is string {
  if (typeof value !== 'string' || value.trim() === '') {
    throw new Error(message)
  }
}

export function assertStringValue(value: unknown, message: string): asserts value is string {
  if (typeof value !== 'string') {
    throw new Error(message)
  }
}

export function assertSparkId(value: unknown): asserts value is string {
  if (typeof value !== 'string' || !UUID_PATTERN.test(value)) {
    log.warn('Rejected IPC request with malformed Spark id', value)
    throw new Error('Valid Spark id is required')
  }
}

export function assertItemId(value: unknown): asserts value is string {
  if (typeof value !== 'string' || !UUID_PATTERN.test(value)) {
    log.warn('Rejected IPC request with malformed Library item id', value)
    throw new Error('Valid Library item id is required')
  }
}

function recordFromUnknown(value: unknown): Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value) ? (value as Record<string, unknown>) : {}
}
