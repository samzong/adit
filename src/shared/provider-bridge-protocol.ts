export const PROTOCOL_VERSION = 1 as const

export const providerBridgeHello = 'provider-bridge:hello'

export interface ProviderBridgeHello {
  protocolVersion: typeof PROTOCOL_VERSION
  runtimeId: string
}
