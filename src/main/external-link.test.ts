import { describe, expect, it } from 'vitest'
import { isPreviewableExternalUrl } from './external-link'

describe('isPreviewableExternalUrl', () => {
  it('only allows http and https urls', () => {
    expect(isPreviewableExternalUrl('https://example.com')).toBe(true)
    expect(isPreviewableExternalUrl('http://example.com')).toBe(true)
    expect(isPreviewableExternalUrl('mailto:test@example.com')).toBe(false)
    expect(isPreviewableExternalUrl('javascript:alert(1)')).toBe(false)
    expect(isPreviewableExternalUrl('not a url')).toBe(false)
  })
})
