import { useCallback, useRef, type Dispatch, type SetStateAction } from 'react'
import type { LibraryItemDetail } from '../../../shared/types'
import type { RunAction } from '../app/types'
import { applyMarkdownToDetail, primaryMarkdownContent } from './library-markdown'

export function useSaveLibraryMarkdown({
  detail,
  runAction,
  setDetail
}: {
  detail: LibraryItemDetail | null
  runAction: RunAction
  setDetail: Dispatch<SetStateAction<LibraryItemDetail | null>>
}): (markdown: string) => void {
  const saveRevision = useRef(0)

  return useCallback(
    (markdown: string) => {
      const current = detail
      const primary = primaryMarkdownContent(current)

      if (!current || !primary) {
        return
      }

      const revision = saveRevision.current + 1
      saveRevision.current = revision
      const itemId = current.item.id
      const contentId = primary.id

      setDetail((latest) => (latest?.item.id === itemId ? applyMarkdownToDetail(latest, markdown) : latest))

      void runAction(async () => {
        try {
          const saved = await window.adit.updateLibraryItemContent({ id: itemId, contentId, bodyText: markdown })

          if (saveRevision.current === revision) {
            setDetail((latest) => (latest?.item.id === saved.item.id ? saved : latest))
          }
        } catch (error) {
          if (saveRevision.current === revision) {
            const fresh = await window.adit.getLibraryItem({ id: itemId }).catch(() => null)
            setDetail((latest) => (latest?.item.id === itemId ? fresh : latest))
          }

          throw error
        }
      })
    },
    [detail, runAction, setDetail]
  )
}
