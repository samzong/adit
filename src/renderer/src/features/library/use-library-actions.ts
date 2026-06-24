import { useCallback, type Dispatch, type SetStateAction } from 'react'
import type { LibraryItemDetail } from '../../../../shared/types'
import type { RunAction } from '../../app/types'
import { useSaveLibraryMarkdown } from '../../editor/use-save-library-markdown'

export function useLibraryActions({
  detail,
  runAction,
  setDetail
}: {
  detail: LibraryItemDetail | null
  runAction: RunAction
  setDetail: Dispatch<SetStateAction<LibraryItemDetail | null>>
}): {
  closeLibraryItem: () => void
  createLibraryItem: () => void
  exportLibraryItem: () => void
  openLibraryItem: (id: string) => void
  updateLibraryMarkdown: (markdown: string) => void
} {
  const createLibraryItem = useCallback(() => {
    void runAction(
      async () => {
        setDetail(await window.adit.createMarkdownLibraryItem())
      },
      { reloadLibrary: true }
    )
  }, [runAction, setDetail])

  const openLibraryItem = useCallback(
    (id: string) => {
      void runAction(
        async () => {
          setDetail(await window.adit.touchLibraryItemOpened({ id }))
        },
        { reloadLibrary: true }
      )
    },
    [runAction, setDetail]
  )

  const closeLibraryItem = useCallback(() => {
    setDetail(null)
  }, [setDetail])

  const updateLibraryMarkdown = useSaveLibraryMarkdown({ detail, runAction, setDetail })

  const exportLibraryItem = useCallback(() => {
    if (!detail) {
      return
    }

    void runAction(async () => {
      await window.adit.exportMarkdownLibraryItem({ id: detail.item.id })
    })
  }, [detail, runAction])

  return {
    closeLibraryItem,
    createLibraryItem,
    exportLibraryItem,
    openLibraryItem,
    updateLibraryMarkdown
  }
}
