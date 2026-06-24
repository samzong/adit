import type { ProviderCapabilities } from '../../shared/provider-bridge-protocol'

export function detectChatGptCapabilities(): ProviderCapabilities {
  return document.querySelector('main') ? { readSelection: true } : {}
}
