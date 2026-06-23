import { BrowserWindow, type WebContentsView } from 'electron'
import { IPC } from '../shared/ipc'
import type { NoteRow, ProviderId, SessionState } from '../shared/types'
import type { NoteStore } from './db/notes'
import { getProvider, isAllowedProviderUrl, type ProviderConfig } from './providers'
import { watchNavigation } from './nav-watcher'
import { createProviderView, removeProviderView, resizeProviderView } from './session-view'

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

  constructor(
    private readonly window: BrowserWindow,
    private readonly store: NoteStore
  ) {}

  async create(providerId: ProviderId): Promise<SessionState> {
    this.close()

    const provider = getProvider(providerId)
    const view = this.createView(provider)
    this.active = {
      provider,
      view,
      mode: 'creating',
      noteId: null,
      sessionUrl: null,
      title: null,
      unwatch: () => undefined
    }
    this.active.unwatch = this.attachViewEvents(this.active)
    this.publishState()
    await view.webContents.loadURL(provider.homeUrl)

    if (this.active?.view === view && this.active.mode === 'creating') {
      this.active.mode = 'active_ephemeral'
      this.publishState()
    }

    return this.getState()
  }

  async open(noteId: string): Promise<SessionState> {
    const note = this.store.getNote(noteId)

    if (!note?.session_url) {
      throw new Error('Note has no session URL')
    }

    this.close()

    const touched = this.store.touchOpened(note.id)
    const provider = getProvider(touched.provider)

    if (!isAllowedProviderUrl(provider, touched.session_url)) {
      throw new Error('Session URL is outside provider allowlist')
    }

    const view = this.createView(provider)
    this.active = {
      provider,
      view,
      mode: 'active_saved',
      noteId: touched.id,
      sessionUrl: touched.session_url,
      title: touched.title,
      unwatch: () => undefined
    }
    this.active.unwatch = this.attachViewEvents(this.active)
    this.publishNotesChanged()
    this.publishState()
    await view.webContents.loadURL(touched.session_url)
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

  private createView(provider: ProviderConfig): WebContentsView {
    return createProviderView(this.window, provider)
  }

  private attachViewEvents(active: ActiveSession): () => void {
    const onTitleUpdated = (_event: Electron.Event, title: string): void => {
      active.title = title

      if (active.noteId) {
        const note = this.store.updateTitleFromProvider(active.noteId, title)
        if (note) {
          active.title = note.title
          this.publishTitle(note)
          this.publishNotesChanged()
        }
      }
    }

    active.view.webContents.on('page-title-updated', onTitleUpdated)
    const unwatch = watchNavigation(active.view.webContents, active.provider, {
      onSessionUrl: (sessionUrl) => this.captureSessionUrl(active, sessionUrl),
      onLoginRequired: () => {
        this.window.webContents.send(IPC.sessionLoginRequired, active.provider.id)
        this.window.webContents.send(IPC.appToast, {
          level: 'info',
          message: `${active.provider.label} login expired. Sign in with email and password.`
        })
      },
      onBlockedNavigation: (url) => {
        this.window.webContents.send(IPC.appToast, {
          level: 'error',
          message: 'Blocked navigation outside the provider allowlist.'
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

    const title = active.title ?? active.view.webContents.getTitle()
    const note = this.store.updateTitleFromProvider(active.noteId, title)

    if (note) {
      active.title = note.title
      this.publishTitle(note)
      this.publishNotesChanged()
    }
  }

  private publishTitle(note: NoteRow): void {
    this.window.webContents.send(IPC.sessionTitleUpdated, note)
  }

  private publishNotesChanged(): void {
    this.window.webContents.send(IPC.notesChanged)
  }

  private publishState(): void {
    this.window.webContents.send(IPC.sessionStateChanged, this.getState())
  }
}
