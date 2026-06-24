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
import { detectProviderCapabilities, hasProviderCapabilities } from './provider-capabilities'
import { providerAdapterForHost } from './provider-adapters'
import {
  createProviderSelectionAction,
  providerSelectionActionCss,
  type ProviderSelectionAction
} from './provider-selection-action'

if (window.top === window) {
  const adapter = providerPageAdapterForHost(window.location.hostname)
  const bridgeAdapter = providerAdapterForHost(window.location.hostname)

  if (adapter) {
    webFrame.insertCSS(adapter.css)
    if (bridgeAdapter) {
      webFrame.insertCSS(providerSelectionActionCss)
    }

    const runtimeId = crypto.randomUUID()
    let selectionAction: ProviderSelectionAction | null = null
    ipcRenderer.send(providerBridgeHello, { protocolVersion: PROTOCOL_VERSION, runtimeId })

    ipcRenderer.on(providerBridgeHello, (event) => {
      const port = event.ports[0]
      if (!port) {
        return
      }
      selectionAction?.dispose()
      selectionAction = bridgeAdapter ? createProviderSelectionAction(port, bridgeAdapter) : null
      port.onmessage = (message) => {
        handlePortMessage(port, message.data, bridgeAdapter, selectionAction)
      }
      port.start()
    })
  }
}

function handlePortMessage(
  port: MessagePort,
  value: unknown,
  adapter: ReturnType<typeof providerAdapterForHost>,
  selectionAction: ProviderSelectionAction | null
): void {
  if (!isProviderCommand(value)) {
    return
  }

  selectionAction?.setRoute(value)

  if (value.type === 'setSelectionActionAvailability') {
    handleSetSelectionActionAvailability(port, value, selectionAction)
    return
  }

  if (value.type === 'refreshCapabilities') {
    void handleRefreshCapabilities(port, value, adapter)
    return
  }

  if (value.type === 'readSelection') {
    handleReadSelection(port, value, adapter)
  }
}

async function handleRefreshCapabilities(
  port: MessagePort,
  command: ProviderCommand,
  adapter: ReturnType<typeof providerAdapterForHost>
): Promise<void> {
  if (!adapter) {
    postError(port, command, 'adapter_unavailable')
    return
  }

  const capabilities = await detectProviderCapabilities(adapter)
  port.postMessage({
    type: 'result',
    requestId: command.requestId,
    connectionId: command.connectionId,
    routeRevision: command.routeRevision,
    ok: true,
    value: { kind: 'capabilities', capabilities }
  })
  postCapabilitiesChanged(port, command, capabilities)

  if (!hasProviderCapabilities(capabilities)) {
    postAdapterError(port, command, 'target_not_found')
  }
}

function handleReadSelection(
  port: MessagePort,
  command: ProviderCommand,
  adapter: ReturnType<typeof providerAdapterForHost>
): void {
  if (!adapter) {
    postError(port, command, 'adapter_unavailable')
    return
  }

  const result = adapter.readSelection()
  if (result.kind === 'empty') {
    postSelectionResult(port, command, null)
    return
  }

  if (result.kind === 'selection') {
    postSelectionResult(port, command, result.selection)
    return
  }

  postError(port, command, result.kind === 'out_of_scope' ? 'selection_out_of_scope' : 'payload_too_large')
}

function handleSetSelectionActionAvailability(
  port: MessagePort,
  command: ProviderCommand,
  selectionAction: ProviderSelectionAction | null
): void {
  if (command.type !== 'setSelectionActionAvailability') {
    return
  }

  selectionAction?.setEnabled(command.enabled)
  postVoidResult(port, command)
}

function postError(port: MessagePort, command: ProviderCommand, code: ProviderBridgeErrorCode): void {
  port.postMessage({
    type: 'result',
    requestId: command.requestId,
    connectionId: command.connectionId,
    routeRevision: command.routeRevision,
    ok: false,
    error: { code }
  })
}

function postVoidResult(port: MessagePort, command: ProviderCommand): void {
  port.postMessage({
    type: 'result',
    requestId: command.requestId,
    connectionId: command.connectionId,
    routeRevision: command.routeRevision,
    ok: true,
    value: { kind: 'void' }
  })
}

function postSelectionResult(port: MessagePort, command: ProviderCommand, selection: { text: string } | null): void {
  port.postMessage({
    type: 'result',
    requestId: command.requestId,
    connectionId: command.connectionId,
    routeRevision: command.routeRevision,
    ok: true,
    value: { kind: 'selection', selection }
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
