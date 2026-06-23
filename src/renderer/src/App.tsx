import {
  Badge,
  Box,
  Button,
  Card,
  Container,
  EmptyState,
  Flex,
  HStack,
  Heading,
  Icon,
  IconButton,
  Input,
  SegmentGroup,
  Stack,
  Text
} from '@chakra-ui/react'
import { Archive, Circle, Clock3, FileText, FolderOpen, MessageSquare, RotateCcw, Search, Sparkles } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import type { NoteRow, ProviderId, SessionState, ToastMessage } from '../../shared/types'

const emptyState: SessionState = {
  mode: 'list',
  provider: null,
  noteId: null,
  sessionUrl: null,
  title: null
}

const viewItems = [
  { label: 'Active', value: 'active' },
  { label: 'Archive', value: 'archive' }
]

export function App(): JSX.Element {
  if (!window.adit) {
    return <StandaloneNotice />
  }

  return <ElectronApp />
}

function ElectronApp(): JSX.Element {
  const [notes, setNotes] = useState<NoteRow[]>([])
  const [archived, setArchived] = useState(false)
  const [query, setQuery] = useState('')
  const [sessionState, setSessionState] = useState<SessionState>(emptyState)
  const [toast, setToast] = useState<ToastMessage | null>(null)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const loadNotes = useCallback(async () => {
    setError(null)
    const nextNotes = await window.adit.listNotes({ archived, query })
    setNotes(nextNotes)
  }, [archived, query])

  useEffect(() => {
    let cancelled = false

    async function boot(): Promise<void> {
      try {
        const [nextNotes, nextState] = await Promise.all([
          window.adit.listNotes({ archived, query }),
          window.adit.getSessionState()
        ])

        if (!cancelled) {
          setNotes(nextNotes)
          setSessionState(nextState)
        }
      } catch (reason) {
        if (!cancelled) {
          setError(reason instanceof Error ? reason.message : 'Failed to load Adit.')
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    void boot()
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      void loadNotes().catch((reason) => setError(reason instanceof Error ? reason.message : 'Failed to load notes.'))
    }, 120)

    return () => window.clearTimeout(timeout)
  }, [loadNotes])

  useEffect(() => {
    const unsubscribers = [
      window.adit.onNotesChanged(() => {
        void loadNotes().catch((reason) => setError(reason instanceof Error ? reason.message : 'Failed to load notes.'))
      }),
      window.adit.onSessionStateChanged(setSessionState),
      window.adit.onToast((message) => {
        setToast(message)
        window.setTimeout(() => setToast(null), 4000)
      })
    ]

    return () => unsubscribers.forEach((unsubscribe) => unsubscribe())
  }, [loadNotes])

  async function runAction(action: () => Promise<void>): Promise<void> {
    setBusy(true)
    setError(null)

    try {
      await action()
      await loadNotes()
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Action failed.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Box minH="100vh" bg="bg" color="fg">
      <TopBar busy={busy} sessionState={sessionState} runAction={runAction} setSessionState={setSessionState} />

      {sessionState.mode === 'list' && (
        <Container maxW="960px" py="4">
          <Stack gap="3.5">
            <NotesToolbar archived={archived} query={query} setArchived={setArchived} setQuery={setQuery} />

            <Stack gap="2">
              <Text color="muted" fontSize="xs">
                Email/password sign-in only.
              </Text>
              {error && <StatusNotice level="error" message={error} />}
              {toast && <StatusNotice level={toast.level} message={toast.message} />}
            </Stack>

            <NotesContent
              archived={archived}
              busy={busy}
              loading={loading}
              notes={notes}
              runAction={runAction}
              setSessionState={setSessionState}
            />
          </Stack>
        </Container>
      )}
    </Box>
  )
}

interface TopBarProps {
  busy: boolean
  sessionState: SessionState
  runAction: (action: () => Promise<void>) => Promise<void>
  setSessionState: (state: SessionState) => void
}

function TopBar({ busy, sessionState, runAction, setSessionState }: TopBarProps): JSX.Element {
  const inSession = sessionState.mode !== 'list'
  const activeTitle = useMemo(() => {
    if (sessionState.title) {
      return sessionState.title
    }

    if (sessionState.provider === 'chatgpt') {
      return 'ChatGPT'
    }

    if (sessionState.provider === 'grok') {
      return 'Grok'
    }

    return 'Adit'
  }, [sessionState.provider, sessionState.title])

  return (
    <Box
      as="header"
      bg={inSession ? 'sessionHeaderBg' : 'headerBg'}
      borderBottomWidth="1px"
      borderColor={inSession ? 'sessionHeaderBorder' : 'headerBorder'}
      color="fg"
      h="52px"
      position="relative"
      zIndex="10"
      backdropFilter="blur(18px)"
    >
      <Flex align="center" h="full" justify="space-between" px="4.5">
        <HStack gap="2.5">
          <Flex
            align="center"
            bg="accent"
            borderRadius="md"
            color="accentContrast"
            fontSize="xs"
            fontWeight="bold"
            h="7"
            justify="center"
            w="7"
          >
            A
          </Flex>
          <Box>
            <Heading fontSize="sm" fontWeight="700" letterSpacing="0" lineHeight="1.05">
              Adit
            </Heading>
            {!inSession && (
              <Text color="headerMuted" fontSize="xs" lineHeight="1.2">
                Local conversation entrances.
              </Text>
            )}
          </Box>
        </HStack>

        {sessionState.mode === 'list' ? (
          <HStack gap="2">
            <Button
              bg="accent"
              color="accentContrast"
              disabled={busy}
              onClick={() => runAction(async () => setSessionState(await window.adit.createSession({ provider: 'chatgpt' })))}
              fontSize="xs"
              h="8"
              px="3"
              _hover={{ bg: 'accentHover' }}
            >
              <Icon as={MessageSquare} />
              New ChatGPT
            </Button>
            <Button
              disabled={busy}
              fontSize="xs"
              h="8"
              onClick={() => runAction(async () => setSessionState(await window.adit.createSession({ provider: 'grok' })))}
              px="3"
              variant="outline"
            >
              <Icon as={Sparkles} />
              New Grok
            </Button>
          </HStack>
        ) : (
          <HStack gap="3">
            <HStack color={sessionState.sessionUrl ? 'capturedFg' : 'waitingFg'} gap="1.5">
              <Icon as={Circle} boxSize="2" fill="currentColor" />
              <Text fontSize="xs" fontWeight="600">
                {sessionState.sessionUrl ? 'Captured' : 'Waiting'}
              </Text>
            </HStack>
            <Text color="sessionHeaderMuted" fontSize="xs" maxW="360px" overflow="hidden" textOverflow="ellipsis" whiteSpace="nowrap">
              {activeTitle}
            </Text>
            <Button
              bg="sessionActionBg"
              color="sessionActionFg"
              disabled={busy}
              fontSize="xs"
              h="8"
              onClick={() => runAction(async () => setSessionState(await window.adit.closeSession()))}
              px="3"
              _hover={{ bg: 'sessionActionHover' }}
            >
              Close
            </Button>
          </HStack>
        )}
      </Flex>
    </Box>
  )
}

interface NotesToolbarProps {
  archived: boolean
  query: string
  setArchived: (value: boolean) => void
  setQuery: (value: string) => void
}

function NotesToolbar({ archived, query, setArchived, setQuery }: NotesToolbarProps): JSX.Element {
  return (
    <Flex align="center" gap="3" justify="space-between">
      <HStack flex="1" maxW="380px" position="relative">
        <Icon as={Search} boxSize="4" color="muted" left="3" position="absolute" zIndex="1" />
        <Input
          bg="panel"
          borderColor="border"
          borderRadius="md"
          fontSize="sm"
          h="9"
          _focus={{ borderColor: 'focusRing' }}
          onChange={(event) => setQuery(event.target.value)}
          pl="9"
          placeholder="Search titles"
          value={query}
        />
      </HStack>

      <SegmentGroup.Root
        onValueChange={(details) => setArchived(details.value === 'archive')}
        size="xs"
        value={archived ? 'archive' : 'active'}
      >
        <SegmentGroup.Indicator />
        <SegmentGroup.Items items={viewItems} />
      </SegmentGroup.Root>
    </Flex>
  )
}

interface NotesContentProps {
  archived: boolean
  busy: boolean
  loading: boolean
  notes: NoteRow[]
  runAction: (action: () => Promise<void>) => Promise<void>
  setSessionState: (state: SessionState) => void
}

function NotesContent({ archived, busy, loading, notes, runAction, setSessionState }: NotesContentProps): JSX.Element {
  if (loading) {
    return <AditEmptyState description="Loading local session entrances..." icon={<Sparkles />} title="Loading notes" />
  }

  if (notes.length === 0) {
    return (
      <AditEmptyState
        description={
          archived
            ? 'Archived sessions will appear here after you move them out of the main list.'
            : 'Start a ChatGPT or Grok session. Adit saves it only after the provider creates a conversation URL.'
        }
        icon={archived ? <Archive /> : <FileText />}
        title={archived ? 'No archived notes' : 'No saved sessions yet'}
      />
    )
  }

  return (
    <Stack as="ul" gap="2.5" listStyle="none" m="0" p="0">
      {notes.map((note) => (
        <Box as="li" key={note.id}>
          <NoteCard
            archived={archived}
            busy={busy}
            note={note}
            onArchive={() =>
              runAction(async () => {
                if (archived) {
                  await window.adit.unarchiveNote({ id: note.id })
                } else {
                  await window.adit.archiveNote({ id: note.id })
                }
              })
            }
            onOpen={() => runAction(async () => setSessionState(await window.adit.openSession({ id: note.id })))}
            onRename={() => {
              const title = window.prompt('Rename note', note.title)
              if (title) {
                void runAction(async () => {
                  await window.adit.renameNote({ id: note.id, title })
                })
              }
            }}
          />
        </Box>
      ))}
    </Stack>
  )
}

interface NoteCardProps {
  archived: boolean
  busy: boolean
  note: NoteRow
  onArchive: () => void
  onOpen: () => void
  onRename: () => void
}

function NoteCard({ archived, busy, note, onArchive, onOpen, onRename }: NoteCardProps): JSX.Element {
  const accentColor = note.provider === 'chatgpt' ? 'green.300' : 'purple.300'

  return (
    <Card.Root
      bg="panel"
      borderColor="border"
      borderLeftColor={accentColor}
      borderLeftWidth="3px"
      borderRadius="panel"
      overflow="hidden"
      size="sm"
      transition="border-color 140ms ease, box-shadow 140ms ease, transform 140ms ease"
      variant="outline"
      _hover={{
        borderColor: 'accent',
        boxShadow: '0 10px 26px rgba(15, 23, 42, 0.07)',
        transform: 'translateY(-1px)',
        _dark: { boxShadow: '0 12px 30px rgba(0, 0, 0, 0.32)' }
      }}
    >
      <Card.Body px="4" py="3">
        <Flex align="center" gap="4" justify="space-between">
          <Button
            alignItems="stretch"
            aria-label={`Open ${note.title}`}
            bg="transparent"
            color="inherit"
            flex="1"
            h="auto"
            justifyContent="stretch"
            minW="0"
            onClick={onOpen}
            p="0"
            textAlign="left"
            variant="plain"
            _hover={{ bg: 'transparent' }}
          >
            <Stack align="stretch" gap="2" minW="0" w="full">
              <HStack gap="2.5">
                <ProviderBadge provider={note.provider} />
                <HStack color="muted" gap="1.5" minW="0">
                  <Icon as={Clock3} boxSize="3" />
                  <Text fontSize="xs">{formatDate(note.updated_at)}</Text>
                </HStack>
              </HStack>

              <Stack gap="0.5" minW="0">
                <Heading fontSize="md" fontWeight="700" letterSpacing="0" lineHeight="1.2" overflow="hidden" textOverflow="ellipsis" whiteSpace="nowrap">
                  {note.title}
                </Heading>
                <Text color="muted" fontSize="xs" overflow="hidden" textOverflow="ellipsis" whiteSpace="nowrap">
                  {note.session_url}
                </Text>
              </Stack>
            </Stack>
          </Button>

          <HStack align="center" flexShrink="0" gap="1.5">
            <Button disabled={busy} fontSize="xs" h="7" onClick={onRename} px="2.5" size="xs" variant="outline">
              Rename
            </Button>
            <IconButton
              aria-label={archived ? 'Restore note' : 'Archive note'}
              disabled={busy}
              onClick={onArchive}
              size="xs"
              variant="subtle"
            >
              <Icon as={archived ? RotateCcw : Archive} boxSize="3.5" />
            </IconButton>
          </HStack>
        </Flex>
      </Card.Body>
    </Card.Root>
  )
}

function ProviderBadge({ provider }: { provider: ProviderId }): JSX.Element {
  return (
    <Badge colorPalette={provider === 'chatgpt' ? 'green' : 'purple'} fontSize="2xs" h="5" px="1.5" variant="subtle">
      {provider === 'chatgpt' ? 'ChatGPT' : 'Grok'}
    </Badge>
  )
}

function AditEmptyState({
  description,
  icon,
  title
}: {
  description: string
  icon: JSX.Element
  title: string
}): JSX.Element {
  return (
    <Card.Root bg="panel" borderColor="border" borderRadius="panel" minH="280px" variant="outline">
      <Card.Body>
        <EmptyState.Root size="md">
          <EmptyState.Content>
            <EmptyState.Indicator>
              <Icon color="accent" boxSize="5">
                {icon}
              </Icon>
            </EmptyState.Indicator>
            <Stack gap="1" textAlign="center">
              <EmptyState.Title fontSize="md">{title}</EmptyState.Title>
              <EmptyState.Description fontSize="sm" maxW="360px">
                {description}
              </EmptyState.Description>
            </Stack>
          </EmptyState.Content>
        </EmptyState.Root>
      </Card.Body>
    </Card.Root>
  )
}

function StatusNotice({ level, message }: ToastMessage): JSX.Element {
  return (
    <Card.Root
      bg={level === 'error' ? 'errorBg' : 'infoBg'}
      borderColor={level === 'error' ? 'errorBorder' : 'infoBorder'}
      borderRadius="panel"
      color={level === 'error' ? 'errorFg' : 'infoFg'}
      size="sm"
      variant="outline"
    >
      <Card.Body py="1.5">
        <Text fontSize="xs">{message}</Text>
      </Card.Body>
    </Card.Root>
  )
}

function StandaloneNotice(): JSX.Element {
  return (
    <Box minH="100vh" bg="bg">
      <TopBar busy={false} runAction={async () => undefined} sessionState={emptyState} setSessionState={() => undefined} />
      <Container maxW="960px" py="5">
        <AditEmptyState
          description="The browser renderer is only a shell. SQLite, session capture, and provider windows run through Electron."
          icon={<FolderOpen />}
          title="Open Adit in Electron"
        />
      </Container>
    </Box>
  )
}

function formatDate(value: number): string {
  return new Intl.DateTimeFormat('en', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }).format(value)
}
