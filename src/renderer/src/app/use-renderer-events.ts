import { useEffect, type Dispatch, type SetStateAction } from 'react'
import type { LibraryItemDetail, SessionState, ToastMessage } from '../../../shared/types'

export function useRendererEvents({
  libraryDetail,
  loadLibraryItems,
  loadSparks,
  setError,
  setLibraryDetail,
  setSessionState,
  setToast
}: {
  libraryDetail: LibraryItemDetail | null
  loadLibraryItems: () => Promise<void>
  loadSparks: () => Promise<void>
  setError: Dispatch<SetStateAction<string | null>>
  setLibraryDetail: Dispatch<SetStateAction<LibraryItemDetail | null>>
  setSessionState: Dispatch<SetStateAction<SessionState>>
  setToast: Dispatch<SetStateAction<ToastMessage | null>>
}): void {
  useEffect(() => {
    let cancelled = false

    async function boot(): Promise<void> {
      try {
        const nextState = await window.adit.getSessionState()

        if (!cancelled) {
          setSessionState(nextState)
        }
      } catch (reason) {
        if (!cancelled) {
          setError(reason instanceof Error ? reason.message : 'Failed to load Adit.')
        }
      }
    }

    void boot()
    return () => {
      cancelled = true
    }
  }, [setError, setSessionState])

  useEffect(() => {
    const unsubscribers = [
      window.adit.onSparksChanged(() => {
        void loadSparks().catch((reason) =>
          setError(reason instanceof Error ? reason.message : 'Failed to load Sparks.')
        )
      }),
      window.adit.onLibraryChanged(() => {
        void loadLibraryItems().catch((reason) =>
          setError(reason instanceof Error ? reason.message : 'Failed to load Library.')
        )
        if (libraryDetail) {
          void window.adit.getLibraryItem({ id: libraryDetail.item.id }).then((detail) => {
            if (detail) {
              setLibraryDetail(detail)
            }
          })
        }
      }),
      window.adit.onSessionStateChanged(setSessionState),
      window.adit.onToast((message) => {
        setToast(message)
        window.setTimeout(() => setToast(null), 4000)
      })
    ]

    return () => unsubscribers.forEach((unsubscribe) => unsubscribe())
  }, [libraryDetail, loadLibraryItems, loadSparks, setError, setLibraryDetail, setSessionState, setToast])
}
