import { ipcMain, MessageChannelMain, type IpcMainEvent, type MessagePortMain } from 'electron'
import { randomUUID } from 'node:crypto'
import log from 'electron-log/main'
import {
  providerBridgeHello,
  type ProviderBridgeErrorCode,
  type ProviderBridgeHello,
  type ProviderCapabilities,
  type ProviderCommand,
  type ProviderResult,
  type ProviderResultValue
} from '../shared/provider-bridge-protocol'
import { isProviderBridgeHello, isProviderEvent, isProviderResult } from '../shared/provider-bridge-schema'
import type { ProviderConfig } from './providers'
import { isAdapterHost } from './providers'

const MAX_RUNTIME_ID_LOG = 64
const REFRESH_CAPABILITIES_TIMEOUT_MS = 1000

export interface BridgeAttachContext {
  provider: ProviderConfig
  webContentsId: number
  mode: 'creating' | 'active_ephemeral' | 'active_saved' | 'closing'
}

interface BridgeConnectionState {
  connectionId: string
  provider: ProviderConfig
  webContentsId: number
  origin: string
  routeRevision: number
  capabilities: ProviderCapabilities | null
  port: MessagePortMain
}

interface PendingRequest {
  resolve: (value: ProviderResultValue) => void
  reject: (error: ProviderBridgeFailure) => void
  routeRevision: number
  timer: ReturnType<typeof setTimeout>
}

export class SessionBridge {
  private activeContext: BridgeAttachContext | null = null
  private connection: BridgeConnectionState | null = null
  private readonly pending = new Map<string, PendingRequest>()

  constructor() {
    ipcMain.on(providerBridgeHello, this.handleHello)
  }

  attach(context: BridgeAttachContext): void {
    if (this.activeContext) {
      this.closeConnection('attach_replaced')
    }
    this.activeContext = context
  }

  detach(): void {
    if (this.connection) {
      this.closeConnection('detach')
    }
    this.activeContext = null
  }

  onFullNavigation(): void {
    this.closeConnection('full_navigation')
  }

  onSameDocumentNavigation(): void {
    const connection = this.connection
    if (!connection) {
      return
    }

    this.rejectAllPending(createBridgeError('route_stale'))
    connection.routeRevision += 1
    connection.capabilities = null
    void this.refreshCapabilities().catch((error: unknown) => {
      log.debug('provider bridge: refresh capabilities failed', { reason: formatBridgeFailure(error) })
    })
  }

  onRenderProcessGone(): void {
    this.closeConnection('render_process_gone')
  }

  private handleHello = (event: IpcMainEvent, hello: unknown): void => {
    const context = this.activeContext
    if (!context) {
      log.debug('provider bridge: hello dropped, no active context')
      return
    }

    if (event.sender.id !== context.webContentsId) {
      log.debug('provider bridge: bootstrap_rejected, sender mismatch')
      return
    }

    const frame = event.senderFrame
    if (!frame) {
      log.debug('provider bridge: bootstrap_rejected, no senderFrame')
      return
    }
    if (frame.processId !== event.sender.mainFrame.processId || frame.routingId !== event.sender.mainFrame.routingId) {
      log.debug('provider bridge: bootstrap_rejected, not top frame')
      return
    }

    if (!isProviderBridgeHello(hello)) {
      log.debug('provider bridge: bootstrap_rejected, malformed hello')
      return
    }

    let host: string
    try {
      host = new URL(frame.url).hostname
    } catch {
      log.debug('provider bridge: bootstrap_rejected, unparseable frame url')
      return
    }
    if (!isAdapterHost(context.provider, host)) {
      log.debug('provider bridge: bootstrap_rejected, host not adapter-allowed', { host })
      return
    }

    if (context.mode === 'closing') {
      log.debug('provider bridge: bootstrap_rejected, session closing')
      return
    }

    this.establishConnection(event, hello, frame.url)
  }

  private establishConnection(event: IpcMainEvent, hello: ProviderBridgeHello, frameUrl: string): void {
    const provider = this.activeContext!.provider
    const { port1, port2 } = new MessageChannelMain()

    const connectionId = randomUUID()
    const origin = (() => {
      try {
        return new URL(frameUrl).origin
      } catch {
        return 'null'
      }
    })()

    if (this.connection) {
      this.closeConnection('replaced')
    }

    this.connection = {
      connectionId,
      provider,
      webContentsId: event.sender.id,
      origin,
      routeRevision: 0,
      capabilities: null,
      port: port1
    }

    port1.on('close', () => this.closeConnection('port_closed'))
    port1.on('message', this.handlePortMessage)
    port1.start()

    event.senderFrame?.postMessage(providerBridgeHello, { connected: true }, [port2])

    log.info('provider bridge: bridge_connected', {
      provider: provider.id,
      connectionId,
      origin,
      runtimeId: clipRuntimeId(hello.runtimeId)
    })
    void this.refreshCapabilities().catch((error: unknown) => {
      log.debug('provider bridge: refresh capabilities failed', { reason: formatBridgeFailure(error) })
    })
  }

  private closeConnection(reason: string): void {
    const connection = this.connection
    if (!connection) {
      return
    }
    this.connection = null
    this.rejectAllPending(createBridgeError('connection_stale'))
    try {
      connection.port.removeAllListeners()
      connection.port.close()
    } catch (reason_) {
      log.debug('provider bridge: port close error', { reason: String(reason_) })
    }
    log.debug('provider bridge: connection closed', { reason, connectionId: connection.connectionId })
  }

  private handlePortMessage = (event: { data: unknown }): void => {
    const message = event.data

    if (isProviderResult(message)) {
      this.handleResult(message)
      return
    }

    if (isProviderEvent(message)) {
      const connection = this.connection
      if (!connection || !isCurrentRoute(connection, message.connectionId, message.routeRevision)) {
        log.debug('provider bridge: event dropped, stale route')
        return
      }

      if (message.type === 'capabilitiesChanged') {
        connection.capabilities = message.capabilities
      } else {
        log.debug('provider bridge: adapter error', { code: message.error.code })
      }
    }
  }

  private handleResult(result: ProviderResult): void {
    const connection = this.connection
    if (!connection || !isCurrentRoute(connection, result.connectionId, result.routeRevision)) {
      log.debug('provider bridge: result dropped, stale route')
      return
    }

    const pending = this.pending.get(result.requestId)
    if (!pending || pending.routeRevision !== result.routeRevision) {
      log.debug('provider bridge: result dropped, missing pending request')
      return
    }

    this.pending.delete(result.requestId)
    clearTimeout(pending.timer)

    if (result.ok) {
      if (result.value.kind === 'capabilities') {
        connection.capabilities = result.value.capabilities
      }
      pending.resolve(result.value)
      return
    }

    pending.reject(createBridgeError(result.error.code, result.error.message))
  }

  private async refreshCapabilities(): Promise<ProviderCapabilities> {
    const result = await this.sendCommand('refreshCapabilities', REFRESH_CAPABILITIES_TIMEOUT_MS)

    if (result.kind !== 'capabilities') {
      throw createBridgeError('unknown')
    }

    return result.capabilities
  }

  private sendCommand(type: ProviderCommand['type'], timeoutMs: number): Promise<ProviderResultValue> {
    const connection = this.connection
    if (!connection) {
      return Promise.reject(createBridgeError('adapter_unavailable'))
    }

    const requestId = randomUUID()
    const command: ProviderCommand = {
      type,
      requestId,
      connectionId: connection.connectionId,
      routeRevision: connection.routeRevision
    }

    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pending.delete(requestId)
        reject(createBridgeError('timeout'))
      }, timeoutMs)

      this.pending.set(requestId, {
        resolve,
        reject,
        routeRevision: connection.routeRevision,
        timer
      })

      try {
        connection.port.postMessage(command)
      } catch (error) {
        clearTimeout(timer)
        this.pending.delete(requestId)
        reject(createBridgeError('unknown', String(error)))
      }
    })
  }

  private rejectAllPending(error: ProviderBridgeFailure): void {
    for (const [requestId, pending] of this.pending) {
      clearTimeout(pending.timer)
      pending.reject(error)
      this.pending.delete(requestId)
    }
  }
}

function clipRuntimeId(value: string): string {
  return value.length > MAX_RUNTIME_ID_LOG ? value.slice(0, MAX_RUNTIME_ID_LOG) : value
}

class ProviderBridgeFailure extends Error {
  constructor(
    readonly code: ProviderBridgeErrorCode,
    message?: string
  ) {
    super(message ?? code)
    this.name = 'ProviderBridgeFailure'
  }
}

function createBridgeError(code: ProviderBridgeErrorCode, message?: string): ProviderBridgeFailure {
  return new ProviderBridgeFailure(code, message)
}

function isCurrentRoute(connection: BridgeConnectionState, connectionId: string, routeRevision: number): boolean {
  return connection.connectionId === connectionId && connection.routeRevision === routeRevision
}

function formatBridgeFailure(error: unknown): string {
  if (error instanceof ProviderBridgeFailure) {
    return error.code
  }

  return String(error)
}
