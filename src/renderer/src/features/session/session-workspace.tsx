import { Box, Flex, Stack } from '@chakra-ui/react'
import { useCallback, useEffect, useRef } from 'react'
import type { SessionState, ToastMessage } from '../../../../shared/types'
import type { RunAction } from '../../app/types'
import type { MarkdownDocumentEditorHandle } from '../../editor/markdown-document-editor'
import { StatusNotice } from '../../ui/status-notice'
import { NotePanel } from './note-panel'
import { SessionBar } from './session-bar'
import { useNotePanelState } from './use-note-panel-state'
import { useWorkspaceSplit } from './use-workspace-split'
import { WorkspaceSplitHandle } from './workspace-split-handle'

export function SessionWorkspace({
  sessionState,
  error,
  runAction,
  setSessionState,
  toast
}: {
  error: string | null
  sessionState: SessionState
  runAction: RunAction
  setSessionState: (state: SessionState) => void
  toast: ToastMessage | null
}): JSX.Element {
  const notePanel = useNotePanelState(runAction)
  const workspaceSplit = useWorkspaceSplit(notePanel.rendered)
  const noteEditorRef = useRef<MarkdownDocumentEditorHandle>(null)
  const insertSelection = notePanel.insertSelection
  const openNoteLayout = workspaceSplit.openNoteLayout
  const noteEditorActive =
    workspaceSplit.notePanelInteractive && notePanel.mode === 'editor' && notePanel.currentNote !== null

  const toggleNotePanel = useCallback((): void => {
    if (notePanel.requestedOpen) {
      notePanel.closePanel()
      workspaceSplit.closeNoteLayout()
      return
    }

    notePanel.openPanel()
    workspaceSplit.openNoteLayout()
  }, [notePanel, workspaceSplit])

  useEffect(() => {
    return window.adit.onSessionInsertSelectionRequested((selection) => {
      openNoteLayout()
      insertSelection(selection, (markdown) => noteEditorRef.current?.insertMarkdown(markdown) ?? false)
    })
  }, [insertSelection, openNoteLayout])

  useEffect(() => window.adit.onSessionToggleNoteRequested(toggleNotePanel), [toggleNotePanel])

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent): void => {
      if (event.defaultPrevented || !isToggleNoteShortcut(event)) {
        return
      }

      event.preventDefault()
      toggleNotePanel()
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [toggleNotePanel])

  useEffect(() => {
    void window.adit.setSessionSelectionActionAvailability({ enabled: noteEditorActive })
  }, [noteEditorActive])

  useEffect(
    () => () => {
      void window.adit.setSessionSelectionActionAvailability({ enabled: false })
    },
    []
  )

  return (
    <Flex direction="column" h="100vh" bg="bg" color="fg" overflow="hidden">
      <SessionBar
        sessionState={sessionState}
        runAction={runAction}
        setSessionState={setSessionState}
        notePanelOpen={notePanel.requestedOpen}
        onToggleNotePanel={toggleNotePanel}
      />
      {(error || toast) && (
        <Stack bg="bg" borderBottomColor="border" borderBottomWidth="1px" flexShrink="0" gap="2" p="3">
          {error && <StatusNotice level="error" message={error} />}
          {toast && <StatusNotice level={toast.level} message={toast.message} />}
        </Stack>
      )}
      <Box flex="1" minH="0" overflow="hidden" position="relative">
        {workspaceSplit.notePanelVisible ? (
          <Flex h="full" minW="0">
            <Box flex="0 0 auto" w={`${workspaceSplit.providerWidth}px`} />
            <WorkspaceSplitHandle
              active={workspaceSplit.notePanelInteractive}
              onPointerDown={workspaceSplit.startSplitDrag}
            />
            <NotePanel
              active={workspaceSplit.notePanelInteractive}
              editorRef={noteEditorRef}
              items={notePanel.items}
              loading={notePanel.loading}
              mode={notePanel.mode}
              note={notePanel.currentNote}
              onCreateNote={notePanel.createNote}
              onDropImage={notePanel.saveDroppedImage}
              onExportNote={notePanel.exportNote}
              onOpenNote={(id) => {
                void notePanel.openNote(id)
              }}
              onSwitchNote={() => notePanel.setMode('chooser')}
              onUpdateMarkdown={notePanel.updateNoteMarkdown}
            />
          </Flex>
        ) : (
          <Box h="full" />
        )}
      </Box>
    </Flex>
  )
}

function isToggleNoteShortcut(event: KeyboardEvent): boolean {
  return event.metaKey && event.shiftKey && !event.ctrlKey && !event.altKey && event.key.toLowerCase() === 'n'
}
