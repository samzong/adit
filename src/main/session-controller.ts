import type { BrowserWindow, WebContentsView } from 'electron'
import log from 'electron-log/main'
import { IPC } from '../shared/ipc'
import type {
  CaptureSource,
  SparkRow,
  ProviderId,
  SessionSelectionResult,
  SessionState,
  WorkspaceLayoutRequest
} from '../shared/types'
import { clampWorkspaceSplitRatio, defaultWorkspaceLayout } from '../shared/workspace-layout'
import type { SparkStore } from './db/sparks'
import { getProvider, isAllowedProviderUrl, type ProviderConfig } from './providers'
import { watchNavigation } from './nav-watcher'
import { attachProviderView, createProviderView, removeProviderView, resizeProviderView } from './session-view'
import { SessionBridge } from './session-bridge'

interface ActiveSession {
  provider: ProviderConfig
  view: WebContentsView
  mode: 'creating' | 'active_ephemeral' | 'active_saved' | 'closing'
  sparkId: string | null
  sessionUrl: string | null
  title: string | null
  unwatch: () => void
}

export class SessionController {
  private active: ActiveSession | null = null
  private selectionActionRequested = false
  private workspaceLayout: WorkspaceLayoutRequest = defaultWorkspaceLayout
  private readonly bridge = new SessionBridge({
    onInsertSelectionRequested: (selection) => {
      this.sendToRenderer(IPC.sessionInsertSelectionRequested, selection)
    }
  })

  constructor(
    private readonly window: BrowserWindow,
    private readonly store: SparkStore
  ) {}

  create(providerId: ProviderId): SessionState {
    this.close()

    const provider = getProvider(providerId)
    const view = createProviderView(this.window, provider)
    const active: ActiveSession = {
      provider,
      view,
      mode: 'creating',
      sparkId: null,
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
    attachProviderView(this.window, view, this.workspaceLayout)
    this.publishState()
    void this.loadCreatedSession(active)

    return this.getState()
  }

  open(sparkId: string): SessionState {
    const spark = this.store.getSpark(sparkId)

    const sessionUrl = spark?.session_url

    if (!sessionUrl) {
      throw new Error('Spark has no session URL')
    }

    this.close()

    const provider = getProvider(spark.provider)

    if (!isAllowedProviderUrl(provider, sessionUrl)) {
      throw new Error('Session URL is outside provider allowlist')
    }

    const view = createProviderView(this.window, provider)
    const active: ActiveSession = {
      provider,
      view,
      mode: 'active_saved',
      sparkId: spark.id,
      sessionUrl,
      title: spark.title,
      unwatch: () => undefined
    }
    this.active = active
    active.unwatch = this.attachViewEvents(active)
    this.bridge.attach({
      provider: active.provider,
      webContentsId: active.view.webContents.id,
      mode: active.mode
    })
    attachProviderView(this.window, view, this.workspaceLayout)
    this.publishState()
    void this.loadSavedSession(active, spark)

    return this.getState()
  }

  close(): SessionState {
    this.workspaceLayout = defaultWorkspaceLayout

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
      resizeProviderView(this.window, this.active.view, this.workspaceLayout)
    }
  }

  setWorkspaceLayout(request: WorkspaceLayoutRequest): void {
    this.workspaceLayout = sanitizeWorkspaceLayout(request)
    this.syncSelectionActionAvailability()
    this.resize()
  }

  setSelectionActionEnabled(enabled: boolean): void {
    this.selectionActionRequested = enabled
    this.syncSelectionActionAvailability()
  }

  getState(): SessionState {
    if (!this.active) {
      return {
        mode: 'list',
        provider: null,
        sparkId: null,
        sessionUrl: null,
        title: null
      }
    }

    return {
      mode: this.active.mode,
      provider: this.active.provider.id,
      sparkId: this.active.sparkId,
      sessionUrl: this.active.sessionUrl,
      title: this.active.title
    }
  }

  readSelection(): Promise<SessionSelectionResult> {
    const active = this.active
    if (!active) {
      throw new Error('No active provider session')
    }

    return this.bridge.readSelection(createCaptureSource(active))
  }

  private clearActive(active: ActiveSession): void {
    if (this.active !== active) {
      return
    }

    active.unwatch()
    this.bridge.detach()
    removeProviderView(this.window, active.view)
    this.active = null
    this.workspaceLayout = defaultWorkspaceLayout
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

  private async loadSavedSession(active: ActiveSession, spark: SparkRow): Promise<void> {
    if (!spark.session_url) {
      return
    }

    try {
      await active.view.webContents.loadURL(spark.session_url)
    } catch (reason) {
      log.error('Failed to resume session', { sparkId: spark.id, reason: formatError(reason) })

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
      const touched = this.store.touchOpened(spark.id)
      active.title = touched.title
      this.publishSparksChanged()
      this.publishState()
    }
  }

  private attachViewEvents(active: ActiveSession): () => void {
    const onTitleUpdated = (_event: Electron.Event, title: string): void => {
      const previousTitle = active.title
      active.title = title

      if (active.sparkId) {
        const spark = this.store.updateTitleFromProvider(active.sparkId, title)
        if (spark) {
          active.title = spark.title
          if (spark.title !== previousTitle) {
            this.publishTitle(spark)
            this.publishSparksChanged()
          }
        }
      }
    }
    const onRenderProcessGone = (): void => this.bridge.onRenderProcessGone()

    active.view.webContents.on('page-title-updated', onTitleUpdated)
    active.view.webContents.on('render-process-gone', onRenderProcessGone)
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
      },
      onFullNavigationStart: () => this.bridge.onFullNavigation(),
      onSameDocumentNavigation: () => this.bridge.onSameDocumentNavigation()
    })

    return () => {
      active.view.webContents.off('page-title-updated', onTitleUpdated)
      active.view.webContents.off('render-process-gone', onRenderProcessGone)
      unwatch()
    }
  }

  private captureSessionUrl(active: ActiveSession, sessionUrl: string): void {
    if (active.sessionUrl === sessionUrl && active.sparkId) {
      return
    }

    const spark = this.store.upsertCapturedSession({
      provider: active.provider.id,
      sessionUrl,
      title: active.title ?? active.view.webContents.getTitle()
    })
    active.mode = 'active_saved'
    active.sparkId = spark.id
    active.sessionUrl = spark.session_url
    active.title = spark.title
    this.publishTitle(spark)
    this.publishSparksChanged()
    this.publishState()
  }

  private flushActive(active: ActiveSession): void {
    if (!active.sparkId) {
      return
    }

    const previousTitle = active.title
    const title = active.title ?? active.view.webContents.getTitle()
    const spark = this.store.updateTitleFromProvider(active.sparkId, title)

    if (spark) {
      active.title = spark.title
      if (spark.title !== previousTitle) {
        this.publishTitle(spark)
        this.publishSparksChanged()
      }
    }
  }

  private publishTitle(spark: SparkRow): void {
    this.sendToRenderer(IPC.sessionTitleUpdated, spark)
  }

  private publishSparksChanged(): void {
    this.sendToRenderer(IPC.sparksChanged)
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

  private syncSelectionActionAvailability(): void {
    this.bridge.setSelectionActionEnabled(
      this.selectionActionRequested &&
        this.workspaceLayout.secondarySurface === 'note' &&
        !this.workspaceLayout.secondaryCollapsed
    )
  }
}

function formatError(reason: unknown): string {
  if (reason instanceof Error) {
    return reason.message
  }

  return typeof reason === 'string' ? reason : 'Unknown error'
}

function sanitizeWorkspaceLayout(request: Partial<WorkspaceLayoutRequest> | null | undefined): WorkspaceLayoutRequest {
  const primarySurface = request?.primarySurface === 'note' ? 'note' : 'spark'
  const secondarySurface =
    request?.secondarySurface === 'note' || request?.secondarySurface === 'spark' ? request.secondarySurface : null

  return {
    primarySurface,
    secondarySurface,
    secondaryCollapsed: Boolean(request?.secondaryCollapsed),
    splitRatio: clampWorkspaceSplitRatio(Number(request?.splitRatio))
  }
}

function createCaptureSource(active: ActiveSession): CaptureSource {
  const title = active.view.webContents.getTitle()

  return {
    provider: active.provider.id,
    url: active.view.webContents.mainFrame.url,
    title: title === '' ? null : title,
    capturedAt: Date.now()
  }
}
