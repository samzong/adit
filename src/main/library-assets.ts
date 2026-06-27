import { createHash, randomUUID } from 'node:crypto'
import { mkdir, writeFile } from 'node:fs/promises'
import { basename, dirname, extname, isAbsolute, join, relative, resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import { app, nativeImage, net, protocol } from 'electron'
import { LIBRARY_ASSET_SCHEME, libraryAttachmentUrl } from '../shared/library-assets'
import type { LibraryAttachmentRow } from '../shared/types'
import type { LibraryStore, StoredLibraryImage } from './db/library'

const MAX_IMAGE_BYTES = 25 * 1024 * 1024
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

interface ImageType {
  mimeType: string
  extension: string
}

export function registerLibraryAssetScheme(): void {
  protocol.registerSchemesAsPrivileged([
    {
      scheme: LIBRARY_ASSET_SCHEME,
      privileges: {
        secure: true,
        standard: true,
        stream: true,
        supportFetchAPI: true
      }
    }
  ])
}

export function registerLibraryAssetProtocol(library: Pick<LibraryStore, 'getAttachment'>): void {
  protocol.handle(LIBRARY_ASSET_SCHEME, async (request) => {
    const attachment = attachmentFromUrl(library, request.url)

    if (!attachment) {
      return new Response('Not found', { status: 404 })
    }

    try {
      const response = await net.fetch(pathToFileURL(resolveLibraryFilePath(attachment.file_path)).toString(), {
        bypassCustomProtocolHandlers: true
      })
      const headers = new Headers(response.headers)

      if (attachment.mime_type) {
        headers.set('content-type', attachment.mime_type)
      }

      return new Response(response.body, {
        headers,
        status: response.status,
        statusText: response.statusText
      })
    } catch {
      return new Response('Not found', { status: 404 })
    }
  })
}

export async function prepareLibraryImage(input: unknown): Promise<StoredLibraryImage> {
  const source = await readImageInput(input)
  const imageType = detectImageType(source.bytes)
  const attachmentId = randomUUID()
  const filePath = join('attachments', `${attachmentId}.${imageType.extension}`)
  const absolutePath = resolveLibraryFilePath(filePath)
  const image = nativeImage.createFromBuffer(source.bytes)
  const size = image.isEmpty() ? null : image.getSize()

  await mkdir(dirname(absolutePath), { recursive: true })
  await writeFile(absolutePath, source.bytes)

  return {
    attachmentId,
    byteSize: source.bytes.byteLength,
    filePath,
    height: size?.height ?? null,
    metadataJson: source.metadata ? JSON.stringify(source.metadata) : null,
    mimeType: imageType.mimeType,
    originalName: source.name,
    sha256: createHash('sha256').update(source.bytes).digest('hex'),
    title: titleFromSource(source.name),
    width: size?.width ?? null
  }
}

export function markdownForImageAttachment(attachment: LibraryAttachmentRow): string {
  return `![${markdownAltText(attachment.original_name)}](${libraryAttachmentUrl(attachment.id)})`
}

async function readImageInput(input: unknown): Promise<{
  bytes: Buffer
  metadata: Record<string, string> | null
  name: string | null
}> {
  if (!isRecord(input)) {
    throw new Error('Image payload is required')
  }

  if (input.kind === 'bytes') {
    if (!(input.bytes instanceof ArrayBuffer)) {
      throw new Error('Image bytes are required')
    }

    const bytes = Buffer.from(input.bytes)
    assertImageSize(bytes.byteLength)
    return {
      bytes,
      metadata: typeof input.mimeType === 'string' ? { sourceMimeType: input.mimeType } : null,
      name: typeof input.name === 'string' ? cleanFileName(input.name) : null
    }
  }

  if (input.kind !== 'url' || typeof input.url !== 'string') {
    throw new Error('Unsupported image payload')
  }

  const url = httpUrl(input.url)
  const response = await fetch(url)

  if (!response.ok) {
    throw new Error('Image could not be fetched')
  }

  const contentLength = response.headers.get('content-length')
  if (contentLength) {
    assertImageSize(Number(contentLength))
  }

  const bytes = await readResponseBytes(response)
  assertImageSize(bytes.byteLength)

  return {
    bytes,
    metadata: { sourceUrl: url },
    name: cleanFileName(basename(new URL(url).pathname))
  }
}

async function readResponseBytes(response: Response): Promise<Buffer> {
  const reader = response.body?.getReader() as ReadableStreamDefaultReader<Uint8Array> | undefined

  if (!reader) {
    return Buffer.from(await response.arrayBuffer())
  }

  const chunks: Buffer[] = []
  let byteSize = 0

  for (;;) {
    const { done, value } = await reader.read()

    if (done) {
      return Buffer.concat(chunks, byteSize)
    }

    byteSize += value.byteLength
    assertImageSize(byteSize)
    chunks.push(Buffer.from(value))
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function detectImageType(bytes: Buffer): ImageType {
  if (bytes.length >= 8 && bytes.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) {
    return { extension: 'png', mimeType: 'image/png' }
  }

  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return { extension: 'jpg', mimeType: 'image/jpeg' }
  }

  if (
    bytes.length >= 6 &&
    (bytes.subarray(0, 6).toString('ascii') === 'GIF87a' || bytes.subarray(0, 6).toString('ascii') === 'GIF89a')
  ) {
    return { extension: 'gif', mimeType: 'image/gif' }
  }

  if (
    bytes.length >= 12 &&
    bytes.subarray(0, 4).toString('ascii') === 'RIFF' &&
    bytes.subarray(8, 12).toString('ascii') === 'WEBP'
  ) {
    return { extension: 'webp', mimeType: 'image/webp' }
  }

  if (
    bytes.length >= 12 &&
    bytes.subarray(4, 8).toString('ascii') === 'ftyp' &&
    ['avif', 'avis'].includes(bytes.subarray(8, 12).toString('ascii'))
  ) {
    return { extension: 'avif', mimeType: 'image/avif' }
  }

  throw new Error('Unsupported image type')
}

function attachmentFromUrl(library: Pick<LibraryStore, 'getAttachment'>, value: string): LibraryAttachmentRow | null {
  try {
    const url = new URL(value)
    const id = decodeURIComponent(url.pathname.replace(/^\//, ''))

    if (url.protocol !== `${LIBRARY_ASSET_SCHEME}:` || url.hostname !== 'attachment' || !UUID_PATTERN.test(id)) {
      return null
    }

    return library.getAttachment(id)
  } catch {
    return null
  }
}

function resolveLibraryFilePath(filePath: string): string {
  const root = resolve(app.getPath('userData'), 'Library')
  const target = resolve(root, filePath)
  const fromRoot = relative(root, target)

  if (fromRoot.startsWith('..') || isAbsolute(fromRoot)) {
    throw new Error('Invalid Library file path')
  }

  return target
}

function httpUrl(value: string): string {
  let url: URL

  try {
    url = new URL(value)
  } catch {
    throw new Error('Image URL is invalid')
  }

  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new Error('Image URL must be HTTP or HTTPS')
  }

  return url.toString()
}

function assertImageSize(byteSize: number): void {
  if (!Number.isFinite(byteSize) || byteSize <= 0) {
    throw new Error('Image is empty')
  }

  if (byteSize > MAX_IMAGE_BYTES) {
    throw new Error('Image is too large')
  }
}

function cleanFileName(name: string | null | undefined): string | null {
  const clean = name ? basename(name).replace(/\s+/g, ' ').trim() : ''
  return clean && clean !== '.' ? clean.slice(0, 240) : null
}

function titleFromSource(name: string | null): string {
  const title = name ? name.slice(0, name.length - extname(name).length).replace(/[-_]+/g, ' ') : ''
  return title.replace(/\s+/g, ' ').trim() || 'Image'
}

function markdownAltText(name: string | null): string {
  return (titleFromSource(name) || 'Image').replace(/[[\]\n\r]/g, ' ').trim()
}
