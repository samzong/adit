import type { ProviderCapabilities } from '../../shared/provider-bridge-protocol'
import { readSelectionFromRoot, type ProviderSelectionResult } from '../provider-selection'

export function detectChatGptCapabilities(): ProviderCapabilities {
  return document.querySelector('main') ? { readSelection: true } : {}
}

export function readChatGptSelection(): ProviderSelectionResult {
  return readSelectionFromRoot(window.getSelection(), document.querySelector('main'))
}
