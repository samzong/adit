import type { BrowserWindow, WebContentsView } from 'electron'
import { describe, expect, it, vi } from 'vitest'
import type { NoteRow } from '../shared/types'
import type { NoteStore } from './db/notes'
import { SessionController } from './session-controller'

vi.mock('./nav-watcher', () => ({
  watchNavigation: vi.fn(() => () => undefined)
}))

vi.mock('./session-view', () => ({
  attachProviderView: vi.fn(),
  createProviderView: vi.fn(),
  removeProviderView: vi.fn(),
  resizeProviderView: vi.fn()
}))

vi.mock('./session-bridge', () => ({
  SessionBridge: vi.fn().mockImplementation(() => ({
    attach: vi.fn(),
    detach: vi.fn(),
    onFullNavigation: vi.fn(),
    onRenderProcessGone: vi.fn(),
    onSameDocumentNavigation: vi.fn()
  }))
}))

describe('SessionController', () => {
  it('flushes an active session without sending IPC after the window is destroyed', () => {
    const note: NoteRow = {
      id: 'note-1',
      provider: 'chatgpt',
      session_url: 'https://chatgpt.com/c/00000000-0000-0000-0000-000000000000',
      title: 'Updated title',
      is_title_manual: 0,
      created_at: 1,
      updated_at: 2,
      last_opened_at: 3,
      archived: 0
    }
    const send = vi.fn(() => {
      throw new Error('destroyed')
    })
    const window = {
      isDestroyed: () => true,
      webContents: {
        isDestroyed: () => true,
        send
      }
    } as unknown as BrowserWindow
    const updateTitleFromProvider = vi.fn(() => note)
    const store = {
      updateTitleFromProvider
    } as unknown as NoteStore
    const view = {
      webContents: {
        getTitle: () => 'Latest title'
      }
    } as unknown as WebContentsView
    const controller = new SessionController(window, store)

    ;(
      controller as unknown as {
        active: {
          provider: { id: 'chatgpt' }
          view: WebContentsView
          mode: 'active_saved'
          noteId: string
          sessionUrl: string
          title: null
          unwatch: () => void
        }
      }
    ).active = {
      provider: { id: 'chatgpt' },
      view,
      mode: 'active_saved',
      noteId: note.id,
      sessionUrl: note.session_url as string,
      title: null,
      unwatch: () => undefined
    }

    expect(() => controller.flushSync()).not.toThrow()
    expect(updateTitleFromProvider).toHaveBeenCalledWith(note.id, 'Latest title')
    expect(send).not.toHaveBeenCalled()
  })
})
