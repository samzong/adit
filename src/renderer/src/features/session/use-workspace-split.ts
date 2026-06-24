import { useCallback, useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react'
import type { WorkspaceLayoutRequest } from '../../../../shared/types'
import {
  WORKSPACE_MIN_EXPANDED_WIDTH,
  WORKSPACE_NOTE_MIN_WIDTH,
  WORKSPACE_PROVIDER_MIN_WIDTH,
  WORKSPACE_SPLIT_HANDLE_WIDTH,
  defaultWorkspaceLayout
} from '../../../../shared/workspace-layout'

export function useWorkspaceSplit(notePanelRendered: boolean): {
  closeNoteLayout: () => void
  notePanelInteractive: boolean
  notePanelVisible: boolean
  openNoteLayout: () => void
  providerWidth: number
  startSplitDrag: (event: ReactPointerEvent<HTMLDivElement>) => void
} {
  const [layout, setLayout] = useState<WorkspaceLayoutRequest>(() => ({ ...defaultWorkspaceLayout }))
  const [viewportWidth, setViewportWidth] = useState(() => window.innerWidth)
  const pendingSplitRatio = useRef<number | null>(null)
  const splitFrame = useRef<number | null>(null)
  const noteLayoutOpen = layout.secondarySurface === 'note'
  const secondaryCollapsed = noteLayoutOpen && viewportWidth < WORKSPACE_MIN_EXPANDED_WIDTH
  const notePanelVisible = notePanelRendered && noteLayoutOpen && !secondaryCollapsed
  const notePanelInteractive = notePanelVisible
  const providerWidth =
    noteLayoutOpen && !secondaryCollapsed ? calculateProviderPaneWidth(viewportWidth, layout.splitRatio) : viewportWidth
  const effectiveLayout = useMemo<WorkspaceLayoutRequest>(
    () => ({
      ...layout,
      secondaryCollapsed
    }),
    [layout, secondaryCollapsed]
  )

  useEffect(() => {
    const updateWidth = (): void => setViewportWidth(window.innerWidth)
    window.addEventListener('resize', updateWidth)
    return () => window.removeEventListener('resize', updateWidth)
  }, [])

  useEffect(() => {
    void window.adit.setWorkspaceLayout(effectiveLayout)
  }, [effectiveLayout])

  useEffect(
    () => () => {
      if (splitFrame.current !== null) {
        window.cancelAnimationFrame(splitFrame.current)
      }
    },
    []
  )

  const openNoteLayout = useCallback(() => {
    setLayout((current) => ({
      ...current,
      primarySurface: 'spark',
      secondarySurface: 'note',
      secondaryCollapsed: false
    }))
  }, [])

  const closeNoteLayout = useCallback(() => {
    setLayout((current) => ({
      ...current,
      primarySurface: 'spark',
      secondarySurface: null,
      secondaryCollapsed: false
    }))
  }, [])

  const queueSplitRatio = useCallback((splitRatio: number) => {
    pendingSplitRatio.current = splitRatio

    if (splitFrame.current !== null) {
      return
    }

    splitFrame.current = window.requestAnimationFrame(() => {
      splitFrame.current = null
      const nextSplitRatio = pendingSplitRatio.current
      pendingSplitRatio.current = null

      if (nextSplitRatio !== null) {
        setLayout((current) => ({
          ...current,
          splitRatio: nextSplitRatio
        }))
      }
    })
  }, [])

  const startSplitDrag = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      if (!notePanelInteractive) {
        return
      }

      event.preventDefault()
      event.currentTarget.setPointerCapture(event.pointerId)
      const previousCursor = document.body.style.cursor
      const previousUserSelect = document.body.style.userSelect
      document.body.style.cursor = 'col-resize'
      document.body.style.userSelect = 'none'
      const handleGrabOffset = event.clientX - event.currentTarget.getBoundingClientRect().left

      const updateSplit = (pointerEvent: PointerEvent): void => {
        queueSplitRatio(calculateSplitRatioFromProviderEdge(pointerEvent.clientX - handleGrabOffset, window.innerWidth))
      }
      const stopSplit = (): void => {
        document.body.style.cursor = previousCursor
        document.body.style.userSelect = previousUserSelect
        window.removeEventListener('pointermove', updateSplit)
        window.removeEventListener('pointerup', stopSplit)
        window.removeEventListener('pointercancel', stopSplit)
      }

      updateSplit(event.nativeEvent)
      window.addEventListener('pointermove', updateSplit)
      window.addEventListener('pointerup', stopSplit)
      window.addEventListener('pointercancel', stopSplit)
    },
    [notePanelInteractive, queueSplitRatio]
  )

  return {
    closeNoteLayout,
    notePanelInteractive,
    notePanelVisible,
    openNoteLayout,
    providerWidth,
    startSplitDrag
  }
}

function calculateProviderPaneWidth(contentWidth: number, splitRatio: number): number {
  const maxProviderWidth = contentWidth - WORKSPACE_NOTE_MIN_WIDTH - WORKSPACE_SPLIT_HANDLE_WIDTH
  return Math.min(maxProviderWidth, Math.max(WORKSPACE_PROVIDER_MIN_WIDTH, Math.round(contentWidth * splitRatio)))
}

function calculateSplitRatioFromProviderEdge(providerEdgeX: number, contentWidth: number): number {
  const minRatio = WORKSPACE_PROVIDER_MIN_WIDTH / contentWidth
  const maxRatio = (contentWidth - WORKSPACE_NOTE_MIN_WIDTH - WORKSPACE_SPLIT_HANDLE_WIDTH) / contentWidth
  return Math.min(maxRatio, Math.max(minRatio, providerEdgeX / contentWidth))
}
