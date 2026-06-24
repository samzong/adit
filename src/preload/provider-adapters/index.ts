import type { ProviderCapabilities } from '../../shared/provider-bridge-protocol'
import { detectChatGptCapabilities } from './chatgpt'
import { detectGrokCapabilities } from './grok'

export interface ProviderAdapter {
  detect: () => ProviderCapabilities
}

export function providerAdapterForHost(hostname: string): ProviderAdapter | null {
  if (isHostMatch(hostname, 'chatgpt.com')) {
    return { detect: detectChatGptCapabilities }
  }

  if (isHostMatch(hostname, 'grok.com')) {
    return { detect: detectGrokCapabilities }
  }

  return null
}

function isHostMatch(hostname: string, host: string): boolean {
  return hostname === host || hostname.endsWith(`.${host}`)
}
