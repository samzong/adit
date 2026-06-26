import { EventEmitter } from 'node:events'
import type { WebContents } from 'electron'
import { describe, expect, it, vi } from 'vitest'
import { providers } from './providers'
import { watchNavigation } from './nav-watcher'

describe('watchNavigation', () => {
  it('only treats allowed provider urls as full provider navigation starts', () => {
    const webContents = new EventEmitter() as WebContents
    const onFullNavigationStart = vi.fn()

    const unwatch = watchNavigation(webContents, providers.chatgpt, {
      onSessionUrl: vi.fn(),
      onLoginRequired: vi.fn(),
      onBlockedNavigation: vi.fn(),
      onFullNavigationStart
    })

    webContents.emit('did-start-navigation', {}, 'https://example.com/', false, true)
    expect(onFullNavigationStart).not.toHaveBeenCalled()

    webContents.emit('did-start-navigation', {}, 'https://chatgpt.com/', false, true)
    expect(onFullNavigationStart).toHaveBeenCalledTimes(1)

    unwatch()
  })
})
