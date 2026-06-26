import type { BrowserWindow, WebContentsView } from 'electron'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { SparkRow } from '../shared/types'
import type { SparkStore } from './db/sparks'
import { ExternalLinkPreviewController } from './external-link-preview'
import { SessionController } from './session-controller'

const externalPreview = vi.hoisted(() => ({
  close: vi.fn(),
  open: vi.fn(),
  resize: vi.fn()
}))

vi.mock('./nav-watcher', () => ({
  watchNavigation: vi.fn(() => () => undefined)
}))

vi.mock('./session-view', () => ({
  attachProviderView: vi.fn(),
  createProviderView: vi.fn(),
  removeProviderView: vi.fn(),
  resizeProviderView: vi.fn()
}))

vi.mock('./external-link-preview', () => ({
  ExternalLinkPreviewController: vi.fn().mockImplementation(() => externalPreview)
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
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('flushes an active session without sending IPC after the window is destroyed', () => {
    const spark: SparkRow = {
      id: 'spark-1',
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
    const updateTitleFromProvider = vi.fn(() => spark)
    const store = {
      updateTitleFromProvider
    } as unknown as SparkStore
    const view = {
      webContents: {
        getTitle: () => 'Latest title'
      }
    } as unknown as WebContentsView
    const controller = new SessionController(window, store)

    expect(ExternalLinkPreviewController).toHaveBeenLastCalledWith(window)
    ;(
      controller as unknown as {
        active: {
          provider: { id: 'chatgpt' }
          view: WebContentsView
          mode: 'active_saved'
          sparkId: string
          sessionUrl: string
          title: null
          unwatch: () => void
        }
      }
    ).active = {
      provider: { id: 'chatgpt' },
      view,
      mode: 'active_saved',
      sparkId: spark.id,
      sessionUrl: spark.session_url as string,
      title: null,
      unwatch: () => undefined
    }

    expect(() => controller.flushSync()).not.toThrow()
    expect(updateTitleFromProvider).toHaveBeenCalledWith(spark.id, 'Latest title')
    expect(send).not.toHaveBeenCalled()
  })

  it('closes an external preview when clearing an active session', () => {
    const window = {
      isDestroyed: () => true,
      webContents: {
        isDestroyed: () => true,
        send: vi.fn()
      }
    } as unknown as BrowserWindow
    const view = {
      webContents: {}
    } as unknown as WebContentsView
    const activeSession = {
      provider: { id: 'chatgpt' },
      view,
      mode: 'active_saved',
      sparkId: null,
      sessionUrl: null,
      title: null,
      unwatch: vi.fn()
    }
    const controller = new SessionController(window, {} as SparkStore)

    ;(
      controller as unknown as {
        active: typeof activeSession
        clearActive: (active: typeof activeSession) => void
      }
    ).active = activeSession
    ;(
      controller as unknown as {
        clearActive: (active: typeof activeSession) => void
      }
    ).clearActive(activeSession)

    expect(externalPreview.close).toHaveBeenCalledTimes(1)
  })
})
