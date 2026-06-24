import { Box, Flex, Stack } from '@chakra-ui/react'
import { useCallback, useState } from 'react'
import type { ProviderId, SessionState, ToastMessage } from '../../shared/types'
import { FooterBar, SectionTabs, StandaloneNotice, TitleBar, Toolbar } from './app/shell'
import type { Section } from './app/types'
import { useRendererEvents } from './app/use-renderer-events'
import { useRunAction } from './app/use-run-action'
import { LibraryContent } from './features/library/library-content'
import { LibraryToolbar } from './features/library/library-toolbar'
import { useLibraryActions } from './features/library/use-library-actions'
import { useLibraryItems } from './features/library/use-library-items'
import { SessionWorkspace } from './features/session/session-workspace'
import { SparksContent } from './features/sparks/sparks-content'
import { useSparks } from './features/sparks/use-sparks'
import { StatusNotice } from './ui/status-notice'

const emptyState: SessionState = {
  mode: 'list',
  provider: null,
  sparkId: null,
  sessionUrl: null,
  title: null
}

export function App(): JSX.Element {
  if (!window.adit) {
    return <StandaloneNotice />
  }

  return <ElectronApp />
}

function ElectronApp(): JSX.Element {
  const [section, setSection] = useState<Section>('spark')
  const [sessionState, setSessionState] = useState<SessionState>(emptyState)
  const [toast, setToast] = useState<ToastMessage | null>(null)
  const [error, setError] = useState<string | null>(null)

  const sparks = useSparks(setError)
  const library = useLibraryItems(setError)
  const { busy, runAction } = useRunAction({
    loadLibraryItems: library.loadLibraryItems,
    loadSparks: sparks.loadSparks,
    setError
  })
  const libraryActions = useLibraryActions({
    detail: library.detail,
    runAction,
    setDetail: library.setDetail
  })

  useRendererEvents({
    libraryDetail: library.detail,
    loadLibraryItems: library.loadLibraryItems,
    loadSparks: sparks.loadSparks,
    setError,
    setLibraryDetail: library.setDetail,
    setSessionState,
    setToast
  })

  const createSession = useCallback(
    (provider: ProviderId) => {
      void runAction(async () => setSessionState(await window.adit.createSession({ provider })))
    },
    [runAction]
  )

  if (sessionState.mode !== 'list') {
    return <SessionWorkspace sessionState={sessionState} runAction={runAction} setSessionState={setSessionState} />
  }

  return (
    <Flex direction="column" h="100vh" bg="bg" color="fg" overflow="hidden">
      <TitleBar />
      <SectionTabs section={section} setSection={setSection} />
      {section === 'spark' ? (
        <Toolbar
          busy={busy}
          query={sparks.query}
          setQuery={sparks.setQuery}
          archived={sparks.archived}
          setArchived={sparks.setArchived}
          onCreateSession={createSession}
        />
      ) : library.detail ? null : (
        <LibraryToolbar
          busy={busy}
          kind={library.kind}
          query={library.query}
          setKind={library.setKind}
          setQuery={library.setQuery}
          onCreateItem={libraryActions.createLibraryItem}
        />
      )}

      <Box flex="1" overflowY="auto">
        <Stack gap="4" p="6">
          {(error || toast) && (
            <Stack gap="2">
              {error && <StatusNotice level="error" message={error} />}
              {toast && <StatusNotice level={toast.level} message={toast.message} />}
            </Stack>
          )}

          {section === 'library' ? (
            <LibraryContent
              busy={busy}
              detail={library.detail}
              items={library.items}
              loading={library.loading}
              onBack={libraryActions.closeLibraryItem}
              onExport={libraryActions.exportLibraryItem}
              onOpen={libraryActions.openLibraryItem}
              onUpdateMarkdown={libraryActions.updateLibraryMarkdown}
              runAction={runAction}
            />
          ) : (
            <SparksContent
              archived={sparks.archived}
              busy={busy}
              loading={sparks.loading}
              sparks={sparks.sparks}
              runAction={runAction}
              setSessionState={setSessionState}
            />
          )}
        </Stack>
      </Box>

      <FooterBar />
    </Flex>
  )
}
