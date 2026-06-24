import type { BrowserWindow, WebContentsView } from 'electron'
import log from 'electron-log/main'
import { IPC } from '../shared/ipc'
import type { NoteRow, ProviderId, SessionState } from '../shared/types'
import type { NoteStore } from './db/notes'
import { getProvider, isAllowedProviderUrl, type ProviderConfig } from './providers'
import { watchNavigation } from './nav-watcher'
import { attachProviderView, createProviderView, removeProviderView, resizeProviderView } from './session-view'
import { SessionBridge } from './session-bridge'

interface ActiveSession {
  provider: ProviderConfig
  view: WebContentsView
  mode: 'creating' | 'active_ephemeral' | 'active_saved' | 'closing'
  noteId: string | null
  sessionUrl: string | null
  title: string | null
  unwatch: () => void
}

export class SessionController {
  private active: ActiveSession | null = null
  private readonly bridge = new SessionBridge()

  constructor(
    private readonly window: BrowserWindow,
    private readonly store: NoteStore
  ) {}

  create(providerId: ProviderId): SessionState {
    this.close()

    const provider = getProvider(providerId)
    const view = createProviderView(this.window, provider)
    const active: ActiveSession = {
      provider,
      view,
      mode: 'creating',
      noteId: null,
      sessionUrl: null,
      title: null,
      unwatch: () => undefined
    }
    this.active = active
    active.unwatch = this.attachViewEvents(active)
    this.bridge.attach({
      provider: active.provider,
      webContentsId: active.view.webContents.id,
      mode: active.mode
    })
    attachProviderView(this.window, view)
    this.publishState()
    void this.loadCreatedSession(active)

    return this.getState()
  }

  open(noteId: string): SessionState {
    const note = this.store.getNote(noteId)

    const sessionUrl = note?.session_url

    if (!sessionUrl) {
      throw new Error('Note has no session URL')
    }

    this.close()

    const provider = getProvider(note.provider)

    if (!isAllowedProviderUrl(provider, sessionUrl)) {
      throw new Error('Session URL is outside provider allowlist')
    }

    const view = createProviderView(this.window, provider)
    const active: ActiveSession = {
      provider,
      view,
      mode: 'active_saved',
      noteId: note.id,
      sessionUrl,
      title: note.title,
      unwatch: () => undefined
    }
    this.active = active
    active.unwatch = this.attachViewEvents(active)
    this.bridge.attach({
      provider: active.provider,
      webContentsId: active.view.webContents.id,
      mode: active.mode
    })
    attachProviderView(this.window, view)
    this.publishState()
    void this.loadSavedSession(active, note)

    return this.getState()
  }

  close(): SessionState {
    if (!this.active) {
      this.publishState()
      return this.getState()
    }

    const active = this.active
    active.mode = 'closing'
    this.publishState()
    this.flushActive(active)
    active.unwatch()
    this.bridge.detach()
    removeProviderView(this.window, active.view)
    this.active = null
    this.publishState()
    return this.getState()
  }

  flushSync(): void {
    if (this.active) {
      this.flushActive(this.active)
    }
  }

  resize(): void {
    if (this.active) {
      resizeProviderView(this.window, this.active.view)
    }
  }

  getState(): SessionState {
    if (!this.active) {
      return {
        mode: 'list',
        provider: null,
        noteId: null,
        sessionUrl: null,
        title: null
      }
    }

    return {
      mode: this.active.mode,
      provider: this.active.provider.id,
      noteId: this.active.noteId,
      sessionUrl: this.active.sessionUrl,
      title: this.active.title
    }
  }

  private clearActive(active: ActiveSession): void {
    if (this.active !== active) {
      return
    }

    active.unwatch()
    this.bridge.detach()
    removeProviderView(this.window, active.view)
    this.active = null
    this.publishState()
  }

  private async loadCreatedSession(active: ActiveSession): Promise<void> {
    try {
      await active.view.webContents.loadURL(active.provider.homeUrl)
    } catch (reason) {
      log.error('Failed to load provider home', { provider: active.provider.id, reason: formatError(reason) })

      if (this.active !== active) {
        return
      }

      this.clearActive(active)
      this.sendToRenderer(IPC.appToast, {
        level: 'error',
        message: `Failed to load ${active.provider.label}.`
      })
      return
    }

    if (this.active === active && active.mode === 'creating') {
      active.mode = 'active_ephemeral'
      this.publishState()
    }
  }

  private async loadSavedSession(active: ActiveSession, note: NoteRow): Promise<void> {
    if (!note.session_url) {
      return
    }

    try {
      await active.view.webContents.loadURL(note.session_url)
    } catch (reason) {
      log.error('Failed to resume session', { noteId: note.id, reason: formatError(reason) })

      if (this.active !== active) {
        return
      }

      this.clearActive(active)
      this.sendToRenderer(IPC.appToast, {
        level: 'error',
        message: `Failed to resume ${active.provider.label} session.`
      })
      return
    }

    if (this.active === active) {
      const touched = this.store.touchOpened(note.id)
      active.title = touched.title
      this.publishNotesChanged()
      this.publishState()
    }
  }

  private attachViewEvents(active: ActiveSession): () => void {
    const onTitleUpdated = (_event: Electron.Event, title: string): void => {
      const previousTitle = active.title
      active.title = title

      if (active.noteId) {
        const note = this.store.updateTitleFromProvider(active.noteId, title)
        if (note) {
          active.title = note.title
          if (note.title !== previousTitle) {
            this.publishTitle(note)
            this.publishNotesChanged()
          }
        }
      }
    }

    active.view.webContents.on('page-title-updated', onTitleUpdated)
    const unwatch = watchNavigation(active.view.webContents, active.provider, {
      onSessionUrl: (sessionUrl) => this.captureSessionUrl(active, sessionUrl),
      onLoginRequired: () => {
        this.sendToRenderer(IPC.sessionLoginRequired, active.provider.id)
        this.sendToRenderer(IPC.appToast, {
          level: 'info',
          message: `${active.provider.label} login expired. Sign in with email and password.`
        })
      },
      onBlockedNavigation: (url) => {
        this.sendToRenderer(IPC.appToast, {
          level: 'error',
          message: `Blocked navigation outside the provider allowlist: ${url}`
        })
      }
    })

    return () => {
      active.view.webContents.off('page-title-updated', onTitleUpdated)
      unwatch()
    }
  }

  private captureSessionUrl(active: ActiveSession, sessionUrl: string): void {
    if (active.sessionUrl === sessionUrl && active.noteId) {
      return
    }

    const note = this.store.upsertCapturedSession({
      provider: active.provider.id,
      sessionUrl,
      title: active.title ?? active.view.webContents.getTitle()
    })
    active.mode = 'active_saved'
    active.noteId = note.id
    active.sessionUrl = note.session_url
    active.title = note.title
    this.publishTitle(note)
    this.publishNotesChanged()
    this.publishState()
  }

  private flushActive(active: ActiveSession): void {
    if (!active.noteId) {
      return
    }

    const previousTitle = active.title
    const title = active.title ?? active.view.webContents.getTitle()
    const note = this.store.updateTitleFromProvider(active.noteId, title)

    if (note) {
      active.title = note.title
      if (note.title !== previousTitle) {
        this.publishTitle(note)
        this.publishNotesChanged()
      }
    }
  }

  private publishTitle(note: NoteRow): void {
    this.sendToRenderer(IPC.sessionTitleUpdated, note)
  }

  private publishNotesChanged(): void {
    this.sendToRenderer(IPC.notesChanged)
  }

  private publishState(): void {
    this.sendToRenderer(IPC.sessionStateChanged, this.getState())
  }

  private sendToRenderer(channel: string, ...args: unknown[]): void {
    if (this.window.isDestroyed() || this.window.webContents.isDestroyed()) {
      return
    }

    this.window.webContents.send(channel, ...args)
  }
}

function formatError(reason: unknown): string {
  if (reason instanceof Error) {
    return reason.message
  }

  return typeof reason === 'string' ? reason : 'Unknown error'
}
