import { describe, expect, it } from 'vitest'
import { isProviderBridgeHello } from './provider-bridge-schema'
import { PROTOCOL_VERSION } from './provider-bridge-protocol'

describe('isProviderBridgeHello', () => {
  it('accepts a well-formed hello', () => {
    expect(isProviderBridgeHello({ protocolVersion: PROTOCOL_VERSION, runtimeId: 'abc' })).toBe(true)
  })

  it('rejects wrong protocol version', () => {
    expect(isProviderBridgeHello({ protocolVersion: 2, runtimeId: 'abc' })).toBe(false)
    expect(isProviderBridgeHello({ protocolVersion: '1', runtimeId: 'abc' })).toBe(false)
  })

  it('rejects empty runtimeId', () => {
    expect(isProviderBridgeHello({ protocolVersion: PROTOCOL_VERSION, runtimeId: '' })).toBe(false)
  })

  it('rejects non-string runtimeId', () => {
    expect(isProviderBridgeHello({ protocolVersion: PROTOCOL_VERSION, runtimeId: 123 })).toBe(false)
    expect(isProviderBridgeHello({ protocolVersion: PROTOCOL_VERSION, runtimeId: null })).toBe(false)
  })

  it('rejects non-objects', () => {
    expect(isProviderBridgeHello(null)).toBe(false)
    expect(isProviderBridgeHello(undefined)).toBe(false)
    expect(isProviderBridgeHello('hello')).toBe(false)
    expect(isProviderBridgeHello(1)).toBe(false)
    expect(isProviderBridgeHello([])).toBe(false)
  })

  it('ignores extra fields (forward-compatible, but does NOT carry origin/url)', () => {
    // A payload smuggling origin/href must still validate only on the real fields;
    // main never reads origin/url from the payload regardless.
    const smuggled = {
      protocolVersion: PROTOCOL_VERSION,
      runtimeId: 'abc',
      origin: 'https://evil.com',
      href: 'https://evil.com/c/x'
    }
    expect(isProviderBridgeHello(smuggled)).toBe(true)
  })
})
