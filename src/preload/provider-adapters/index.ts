import type { ProviderCapabilities } from '../../shared/provider-bridge-protocol'
import type { ProviderSelectionResult } from '../provider-selection'
import { detectChatGptCapabilities, readChatGptSelection } from './chatgpt'
import { detectGrokCapabilities, readGrokSelection } from './grok'

export interface ProviderAdapter {
  detect: () => ProviderCapabilities
  readSelection: () => ProviderSelectionResult
}

export function providerAdapterForHost(hostname: string): ProviderAdapter | null {
  if (isHostMatch(hostname, 'chatgpt.com')) {
    return { detect: detectChatGptCapabilities, readSelection: readChatGptSelection }
  }

  if (isHostMatch(hostname, 'grok.com')) {
    return { detect: detectGrokCapabilities, readSelection: readGrokSelection }
  }

  return null
}

function isHostMatch(hostname: string, host: string): boolean {
  return hostname === host || hostname.endsWith(`.${host}`)
}
