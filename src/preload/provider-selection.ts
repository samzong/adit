import { MAX_SELECTION_BYTES, type AdapterCapturedSelection } from '../shared/provider-bridge-protocol'

export type ProviderSelectionResult =
  | { kind: 'empty' }
  | { kind: 'selection'; selection: AdapterCapturedSelection }
  | { kind: 'out_of_scope' }
  | { kind: 'too_large' }

interface SelectionLike {
  rangeCount: number
  anchorNode: Node | null
  focusNode: Node | null
  toString: () => string
}

interface ContentRootLike {
  contains: (node: Node | null) => boolean
}

export function readSelectionFromRoot(
  selection: SelectionLike | null,
  contentRoot: ContentRootLike | null
): ProviderSelectionResult {
  if (!selection || selection.rangeCount === 0) {
    return { kind: 'empty' }
  }

  const text = selection.toString()
  if (text.length === 0) {
    return { kind: 'empty' }
  }

  if (
    !contentRoot ||
    !selection.anchorNode ||
    !selection.focusNode ||
    !contentRoot.contains(selection.anchorNode) ||
    !contentRoot.contains(selection.focusNode)
  ) {
    return { kind: 'out_of_scope' }
  }

  if (new TextEncoder().encode(text).length > MAX_SELECTION_BYTES) {
    return { kind: 'too_large' }
  }

  return { kind: 'selection', selection: { text } }
}
