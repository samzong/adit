import { describe, expect, it } from 'vitest'
import { imageUrlFromDrop } from './image-drop'

describe('imageUrlFromDrop', () => {
  it('reads supported image URLs from drag payloads', () => {
    expect(urlFrom({ 'text/uri-list': '# comment\nhttps://example.com/image.png\n' })).toBe(
      'https://example.com/image.png'
    )
    expect(urlFrom({ 'text/html': '<figure><img src="https://example.com/image.webp"></figure>' })).toBe(
      'https://example.com/image.webp'
    )
    expect(urlFrom({ 'text/plain': 'https://example.com/image.jpg' })).toBe('https://example.com/image.jpg')
  })

  it('rejects protected or non-http drag payloads', () => {
    expect(urlFrom({ 'text/html': '<img src="blob:https://chatgpt.com/image">' })).toBeNull()
    expect(urlFrom({ 'text/plain': 'file:///tmp/image.png' })).toBeNull()
  })
})

function urlFrom(values: Record<string, string>): string | null {
  return imageUrlFromDrop({
    getData: (type) => values[type] ?? ''
  })
}
