import { Box, Button, EmptyState, Flex, HStack, Icon, IconButton, Input, Menu, Portal, Stack, Text, Tooltip } from '@chakra-ui/react'
import {
  Archive,
  ArrowRight,
  ChevronDown,
  Circle,
  Clock3,
  ExternalLink,
  Folder,
  FolderOpen,
  Mic,
  MoreHorizontal,
  Plus,
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

type Section = 'spark' | 'library'
type RunAction = (action: () => Promise<void>, options?: { reloadNotes?: boolean }) => Promise<void>

interface ProviderMeta {
  id: ProviderId
  label: string
  host: string
}

const providerDefs: ProviderMeta[] = [
  { id: 'chatgpt', label: 'ChatGPT', host: 'chatgpt.com' },
  { id: 'grok', label: 'Grok', host: 'grok.com' }
]
const providerLabels: Record<ProviderId, string> = {
  chatgpt: 'ChatGPT',
  grok: 'Grok'
}
const providerColors: Record<ProviderId, { fg: string; bg: string; border: string }> = {
  chatgpt: { fg: 'providerChatgptFg', bg: 'providerChatgptBg', border: 'providerChatgptBorder' },
  grok: { fg: 'providerGrokFg', bg: 'providerGrokBg', border: 'providerGrokBorder' }
}

export function App(): JSX.Element {
  if (!window.adit) {
    return <StandaloneNotice />
  }

  return <ElectronApp />
}

function ElectronApp(): JSX.Element {
  const [notes, setNotes] = useState<NoteRow[]>([])
  const [section, setSection] = useState<Section>('spark')
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

  const runAction = useCallback<RunAction>(
    async (action, options = {}) => {
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
    },
    [loadNotes]
  )

  const createSession = useCallback(
    (provider: ProviderId) => {
      void runAction(async () => setSessionState(await window.adit.createSession({ provider })))
    },
    [runAction]
  )

  if (sessionState.mode !== 'list') {
    return (
      <Box minH="100vh" bg="bg" color="fg">
        <SessionBar sessionState={sessionState} runAction={runAction} setSessionState={setSessionState} />
      </Box>
    )
  }

  return (
    <Flex direction="column" h="100vh" bg="bg" color="fg" overflow="hidden">
      <TitleBar />
      <SectionTabs section={section} setSection={setSection} />
      {section === 'spark' && (
        <Toolbar
          busy={busy}
          query={query}
          setQuery={setQuery}
          archived={archived}
          setArchived={setArchived}
          onCreateSession={createSession}
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
            <LibraryPlaceholder />
          ) : (
            <NotesContent
              archived={archived}
              busy={busy}
              loading={loading}
              notes={notes}
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

function TitleBar(): JSX.Element {
  return (
    <Box
      className="app-toolbar app-region-drag"
      flexShrink="0"
      h="46px"
      bg="chrome"
      borderBottomWidth="1px"
      borderBottomColor="chromeBorder"
      position="relative"
    >
      <Text
        color="muted"
        fontSize="sm"
        fontWeight="600"
        left="50%"
        position="absolute"
        top="50%"
        transform="translate(-50%, -50%)"
      >
        Adit
      </Text>
    </Box>
  )
}

interface SectionTabsProps {
  section: Section
  setSection: (section: Section) => void
}

function SectionTabs({ section, setSection }: SectionTabsProps): JSX.Element {
  return (
    <Flex
      flexShrink="0"
      justify="center"
      bg="panelHeader"
      borderBottomWidth="1px"
      borderBottomColor="border"
      py="18px"
    >
      <HStack bg="track" borderColor="trackBorder" borderRadius="full" borderWidth="1px" gap="1.5" p="1.5" role="tablist">
        <SectionTab icon={Sparkles} label="Spark" active={section === 'spark'} onClick={() => setSection('spark')} />
        <SectionTab icon={Folder} label="Library" active={section === 'library'} onClick={() => setSection('library')} />
      </HStack>
    </Flex>
  )
}

interface SectionTabProps {
  icon: typeof Sparkles
  label: string
  active: boolean
  onClick: () => void
}

function SectionTab({ icon, label, active, onClick }: SectionTabProps): JSX.Element {
  return (
    <Button
      role="tab"
      aria-selected={active}
      bg={active ? 'trackActive' : 'transparent'}
      borderColor={active ? 'border' : 'transparent'}
      borderRadius="full"
      borderWidth="1px"
      color={active ? 'fg' : 'faint'}
      fontSize="sm"
      fontWeight={active ? '700' : '600'}
      gap="2"
      h="9"
      minW="148px"
      onClick={onClick}
      px="6"
      shadow={active ? 'trackActive' : 'none'}
      variant="plain"
      _hover={{ color: active ? 'fg' : 'fgSoft' }}
    >
      <Icon as={icon} boxSize="3.5" color={active ? 'accent' : 'currentColor'} />
      <Text as="span">{label}</Text>
    </Button>
  )
}

interface ToolbarProps {
  busy: boolean
  query: string
  setQuery: (value: string) => void
  archived: boolean
  setArchived: (value: boolean) => void
  onCreateSession: (provider: ProviderId) => void
}

function Toolbar({ busy, query, setQuery, archived, setArchived, onCreateSession }: ToolbarProps): JSX.Element {
  return (
    <Flex
      align="center"
      flexShrink="0"
      gap="4"
      justify="space-between"
      px="5"
      py="4"
      borderBottomWidth="1px"
      borderBottomColor="border"
    >
      <Box position="relative" flex="1" maxW="440px">
        <Icon as={Search} boxSize="4" color="faint" left="3.5" pointerEvents="none" position="absolute" top="50%" transform="translateY(-50%)" zIndex="1" />
        <Input
          bg="cardBg"
          borderColor="border"
          borderRadius="9px"
          color="fg"
          fontSize="sm"
          fontWeight="500"
          h="38px"
          pl="9"
          placeholder="Search titles"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          _placeholder={{ color: 'faint' }}
          _focus={{ bg: 'cardBg', borderColor: 'focusRing' }}
        />
      </Box>

      <HStack gap="2.5">
        <NewSessionSplit busy={busy} onCreateSession={onCreateSession} />
        <Box bg="border" h="22px" w="1px" />
        <Button
          aria-pressed={archived}
          bg={archived ? 'accent' : 'panelHeader'}
          borderColor={archived ? 'accent' : 'border'}
          borderRadius="9px"
          borderWidth="1px"
          color={archived ? 'accentOn' : 'muted'}
          fontSize="13px"
          fontWeight="600"
          h="38px"
          onClick={() => setArchived(!archived)}
          px="4"
          variant="plain"
          _hover={{ bg: archived ? 'accentHover' : 'track', color: archived ? 'accentOn' : 'fgSoft' }}
        >
          Archive
        </Button>
      </HStack>
    </Flex>
  )
}

interface NewSessionSplitProps {
  busy: boolean
  onCreateSession: (provider: ProviderId) => void
}

function NewSessionSplit({ busy, onCreateSession }: NewSessionSplitProps): JSX.Element {
  const [menuOpen, setMenuOpen] = useState(false)
  const primary = providerDefs[0]

  return (
    <Flex
      align="stretch"
      h="38px"
      borderRadius="9px"
      overflow="hidden"
      shadow="primaryButton"
      opacity={busy ? 0.6 : 1}
      pointerEvents={busy ? 'none' : 'auto'}
    >
      <Flex
        as="button"
        appearance="none"
        border="0"
        align="center"
        h="38px"
        lineHeight="1"
        bg="accent"
        color="accentOn"
        cursor="pointer"
        gap="1.5"
        fontSize="13px"
        fontWeight="600"
        pl="3.5"
        pr="3"
        onClick={() => onCreateSession(primary.id)}
        _hover={{ bg: 'accentHover' }}
      >
        <Icon as={Plus} boxSize="4" />
        <Text as="span">New {primary.label}</Text>
      </Flex>
      <Menu.Root open={menuOpen} onOpenChange={(details) => setMenuOpen(details.open)} positioning={{ placement: 'bottom-end' }}>
        <Menu.Trigger asChild>
          <Flex
            as="button"
            appearance="none"
            border="0"
            aria-label="Choose a provider"
            align="center"
            justify="center"
            h="38px"
            bg="accent"
            borderLeftColor="rgba(255,255,255,0.22)"
            borderLeftWidth="1px"
            borderLeftStyle="solid"
            color="accentOn"
            cursor="pointer"
            px="2.5"
            _hover={{ bg: 'accentHover' }}
          >
            <Icon
              as={ChevronDown}
              boxSize="3.5"
              transform={menuOpen ? 'rotate(180deg)' : 'rotate(0deg)'}
              transition="transform 160ms ease"
            />
          </Flex>
        </Menu.Trigger>
        <Portal>
          <Menu.Positioner>
            <Menu.Content bg="cardBg" borderColor="borderStrong" borderRadius="11px" borderWidth="1px" minW="220px" p="1.5" shadow="menu">
              <Text color="faint" fontSize="2xs" fontWeight="700" letterSpacing="0.1em" px="2.5" py="1.5" textTransform="uppercase">
                Start a session
              </Text>
              {providerDefs.map((provider) => {
                const colors = providerColors[provider.id]
                return (
                  <Menu.Item
                    key={provider.id}
                    value={provider.id}
                    borderRadius="7px"
                    gap="2.5"
                    px="2.5"
                    py="2"
                    onClick={() => onCreateSession(provider.id)}
                  >
                    <Flex align="center" justify="center" bg={colors.bg} borderRadius="6px" boxSize="6" color={colors.fg}>
                      <Icon as={Sparkles} boxSize="3.5" />
                    </Flex>
                    <Text flex="1" fontSize="sm" fontWeight="600" color="fg">
                      {provider.label}
                    </Text>
                    <Text color="faint" fontFamily="mono" fontSize="2xs">
                      {provider.host}
                    </Text>
                  </Menu.Item>
                )
              })}
            </Menu.Content>
          </Menu.Positioner>
        </Portal>
      </Menu.Root>
    </Flex>
  )
}

function FooterBar(): JSX.Element {
  return (
    <HStack
      flexShrink="0"
      align="center"
      justify="center"
      gap="2.5"
      px="5"
      py="5"
      borderTopWidth="1px"
      borderTopColor="border"
      color="muted"
    >
      <Icon as={Mic} boxSize="3.5" flexShrink="0" />
      <Text fontSize="xs" fontWeight="500">
        Adit works best when you speak to your AI instead of typing.
      </Text>
      <Button asChild color="accent" fontSize="xs" fontWeight="600" h="6" px="1.5" variant="ghost" _hover={{ bg: 'track' }}>
        <a href={repositoryUrl} rel="noreferrer" target="_blank">
          GitHub
          <Icon as={ExternalLink} boxSize="3" />
        </a>
      </Button>
    </HStack>
  )
}

interface SessionBarProps {
  sessionState: SessionState
  runAction: RunAction
  setSessionState: (state: SessionState) => void
}

function SessionBar({ sessionState, runAction, setSessionState }: SessionBarProps): JSX.Element {
  const providerLabel = sessionState.provider ? providerLabels[sessionState.provider] : ''
  const backTooltip = sessionState.sessionUrl
    ? "Leaving this view won't interrupt the current reply."
    : 'Adit saves this session after its conversation URL is created.'

  return (
    <Box
      as="header"
      bg="chrome"
      borderBottomWidth="1px"
      borderColor="chromeBorder"
      className="app-toolbar app-region-drag"
      color="fg"
      h="46px"
      position="relative"
      zIndex="10"
    >
      <Flex align="center" h="full" justify="flex-end" px="4" position="relative">
        <Text
          color="muted"
          fontSize="sm"
          fontWeight="600"
          left="50%"
          position="absolute"
          top="50%"
          transform="translate(-50%, -50%)"
        >
          Adit
        </Text>
        <HStack className="app-region-no-drag" gap="3">
          <HStack color={sessionState.sessionUrl ? 'capturedFg' : 'waitingFg'} gap="1.5">
            <Icon as={Circle} boxSize="2" fill="currentColor" />
            <Text fontSize="xs" fontWeight="600">
              {sessionState.sessionUrl ? 'Captured' : 'Waiting'}
            </Text>
          </HStack>
          <Text color="muted" fontSize="xs" maxW="360px" overflow="hidden" textOverflow="ellipsis" whiteSpace="nowrap">
            {providerLabel}
          </Text>
          <Tooltip.Root openDelay={350} closeDelay={100} positioning={{ placement: 'bottom-end' }}>
            <Tooltip.Trigger asChild>
              <Button
                bg="accent"
                borderRadius="9px"
                color="accentOn"
                fontSize="xs"
                fontWeight="600"
                h="8"
                onClick={() => {
                  void runAction(async () => setSessionState(await window.adit.closeSession()))
                }}
                px="3.5"
                _hover={{ bg: 'accentHover' }}
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
      </Flex>
    </Box>
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

  if (notes.length === 0) {
    return (
      <AditEmptyState
        description={
          archived
            ? 'Archived Sparks will show up here once you archive one.'
            : 'Start a new Spark or adjust the current filters.'
        }
        icon={archived ? <Archive /> : <Sparkles />}
        title={archived ? 'No archived Sparks' : 'No Sparks yet'}
      />
    )
  }

  return (
    <Box as="ul" display="grid" gap="4" gridTemplateColumns="repeat(4, minmax(0, 1fr))" listStyle="none" m="0" p="0">
      {notes.map((note) => (
        <Box as="li" key={note.id} display="flex">
          <PaperCard
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

interface PaperCardProps {
  archived: boolean
  busy: boolean
  note: NoteRow
  onArchive: () => void
  onOpen: () => void
}

function PaperCard({ archived, busy, note, onArchive, onOpen }: PaperCardProps): JSX.Element {
  const [menuOpen, setMenuOpen] = useState(false)

  return (
    <Flex
      aria-label={`Open ${note.title}`}
      role="button"
      tabIndex={0}
      direction="column"
      justify="space-between"
      gap="18px"
      minH="188px"
      w="full"
      position="relative"
      px="22px"
      py="20px"
      bg="cardBg"
      borderColor="border"
      borderRadius="card"
      borderWidth="1px"
      cursor="pointer"
      shadow="card"
      transition="transform 170ms cubic-bezier(.2,.7,.3,1), box-shadow 170ms ease, border-color 170ms ease, background 170ms ease"
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
      _focusVisible={{ borderColor: 'focusRing', outline: 'none', shadow: 'focus' }}
      _focusWithin={{ '& [data-card-actions]': { opacity: 1, pointerEvents: 'auto' } }}
      _hover={{
        bg: 'cardHoverBg',
        borderColor: 'borderStrong',
        shadow: 'cardHover',
        transform: 'translateY(-3px)',
        '& [data-card-actions]': { opacity: 1, pointerEvents: 'auto' }
      }}
    >
      <Stack gap="3.5" minW="0">
        <ProviderPill provider={note.provider} />
        <Text textStyle="cardTitle" color="fg" lineClamp="2" minW="0" overflow="hidden">
          {note.title}
        </Text>
        <Text color="muted" fontSize="13px" fontWeight="500" overflow="hidden" textOverflow="ellipsis" whiteSpace="nowrap">
          {formatSessionHost(note.session_url)}
        </Text>
      </Stack>

      <Stack gap="3">
        <Box bg="border" h="1px" />
        <Flex align="center" justify="space-between">
          <HStack color="faint" gap="1.5" minW="0">
            <Icon as={Clock3} boxSize="3.5" />
            <Text fontSize="12.5px" fontWeight="500" overflow="hidden" textOverflow="ellipsis" whiteSpace="nowrap">
              {formatDate(note.updated_at)}
            </Text>
          </HStack>
          <HStack color="accent" flexShrink="0" gap="1.5">
            <Text fontSize="13px" fontWeight="600">
              Open
            </Text>
            <Icon as={ArrowRight} boxSize="3.5" />
          </HStack>
        </Flex>
      </Stack>

      <Box
        data-card-actions=""
        opacity={menuOpen ? 1 : 0}
        pointerEvents={menuOpen ? 'auto' : 'none'}
        position="absolute"
        right="2.5"
        top="2.5"
        transition="opacity 120ms ease"
      >
        <Menu.Root onOpenChange={(details) => setMenuOpen(details.open)} positioning={{ placement: 'bottom-end' }}>
          <Menu.Trigger asChild>
            <IconButton
              aria-label="Note actions"
              color="faint"
              disabled={busy}
              minW="6"
              onClick={(event) => event.stopPropagation()}
              size="2xs"
              variant="ghost"
              _hover={{ bg: 'track', color: 'fg' }}
            >
              <Icon as={MoreHorizontal} boxSize="3.5" />
            </IconButton>
          </Menu.Trigger>
          <Portal>
            <Menu.Positioner>
              <Menu.Content
                bg="cardBg"
                borderColor="borderStrong"
                borderRadius="11px"
                borderWidth="1px"
                minW="140px"
                p="1.5"
                shadow="menu"
                onClick={(event) => event.stopPropagation()}
              >
                <Menu.Item
                  value={archived ? 'restore' : 'archive'}
                  borderRadius="7px"
                  gap="2"
                  onClick={(event) => {
                    event.stopPropagation()
                    onArchive()
                  }}
                >
                  <Icon as={archived ? RotateCcw : Archive} boxSize="3.5" />
                  <Text fontSize="sm">{archived ? 'Restore' : 'Archive'}</Text>
                </Menu.Item>
              </Menu.Content>
            </Menu.Positioner>
          </Portal>
        </Menu.Root>
      </Box>
    </Flex>
  )
}

function ProviderPill({ provider }: { provider: ProviderId }): JSX.Element {
  const colors = providerColors[provider]

  return (
    <HStack
      alignSelf="flex-start"
      bg={colors.bg}
      borderColor={colors.border}
      borderRadius="full"
      borderWidth="1px"
      color={colors.fg}
      gap="1.5"
      pl="2"
      pr="2.5"
      py="1"
    >
      <Box bg={colors.fg} borderRadius="full" boxSize="1.5" />
      <Text fontSize="11px" fontWeight="600" letterSpacing="0.03em">
        {providerLabels[provider]}
      </Text>
    </HStack>
  )
}

function LibraryPlaceholder(): JSX.Element {
  return (
    <AditEmptyState
      description="Library is where your saved AI notes will live. Soon you'll be able to keep the results worth keeping from any Spark — summaries, documents, images, and code — without reopening the provider."
      icon={<Folder />}
      title="Your Library is coming"
    />
  )
}

function AditEmptyState({ description, icon, title }: { description: string; icon: JSX.Element; title: string }): JSX.Element {
  return (
    <Flex
      align="center"
      justify="center"
      bg="panel"
      borderColor="border"
      borderRadius="panel"
      borderWidth="1px"
      minH="300px"
    >
      <EmptyState.Root size="md">
        <EmptyState.Content>
          <EmptyState.Indicator>
            <Icon color="accent" boxSize="6">
              {icon}
            </Icon>
          </EmptyState.Indicator>
          <Stack gap="1.5" textAlign="center">
            <EmptyState.Title fontSize="md" fontWeight="700">
              {title}
            </EmptyState.Title>
            <EmptyState.Description color="muted" fontSize="sm" maxW="380px">
              {description}
            </EmptyState.Description>
          </Stack>
        </EmptyState.Content>
      </EmptyState.Root>
    </Flex>
  )
}

function StatusNotice({ level, message }: ToastMessage): JSX.Element {
  return (
    <Box
      bg={level === 'error' ? 'errorBg' : 'infoBg'}
      borderColor={level === 'error' ? 'errorBorder' : 'infoBorder'}
      borderRadius="panel"
      borderWidth="1px"
      color={level === 'error' ? 'errorFg' : 'infoFg'}
      px="3.5"
      py="2"
    >
      <Text fontSize="xs">{message}</Text>
    </Box>
  )
}

function StandaloneNotice(): JSX.Element {
  return (
    <Box minH="100vh" bg="bg">
      <Box className="app-region-drag" h="46px" bg="chrome" borderBottomWidth="1px" borderBottomColor="chromeBorder" />
      <Box maxW="560px" mx="auto" px="6" py="6">
        <AditEmptyState
          description="The browser renderer is only a shell. SQLite, session capture, and provider windows run through Electron."
          icon={<FolderOpen />}
          title="Open Adit in Electron"
        />
      </Box>
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
