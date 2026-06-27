import type { LibraryImageInput } from '../../../../shared/types'

const IMAGE_EXTENSION_PATTERN = /\.(avif|gif|jpe?g|png|webp)$/i

export async function imageInputFromDrop(dataTransfer: DataTransfer): Promise<LibraryImageInput | null> {
  const file = Array.from(dataTransfer.files).find(isImageFile)

  if (file) {
    return {
      bytes: await file.arrayBuffer(),
      kind: 'bytes',
      mimeType: file.type || undefined,
      name: file.name || undefined
    }
  }

  const url = imageUrlFromDrop(dataTransfer)
  return url ? { kind: 'url', url } : null
}

export function hasImageDrop(dataTransfer: DataTransfer): boolean {
  return (
    Array.from(dataTransfer.files).some(isImageFile) ||
    Array.from(dataTransfer.items).some((item) => item.kind === 'file' && item.type.startsWith('image/')) ||
    Boolean(imageUrlFromDrop(dataTransfer))
  )
}

export function hasPossibleImageDrop(dataTransfer: DataTransfer): boolean {
  return (
    hasImageDrop(dataTransfer) ||
    Array.from(dataTransfer.types).some(
      (type) => type === 'text/html' || type === 'text/plain' || type === 'text/uri-list'
    )
  )
}

export function imageUrlFromDrop(dataTransfer: Pick<DataTransfer, 'getData'>): string | null {
  return (
    firstHttpUrl(dataTransfer.getData('text/uri-list')) ??
    firstImageUrlFromHtml(dataTransfer.getData('text/html')) ??
    firstHttpUrl(dataTransfer.getData('text/plain'))
  )
}

function isImageFile(file: File): boolean {
  return file.type.startsWith('image/') || IMAGE_EXTENSION_PATTERN.test(file.name)
}

function firstImageUrlFromHtml(html: string): string | null {
  if (!html.trim()) {
    return null
  }

  if (typeof DOMParser !== 'undefined') {
    const src = new DOMParser().parseFromString(html, 'text/html').querySelector('img')?.getAttribute('src')
    return src ? firstHttpUrl(src) : null
  }

  const match = html.match(/<img\b[^>]*\bsrc\s*=\s*(["'])(.*?)\1/i)
  return match ? firstHttpUrl(match[2]) : null
}

function firstHttpUrl(value: string): string | null {
  for (const line of value.split(/\r?\n/)) {
    const clean = line.trim()

    if (!clean || clean.startsWith('#')) {
      continue
    }

    try {
      const url = new URL(clean)
      if (url.protocol === 'http:' || url.protocol === 'https:') {
        return url.toString()
      }
    } catch {
      continue
    }
  }

  return null
}
