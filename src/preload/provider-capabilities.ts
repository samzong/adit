import type { ProviderCapabilities } from '../shared/provider-bridge-protocol'
import type { ProviderAdapter } from './provider-adapters'

const CAPABILITY_DETECT_ATTEMPTS = 6
const CAPABILITY_DETECT_RETRY_MS = 150

export interface ProviderCapabilityDetectOptions {
  attempts?: number
  retryMs?: number
  wait?: (ms: number) => Promise<void>
}

export async function detectProviderCapabilities(
  adapter: ProviderAdapter,
  options: ProviderCapabilityDetectOptions = {}
): Promise<ProviderCapabilities> {
  const attempts = Math.max(1, options.attempts ?? CAPABILITY_DETECT_ATTEMPTS)
  const retryMs = options.retryMs ?? CAPABILITY_DETECT_RETRY_MS
  const wait = options.wait ?? delay

  let capabilities = adapter.detect()

  for (let attempt = 1; attempt < attempts && !hasProviderCapabilities(capabilities); attempt += 1) {
    await wait(retryMs)
    capabilities = adapter.detect()
  }

  return capabilities
}

export function hasProviderCapabilities(capabilities: ProviderCapabilities): boolean {
  return capabilities.readSelection === true
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms)
  })
}
