import { randomUUID } from 'node:crypto'
import type { DatabaseConnection } from './connection'
import type { NoteRow, NotesListRequest, ProviderId } from '../../shared/types'

export interface UpsertCapturedSessionRequest {
  provider: ProviderId
  sessionUrl: string
  title?: string | null
  now?: number
}

export class NoteStore {
  constructor(private readonly database: DatabaseConnection) {}

  listNotes(request: NotesListRequest = {}): NoteRow[] {
    const archived = request.archived ? 1 : 0
    const query = request.query?.trim()

    if (query) {
      return this.database
        .prepare(
          `SELECT * FROM notes
           WHERE archived = ? AND title LIKE ?
           ORDER BY updated_at DESC
           LIMIT 1000`
        )
        .all(archived, `%${query}%`) as NoteRow[]
    }

    return this.database
      .prepare(
        `SELECT * FROM notes
         WHERE archived = ?
         ORDER BY updated_at DESC
         LIMIT 1000`
      )
      .all(archived) as NoteRow[]
  }

  getNote(id: string): NoteRow | null {
    return (this.database.prepare('SELECT * FROM notes WHERE id = ?').get(id) as NoteRow | undefined) ?? null
  }

  upsertCapturedSession(request: UpsertCapturedSessionRequest): NoteRow {
    const now = request.now ?? Date.now()
    const title = cleanTitle(request.title) ?? fallbackTitle(now)
    const existing = this.database
      .prepare('SELECT * FROM notes WHERE provider = ? AND session_url = ?')
      .get(request.provider, request.sessionUrl) as NoteRow | undefined

    if (existing) {
      const nextTitle = existing.is_title_manual ? existing.title : title
      this.database
        .prepare(
          `UPDATE notes
           SET title = ?, updated_at = ?, last_opened_at = ?, archived = 0
           WHERE id = ?`
        )
        .run(nextTitle, now, now, existing.id)

      return this.getNote(existing.id) as NoteRow
    }

    const id = randomUUID()
    this.database
      .prepare(
        `INSERT INTO notes
         (id, provider, session_url, title, is_title_manual, created_at, updated_at, last_opened_at, archived)
         VALUES (?, ?, ?, ?, 0, ?, ?, ?, 0)`
      )
      .run(id, request.provider, request.sessionUrl, title, now, now, now)

    return this.getNote(id) as NoteRow
  }

  touchOpened(id: string, now = Date.now()): NoteRow {
    this.database
      .prepare(
        `UPDATE notes
         SET updated_at = ?, last_opened_at = ?
         WHERE id = ?`
      )
      .run(now, now, id)

    const note = this.getNote(id)

    if (!note) {
      throw new Error('Note not found')
    }

    return note
  }

  updateTitleFromProvider(id: string, title: string | null | undefined, now = Date.now()): NoteRow | null {
    const clean = cleanTitle(title)

    if (!clean) {
      return this.getNote(id)
    }

    this.database
      .prepare(
        `UPDATE notes
         SET title = ?, updated_at = ?
         WHERE id = ? AND is_title_manual = 0`
      )
      .run(clean, now, id)

    return this.getNote(id)
  }

  renameNote(id: string, title: string, now = Date.now()): NoteRow {
    const clean = cleanTitle(title)

    if (!clean) {
      throw new Error('Title is required')
    }

    this.database
      .prepare(
        `UPDATE notes
         SET title = ?, is_title_manual = 1, updated_at = ?
         WHERE id = ?`
      )
      .run(clean, now, id)

    const note = this.getNote(id)

    if (!note) {
      throw new Error('Note not found')
    }

    return note
  }

  setArchived(id: string, archived: boolean, now = Date.now()): NoteRow {
    this.database
      .prepare(
        `UPDATE notes
         SET archived = ?, updated_at = ?
         WHERE id = ?`
      )
      .run(archived ? 1 : 0, now, id)

    const note = this.getNote(id)

    if (!note) {
      throw new Error('Note not found')
    }

    return note
  }
}

export function cleanTitle(title: string | null | undefined): string | null {
  const clean = title?.replace(/\s+/g, ' ').trim()
  return clean ? clean.slice(0, 240) : null
}

export function fallbackTitle(now: number): string {
  const date = new Date(now)
  const yyyy = date.getFullYear()
  const mm = String(date.getMonth() + 1).padStart(2, '0')
  const dd = String(date.getDate()).padStart(2, '0')
  const hh = String(date.getHours()).padStart(2, '0')
  const min = String(date.getMinutes()).padStart(2, '0')
  return `Untitled · ${yyyy}-${mm}-${dd} ${hh}:${min}`
}
