export const PROTOCOL_VERSION = 1 as const

export const providerBridgeHello = 'provider-bridge:hello'

export const MAX_SELECTION_BYTES = 64 * 1024

export interface ProviderBridgeHello {
  protocolVersion: typeof PROTOCOL_VERSION
  runtimeId: string
}

export interface ProviderCapabilities {
  readSelection?: true
}

export type ProviderBridgeErrorCode =
  | 'adapter_unavailable'
  | 'connection_stale'
  | 'route_stale'
  | 'target_not_found'
  | 'timeout'
  | 'unknown'

export interface ProviderBridgeError {
  code: ProviderBridgeErrorCode
  message?: string
}

export interface BridgeEnvelope {
  connectionId: string
  routeRevision: number
  requestId?: string
}

export interface RefreshCapabilitiesCommand extends BridgeEnvelope {
  type: 'refreshCapabilities'
  requestId: string
}

export interface SetSelectionActionAvailabilityCommand extends BridgeEnvelope {
  type: 'setSelectionActionAvailability'
  requestId: string
  enabled: boolean
}

export type ProviderCommand = RefreshCapabilitiesCommand | SetSelectionActionAvailabilityCommand

export interface AdapterCapturedSelection {
  text: string
}

export type ProviderResultValue = { kind: 'capabilities'; capabilities: ProviderCapabilities } | { kind: 'void' }

export type ProviderResult =
  | {
      type: 'result'
      requestId: string
      connectionId: string
      routeRevision: number
      ok: true
      value: ProviderResultValue
    }
  | {
      type: 'result'
      requestId: string
      connectionId: string
      routeRevision: number
      ok: false
      error: ProviderBridgeError
    }

export type ProviderEvent =
  | {
      type: 'capabilitiesChanged'
      connectionId: string
      routeRevision: number
      capabilities: ProviderCapabilities
    }
  | {
      type: 'insertSelectionRequested'
      connectionId: string
      routeRevision: number
      selection: AdapterCapturedSelection
    }
  | {
      type: 'adapterError'
      connectionId: string
      routeRevision: number
      error: ProviderBridgeError
    }
