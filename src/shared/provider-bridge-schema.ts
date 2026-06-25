import {
  MAX_SELECTION_BYTES,
  PROTOCOL_VERSION,
  type AdapterCapturedSelection,
  type ProviderBridgeError,
  type ProviderBridgeErrorCode,
  type ProviderBridgeHello,
  type ProviderCapabilities,
  type ProviderCommand,
  type ProviderEvent,
  type ProviderResult,
  type ProviderResultValue
} from './provider-bridge-protocol'

const providerBridgeErrorCodes = new Set<ProviderBridgeErrorCode>([
  'adapter_unavailable',
  'connection_stale',
  'route_stale',
  'target_not_found',
  'timeout',
  'unknown'
])

function isString(value: unknown): value is string {
  return typeof value === 'string'
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isNonEmptyString(value: unknown): value is string {
  return isString(value) && value.length > 0
}

function isNonNegativeInteger(value: unknown): value is number {
  return Number.isInteger(value) && typeof value === 'number' && value >= 0
}

export function isProviderBridgeHello(value: unknown): value is ProviderBridgeHello {
  return isObject(value) && value.protocolVersion === PROTOCOL_VERSION && isNonEmptyString(value.runtimeId)
}

export function isProviderCapabilities(value: unknown): value is ProviderCapabilities {
  return isObject(value) && (value.readSelection === undefined || value.readSelection === true)
}

function hasBridgeEnvelope(value: Record<string, unknown>, requireRequestId: boolean): boolean {
  return (
    isNonEmptyString(value.connectionId) &&
    isNonNegativeInteger(value.routeRevision) &&
    (requireRequestId ? isNonEmptyString(value.requestId) : value.requestId === undefined)
  )
}

export function isProviderCommand(value: unknown): value is ProviderCommand {
  if (!isObject(value) || !hasBridgeEnvelope(value, true)) {
    return false
  }

  if (value.type === 'refreshCapabilities') {
    return true
  }

  return value.type === 'setSelectionActionAvailability' && typeof value.enabled === 'boolean'
}

function isProviderBridgeErrorCode(value: unknown): value is ProviderBridgeErrorCode {
  return isString(value) && providerBridgeErrorCodes.has(value as ProviderBridgeErrorCode)
}

function isProviderBridgeError(value: unknown): value is ProviderBridgeError {
  return (
    isObject(value) && isProviderBridgeErrorCode(value.code) && (value.message === undefined || isString(value.message))
  )
}

export function isAdapterCapturedSelection(value: unknown): value is AdapterCapturedSelection {
  return isObject(value) && isString(value.text) && encodedByteLength(value.text) <= MAX_SELECTION_BYTES
}

function isProviderResultValue(value: unknown): value is ProviderResultValue {
  if (!isObject(value) || !isString(value.kind)) {
    return false
  }

  if (value.kind === 'capabilities') {
    return isProviderCapabilities(value.capabilities)
  }

  return value.kind === 'void'
}

export function isProviderResult(value: unknown): value is ProviderResult {
  if (!isObject(value) || value.type !== 'result' || !hasBridgeEnvelope(value, true) || typeof value.ok !== 'boolean') {
    return false
  }

  if (value.ok) {
    return isProviderResultValue(value.value)
  }

  return isProviderBridgeError(value.error)
}

export function isProviderEvent(value: unknown): value is ProviderEvent {
  if (!isObject(value) || !hasBridgeEnvelope(value, false)) {
    return false
  }

  if (value.type === 'capabilitiesChanged') {
    return isProviderCapabilities(value.capabilities)
  }

  if (value.type === 'insertSelectionRequested') {
    return isAdapterCapturedSelection(value.selection)
  }

  return value.type === 'adapterError' && isProviderBridgeError(value.error)
}

function encodedByteLength(value: string): number {
  return new TextEncoder().encode(value).length
}
