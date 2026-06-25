import { useCallback, useEffect, useState } from 'react'
import type { LibraryItemDetail, LibraryItemRow } from '../../../../shared/types'
import type { AdapterCapturedSelection } from '../../../../shared/provider-bridge-protocol'
import type { RunAction } from '../../app/types'
import { markdownFromLibraryDetail } from '../../editor/library-markdown'
import { useSaveLibraryMarkdown } from '../../editor/use-save-library-markdown'
import type { NotePanelMode } from './note-panel'

export function useNotePanelState(runAction: RunAction): {
  closePanel: () => void
  createNote: () => void
  currentNote: LibraryItemDetail | null
  exportNote: () => void
  insertSelection: (selection: AdapterCapturedSelection, insertMarkdown?: (markdown: string) => boolean) => void
  items: LibraryItemRow[]
  loading: boolean
  mode: NotePanelMode
  openNote: (id: string) => Promise<void>
  openPanel: () => void
  rendered: boolean
  requestedOpen: boolean
  setMode: (mode: NotePanelMode) => void
  updateNoteMarkdown: (markdown: string) => void
} {
  const [currentNote, setCurrentNote] = useState<LibraryItemDetail | null>(null)
  const [items, setItems] = useState<LibraryItemRow[]>([])
  const [loading, setLoading] = useState(true)
  const [mode, setMode] = useState<NotePanelMode>('chooser')
  const [requestedOpen, setRequestedOpen] = useState(false)
  const [rendered, setRendered] = useState(false)

  const loadItems = useCallback(async (): Promise<LibraryItemRow[]> => {
    setLoading(true)
    const nextItems = await window.adit.listLibraryItems()
    setItems(nextItems)
    setLoading(false)
    return nextItems
  }, [])

  useEffect(() => {
    void loadItems().catch(() => setLoading(false))
  }, [loadItems])

  useEffect(() => {
    const unsubscribe = window.adit.onLibraryChanged(() => {
      void loadItems()
      if (currentNote) {
        void window.adit.getLibraryItem({ id: currentNote.item.id }).then((detail) => {
          if (detail) {
            setCurrentNote(detail)
          }
        })
      }
    })

    return unsubscribe
  }, [currentNote, loadItems])

  const openNote = useCallback(async (id: string): Promise<void> => {
    setCurrentNote(await window.adit.touchLibraryItemOpened({ id }))
    setMode('editor')
  }, [])

  const openCurrentOrLastNote = useCallback(async (): Promise<void> => {
    const nextItems = await loadItems()

    if (currentNote) {
      setMode('editor')
      return
    }

    const lastOpened = [...nextItems]
      .filter((item) => item.last_opened_at !== null)
      .sort((left, right) => (right.last_opened_at ?? 0) - (left.last_opened_at ?? 0))[0]

    if (lastOpened) {
      await openNote(lastOpened.id)
      return
    }

    setMode('chooser')
  }, [currentNote, loadItems, openNote])

  const openPanel = useCallback(() => {
    setMode(currentNote ? 'editor' : 'chooser')
    setRequestedOpen(true)
    setRendered(true)
    void runAction(openCurrentOrLastNote)
  }, [currentNote, openCurrentOrLastNote, runAction])

  const closePanel = useCallback(() => {
    setRequestedOpen(false)
    setRendered(false)
  }, [])

  const createNote = useCallback(() => {
    void runAction(
      async () => {
        setCurrentNote(await window.adit.createMarkdownLibraryItem())
        setMode('editor')
        await loadItems()
      },
      { reloadLibrary: true }
    )
  }, [loadItems, runAction])

  const exportNote = useCallback(() => {
    if (!currentNote) {
      return
    }

    void runAction(async () => {
      await window.adit.exportMarkdownLibraryItem({ id: currentNote.item.id })
    })
  }, [currentNote, runAction])

  const updateNoteMarkdown = useSaveLibraryMarkdown({
    detail: currentNote,
    runAction,
    setDetail: setCurrentNote
  })

  const insertSelection = useCallback(
    (selection: AdapterCapturedSelection, insertMarkdown?: (markdown: string) => boolean) => {
      const text = selection.text.replace(/\r\n/g, '\n').trim()
      if (!text || !currentNote) {
        return
      }

      setRequestedOpen(true)
      setRendered(true)
      setMode('editor')

      if (insertMarkdown?.(text)) {
        return
      }

      updateNoteMarkdown(appendMarkdownSelection(markdownFromLibraryDetail(currentNote), text))
    },
    [currentNote, updateNoteMarkdown]
  )

  return {
    closePanel,
    createNote,
    currentNote,
    exportNote,
    insertSelection,
    items,
    loading,
    mode,
    openNote,
    openPanel,
    rendered,
    requestedOpen,
    setMode,
    updateNoteMarkdown
  }
}

function appendMarkdownSelection(markdown: string, selection: string): string {
  if (markdown.trim() === '') {
    return `${selection}\n`
  }

  return `${markdown.trimEnd()}\n\n${selection}\n`
}
