import { Box, Flex, HStack, Icon, IconButton, Menu, Portal, Stack, Text } from '@chakra-ui/react'
import { Archive, ArrowRight, Clock3, MoreHorizontal, RotateCcw, Sparkles } from 'lucide-react'
import { useState } from 'react'
import type { SessionState, SparkRow } from '../../../../shared/types'
import type { RunAction } from '../../app/types'
import { AditEmptyState } from '../../ui/empty-state'
import { formatDate, formatSessionHost } from '../../utils/format'
import { ProviderPill } from './provider'

export function SparksContent({
  archived,
  busy,
  loading,
  sparks,
  runAction,
  setSessionState
}: {
  archived: boolean
  busy: boolean
  loading: boolean
  sparks: SparkRow[]
  runAction: RunAction
  setSessionState: (state: SessionState) => void
}): JSX.Element {
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

function PaperCard({
  archived,
  busy,
  spark,
  onArchive,
  onOpen
}: {
  archived: boolean
  busy: boolean
  spark: SparkRow
  onArchive: () => void
  onOpen: () => void
}): JSX.Element {
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
