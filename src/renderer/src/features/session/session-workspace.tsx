import { Box, Flex } from '@chakra-ui/react'
import { useEffect, useRef } from 'react'
import type { SessionState } from '../../../../shared/types'
import type { RunAction } from '../../app/types'
import type { MarkdownDocumentEditorHandle } from '../../editor/markdown-document-editor'
import { NotePanel } from './note-panel'
import { SessionBar } from './session-bar'
import { useNotePanelState } from './use-note-panel-state'
import { useWorkspaceSplit } from './use-workspace-split'
import { WorkspaceSplitHandle } from './workspace-split-handle'

export function SessionWorkspace({
  sessionState,
  runAction,
  setSessionState
}: {
  sessionState: SessionState
  runAction: RunAction
  setSessionState: (state: SessionState) => void
}): JSX.Element {
  const notePanel = useNotePanelState(runAction)
  const workspaceSplit = useWorkspaceSplit(notePanel.rendered)
  const noteEditorRef = useRef<MarkdownDocumentEditorHandle>(null)
  const insertSelection = notePanel.insertSelection
  const openNoteLayout = workspaceSplit.openNoteLayout
  const noteEditorActive =
    workspaceSplit.notePanelInteractive && notePanel.mode === 'editor' && notePanel.currentNote !== null

  useEffect(() => {
    return window.adit.onSessionInsertSelectionRequested((selection) => {
      openNoteLayout()
      insertSelection(selection, (markdown) => noteEditorRef.current?.insertMarkdown(markdown) ?? false)
    })
  }, [insertSelection, openNoteLayout])

  useEffect(() => {
    void window.adit.setSessionSelectionActionAvailability({ enabled: noteEditorActive })
  }, [noteEditorActive])

  useEffect(
    () => () => {
      void window.adit.setSessionSelectionActionAvailability({ enabled: false })
    },
    []
  )

  const toggleNotePanel = (): void => {
    if (notePanel.requestedOpen) {
      notePanel.closePanel()
      workspaceSplit.closeNoteLayout()
      return
    }

    notePanel.openPanel()
    workspaceSplit.openNoteLayout()
  }

  return (
    <Flex direction="column" h="100vh" bg="bg" color="fg" overflow="hidden">
      <SessionBar
        sessionState={sessionState}
        runAction={runAction}
        setSessionState={setSessionState}
        notePanelOpen={notePanel.requestedOpen}
        onToggleNotePanel={toggleNotePanel}
      />
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
