import { describe, expect, it } from 'vitest'
import { captureSessionUrl } from './session-url'

const id = '123e4567-e89b-12d3-a456-426614174000'

describe('captureSessionUrl', () => {
  it('captures ChatGPT session URLs', () => {
    expect(captureSessionUrl('chatgpt', `https://chatgpt.com/c/${id}`)).toBe(`https://chatgpt.com/c/${id}`)
    expect(captureSessionUrl('chatgpt', `https://chatgpt.com/c/${id}?model=gpt-4o`)).toBe(`https://chatgpt.com/c/${id}`)
  })

  it('captures Grok session URLs', () => {
    expect(captureSessionUrl('grok', `https://grok.com/c/${id}`)).toBe(`https://grok.com/c/${id}`)
    expect(captureSessionUrl('grok', `https://grok.com/c/${id}/`)).toBe(`https://grok.com/c/${id}`)
  })

  it('rejects unrelated URLs', () => {
    expect(captureSessionUrl('grok', `https://grok.com/chat/${id}`)).toBeNull()
    expect(captureSessionUrl('grok', `https://grok.com/conversation/${id}`)).toBeNull()
    expect(captureSessionUrl('chatgpt', `https://example.com/c/${id}`)).toBeNull()
  })
})
