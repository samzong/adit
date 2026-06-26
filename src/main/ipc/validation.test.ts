import { describe, expect, it } from 'vitest'
import { sanitizeCreateMarkdownRequest, sanitizeLibraryListRequest, sanitizeSparkListRequest } from './validation'

describe('IPC validation', () => {
  it('sanitizes malformed list requests without throwing TypeError', () => {
    expect(sanitizeSparkListRequest(null)).toEqual({ archived: false, query: '' })
    expect(sanitizeLibraryListRequest('bad')).toEqual({ archived: false, kind: 'all', query: '' })
  })

  it('keeps only supported Library list filters', () => {
    expect(sanitizeLibraryListRequest({ archived: true, kind: 'image_asset', query: 'diagram' })).toEqual({
      archived: true,
      kind: 'image_asset',
      query: 'diagram'
    })
    expect(sanitizeLibraryListRequest({ kind: 'future_kind' })).toEqual({ archived: false, kind: 'all', query: '' })
  })

  it('sanitizes malformed markdown creation source fields', () => {
    expect(
      sanitizeCreateMarkdownRequest({
        title: 123,
        markdown: '# Kept',
        source: { provider: 42, url: 42, capturedAt: Number.NaN }
      })
    ).toEqual({
      markdown: '# Kept',
      source: {
        capturedAt: undefined,
        provider: null,
        sparkId: null,
        title: null,
        url: null
      },
      title: undefined
    })
  })

  it('rejects unsupported provider strings', () => {
    expect(() => sanitizeCreateMarkdownRequest({ source: { provider: 'unknown' } })).toThrow('Unsupported provider')
  })
})
