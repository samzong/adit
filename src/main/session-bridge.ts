import { ipcMain, MessageChannelMain, type IpcMainEvent, type MessagePortMain } from 'electron'
import { randomUUID } from 'node:crypto'
import log from 'electron-log/main'
import { providerBridgeHello, type ProviderBridgeHello } from '../shared/provider-bridge-protocol'
import { isProviderBridgeHello } from '../shared/provider-bridge-schema'
import type { ProviderConfig } from './providers'
import { isAdapterHost } from './providers'

const MAX_RUNTIME_ID_LOG = 64

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
  port: MessagePortMain
}

export class SessionBridge {
  private activeContext: BridgeAttachContext | null = null
  private connection: BridgeConnectionState | null = null

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
      port: port1
    }

    port1.on('close', () => this.closeConnection('port_closed'))
    port1.start()

    event.senderFrame?.postMessage(providerBridgeHello, { connected: true }, [port2])

    log.info('provider bridge: bridge_connected', {
      provider: provider.id,
      connectionId,
      origin,
      runtimeId: clipRuntimeId(hello.runtimeId)
    })
  }

  private closeConnection(reason: string): void {
    const connection = this.connection
    if (!connection) {
      return
    }
    this.connection = null
    try {
      connection.port.removeAllListeners()
      connection.port.close()
    } catch (reason_) {
      log.debug('provider bridge: port close error', { reason: String(reason_) })
    }
    log.debug('provider bridge: connection closed', { reason, connectionId: connection.connectionId })
  }
}

function clipRuntimeId(value: string): string {
  return value.length > MAX_RUNTIME_ID_LOG ? value.slice(0, MAX_RUNTIME_ID_LOG) : value
}
