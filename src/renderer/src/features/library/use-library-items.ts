import { useCallback, useEffect, useState, type Dispatch, type SetStateAction } from 'react'
import type { LibraryItemDetail, LibraryItemRow } from '../../../../shared/types'

export function useLibraryItems(setError: Dispatch<SetStateAction<string | null>>): {
  detail: LibraryItemDetail | null
  items: LibraryItemRow[]
  loading: boolean
  loadLibraryItems: () => Promise<void>
  query: string
  setDetail: Dispatch<SetStateAction<LibraryItemDetail | null>>
  setQuery: Dispatch<SetStateAction<string>>
} {
  const [items, setItems] = useState<LibraryItemRow[]>([])
  const [detail, setDetail] = useState<LibraryItemDetail | null>(null)
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(true)

  const loadLibraryItems = useCallback(async () => {
    setError(null)
    const nextItems = await window.adit.listLibraryItems({ query })
    setItems(nextItems)
  }, [query, setError])

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
    loading,
    loadLibraryItems,
    query,
    setDetail,
    setQuery
  }
}
