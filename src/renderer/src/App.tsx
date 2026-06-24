import {
  Box,
  Button,
  EmptyState,
  Flex,
  HStack,
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
  MDXEditor,
  codeBlockPlugin,
  headingsPlugin,
  linkPlugin,
  listsPlugin,
  markdownShortcutPlugin,
  quotePlugin,
  thematicBreakPlugin,
  type MDXEditorMethods
} from '@mdxeditor/editor'
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
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type Dispatch,
  type PointerEvent as ReactPointerEvent,
  type SetStateAction
} from 'react'
import type {
  CaptureSource,
  SparkRow,
  ProviderId,
  SessionState,
  ToastMessage,
  WorkspaceLayoutRequest
} from '../../shared/types'
import {
  WORKSPACE_MIN_EXPANDED_WIDTH,
  WORKSPACE_NOTE_MIN_WIDTH,
  WORKSPACE_PROVIDER_MIN_WIDTH,
  WORKSPACE_SPLIT_HANDLE_WIDTH,
  defaultWorkspaceLayout
} from '../../shared/workspace-layout'

const emptyState: SessionState = {
  mode: 'list',
  provider: null,
  sparkId: null,
  sessionUrl: null,
  title: null
}
const repositoryUrl = 'https://github.com/samzong/adit'
const sparkDateFormatter = new Intl.DateTimeFormat('en', {
  month: 'short',
  day: 'numeric',
  hour: '2-digit',
  minute: '2-digit'
})
type Section = 'spark' | 'library'
type RunAction = (action: () => Promise<void>, options?: { reloadSparks?: boolean }) => Promise<void>

interface EphemeralNoteState {
  markdown: string
  sources: CaptureSource[]
}

interface ProviderMeta {
  id: ProviderId
  label: string
}

const providerDefs: ProviderMeta[] = [
  { id: 'chatgpt', label: 'ChatGPT' },
  { id: 'grok', label: 'Grok' }
]
const providerLabels: Record<ProviderId, string> = {
  chatgpt: 'ChatGPT',
  grok: 'Grok'
}
const providerColors: Record<ProviderId, { fg: string; bg: string; border: string }> = {
  chatgpt: { fg: 'providerChatgptFg', bg: 'providerChatgptBg', border: 'providerChatgptBorder' },
  grok: { fg: 'providerGrokFg', bg: 'providerGrokBg', border: 'providerGrokBorder' }
}
const emptyNoteState: EphemeralNoteState = {
  markdown: '',
  sources: []
}
const ephemeralNoteTitle = 'Untitled note'

export function App(): JSX.Element {
  if (!window.adit) {
    return <StandaloneNotice />
  }

  return <ElectronApp />
}

function ElectronApp(): JSX.Element {
  const [sparks, setSparks] = useState<SparkRow[]>([])
  const [section, setSection] = useState<Section>('spark')
  const [archived, setArchived] = useState(false)
  const [query, setQuery] = useState('')
  const [sessionState, setSessionState] = useState<SessionState>(emptyState)
  const [toast, setToast] = useState<ToastMessage | null>(null)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const loadSparks = useCallback(async () => {
    setError(null)
    const nextSparks = await window.adit.listSparks({ archived, query })
    setSparks(nextSparks)
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
      void loadSparks()
        .catch((reason) => setError(reason instanceof Error ? reason.message : 'Failed to load Sparks.'))
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
  }, [loadSparks])

  useEffect(() => {
    const unsubscribers = [
      window.adit.onSparksChanged(() => {
        void loadSparks().catch((reason) =>
          setError(reason instanceof Error ? reason.message : 'Failed to load Sparks.')
        )
      }),
      window.adit.onSessionStateChanged(setSessionState),
      window.adit.onToast((message) => {
        setToast(message)
        window.setTimeout(() => setToast(null), 4000)
      })
    ]

    return () => unsubscribers.forEach((unsubscribe) => unsubscribe())
  }, [loadSparks])

  const runAction = useCallback<RunAction>(
    async (action, options = {}) => {
      setBusy(true)
      setError(null)

      try {
        await action()
        if (options.reloadSparks) {
          await loadSparks()
        }
      } catch (reason) {
        setError(reason instanceof Error ? reason.message : 'Action failed.')
      } finally {
        setBusy(false)
      }
    },
    [loadSparks]
  )

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
            <SparksContent
              archived={archived}
              busy={busy}
              loading={loading}
              sparks={sparks}
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
      <HStack
        color="muted"
        fontSize="sm"
        gap="1"
        left="50%"
        lineHeight="1"
        position="absolute"
        top="50%"
        transform="translate(-50%, -50%)"
        whiteSpace="nowrap"
      >
        <Text as="span" fontWeight="600">
          Adit
        </Text>
        <Text as="span" color="faint" fontWeight="400">
          — Speak, don’t type
        </Text>
      </HStack>
    </Box>
  )
}

interface SectionTabsProps {
  section: Section
  setSection: (section: Section) => void
}

function SectionTabs({ section, setSection }: SectionTabsProps): JSX.Element {
  return (
    <Flex flexShrink="0" justify="center" bg="panelHeader" borderBottomWidth="1px" borderBottomColor="border" py="18px">
      <HStack
        bg="track"
        borderColor="trackBorder"
        borderRadius="full"
        borderWidth="1px"
        gap="1.5"
        p="1.5"
        role="tablist"
      >
        <SectionTab icon={Sparkles} label="Spark" active={section === 'spark'} onClick={() => setSection('spark')} />
        <SectionTab
          icon={Folder}
          label="Library"
          active={section === 'library'}
          onClick={() => setSection('library')}
        />
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
        <Icon
          as={Search}
          boxSize="4"
          color="faint"
          left="3.5"
          pointerEvents="none"
          position="absolute"
          top="50%"
          transform="translateY(-50%)"
          zIndex="1"
        />
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
      <Menu.Root
        open={menuOpen}
        onOpenChange={(details) => setMenuOpen(details.open)}
        positioning={{ placement: 'bottom-end' }}
      >
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
            <Menu.Content
              bg="cardBg"
              borderColor="borderStrong"
              borderRadius="11px"
              borderWidth="1px"
              minW="160px"
              p="1.5"
              shadow="menu"
            >
              <Text
                color="faint"
                fontSize="2xs"
                fontWeight="700"
                letterSpacing="0.1em"
                px="2.5"
                py="1.5"
                textTransform="uppercase"
              >
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
                    transition="background 120ms ease, color 120ms ease"
                    onClick={() => onCreateSession(provider.id)}
                    _focusVisible={{
                      bg: 'track',
                      outlineColor: 'focusRing',
                      outlineOffset: '2px',
                      outlineWidth: '1px'
                    }}
                    _highlighted={{ bg: 'track', color: 'fg' }}
                    _hover={{ bg: 'track', color: 'fg' }}
                  >
                    <Flex
                      align="center"
                      justify="center"
                      bg={colors.bg}
                      borderRadius="6px"
                      boxSize="6"
                      color={colors.fg}
                    >
                      <ProviderMark provider={provider.id} boxSize="4" />
                    </Flex>
                    <Text flex="1" fontSize="sm" fontWeight="600" color="fg">
                      {provider.label}
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
      <Button
        asChild
        color="accent"
        fontSize="xs"
        fontWeight="600"
        h="6"
        px="1.5"
        variant="ghost"
        _hover={{ bg: 'track' }}
      >
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
  notePanelOpen: boolean
  onToggleNotePanel: () => void
}

interface SessionWorkspaceProps {
  sessionState: SessionState
  runAction: RunAction
  setSessionState: (state: SessionState) => void
}

function SessionWorkspace({ sessionState, runAction, setSessionState }: SessionWorkspaceProps): JSX.Element {
  const [layout, setLayout] = useState<WorkspaceLayoutRequest>(() => ({ ...defaultWorkspaceLayout }))
  const [noteState, setNoteState] = useState<EphemeralNoteState>(() => ({ ...emptyNoteState }))
  const [notePanelRequestedOpen, setNotePanelRequestedOpen] = useState(false)
  const [notePanelRendered, setNotePanelRendered] = useState(false)
  const [viewportWidth, setViewportWidth] = useState(() => window.innerWidth)
  const pendingSplitRatio = useRef<number | null>(null)
  const splitFrame = useRef<number | null>(null)
  const noteLayoutOpen = layout.secondarySurface === 'note'
  const secondaryCollapsed = noteLayoutOpen && viewportWidth < WORKSPACE_MIN_EXPANDED_WIDTH
  const notePanelVisible = notePanelRendered && noteLayoutOpen && !secondaryCollapsed
  const notePanelInteractive = notePanelVisible
  const providerWidth =
    noteLayoutOpen && !secondaryCollapsed ? calculateProviderPaneWidth(viewportWidth, layout.splitRatio) : viewportWidth
  const effectiveLayout = useMemo<WorkspaceLayoutRequest>(
    () => ({
      ...layout,
      secondaryCollapsed
    }),
    [layout, secondaryCollapsed]
  )

  useEffect(() => {
    const updateWidth = (): void => setViewportWidth(window.innerWidth)
    window.addEventListener('resize', updateWidth)
    return () => window.removeEventListener('resize', updateWidth)
  }, [])

  useEffect(() => {
    void window.adit.setWorkspaceLayout(effectiveLayout)
  }, [effectiveLayout])

  useEffect(
    () => () => {
      if (splitFrame.current !== null) {
        window.cancelAnimationFrame(splitFrame.current)
      }
    },
    []
  )

  const toggleNotePanel = useCallback(() => {
    if (notePanelRequestedOpen) {
      setNotePanelRequestedOpen(false)
      setNotePanelRendered(false)
      setLayout((current) => ({
        ...current,
        primarySurface: 'spark',
        secondarySurface: null,
        secondaryCollapsed: false
      }))
      return
    }

    setNotePanelRequestedOpen(true)
    setNotePanelRendered(true)

    setLayout((current) => ({
      ...current,
      primarySurface: 'spark',
      secondarySurface: 'note',
      secondaryCollapsed: false
    }))
  }, [notePanelRequestedOpen])

  const queueSplitRatio = useCallback((splitRatio: number) => {
    pendingSplitRatio.current = splitRatio

    if (splitFrame.current !== null) {
      return
    }

    splitFrame.current = window.requestAnimationFrame(() => {
      splitFrame.current = null
      const nextSplitRatio = pendingSplitRatio.current
      pendingSplitRatio.current = null

      if (nextSplitRatio !== null) {
        setLayout((current) => ({
          ...current,
          splitRatio: nextSplitRatio
        }))
      }
    })
  }, [])

  const startSplitDrag = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      if (!notePanelInteractive) {
        return
      }

      event.preventDefault()
      event.currentTarget.setPointerCapture(event.pointerId)
      const previousCursor = document.body.style.cursor
      const previousUserSelect = document.body.style.userSelect
      document.body.style.cursor = 'col-resize'
      document.body.style.userSelect = 'none'
      const handleGrabOffset = event.clientX - event.currentTarget.getBoundingClientRect().left

      const updateSplit = (pointerEvent: PointerEvent): void => {
        queueSplitRatio(calculateSplitRatioFromProviderEdge(pointerEvent.clientX - handleGrabOffset, window.innerWidth))
      }
      const stopSplit = (): void => {
        document.body.style.cursor = previousCursor
        document.body.style.userSelect = previousUserSelect
        window.removeEventListener('pointermove', updateSplit)
        window.removeEventListener('pointerup', stopSplit)
        window.removeEventListener('pointercancel', stopSplit)
      }

      updateSplit(event.nativeEvent)
      window.addEventListener('pointermove', updateSplit)
      window.addEventListener('pointerup', stopSplit)
      window.addEventListener('pointercancel', stopSplit)
    },
    [notePanelInteractive, queueSplitRatio]
  )

  return (
    <Flex direction="column" h="100vh" bg="bg" color="fg" overflow="hidden">
      <SessionBar
        sessionState={sessionState}
        runAction={runAction}
        setSessionState={setSessionState}
        notePanelOpen={notePanelRequestedOpen}
        onToggleNotePanel={toggleNotePanel}
      />
      <Box flex="1" minH="0" overflow="hidden" position="relative">
        {notePanelVisible ? (
          <Flex h="full" minW="0">
            <Box flex="0 0 auto" w={`${providerWidth}px`} />
            <WorkspaceSplitHandle active={notePanelInteractive} onPointerDown={startSplitDrag} />
            <EphemeralNotePanel active={notePanelInteractive} noteState={noteState} setNoteState={setNoteState} />
          </Flex>
        ) : (
          <Box h="full" />
        )}
      </Box>
    </Flex>
  )
}

function SessionBar({
  sessionState,
  runAction,
  setSessionState,
  notePanelOpen,
  onToggleNotePanel
}: SessionBarProps): JSX.Element {
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
      <Flex align="center" h="full" justify="space-between" pl="92px" pr="3" position="relative">
        <HStack
          color="muted"
          fontSize="sm"
          gap="1"
          left="50%"
          lineHeight="1"
          position="absolute"
          top="50%"
          transform="translate(-50%, -50%)"
          whiteSpace="nowrap"
        >
          <Text as="span" fontWeight="600">
            Adit
          </Text>
          <Text as="span" color="faint" fontWeight="400">
            — Speak, don’t type
          </Text>
        </HStack>
        <HStack className="app-region-no-drag" gap="3">
          <Tooltip.Root openDelay={350} closeDelay={100} positioning={{ placement: 'bottom-start' }}>
            <Tooltip.Trigger asChild>
              <Button
                bg="panelHeader"
                borderColor="border"
                borderRadius="9px"
                borderWidth="1px"
                color="fgSoft"
                fontSize="xs"
                fontWeight="600"
                h="8"
                onClick={() => {
                  void runAction(async () => setSessionState(await window.adit.closeSession()))
                }}
                px="3.5"
                variant="plain"
                w="72px"
                _hover={{ bg: 'track', color: 'fg' }}
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
          <Button
            aria-pressed={notePanelOpen}
            bg="accent"
            borderRadius="9px"
            color="accentOn"
            fontSize="xs"
            fontWeight="600"
            h="8"
            onClick={onToggleNotePanel}
            px="3"
            w="72px"
            _hover={{ bg: 'accentHover' }}
          >
            Note
          </Button>
        </HStack>
      </Flex>
    </Box>
  )
}

interface WorkspaceSplitHandleProps {
  active: boolean
  onPointerDown: (event: ReactPointerEvent<HTMLDivElement>) => void
}

function WorkspaceSplitHandle({ active, onPointerDown }: WorkspaceSplitHandleProps): JSX.Element {
  return (
    <Box
      aria-label="Resize note panel"
      alignItems="center"
      cursor="col-resize"
      display="flex"
      flex="0 0 auto"
      justifyContent="center"
      opacity={active ? '1' : '0'}
      pointerEvents={active ? 'auto' : 'none'}
      position="relative"
      role="separator"
      w={`${WORKSPACE_SPLIT_HANDLE_WIDTH}px`}
      zIndex="1"
      onPointerDown={onPointerDown}
      _hover={{ '& > [data-split-grip]': { bg: 'accent' } }}
    >
      <Box bg="cardBg" inset="0" position="absolute" />
      <Box
        bg="panelHeader"
        borderBottomColor="border"
        borderBottomWidth="1px"
        h="10"
        left="0"
        position="absolute"
        right="0"
        top="0"
      />
      <Box
        data-split-grip
        bg="accent"
        borderRadius="full"
        h="52px"
        left="50%"
        position="absolute"
        top="50%"
        transition="background-color 160ms ease, transform 160ms ease"
        transform="translate(-50%, -50%)"
        w="2px"
      />
    </Box>
  )
}

interface EphemeralNotePanelProps {
  active: boolean
  noteState: EphemeralNoteState
  setNoteState: Dispatch<SetStateAction<EphemeralNoteState>>
}

function EphemeralNotePanel({ active, noteState, setNoteState }: EphemeralNotePanelProps): JSX.Element {
  const editorRef = useRef<MDXEditorMethods>(null)
  const editorPlugins = useMemo(
    () => [
      headingsPlugin(),
      listsPlugin(),
      quotePlugin(),
      linkPlugin(),
      codeBlockPlugin(),
      thematicBreakPlugin(),
      markdownShortcutPlugin()
    ],
    []
  )

  return (
    <Flex
      as="aside"
      bg="cardBg"
      direction="column"
      flex="1"
      minW={`${WORKSPACE_NOTE_MIN_WIDTH}px`}
      overflow="hidden"
      pointerEvents={active ? 'auto' : 'none'}
    >
      <Box
        bg="panelHeader"
        borderBottomColor="border"
        borderBottomWidth="1px"
        flexShrink="0"
        h="10"
        position="relative"
      >
        <Text
          color="muted"
          fontSize="xs"
          fontWeight="600"
          left="50%"
          lineHeight="1"
          position="absolute"
          top="50%"
          transform="translate(-50%, -50%)"
          whiteSpace="nowrap"
        >
          {ephemeralNoteTitle}
        </Text>
      </Box>
      <Box className="adit-mdx-shell" flex="1" minH="0" overflow="hidden">
        <MDXEditor
          ref={editorRef}
          className="adit-mdx-editor"
          contentEditableClassName="adit-mdx-content"
          markdown={noteState.markdown}
          plugins={editorPlugins}
          onChange={(markdown) =>
            setNoteState((current) => ({
              ...current,
              markdown
            }))
          }
        />
      </Box>
    </Flex>
  )
}

interface SparksContentProps {
  archived: boolean
  busy: boolean
  loading: boolean
  sparks: SparkRow[]
  runAction: RunAction
  setSessionState: (state: SessionState) => void
}

function SparksContent({
  archived,
  busy,
  loading,
  sparks,
  runAction,
  setSessionState
}: SparksContentProps): JSX.Element {
  if (loading) {
    return (
      <AditEmptyState description="Loading local session entrances..." icon={<Sparkles />} title="Loading Sparks" />
    )
  }

  if (sparks.length === 0) {
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
      {sparks.map((spark) => (
        <Box as="li" key={spark.id} display="flex">
          <PaperCard
            archived={archived}
            busy={busy}
            spark={spark}
            onArchive={() => {
              void runAction(
                async () => {
                  if (archived) {
                    await window.adit.unarchiveSpark({ id: spark.id })
                  } else {
                    await window.adit.archiveSpark({ id: spark.id })
                  }
                },
                { reloadSparks: true }
              )
            }}
            onOpen={() => {
              void runAction(async () => setSessionState(await window.adit.openSession({ id: spark.id })))
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
  spark: SparkRow
  onArchive: () => void
  onOpen: () => void
}

function PaperCard({ archived, busy, spark, onArchive, onOpen }: PaperCardProps): JSX.Element {
  const [menuOpen, setMenuOpen] = useState(false)

  return (
    <Flex
      aria-label={`Open ${spark.title}`}
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
        <ProviderPill provider={spark.provider} />
        <Text textStyle="cardTitle" color="fg" lineClamp="2" minW="0" overflow="hidden">
          {spark.title}
        </Text>
        <Text
          color="muted"
          fontSize="13px"
          fontWeight="500"
          overflow="hidden"
          textOverflow="ellipsis"
          whiteSpace="nowrap"
        >
          {formatSessionHost(spark.session_url)}
        </Text>
      </Stack>

      <Stack gap="3">
        <Box bg="border" h="1px" />
        <Flex align="center" justify="space-between">
          <HStack color="faint" gap="1.5" minW="0">
            <Icon as={Clock3} boxSize="3.5" />
            <Text fontSize="12.5px" fontWeight="500" overflow="hidden" textOverflow="ellipsis" whiteSpace="nowrap">
              {formatDate(spark.updated_at)}
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
              aria-label="Spark actions"
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

function ProviderMark({ provider, boxSize = '3.5' }: { provider: ProviderId; boxSize?: string }): JSX.Element {
  if (provider === 'chatgpt') {
    return (
      <Box boxSize={boxSize} color="currentColor" display="block">
        <svg aria-hidden="true" fill="currentColor" height="100%" viewBox="0 0 16 16" width="100%">
          <path d="M14.949 6.547a3.94 3.94 0 0 0-.348-3.273 4.11 4.11 0 0 0-4.4-1.934A4.1 4.1 0 0 0 8.423.2 4.15 4.15 0 0 0 6.305.086a4.1 4.1 0 0 0-1.891.948 4.04 4.04 0 0 0-1.158 1.753 4.1 4.1 0 0 0-1.563.679A4 4 0 0 0 .554 4.72a3.99 3.99 0 0 0 .502 4.731 3.94 3.94 0 0 0 .346 3.274 4.11 4.11 0 0 0 4.402 1.933c.382.425.852.764 1.377.995.526.231 1.095.35 1.67.346 1.78.002 3.358-1.132 3.901-2.804a4.1 4.1 0 0 0 1.563-.68 4 4 0 0 0 1.14-1.253 3.99 3.99 0 0 0-.506-4.716m-6.097 8.406a3.05 3.05 0 0 1-1.945-.694l.096-.054 3.23-1.838a.53.53 0 0 0 .265-.455v-4.49l1.366.778q.02.011.025.035v3.722c-.003 1.653-1.361 2.992-3.037 2.996m-6.53-2.75a2.95 2.95 0 0 1-.36-2.01l.095.057L5.29 12.09a.53.53 0 0 0 .527 0l3.949-2.246v1.555a.05.05 0 0 1-.022.041L6.473 13.3c-1.454.826-3.311.335-4.15-1.098m-.85-6.94A3.02 3.02 0 0 1 3.07 3.949v3.785a.51.51 0 0 0 .262.451l3.93 2.237-1.366.779a.05.05 0 0 1-.048 0L2.585 9.342a2.98 2.98 0 0 1-1.113-4.094zm11.216 2.571L8.747 5.576l1.362-.776a.05.05 0 0 1 .048 0l3.265 1.86a3 3 0 0 1 1.173 1.207 2.96 2.96 0 0 1-.27 3.2 3.05 3.05 0 0 1-1.36.997V8.279a.52.52 0 0 0-.276-.445m1.36-2.015-.097-.057-3.226-1.855a.53.53 0 0 0-.53 0L6.249 6.153V4.598a.04.04 0 0 1 .019-.04L9.533 2.7a3.07 3.07 0 0 1 3.257.139c.474.325.843.778 1.066 1.303.223.526.289 1.103.191 1.664zM5.503 8.575 4.139 7.8a.05.05 0 0 1-.026-.037V4.049c0-.57.166-1.127.476-1.607s.752-.864 1.275-1.105a3.08 3.08 0 0 1 3.234.41l-.096.054-3.23 1.838a.53.53 0 0 0-.265.455zm.742-1.577 1.758-1 1.762 1v2l-1.755 1-1.762-1z" />
        </svg>
      </Box>
    )
  }

  return (
    <Box boxSize={boxSize} color="currentColor" display="block">
      <svg aria-hidden="true" fill="currentColor" height="100%" viewBox="0 0 512 509.641" width="100%">
        <path d="M213.235 306.019l178.976-180.002v.169l51.695-51.763c-.924 1.32-1.86 2.605-2.785 3.89-39.281 54.164-58.46 80.649-43.07 146.922l-.09-.101c10.61 45.11-.744 95.137-37.398 131.836-46.216 46.306-120.167 56.611-181.063 14.928l42.462-19.675c38.863 15.278 81.392 8.57 111.947-22.03 30.566-30.6 37.432-75.159 22.065-112.252-2.92-7.025-11.67-8.795-17.792-4.263l-124.947 92.341zm-25.786 22.437-.033.034L68.094 435.217c7.565-10.429 16.957-20.294 26.327-30.149 26.428-27.803 52.653-55.359 36.654-94.302-21.422-52.112-8.952-113.177 30.724-152.898 41.243-41.254 101.98-51.661 152.706-30.758 11.23 4.172 21.016 10.114 28.638 15.639l-42.359 19.584c-39.44-16.563-84.629-5.299-112.207 22.313-37.298 37.308-44.84 102.003-1.128 143.81z" />
      </svg>
    </Box>
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
      <ProviderMark provider={provider} boxSize="3" />
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
  return sparkDateFormatter.format(value)
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

function calculateProviderPaneWidth(contentWidth: number, splitRatio: number): number {
  const maxProviderWidth = contentWidth - WORKSPACE_NOTE_MIN_WIDTH - WORKSPACE_SPLIT_HANDLE_WIDTH
  return Math.min(maxProviderWidth, Math.max(WORKSPACE_PROVIDER_MIN_WIDTH, Math.round(contentWidth * splitRatio)))
}

function calculateSplitRatioFromProviderEdge(providerEdgeX: number, contentWidth: number): number {
  const minRatio = WORKSPACE_PROVIDER_MIN_WIDTH / contentWidth
  const maxRatio = (contentWidth - WORKSPACE_NOTE_MIN_WIDTH - WORKSPACE_SPLIT_HANDLE_WIDTH) / contentWidth
  return Math.min(maxRatio, Math.max(minRatio, providerEdgeX / contentWidth))
}
