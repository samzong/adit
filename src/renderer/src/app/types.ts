import type { LibraryItemKind } from '../../../shared/types'

export type Section = 'spark' | 'library'
export type RunAction = (
  action: () => Promise<void>,
  options?: { reloadLibrary?: boolean; reloadSparks?: boolean }
) => Promise<void>
export type LibraryKindFilter = LibraryItemKind | 'all'
