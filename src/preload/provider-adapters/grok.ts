import type { ProviderCapabilities } from '../../shared/provider-bridge-protocol'
import { readSelectionFromRoot, type ProviderSelectionResult } from '../provider-selection'

export function detectGrokCapabilities(): ProviderCapabilities {
  return document.querySelector('#grok-content-area, main') ? { readSelection: true } : {}
}

export function readGrokSelection(): ProviderSelectionResult {
  return readSelectionFromRoot(window.getSelection(), document.querySelector('#grok-content-area, main'))
}
