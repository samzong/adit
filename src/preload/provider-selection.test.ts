import { describe, expect, it } from 'vitest'
import { MAX_SELECTION_BYTES } from '../shared/provider-bridge-protocol'
import { readSelectionFromRoot } from './provider-selection'

function selection(text: string, anchorNode: Node, focusNode: Node = anchorNode) {
  return {
    rangeCount: 1,
    anchorNode,
    focusNode,
    toString: () => text
  }
}

function rootContaining(nodes: Node[]) {
  const allowed = new Set(nodes)
  return {
    contains: (node: Node | null): boolean => node !== null && allowed.has(node)
  }
}

function node(): Node {
  return {} as Node
}

describe('readSelectionFromRoot', () => {
  it('returns empty when there is no selection text', () => {
    expect(readSelectionFromRoot(null, rootContaining([]))).toEqual({ kind: 'empty' })
    expect(readSelectionFromRoot(selection('', node()), rootContaining([]))).toEqual({ kind: 'empty' })
  })

  it('rejects selection outside the content root', () => {
    const inside = node()
    const outside = node()

    expect(readSelectionFromRoot(selection('hello', inside, outside), rootContaining([inside]))).toEqual({
      kind: 'out_of_scope'
    })
  })

  it('rejects oversized selection text by encoded byte length', () => {
    const selectedNode = node()

    expect(
      readSelectionFromRoot(
        selection('a'.repeat(MAX_SELECTION_BYTES + 1), selectedNode),
        rootContaining([selectedNode])
      )
    ).toEqual({
      kind: 'too_large'
    })
  })

  it('returns plain text for an in-scope selection', () => {
    const selectedNode = node()

    expect(readSelectionFromRoot(selection('hello', selectedNode), rootContaining([selectedNode]))).toEqual({
      kind: 'selection',
      selection: { text: 'hello' }
    })
  })
})
