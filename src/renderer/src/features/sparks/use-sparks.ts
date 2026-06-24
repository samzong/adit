import { useCallback, useEffect, useState, type Dispatch, type SetStateAction } from 'react'
import type { SparkRow } from '../../../../shared/types'

export function useSparks(setError: Dispatch<SetStateAction<string | null>>): {
  archived: boolean
  loading: boolean
  loadSparks: () => Promise<void>
  query: string
  setArchived: Dispatch<SetStateAction<boolean>>
  setQuery: Dispatch<SetStateAction<string>>
  sparks: SparkRow[]
} {
  const [sparks, setSparks] = useState<SparkRow[]>([])
  const [archived, setArchived] = useState(false)
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(true)

  const loadSparks = useCallback(async () => {
    setError(null)
    const nextSparks = await window.adit.listSparks({ archived, query })
    setSparks(nextSparks)
  }, [archived, query, setError])

  useEffect(() => {
    let cancelled = false
    const timeout = window.setTimeout(() => {
      void loadSparks()
        .catch((reason) => setError(reason instanceof Error ? reason.message : 'Failed to load Sparks.'))
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
  }, [loadSparks, setError])

  return {
    archived,
    loading,
    loadSparks,
    query,
    setArchived,
    setQuery,
    sparks
  }
}
