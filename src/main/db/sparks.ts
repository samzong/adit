import { randomUUID } from 'node:crypto'
import type { DatabaseConnection } from './connection'
import type { SparkRow, SparkListRequest, ProviderId } from '../../shared/types'

export interface UpsertCapturedSessionRequest {
  provider: ProviderId
  sessionUrl: string
  title?: string | null
  now?: number
}

export class SparkStore {
  constructor(private readonly database: DatabaseConnection) {}

  listSparks(request: SparkListRequest = {}): SparkRow[] {
    const archived = request.archived ? 1 : 0
    const query = request.query?.trim()

    if (query) {
      return this.database
        .prepare(
          `SELECT * FROM sparks
           WHERE archived = ? AND title LIKE ?
           ORDER BY updated_at DESC
           LIMIT 1000`
        )
        .all(archived, `%${query}%`) as SparkRow[]
    }

    return this.database
      .prepare(
        `SELECT * FROM sparks
         WHERE archived = ?
         ORDER BY updated_at DESC
         LIMIT 1000`
      )
      .all(archived) as SparkRow[]
  }

  getSpark(id: string): SparkRow | null {
    return (this.database.prepare('SELECT * FROM sparks WHERE id = ?').get(id) as SparkRow | undefined) ?? null
  }

  upsertCapturedSession(request: UpsertCapturedSessionRequest): SparkRow {
    const now = request.now ?? Date.now()
    const title = cleanTitle(request.title) ?? fallbackTitle(now)
    const existing = this.database
      .prepare('SELECT * FROM sparks WHERE provider = ? AND session_url = ?')
      .get(request.provider, request.sessionUrl) as SparkRow | undefined

    if (existing) {
      const nextTitle = existing.is_title_manual ? existing.title : title
      this.database
        .prepare(
          `UPDATE sparks
           SET title = ?, updated_at = ?, last_opened_at = ?, archived = 0
           WHERE id = ?`
        )
        .run(nextTitle, now, now, existing.id)

      return this.getSpark(existing.id) as SparkRow
    }

    const id = randomUUID()
    this.database
      .prepare(
        `INSERT INTO sparks
         (id, provider, session_url, title, is_title_manual, created_at, updated_at, last_opened_at, archived)
         VALUES (?, ?, ?, ?, 0, ?, ?, ?, 0)`
      )
      .run(id, request.provider, request.sessionUrl, title, now, now, now)

    return this.getSpark(id) as SparkRow
  }

  touchOpened(id: string, now = Date.now()): SparkRow {
    this.database
      .prepare(
        `UPDATE sparks
         SET updated_at = ?, last_opened_at = ?
         WHERE id = ?`
      )
      .run(now, now, id)

    const spark = this.getSpark(id)

    if (!spark) {
      throw new Error('Spark not found')
    }

    return spark
  }

  updateTitleFromProvider(id: string, title: string | null | undefined, now = Date.now()): SparkRow | null {
    const clean = cleanTitle(title)
    const spark = this.getSpark(id)

    if (!spark || !clean || spark.is_title_manual || spark.title === clean) {
      return spark
    }

    this.database
      .prepare(
        `UPDATE sparks
         SET title = ?, updated_at = ?
         WHERE id = ? AND is_title_manual = 0`
      )
      .run(clean, now, id)

    return this.getSpark(id)
  }

  renameSpark(id: string, title: string, now = Date.now()): SparkRow {
    const clean = cleanTitle(title)

    if (!clean) {
      throw new Error('Title is required')
    }

    this.database
      .prepare(
        `UPDATE sparks
         SET title = ?, is_title_manual = 1, updated_at = ?
         WHERE id = ?`
      )
      .run(clean, now, id)

    const spark = this.getSpark(id)

    if (!spark) {
      throw new Error('Spark not found')
    }

    return spark
  }

  setArchived(id: string, archived: boolean, now = Date.now()): SparkRow {
    this.database
      .prepare(
        `UPDATE sparks
         SET archived = ?, updated_at = ?
         WHERE id = ?`
      )
      .run(archived ? 1 : 0, now, id)

    const spark = this.getSpark(id)

    if (!spark) {
      throw new Error('Spark not found')
    }

    return spark
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
