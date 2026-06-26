import { useCallback, useEffect, useState, type Dispatch, type SetStateAction } from 'react'
import type { LibraryItemDetail, LibraryItemRow } from '../../../../shared/types'
import type { LibraryKindFilter } from '../../app/types'

export function useLibraryItems(setError: Dispatch<SetStateAction<string | null>>): {
  detail: LibraryItemDetail | null
  items: LibraryItemRow[]
  kind: LibraryKindFilter
  loading: boolean
  loadLibraryItems: () => Promise<void>
  query: string
  setDetail: Dispatch<SetStateAction<LibraryItemDetail | null>>
  setKind: Dispatch<SetStateAction<LibraryKindFilter>>
  setQuery: Dispatch<SetStateAction<string>>
} {
  const [items, setItems] = useState<LibraryItemRow[]>([])
  const [detail, setDetail] = useState<LibraryItemDetail | null>(null)
  const [query, setQuery] = useState('')
  const [kind, setKind] = useState<LibraryKindFilter>('all')
  const [loading, setLoading] = useState(true)

  const loadLibraryItems = useCallback(async () => {
    setError(null)
    const nextItems = await window.adit.listLibraryItems({ kind, query })
    setItems(nextItems)
  }, [kind, query, setError])

  useEffect(() => {
    let cancelled = false
    const timeout = window.setTimeout(() => {
      void loadLibraryItems()
        .catch((reason) => setError(reason instanceof Error ? reason.message : 'Failed to load Library.'))
        .finally(() => {
          if (!cancelled) {
            setLoading(false)
          }
        })
    }, 120)

    return () => {
      cancelled = true
      window.clearTimeout(timeout)
    }
  }, [loadLibraryItems, setError])

  return {
    detail,
    items,
    kind,
    loading,
    loadLibraryItems,
    query,
    setDetail,
    setKind,
    setQuery
  }
}
