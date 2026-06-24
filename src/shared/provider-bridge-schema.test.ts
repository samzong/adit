import { describe, expect, it } from 'vitest'
import {
  isProviderBridgeHello,
  isProviderCapabilities,
  isProviderCommand,
  isProviderEvent,
  isProviderResult
} from './provider-bridge-schema'
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

  it('ignores extra fields without treating smuggled origin or href as trusted data', () => {
    const smuggled = {
      protocolVersion: PROTOCOL_VERSION,
      runtimeId: 'abc',
      origin: 'https://evil.com',
      href: 'https://evil.com/c/x'
    }
    expect(isProviderBridgeHello(smuggled)).toBe(true)
  })
})

describe('provider bridge command/result/event schemas', () => {
  const envelope = { connectionId: 'conn-1', routeRevision: 0 }

  it('accepts refreshCapabilities commands', () => {
    expect(isProviderCommand({ type: 'refreshCapabilities', requestId: 'req-1', ...envelope })).toBe(true)
  })

  it('rejects commands without valid envelope fields', () => {
    expect(
      isProviderCommand({ type: 'refreshCapabilities', requestId: 'req-1', connectionId: '', routeRevision: 0 })
    ).toBe(false)
    expect(
      isProviderCommand({ type: 'refreshCapabilities', requestId: 'req-1', connectionId: 'conn', routeRevision: -1 })
    ).toBe(false)
  })

  it('accepts capability results and stale-safe errors', () => {
    expect(
      isProviderResult({
        type: 'result',
        requestId: 'req-1',
        ...envelope,
        ok: true,
        value: { kind: 'capabilities', capabilities: { readSelection: true } }
      })
    ).toBe(true)
    expect(
      isProviderResult({
        type: 'result',
        requestId: 'req-1',
        ...envelope,
        ok: false,
        error: { code: 'timeout' }
      })
    ).toBe(true)
  })

  it('rejects array capability payloads', () => {
    expect(isProviderCapabilities([])).toBe(false)
    expect(
      isProviderResult({
        type: 'result',
        requestId: 'req-1',
        ...envelope,
        ok: true,
        value: { kind: 'capabilities', capabilities: [] }
      })
    ).toBe(false)
  })

  it('accepts capability and adapter error events', () => {
    expect(
      isProviderEvent({
        type: 'capabilitiesChanged',
        ...envelope,
        capabilities: { readSelection: true }
      })
    ).toBe(true)
    expect(
      isProviderEvent({
        type: 'adapterError',
        ...envelope,
        error: { code: 'adapter_unavailable' }
      })
    ).toBe(true)
  })

  it('rejects unknown adapter error codes', () => {
    expect(
      isProviderResult({
        type: 'result',
        requestId: 'req-1',
        ...envelope,
        ok: false,
        error: { code: 'not_real' }
      })
    ).toBe(false)
    expect(
      isProviderEvent({
        type: 'adapterError',
        ...envelope,
        error: { code: 'not_real' }
      })
    ).toBe(false)
  })
})
