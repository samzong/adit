import { useCallback, useEffect, useRef, useState } from 'react'
import type { LibraryImageInput, LibraryItemDetail, LibraryItemRow } from '../../../../shared/types'
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
  saveDroppedImage: (image: LibraryImageInput, insertMarkdown?: (markdown: string) => boolean) => void
  setMode: (mode: NotePanelMode) => void
  updateNoteMarkdown: (markdown: string) => void
} {
  const [currentNote, setCurrentNote] = useState<LibraryItemDetail | null>(null)
  const [items, setItems] = useState<LibraryItemRow[]>([])
  const [loading, setLoading] = useState(true)
  const [mode, setMode] = useState<NotePanelMode>('chooser')
  const [requestedOpen, setRequestedOpen] = useState(false)
  const [rendered, setRendered] = useState(false)
  const [selectedNoteId, setSelectedNoteIdState] = useState<string | null>(null)
  const selectedNoteIdRef = useRef<string | null>(null)

  const setSelectedNoteId = useCallback((id: string | null) => {
    selectedNoteIdRef.current = id
    setSelectedNoteIdState(id)
  }, [])

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
      const noteId = selectedNoteIdRef.current

      if (noteId) {
        void window.adit.getLibraryItem({ id: noteId }).then((detail) => {
          if (!detail || selectedNoteIdRef.current !== noteId) {
            return
          }

          if (detail.item.kind !== 'markdown_doc') {
            setSelectedNoteId(null)
            setCurrentNote(null)
            setMode('chooser')
            return
          }

          setCurrentNote(detail)
        })
      }
    })

    return unsubscribe
  }, [loadItems, setSelectedNoteId])

  const openNote = useCallback(
    async (id: string): Promise<void> => {
      setSelectedNoteId(id)
      setCurrentNote((latest) => (latest?.item.id === id ? latest : null))
      const detail = await window.adit.touchLibraryItemOpened({ id })

      if (selectedNoteIdRef.current !== id) {
        return
      }

      if (detail.item.kind !== 'markdown_doc') {
        setSelectedNoteId(null)
        setCurrentNote(null)
        setMode('chooser')
        return
      }

      setCurrentNote(detail)
      setMode('editor')
    },
    [setSelectedNoteId]
  )

  const openCurrentOrLastNote = useCallback(async (): Promise<void> => {
    const nextItems = await loadItems()

    if (currentNote && currentNote.item.id === selectedNoteId) {
      setMode('editor')
      return
    }

    const lastOpened = [...nextItems]
      .filter((item) => item.kind === 'markdown_doc')
      .filter((item) => item.last_opened_at !== null)
      .sort((left, right) => (right.last_opened_at ?? 0) - (left.last_opened_at ?? 0))[0]

    if (lastOpened) {
      await openNote(lastOpened.id)
      return
    }

    setMode('chooser')
  }, [currentNote, loadItems, openNote, selectedNoteId])

  const openPanel = useCallback(() => {
    setMode(currentNote && currentNote.item.id === selectedNoteId ? 'editor' : 'chooser')
    setRequestedOpen(true)
    setRendered(true)
    void runAction(openCurrentOrLastNote)
  }, [currentNote, openCurrentOrLastNote, runAction, selectedNoteId])

  const closePanel = useCallback(() => {
    setRequestedOpen(false)
    setRendered(false)
  }, [])

  const createNote = useCallback(() => {
    setSelectedNoteId(null)
    setCurrentNote(null)
    void runAction(
      async () => {
        const detail = await window.adit.createMarkdownLibraryItem()
        setSelectedNoteId(detail.item.id)
        setCurrentNote(detail)
        setMode('editor')
        await loadItems()
      },
      { reloadLibrary: true }
    )
  }, [loadItems, runAction, setSelectedNoteId])

  const exportNote = useCallback(() => {
    if (!currentNote || selectedNoteIdRef.current !== currentNote.item.id) {
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
      if (!text || !currentNote || selectedNoteIdRef.current !== currentNote.item.id) {
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

  const saveDroppedImage = useCallback(
    (image: LibraryImageInput, insertMarkdown?: (markdown: string) => boolean) => {
      void runAction(
        async () => {
          if (mode === 'editor' && currentNote && selectedNoteIdRef.current === currentNote.item.id) {
            const note = currentNote
            const itemId = note.item.id
            const result = await window.adit.addLibraryImageAttachment({ image, itemId })
            const markdown = `${result.markdown}\n`

            if (selectedNoteIdRef.current !== itemId) {
              return
            }

            if (insertMarkdown?.(markdown)) {
              setCurrentNote((latest) => (latest?.item.id === itemId ? result.detail : latest))
            } else {
              const detail = await window.adit.updateLibraryItemContent({
                bodyText: appendMarkdownSelection(markdownFromLibraryDetail(note), result.markdown),
                id: itemId
              })

              if (selectedNoteIdRef.current === itemId) {
                setCurrentNote(detail)
              }
            }
          } else {
            await window.adit.createImageLibraryItem({ image })
          }

          await loadItems()
        },
        { reloadLibrary: true }
      )
    },
    [currentNote, loadItems, mode, runAction]
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
    saveDroppedImage,
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
