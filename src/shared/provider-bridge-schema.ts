import { PROTOCOL_VERSION, type ProviderBridgeHello } from './provider-bridge-protocol'

function isString(value: unknown): value is string {
  return typeof value === 'string'
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

export function isProviderBridgeHello(value: unknown): value is ProviderBridgeHello {
  return (
    isObject(value) &&
    value.protocolVersion === PROTOCOL_VERSION &&
    isString(value.runtimeId) &&
    value.runtimeId.length > 0
  )
}
