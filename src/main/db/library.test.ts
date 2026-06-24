import Database from 'better-sqlite3'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import schemaSql from './schema.sql?raw'
import { LibraryStore } from './library'

describe('LibraryStore', () => {
  let database: Database.Database
  let store: LibraryStore

  beforeEach(() => {
    database = new Database(':memory:')
    database.pragma('foreign_keys = ON')
    database.exec(schemaSql)
    store = new LibraryStore(database)
  })

  afterEach(() => {
    database?.close()
  })

  it('creates a markdown library item with primary content', () => {
    const item = store.createMarkdownItem(
      {
        markdown: '# Saved answer\n\nUseful output.',
        source: {
          sparkId: null,
          provider: 'grok',
          url: 'https://grok.com/c/example',
          title: 'Grok result',
          capturedAt: 10
        }
      },
      20
    )

    expect(item.item.kind).toBe('markdown_doc')
    expect(item.item.title).toBe('Saved answer')
    expect(item.item.preview_text).toBe('Saved answer Useful output.')
    expect(item.contents).toHaveLength(1)
    expect(item.contents[0]).toMatchObject({
      role: 'primary',
      format: 'markdown',
      body_text: '# Saved answer\n\nUseful output.'
    })
    expect(item.sources[0]).toMatchObject({
      provider: 'grok',
      source_url: 'https://grok.com/c/example',
      source_title: 'Grok result',
      captured_at: 10
    })
  })

  it('lists and filters active library items', () => {
    const first = store.createMarkdownItem({ title: 'Research note', markdown: 'Alpha' }, 10)
    const second = store.createMarkdownItem({ title: 'Draft', markdown: 'Beta' }, 20)
    store.setArchived(first.item.id, true, 30)

    expect(store.listItems().map((item) => item.id)).toEqual([second.item.id])
    expect(store.listItems({ archived: true }).map((item) => item.id)).toEqual([first.item.id])
    expect(store.listItems({ query: 'Beta' }).map((item) => item.id)).toEqual([second.item.id])
    expect(store.listItems({ kind: 'markdown_doc' }).map((item) => item.id)).toEqual([second.item.id])
  })

  it('updates title and markdown content', () => {
    const created = store.createMarkdownItem({ title: 'Draft', markdown: 'Old body' }, 10)
    const content = created.contents[0]

    const renamed = store.updateTitle(created.item.id, 'Final note', 20)
    expect(renamed.item.title).toBe('Final note')
    expect(renamed.item.updated_at).toBe(20)

    const updated = store.updateContent(created.item.id, 'New body', content.id, 30)
    expect(updated.contents[0].body_text).toBe('New body')
    expect(updated.item.preview_text).toBe('New body')
    expect(updated.item.updated_at).toBe(30)

    const cleared = store.updateContent(created.item.id, '', content.id, 40)
    expect(cleared.contents[0].body_text).toBe('')
    expect(cleared.item.preview_text).toBeNull()
    expect(cleared.item.updated_at).toBe(40)
  })

  it('rolls back markdown content when item metadata update fails', () => {
    const created = store.createMarkdownItem({ title: 'Draft', markdown: 'Old body' }, 10)
    const content = created.contents[0]

    database.exec(`
      CREATE TRIGGER fail_library_item_preview_update
      BEFORE UPDATE OF preview_text ON library_items
      BEGIN
        SELECT RAISE(ABORT, 'preview update failed');
      END;
    `)

    expect(() => store.updateContent(created.item.id, 'New body', content.id, 20)).toThrow('preview update failed')

    const detail = store.getItem(created.item.id)
    expect(detail?.contents[0].body_text).toBe('Old body')
    expect(detail?.item.preview_text).toBe('Old body')
    expect(detail?.item.updated_at).toBe(10)
  })

  it('touches and archives existing items', () => {
    const created = store.createMarkdownItem({ title: 'Draft' }, 10)

    const opened = store.touchOpened(created.item.id, 20)
    expect(opened.item.last_opened_at).toBe(20)
    expect(opened.item.updated_at).toBe(10)
    expect(store.setArchived(created.item.id, true, 30).item.archived).toBe(1)
    expect(store.listItems()).toEqual([])
    expect(store.setArchived(created.item.id, false, 40).item.archived).toBe(0)
    expect(store.listItems()).toHaveLength(1)
  })
})
