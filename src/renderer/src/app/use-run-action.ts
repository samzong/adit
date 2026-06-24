import { useCallback, useState, type Dispatch, type SetStateAction } from 'react'
import type { RunAction } from './types'

export function useRunAction({
  loadLibraryItems,
  loadSparks,
  setError
}: {
  loadLibraryItems: () => Promise<void>
  loadSparks: () => Promise<void>
  setError: Dispatch<SetStateAction<string | null>>
}): { busy: boolean; runAction: RunAction } {
  const [busy, setBusy] = useState(false)

  const runAction = useCallback<RunAction>(
    async (action, options = {}) => {
      setBusy(true)
      setError(null)

      try {
        await action()
        if (options.reloadSparks) {
          await loadSparks()
        }
        if (options.reloadLibrary) {
          await loadLibraryItems()
        }
      } catch (reason) {
        setError(reason instanceof Error ? reason.message : 'Action failed.')
      } finally {
        setBusy(false)
      }
    },
    [loadLibraryItems, loadSparks, setError]
  )

  return { busy, runAction }
}
