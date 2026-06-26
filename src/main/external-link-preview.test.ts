import { describe, expect, it, vi } from 'vitest'
import { defaultWorkspaceLayout } from '../shared/workspace-layout'

vi.mock('electron', () => ({
  BrowserWindow: class {},
  WebContentsView: class {},
  ipcMain: { on: vi.fn() },
  shell: { openExternal: vi.fn() }
}))

vi.mock('electron-log/main', () => ({
  default: {
    debug: vi.fn(),
    error: vi.fn()
  }
}))

import { calculatePreviewLayout } from './external-link-preview'

describe('calculatePreviewLayout', () => {
  it('keeps the page top fixed and fills the frame body', () => {
    const layout = calculatePreviewLayout(1600, 1000, defaultWorkspaceLayout)
    const frameTop = layout.shell.y + layout.margin
    const frameBottom = layout.shell.y + layout.shell.height - layout.margin
    const pageBottom = layout.page.y + layout.page.height

    expect(layout.page.y).toBe(frameTop + 44)
    expect(frameBottom - pageBottom).toBe(1)
  })
})
