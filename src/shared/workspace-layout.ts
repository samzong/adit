import type { WorkspaceLayoutRequest } from './types'

export const WORKSPACE_PROVIDER_MIN_WIDTH = 560
export const WORKSPACE_NOTE_MIN_WIDTH = 400
export const WORKSPACE_SPLIT_HANDLE_WIDTH = 8
export const WORKSPACE_DEFAULT_SPLIT_RATIO = 0.62
export const WORKSPACE_MIN_EXPANDED_WIDTH =
  WORKSPACE_PROVIDER_MIN_WIDTH + WORKSPACE_NOTE_MIN_WIDTH + WORKSPACE_SPLIT_HANDLE_WIDTH

export const defaultWorkspaceLayout: WorkspaceLayoutRequest = {
  noteOpen: false,
  noteCollapsed: false,
  splitRatio: WORKSPACE_DEFAULT_SPLIT_RATIO
}

export function calculateWorkspaceProviderBounds(
  contentWidth: number,
  layout: WorkspaceLayoutRequest
): { x: number; width: number } {
  if (!layout.noteOpen || layout.noteCollapsed || contentWidth < WORKSPACE_MIN_EXPANDED_WIDTH) {
    return { x: 0, width: contentWidth }
  }

  const maxProviderWidth = contentWidth - WORKSPACE_NOTE_MIN_WIDTH - WORKSPACE_SPLIT_HANDLE_WIDTH
  const providerWidth = Math.min(
    maxProviderWidth,
    Math.max(WORKSPACE_PROVIDER_MIN_WIDTH, Math.round(contentWidth * layout.splitRatio))
  )

  return { x: 0, width: providerWidth }
}

export function clampWorkspaceSplitRatio(splitRatio: number): number {
  if (!Number.isFinite(splitRatio)) {
    return WORKSPACE_DEFAULT_SPLIT_RATIO
  }

  return Math.min(0.9, Math.max(0.1, splitRatio))
}
