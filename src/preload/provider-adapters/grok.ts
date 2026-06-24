import type { ProviderCapabilities } from '../../shared/provider-bridge-protocol'

export function detectGrokCapabilities(): ProviderCapabilities {
  return document.querySelector('#grok-content-area, main') ? { readSelection: true } : {}
}
