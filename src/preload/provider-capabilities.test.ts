import { describe, expect, it, vi } from 'vitest'
import { detectProviderCapabilities, hasProviderCapabilities } from './provider-capabilities'
import type { ProviderCapabilities } from '../shared/provider-bridge-protocol'
import type { ProviderAdapter } from './provider-adapters'

function adapterFor(sequence: ProviderCapabilities[]): ProviderAdapter {
  const detect = vi.fn(() => sequence.shift() ?? {})
  return { detect }
}

describe('detectProviderCapabilities', () => {
  it('returns immediate capabilities without waiting', async () => {
    const adapter = adapterFor([{ readSelection: true }])
    const wait = vi.fn(() => Promise.resolve())

    await expect(detectProviderCapabilities(adapter, { attempts: 3, wait })).resolves.toEqual({ readSelection: true })

    expect(adapter.detect).toHaveBeenCalledTimes(1)
    expect(wait).not.toHaveBeenCalled()
  })

  it('retries empty capabilities before reporting unavailable', async () => {
    const adapter = adapterFor([{}, {}, { readSelection: true }])
    const wait = vi.fn(() => Promise.resolve())

    await expect(detectProviderCapabilities(adapter, { attempts: 4, retryMs: 25, wait })).resolves.toEqual({
      readSelection: true
    })

    expect(adapter.detect).toHaveBeenCalledTimes(3)
    expect(wait).toHaveBeenCalledTimes(2)
    expect(wait).toHaveBeenCalledWith(25)
  })

  it('keeps empty capabilities after retries are exhausted', async () => {
    const adapter = adapterFor([{}, {}, {}])
    const wait = vi.fn(() => Promise.resolve())

    await expect(detectProviderCapabilities(adapter, { attempts: 3, retryMs: 10, wait })).resolves.toEqual({})

    expect(adapter.detect).toHaveBeenCalledTimes(3)
    expect(wait).toHaveBeenCalledTimes(2)
  })
})

describe('hasProviderCapabilities', () => {
  it('requires a real readSelection capability', () => {
    expect(hasProviderCapabilities({ readSelection: true })).toBe(true)
    expect(hasProviderCapabilities({})).toBe(false)
  })
})
