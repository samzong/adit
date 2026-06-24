import { Box, Button, Flex, HStack, Icon, Input, Menu, Portal, Text } from '@chakra-ui/react'
import { ChevronDown, ExternalLink, Folder, FolderOpen, Mic, Plus, Search, Sparkles } from 'lucide-react'
import { useState } from 'react'
import type { ProviderId } from '../../../shared/types'
import { providerColors, providerDefs, ProviderMark } from '../features/sparks/provider'
import type { Section } from './types'
import { AditEmptyState } from '../ui/empty-state'

const repositoryUrl = 'https://github.com/samzong/adit'

export function TitleBar(): JSX.Element {
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

export function SectionTabs({
  section,
  setSection
}: {
  section: Section
  setSection: (section: Section) => void
}): JSX.Element {
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

function SectionTab({
  icon,
  label,
  active,
  onClick
}: {
  icon: typeof Sparkles
  label: string
  active: boolean
  onClick: () => void
}): JSX.Element {
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

export function Toolbar({
  busy,
  query,
  setQuery,
  archived,
  setArchived,
  onCreateSession
}: {
  busy: boolean
  query: string
  setQuery: (value: string) => void
  archived: boolean
  setArchived: (value: boolean) => void
  onCreateSession: (provider: ProviderId) => void
}): JSX.Element {
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

function NewSessionSplit({
  busy,
  onCreateSession
}: {
  busy: boolean
  onCreateSession: (provider: ProviderId) => void
}): JSX.Element {
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

export function FooterBar(): JSX.Element {
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

export function StandaloneNotice(): JSX.Element {
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
