import {
  PROTOCOL_VERSION,
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
  'capability_unavailable',
  'connection_stale',
  'route_stale',
  'target_not_found',
  'selection_empty',
  'selection_out_of_scope',
  'payload_too_large',
  'write_failed',
  'verification_failed',
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
  return isObject(value) && value.type === 'refreshCapabilities' && hasBridgeEnvelope(value, true)
}

function isProviderBridgeErrorCode(value: unknown): value is ProviderBridgeErrorCode {
  return isString(value) && providerBridgeErrorCodes.has(value as ProviderBridgeErrorCode)
}

function isProviderBridgeError(value: unknown): value is ProviderBridgeError {
  return (
    isObject(value) && isProviderBridgeErrorCode(value.code) && (value.message === undefined || isString(value.message))
  )
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

  return value.type === 'adapterError' && isProviderBridgeError(value.error)
}
