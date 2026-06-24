import { ipcRenderer, webFrame } from 'electron'
import { providerPageAdapterForHost } from '../shared/provider-page-adapters'
import {
  providerBridgeHello,
  PROTOCOL_VERSION,
  type ProviderBridgeErrorCode,
  type ProviderCapabilities,
  type ProviderCommand
} from '../shared/provider-bridge-protocol'
import { isProviderCommand } from '../shared/provider-bridge-schema'
import { providerAdapterForHost } from './provider-adapters'

if (window.top === window) {
  const adapter = providerPageAdapterForHost(window.location.hostname)
  const bridgeAdapter = providerAdapterForHost(window.location.hostname)

  if (adapter) {
    webFrame.insertCSS(adapter.css)

    const runtimeId = crypto.randomUUID()
    ipcRenderer.send(providerBridgeHello, { protocolVersion: PROTOCOL_VERSION, runtimeId })

    ipcRenderer.on(providerBridgeHello, (event) => {
      const port = event.ports[0]
      if (!port) {
        return
      }
      port.onmessage = (message) => {
        handlePortMessage(port, message.data, bridgeAdapter)
      }
      port.start()
    })
  }
}

function handlePortMessage(
  port: MessagePort,
  value: unknown,
  adapter: ReturnType<typeof providerAdapterForHost>
): void {
  if (!isProviderCommand(value)) {
    return
  }

  if (value.type === 'refreshCapabilities') {
    handleRefreshCapabilities(port, value, adapter)
  }
}

function handleRefreshCapabilities(
  port: MessagePort,
  command: ProviderCommand,
  adapter: ReturnType<typeof providerAdapterForHost>
): void {
  if (!adapter) {
    postError(port, command, 'adapter_unavailable')
    return
  }

  const capabilities = adapter.detect()
  port.postMessage({
    type: 'result',
    requestId: command.requestId,
    connectionId: command.connectionId,
    routeRevision: command.routeRevision,
    ok: true,
    value: { kind: 'capabilities', capabilities }
  })
  postCapabilitiesChanged(port, command, capabilities)

  if (!hasCapabilities(capabilities)) {
    postAdapterError(port, command, 'target_not_found')
  }
}

function postError(port: MessagePort, command: ProviderCommand, code: 'adapter_unavailable'): void {
  port.postMessage({
    type: 'result',
    requestId: command.requestId,
    connectionId: command.connectionId,
    routeRevision: command.routeRevision,
    ok: false,
    error: { code }
  })
}

function postCapabilitiesChanged(
  port: MessagePort,
  command: ProviderCommand,
  capabilities: ProviderCapabilities
): void {
  port.postMessage({
    type: 'capabilitiesChanged',
    connectionId: command.connectionId,
    routeRevision: command.routeRevision,
    capabilities
  })
}

function postAdapterError(port: MessagePort, command: ProviderCommand, code: ProviderBridgeErrorCode): void {
  port.postMessage({
    type: 'adapterError',
    connectionId: command.connectionId,
    routeRevision: command.routeRevision,
    error: { code }
  })
}

function hasCapabilities(capabilities: ProviderCapabilities): boolean {
  return capabilities.readSelection === true
}
