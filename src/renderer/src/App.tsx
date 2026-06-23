import {
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
  Menu,
  Portal,
  Stack,
  Text,
  Tooltip
} from '@chakra-ui/react'
import {
  Archive,
  ArrowRight,
  Circle,
  Clock3,
  ExternalLink,
  FolderOpen,
  MessageSquare,
  Mic,
  MoreHorizontal,
  RotateCcw,
  Search,
  Sparkles
} from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import type { NoteRow, ProviderId, SessionState, ToastMessage } from '../../shared/types'

const emptyState: SessionState = {
  mode: 'list',
  provider: null,
  noteId: null,
  sessionUrl: null,
  title: null
}
const repositoryUrl = 'https://github.com/samzong/adit'
const noteDateFormatter = new Intl.DateTimeFormat('en', {
  month: 'short',
  day: 'numeric',
  hour: '2-digit',
  minute: '2-digit'
})
type RunAction = (action: () => Promise<void>, options?: { reloadNotes?: boolean }) => Promise<void>

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
  const [providerFilter, setProviderFilter] = useState<ProviderId | null>(null)
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
  }, [])

  useEffect(() => {
    let cancelled = false
    const timeout = window.setTimeout(() => {
      void loadNotes()
        .catch((reason) => setError(reason instanceof Error ? reason.message : 'Failed to load notes.'))
        .finally(() => {
          if (!cancelled) {
            setLoading(false)
          }
        })
    }, 120)

    return () => {
      cancelled = true
      window.clearTimeout(timeout)
    }
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

  async function runAction(action: () => Promise<void>, options: { reloadNotes?: boolean } = {}): Promise<void> {
    setBusy(true)
    setError(null)

    try {
      await action()
      if (options.reloadNotes) {
        await loadNotes()
      }
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Action failed.')
    } finally {
      setBusy(false)
    }
  }

  const visibleNotes = providerFilter ? notes.filter((note) => note.provider === providerFilter) : notes

  return (
    <Box minH="100vh" bg="bg" color="fg">
      <TopBar sessionState={sessionState} runAction={runAction} setSessionState={setSessionState} />

      {sessionState.mode === 'list' && (
        <Container display="flex" flexDirection="column" maxW="960px" minH="calc(100vh - 44px)" px="4" pb="4" pt="5">
          <Stack flex="1" gap="5">
            <NotesToolbar
              archived={archived}
              providerFilter={providerFilter}
              query={query}
              setArchived={setArchived}
              setProviderFilter={setProviderFilter}
              setQuery={setQuery}
            />

            <Stack gap="2">
              {error && <StatusNotice level="error" message={error} />}
              {toast && <StatusNotice level={toast.level} message={toast.message} />}
            </Stack>

            <NotesContent
              archived={archived}
              busy={busy}
              loading={loading}
              notes={visibleNotes}
              runAction={runAction}
              setSessionState={setSessionState}
            />

            <VoiceRecommendation />
          </Stack>
        </Container>
      )}
    </Box>
  )
}

function VoiceRecommendation(): JSX.Element {
  return (
    <HStack align="center" alignSelf="center" color="muted" gap="2.5" justify="center" mt="auto">
      <Icon as={Mic} boxSize="3.5" flexShrink="0" />
      <Text fontSize="xs" fontWeight="600">
        Adit works best when you speak to your AI instead of typing.
      </Text>
      <Button
        asChild
        color="actionFg"
        fontSize="xs"
        h="6"
        px="2"
        variant="ghost"
        _hover={{ bg: 'actionHoverBg', color: 'fg' }}
      >
        <a href={repositoryUrl} rel="noreferrer" target="_blank">
          GitHub
          <Icon as={ExternalLink} boxSize="3" />
        </a>
      </Button>
    </HStack>
  )
}

interface TopBarProps {
  sessionState: SessionState
  runAction: RunAction
  setSessionState: (state: SessionState) => void
}

function TopBar({ sessionState, runAction, setSessionState }: TopBarProps): JSX.Element {
  const inSession = sessionState.mode !== 'list'
  const providerLabel = sessionState.provider === 'chatgpt' ? 'ChatGPT' : 'Grok'
  const backTooltip = sessionState.sessionUrl
    ? "Leaving this view won't interrupt the current reply."
    : 'Adit saves this session after its conversation URL is created.'

  return (
    <Box
      as="header"
      bg={inSession ? 'sessionHeaderBg' : 'headerBg'}
      borderBottomWidth="1px"
      borderColor={inSession ? 'sessionHeaderBorder' : 'headerBorder'}
      className="app-toolbar app-region-drag"
      color="fg"
      h="44px"
      position="relative"
      zIndex="10"
      backdropBlur="lg"
    >
      <Flex align="center" h="full" justify="flex-end" px="4" position="relative">
        <Text
          color="headerMuted"
          fontSize="sm"
          fontWeight="700"
          left="50%"
          position="absolute"
          top="50%"
          transform="translate(-50%, -50%)"
        >
          Adit
        </Text>
        {sessionState.mode !== 'list' && (
          <HStack className="app-region-no-drag" gap="3">
            <HStack color={sessionState.sessionUrl ? 'capturedFg' : 'waitingFg'} gap="1.5">
              <Icon as={Circle} boxSize="2" fill="currentColor" />
              <Text fontSize="xs" fontWeight="600">
                {sessionState.sessionUrl ? 'Captured' : 'Waiting'}
              </Text>
            </HStack>
            <Text
              color="sessionHeaderMuted"
              fontSize="xs"
              maxW="360px"
              overflow="hidden"
              textOverflow="ellipsis"
              whiteSpace="nowrap"
            >
              {providerLabel}
            </Text>
            <Tooltip.Root openDelay={350} closeDelay={100} positioning={{ placement: 'bottom-end' }}>
              <Tooltip.Trigger asChild>
                <Button
                  bg="sessionActionBg"
                  borderRadius="md"
                  color="sessionActionFg"
                  fontSize="xs"
                  h="8"
                  onClick={() => {
                    void runAction(async () => setSessionState(await window.adit.closeSession()))
                  }}
                  px="3"
                  _hover={{ bg: 'sessionActionHover' }}
                >
                  Back
                </Button>
              </Tooltip.Trigger>
              <Portal>
                <Tooltip.Positioner>
                  <Tooltip.Content>{backTooltip}</Tooltip.Content>
                </Tooltip.Positioner>
              </Portal>
            </Tooltip.Root>
          </HStack>
        )}
      </Flex>
    </Box>
  )
}

interface NotesToolbarProps {
  archived: boolean
  providerFilter: ProviderId | null
  query: string
  setArchived: (value: boolean) => void
  setProviderFilter: (value: ProviderId | null) => void
  setQuery: (value: string) => void
}

function NotesToolbar({
  archived,
  providerFilter,
  query,
  setArchived,
  setProviderFilter,
  setQuery
}: NotesToolbarProps): JSX.Element {
  const providerButtonProps = {
    borderWidth: '1px',
    fontSize: '2xs',
    fontWeight: '700',
    h: '7',
    minW: '72px',
    px: '2.5',
    variant: 'plain' as const
  }

  return (
    <Flex align="center" gap="3" justify="space-between">
      <HStack flex="1" gap="2" minW="0">
        <HStack flex="1" maxW="380px" minW="240px" position="relative">
          <Icon as={Search} boxSize="4" color="muted" left="3" pointerEvents="none" position="absolute" zIndex="1" />
          <Input
            bg="panelMuted"
            borderColor="transparent"
            borderRadius="md"
            fontSize="sm"
            h="8"
            _focus={{ bg: 'panel', borderColor: 'focusRing' }}
            onChange={(event) => setQuery(event.target.value)}
            pl="9"
            placeholder="Search titles"
            value={query}
          />
        </HStack>
        <HStack bg="panelMuted" borderColor="border" borderRadius="md" borderWidth="1px" gap="0.5" h="8" p="0.5">
          <Button
            aria-pressed={providerFilter === 'chatgpt'}
            bg={providerFilter === 'chatgpt' ? 'accent' : 'transparent'}
            borderColor={providerFilter === 'chatgpt' ? 'accent' : 'transparent'}
            color={providerFilter === 'chatgpt' ? 'accentOn' : 'muted'}
            onClick={() => setProviderFilter(providerFilter === 'chatgpt' ? null : 'chatgpt')}
            _hover={{
              bg: providerFilter === 'chatgpt' ? 'accentHover' : 'actionHoverBg',
              color: providerFilter === 'chatgpt' ? 'accentOn' : 'fg'
            }}
            {...providerButtonProps}
          >
            ChatGPT
          </Button>
          <Button
            aria-pressed={providerFilter === 'grok'}
            bg={providerFilter === 'grok' ? 'accent' : 'transparent'}
            borderColor={providerFilter === 'grok' ? 'accent' : 'transparent'}
            color={providerFilter === 'grok' ? 'accentOn' : 'muted'}
            onClick={() => setProviderFilter(providerFilter === 'grok' ? null : 'grok')}
            _hover={{
              bg: providerFilter === 'grok' ? 'accentHover' : 'actionHoverBg',
              color: providerFilter === 'grok' ? 'accentOn' : 'fg'
            }}
            {...providerButtonProps}
          >
            Grok
          </Button>
        </HStack>
      </HStack>

      <Button
        aria-pressed={archived}
        bg={archived ? 'accent' : 'panelMuted'}
        borderColor={archived ? 'accent' : 'border'}
        borderRadius="md"
        borderWidth="1px"
        color={archived ? 'accentOn' : 'actionFg'}
        fontSize="xs"
        fontWeight="700"
        h="8"
        minW="72px"
        onClick={() => setArchived(!archived)}
        px="3"
        variant="plain"
        _hover={{ bg: archived ? 'accentHover' : 'actionHoverBg', color: archived ? 'accentOn' : 'fg' }}
      >
        Archive
      </Button>
    </Flex>
  )
}

interface NotesContentProps {
  archived: boolean
  busy: boolean
  loading: boolean
  notes: NoteRow[]
  runAction: RunAction
  setSessionState: (state: SessionState) => void
}

function NotesContent({ archived, busy, loading, notes, runAction, setSessionState }: NotesContentProps): JSX.Element {
  if (loading) {
    return <AditEmptyState description="Loading local session entrances..." icon={<Sparkles />} title="Loading notes" />
  }

  return (
    <Box
      as="ul"
      display="grid"
      gap="4"
      gridTemplateColumns="repeat(auto-fill, minmax(176px, 1fr))"
      listStyle="none"
      m="0"
      p="0"
    >
      <Box as="li">
        <NewSessionCard busy={busy} runAction={runAction} setSessionState={setSessionState} />
      </Box>
      {notes.map((note) => (
        <Box as="li" key={note.id}>
          <NoteCard
            archived={archived}
            busy={busy}
            note={note}
            onArchive={() => {
              void runAction(
                async () => {
                  if (archived) {
                    await window.adit.unarchiveNote({ id: note.id })
                  } else {
                    await window.adit.archiveNote({ id: note.id })
                  }
                },
                { reloadNotes: true }
              )
            }}
            onOpen={() => {
              void runAction(async () => setSessionState(await window.adit.openSession({ id: note.id })))
            }}
          />
        </Box>
      ))}
    </Box>
  )
}

interface NewSessionCardProps {
  busy: boolean
  runAction: RunAction
  setSessionState: (state: SessionState) => void
}

function NewSessionCard({ busy, runAction, setSessionState }: NewSessionCardProps): JSX.Element {
  return (
    <Card.Root
      aspectRatio="1.32"
      bg="panel"
      borderColor="border"
      borderRadius="panel"
      shadow="card"
      size="sm"
      transition="border-color 140ms ease, box-shadow 140ms ease, transform 140ms ease"
      variant="outline"
      _hover={{
        bg: 'cardHoverBg',
        borderColor: 'accent',
        shadow: 'cardHover',
        transform: 'translateY(-2px)'
      }}
    >
      <Card.Body alignItems="center" display="flex" justifyContent="center" p="3">
        <Stack gap="2" maxW="240px" w="full">
          <Button
            bg="sessionActionBg"
            borderRadius="md"
            color="sessionActionFg"
            disabled={busy}
            fontSize="xs"
            fontWeight="700"
            h="8"
            onClick={() => {
              void runAction(async () => setSessionState(await window.adit.createSession({ provider: 'chatgpt' })))
            }}
            px="3"
            _hover={{ bg: 'sessionActionHover' }}
          >
            <Icon as={MessageSquare} boxSize="4" />
            New ChatGPT
          </Button>
          <Button
            bg="panelMuted"
            borderColor="actionBorder"
            borderRadius="md"
            borderWidth="1px"
            color="actionFg"
            disabled={busy}
            fontSize="xs"
            fontWeight="700"
            h="8"
            onClick={() => {
              void runAction(async () => setSessionState(await window.adit.createSession({ provider: 'grok' })))
            }}
            px="3"
            variant="plain"
            _disabled={{ borderColor: 'actionDisabledBorder', color: 'actionDisabledFg', opacity: 1 }}
            _hover={{ bg: 'actionHoverBg' }}
          >
            <Icon as={Sparkles} boxSize="4" />
            New Grok
          </Button>
        </Stack>
      </Card.Body>
    </Card.Root>
  )
}

interface NoteCardProps {
  archived: boolean
  busy: boolean
  note: NoteRow
  onArchive: () => void
  onOpen: () => void
}

function NoteCard({ archived, busy, note, onArchive, onOpen }: NoteCardProps): JSX.Element {
  const [menuOpen, setMenuOpen] = useState(false)

  return (
    <Card.Root
      aria-label={`Open ${note.title}`}
      aspectRatio="1.32"
      bg="cardBg"
      borderColor="border"
      borderRadius="panel"
      cursor="pointer"
      onClick={onOpen}
      onKeyDown={(event) => {
        if (event.target !== event.currentTarget) {
          return
        }

        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault()
          onOpen()
        }
      }}
      overflow="hidden"
      position="relative"
      role="button"
      shadow="card"
      size="sm"
      tabIndex={0}
      transition="border-color 140ms ease, box-shadow 140ms ease, transform 140ms ease"
      variant="outline"
      _focusVisible={{ borderColor: 'focusRing', outline: 'none', shadow: 'focus' }}
      _focusWithin={{
        '& [data-note-actions]': {
          opacity: 1,
          pointerEvents: 'auto'
        }
      }}
      _hover={{
        bg: 'cardHoverBg',
        borderColor: 'accent',
        shadow: 'cardHover',
        transform: 'translateY(-2px)',
        '& [data-note-actions]': {
          opacity: 1,
          pointerEvents: 'auto'
        }
      }}
    >
      <ProviderRibbon provider={note.provider} />
      <Card.Body p="3">
        <Stack gap="2.5" h="full" justify="space-between" minW="0">
          <Heading lineClamp="2" minW="0" overflow="hidden" pl="10" pr="8" textStyle="headline">
            {note.title}
          </Heading>

          <Stack gap="1" minW="0">
            <Text color="muted" overflow="hidden" textOverflow="ellipsis" textStyle="caption" whiteSpace="nowrap">
              {formatSessionHost(note.session_url)}
            </Text>
          </Stack>

          <Box borderTopColor="border" borderTopWidth="1px" />

          <Flex align="center" color="muted" gap="2" justify="space-between" minW="0">
            <HStack gap="1.5" minW="0">
              <Icon as={Clock3} boxSize="3" />
              <Text overflow="hidden" textOverflow="ellipsis" textStyle="caption" whiteSpace="nowrap">
                {formatDate(note.updated_at)}
              </Text>
            </HStack>
            <HStack color="accent" flexShrink="0" gap="1">
              <Text fontSize="xs" fontWeight="700">
                Open
              </Text>
              <Icon as={ArrowRight} boxSize="3" />
            </HStack>
          </Flex>
        </Stack>
      </Card.Body>
      <Box
        data-note-actions=""
        opacity={menuOpen ? 1 : 0}
        pointerEvents={menuOpen ? 'auto' : 'none'}
        position="absolute"
        right="2"
        top="2"
        transition="opacity 120ms ease"
      >
        <Menu.Root onOpenChange={(details) => setMenuOpen(details.open)} positioning={{ placement: 'bottom-end' }}>
          <Menu.Trigger asChild>
            <IconButton
              aria-label="Note actions"
              color="muted"
              disabled={busy}
              minW="6"
              onClick={(event) => event.stopPropagation()}
              size="2xs"
              variant="ghost"
              _disabled={{ color: 'actionDisabledFg', opacity: 1 }}
              _hover={{ bg: 'actionHoverBg', color: 'fg' }}
            >
              <Icon as={MoreHorizontal} boxSize="3.5" />
            </IconButton>
          </Menu.Trigger>
          <Portal>
            <Menu.Positioner>
              <Menu.Content
                bg="panel"
                borderColor="border"
                borderRadius="panel"
                minW="140px"
                p="1"
                shadow="cardHover"
                onClick={(event) => event.stopPropagation()}
              >
                <Menu.Item
                  value={archived ? 'restore' : 'archive'}
                  onClick={(event) => {
                    event.stopPropagation()
                    onArchive()
                  }}
                >
                  <Icon as={archived ? RotateCcw : Archive} boxSize="3.5" />
                  <Text textStyle="caption">{archived ? 'Restore' : 'Archive'}</Text>
                </Menu.Item>
              </Menu.Content>
            </Menu.Positioner>
          </Portal>
        </Menu.Root>
      </Box>
    </Card.Root>
  )
}

function ProviderRibbon({ provider }: { provider: ProviderId }): JSX.Element {
  const isChatGPT = provider === 'chatgpt'

  return (
    <Box h="14" left="0" overflow="hidden" pointerEvents="none" position="absolute" top="0" w="14" zIndex="1">
      <Box
        bg={isChatGPT ? 'providerChatgptBg' : 'providerGrokBg'}
        borderColor={isChatGPT ? 'providerChatgptBorder' : 'providerGrokBorder'}
        borderWidth="1px"
        color={isChatGPT ? 'providerChatgptFg' : 'providerGrokFg'}
        fontSize="2xs"
        fontWeight="700"
        left="-8"
        letterSpacing="0"
        lineHeight="1"
        position="absolute"
        py="1"
        textAlign="center"
        top="3"
        transform="rotate(-45deg)"
        transformOrigin="center"
        w="24"
      >
        {isChatGPT ? 'ChatGPT' : 'Grok'}
      </Box>
    </Box>
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
      <TopBar runAction={() => Promise.resolve()} sessionState={emptyState} setSessionState={() => undefined} />
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
  return noteDateFormatter.format(value)
}

function formatSessionHost(sessionUrl: string | null): string {
  if (!sessionUrl) {
    return ''
  }

  try {
    return new URL(sessionUrl).hostname
  } catch {
    return ''
  }
}
