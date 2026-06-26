import { randomUUID } from 'node:crypto'
import type { DatabaseConnection } from './connection'
import type {
  CreateMarkdownLibraryItemRequest,
  LibraryItemContentRow,
  LibraryItemDetail,
  LibraryItemRow,
  LibraryItemSourceRow,
  LibraryListRequest
} from '../../shared/types'

export class LibraryStore {
  constructor(private readonly database: DatabaseConnection) {}

  listItems(request: LibraryListRequest = {}): LibraryItemRow[] {
    const archived = request.archived ? 1 : 0
    const query = request.query?.trim()
    const kind = request.kind && request.kind !== 'all' ? request.kind : null
    const conditions = ['archived = ?']
    const values: unknown[] = [archived]

    if (kind) {
      conditions.push('kind = ?')
      values.push(kind)
    }

    if (query) {
      conditions.push('(title LIKE ? OR preview_text LIKE ?)')
      values.push(`%${query}%`, `%${query}%`)
    }

    return this.database
      .prepare(
        `SELECT * FROM library_items
         WHERE ${conditions.join(' AND ')}
         ORDER BY pinned DESC, updated_at DESC
         LIMIT 1000`
      )
      .all(...values) as LibraryItemRow[]
  }

  getItem(id: string): LibraryItemDetail | null {
    const item = this.database.prepare('SELECT * FROM library_items WHERE id = ?').get(id) as LibraryItemRow | undefined

    if (!item) {
      return null
    }

    return {
      item,
      contents: this.listContents(id),
      attachments: this.database
        .prepare('SELECT * FROM library_attachments WHERE item_id = ? ORDER BY created_at ASC')
        .all(id) as LibraryItemDetail['attachments'],
      sources: this.database
        .prepare('SELECT * FROM library_item_sources WHERE item_id = ? ORDER BY captured_at DESC')
        .all(id) as LibraryItemSourceRow[]
    }
  }

  createMarkdownItem(request: CreateMarkdownLibraryItemRequest = {}, now = Date.now()): LibraryItemDetail {
    const create = this.database.transaction(() => {
      const itemId = randomUUID()
      const contentId = randomUUID()
      const markdown = request.markdown ?? ''
      const title = cleanLibraryTitle(request.title) ?? titleFromMarkdown(markdown) ?? fallbackLibraryTitle(now)
      const preview = previewFromMarkdown(markdown)

      this.database
        .prepare(
          `INSERT INTO library_items
           (id, kind, title, preview_text, archived, pinned, created_at, updated_at, last_opened_at)
           VALUES (?, 'markdown_doc', ?, ?, 0, 0, ?, ?, ?)`
        )
        .run(itemId, title, preview, now, now, now)

      this.database
        .prepare(
          `INSERT INTO library_item_contents
           (id, item_id, role, format, body_text, attachment_id, language, sort_order, metadata_json, created_at, updated_at)
           VALUES (?, ?, 'primary', 'markdown', ?, NULL, NULL, 0, NULL, ?, ?)`
        )
        .run(contentId, itemId, markdown, now, now)

      if (request.source) {
        this.database
          .prepare(
            `INSERT INTO library_item_sources
             (id, item_id, spark_id, provider, source_url, source_title, captured_at, metadata_json)
             VALUES (?, ?, ?, ?, ?, ?, ?, NULL)`
          )
          .run(
            randomUUID(),
            itemId,
            request.source.sparkId ?? null,
            request.source.provider ?? null,
            request.source.url ?? null,
            request.source.title ?? null,
            request.source.capturedAt ?? now
          )
      }

      return this.requireItem(itemId)
    })

    return create()
  }

  updateTitle(id: string, title: string, now = Date.now()): LibraryItemDetail {
    const clean = cleanLibraryTitle(title)

    if (!clean) {
      throw new Error('Title is required')
    }

    this.database
      .prepare(
        `UPDATE library_items
         SET title = ?, updated_at = ?
         WHERE id = ?`
      )
      .run(clean, now, id)

    return this.requireItem(id)
  }

  updateContent(id: string, bodyText: string, contentId?: string, now = Date.now()): LibraryItemDetail {
    const update = this.database.transaction(() => {
      const content = contentId ? this.getContentForItem(id, contentId) : this.getPrimaryMarkdownContent(id)

      if (!content) {
        throw new Error('Library item content not found')
      }

      const preview = previewFromMarkdown(bodyText)
      this.database
        .prepare(
          `UPDATE library_item_contents
           SET body_text = ?, updated_at = ?
           WHERE id = ? AND item_id = ?`
        )
        .run(bodyText, now, content.id, id)

      this.database
        .prepare(
          `UPDATE library_items
           SET preview_text = ?, updated_at = ?
           WHERE id = ?`
        )
        .run(preview, now, id)

      return this.requireItem(id)
    })

    return update()
  }

  touchOpened(id: string, now = Date.now()): LibraryItemDetail {
    this.database
      .prepare(
        `UPDATE library_items
         SET last_opened_at = ?
         WHERE id = ?`
      )
      .run(now, id)

    return this.requireItem(id)
  }

  setArchived(id: string, archived: boolean, now = Date.now()): LibraryItemDetail {
    this.database
      .prepare(
        `UPDATE library_items
         SET archived = ?, updated_at = ?
         WHERE id = ?`
      )
      .run(archived ? 1 : 0, now, id)

    return this.requireItem(id)
  }

  private requireItem(id: string): LibraryItemDetail {
    const detail = this.getItem(id)

    if (!detail) {
      throw new Error('Library item not found')
    }

    return detail
  }

  private listContents(itemId: string): LibraryItemContentRow[] {
    return this.database
      .prepare('SELECT * FROM library_item_contents WHERE item_id = ? ORDER BY sort_order ASC, created_at ASC')
      .all(itemId) as LibraryItemContentRow[]
  }

  private getPrimaryMarkdownContent(itemId: string): LibraryItemContentRow | null {
    return (
      (this.database
        .prepare(
          `SELECT * FROM library_item_contents
           WHERE item_id = ? AND role = 'primary' AND format = 'markdown'
           ORDER BY sort_order ASC
           LIMIT 1`
        )
        .get(itemId) as LibraryItemContentRow | undefined) ?? null
    )
  }

  private getContentForItem(itemId: string, contentId: string): LibraryItemContentRow | null {
    return (
      (this.database
        .prepare('SELECT * FROM library_item_contents WHERE item_id = ? AND id = ?')
        .get(itemId, contentId) as LibraryItemContentRow | undefined) ?? null
    )
  }
}

export function cleanLibraryTitle(title: string | null | undefined): string | null {
  const clean = title?.replace(/\s+/g, ' ').trim()
  return clean ? clean.slice(0, 240) : null
}

function titleFromMarkdown(markdown: string): string | null {
  const firstLine = markdown
    .split(/\r?\n/)
    .map((line) => line.replace(/^#+\s*/, '').trim())
    .find(Boolean)
  return cleanLibraryTitle(firstLine)
}

function previewFromMarkdown(markdown: string): string | null {
  const preview = markdown
    .split(/\r?\n/)
    .map((line) => line.replace(/^#+\s*/, '').trim())
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim()
  return preview ? preview.slice(0, 320) : null
}

function fallbackLibraryTitle(now: number): string {
  const date = new Date(now)
  const yyyy = date.getFullYear()
  const mm = String(date.getMonth() + 1).padStart(2, '0')
  const dd = String(date.getDate()).padStart(2, '0')
  const hh = String(date.getHours()).padStart(2, '0')
  const min = String(date.getMinutes()).padStart(2, '0')
  return `Untitled note · ${yyyy}-${mm}-${dd} ${hh}:${min}`
}
