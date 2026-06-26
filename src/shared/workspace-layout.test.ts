import { describe, expect, it } from 'vitest'
import { calculateWorkspaceProviderBounds } from './workspace-layout'

describe('calculateWorkspaceProviderBounds', () => {
  it('uses the full width when the note panel is closed', () => {
    expect(calculateWorkspaceProviderBounds(1400, { noteOpen: false, noteCollapsed: false, splitRatio: 0.62 })).toEqual(
      {
        x: 0,
        width: 1400
      }
    )
  })

  it('shrinks to the provider side when the note panel is open', () => {
    expect(calculateWorkspaceProviderBounds(1400, { noteOpen: true, noteCollapsed: false, splitRatio: 0.62 })).toEqual({
      x: 0,
      width: 868
    })
  })
})
