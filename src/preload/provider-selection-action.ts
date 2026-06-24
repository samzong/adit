import type { AdapterCapturedSelection, ProviderCommand } from '../shared/provider-bridge-protocol'
import type { ProviderAdapter } from './provider-adapters'

export const providerSelectionActionCss = `
.adit-provider-selection-action {
  align-items: center !important;
  background: #b06440 !important;
  border: 1px solid rgba(0, 0, 0, 0.08) !important;
  border-radius: 9px !important;
  box-shadow: 0 10px 26px rgba(52, 32, 21, 0.18), 0 2px 7px rgba(52, 32, 21, 0.12) !important;
  box-sizing: border-box !important;
  color: #fff !important;
  cursor: pointer !important;
  display: inline-flex !important;
  font-family: -apple-system, BlinkMacSystemFont, "Hanken Grotesk", "Segoe UI", sans-serif !important;
  font-size: 13px !important;
  font-weight: 650 !important;
  gap: 6px !important;
  height: 32px !important;
  justify-content: center !important;
  line-height: 1 !important;
  min-width: 122px !important;
  opacity: 1 !important;
  padding: 0 12px !important;
  pointer-events: auto !important;
  position: fixed !important;
  transform: translateY(0) !important;
  transition: opacity 120ms ease, transform 120ms ease !important;
  user-select: none !important;
  white-space: nowrap !important;
  z-index: 2147483647 !important;
}

.adit-provider-selection-action:hover {
  background: #9c5638 !important;
}

.adit-provider-selection-action[data-hidden="true"] {
  opacity: 0 !important;
  pointer-events: none !important;
  transform: translateY(2px) !important;
}
`

interface RouteEnvelope {
  connectionId: string
  routeRevision: number
}

export interface ProviderSelectionAction {
  dispose: () => void
  setEnabled: (enabled: boolean) => void
  setRoute: (command: ProviderCommand) => void
}

export function createProviderSelectionAction(port: MessagePort, adapter: ProviderAdapter): ProviderSelectionAction {
  let enabled = false
  let pointerSelecting = false
  let route: RouteEnvelope | null = null
  let button: HTMLButtonElement | null = null
  let updateTimer: number | null = null

  const ensureButton = (): HTMLButtonElement => {
    if (button) {
      return button
    }

    const nextButton = document.createElement('button')
    nextButton.type = 'button'
    nextButton.className = 'adit-provider-selection-action'
    nextButton.textContent = 'Insert selection'
    nextButton.dataset.hidden = 'true'
    nextButton.addEventListener('mousedown', (event) => {
      event.preventDefault()
      event.stopPropagation()
    })
    nextButton.addEventListener('click', (event) => {
      event.preventDefault()
      event.stopPropagation()
      requestInsert()
    })
    ;(document.body ?? document.documentElement).appendChild(nextButton)
    button = nextButton
    return nextButton
  }

  const hide = (): void => {
    if (button) {
      button.dataset.hidden = 'true'
    }
  }

  const requestInsert = (): void => {
    const selection = currentSelection()
    if (!selection || !route) {
      hide()
      return
    }

    port.postMessage({
      type: 'insertSelectionRequested',
      connectionId: route.connectionId,
      routeRevision: route.routeRevision,
      selection
    })
    hide()
  }

  const update = (): void => {
    updateTimer = null
    const selection = currentSelection()
    const rect = currentSelectionAnchorRect()

    if (!enabled || pointerSelecting || !selection || !rect || !route) {
      hide()
      return
    }

    const action = ensureButton()
    const width = action.getBoundingClientRect().width || 122
    const height = action.getBoundingClientRect().height || 32
    const left = clamp(rect.right - width, 12, window.innerWidth - width - 12)
    const preferredTop = rect.top - height - 8
    const top = clamp(preferredTop >= 12 ? preferredTop : rect.bottom + 8, 12, window.innerHeight - height - 12)
    action.style.left = `${left}px`
    action.style.top = `${top}px`
    action.dataset.hidden = 'false'
  }

  const queueUpdate = (): void => {
    if (!enabled) {
      hide()
      return
    }

    if (updateTimer !== null) {
      window.clearTimeout(updateTimer)
    }
    updateTimer = window.setTimeout(update, 20)
  }

  const handlePointerDown = (event: PointerEvent): void => {
    if (button && event.target instanceof Node && button.contains(event.target)) {
      return
    }

    pointerSelecting = true
    hide()
  }
  const handlePointerUp = (): void => {
    pointerSelecting = false
    queueUpdate()
  }
  const handleSelectionChange = (): void => {
    if (pointerSelecting) {
      hide()
      return
    }

    if (button?.dataset.hidden === 'false') {
      queueUpdate()
    }
  }
  const handleViewportChange = (): void => {
    if (button?.dataset.hidden === 'false') {
      queueUpdate()
    }
  }

  document.addEventListener('selectionchange', handleSelectionChange)
  window.addEventListener('pointerdown', handlePointerDown, true)
  window.addEventListener('pointerup', handlePointerUp, true)
  window.addEventListener('keyup', queueUpdate, true)
  window.addEventListener('resize', handleViewportChange)
  window.addEventListener('scroll', handleViewportChange, true)
  window.addEventListener('beforeunload', () => action.dispose(), { once: true })

  const action: ProviderSelectionAction = {
    dispose: () => {
      if (updateTimer !== null) {
        window.clearTimeout(updateTimer)
        updateTimer = null
      }
      document.removeEventListener('selectionchange', handleSelectionChange)
      window.removeEventListener('pointerdown', handlePointerDown, true)
      window.removeEventListener('pointerup', handlePointerUp, true)
      window.removeEventListener('keyup', queueUpdate, true)
      window.removeEventListener('resize', handleViewportChange)
      window.removeEventListener('scroll', handleViewportChange, true)
      button?.remove()
      button = null
    },
    setEnabled: (nextEnabled) => {
      enabled = nextEnabled
      if (enabled) {
        queueUpdate()
      } else {
        hide()
      }
    },
    setRoute: (command) => {
      route = {
        connectionId: command.connectionId,
        routeRevision: command.routeRevision
      }
    }
  }

  return action

  function currentSelection(): AdapterCapturedSelection | null {
    const result = adapter.readSelection()
    return result.kind === 'selection' ? result.selection : null
  }
}

interface SelectionAnchorRect {
  bottom: number
  right: number
  top: number
}

function currentSelectionAnchorRect(): SelectionAnchorRect | null {
  const selection = window.getSelection()
  if (!selection || selection.rangeCount === 0 || selection.toString().trim() === '') {
    return null
  }

  const range = selection.getRangeAt(0)
  const rects = Array.from(range.getClientRects())
    .map(visibleSelectionRect)
    .filter((rect): rect is SelectionAnchorRect => rect !== null)
    .sort((left, right) => left.top - right.top || right.right - left.right)

  if (rects.length > 0) {
    return rects[0]
  }

  return visibleSelectionRect(range.getBoundingClientRect())
}

function visibleSelectionRect(rect: DOMRect | DOMRectReadOnly): SelectionAnchorRect | null {
  if (rect.width <= 0 || rect.height <= 0) {
    return null
  }

  if (rect.right <= 0 || rect.left >= window.innerWidth || rect.bottom <= 0 || rect.top >= window.innerHeight) {
    return null
  }

  return {
    bottom: clamp(rect.bottom, 0, window.innerHeight),
    right: clamp(rect.right, 0, window.innerWidth),
    top: clamp(rect.top, 0, window.innerHeight)
  }
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}
