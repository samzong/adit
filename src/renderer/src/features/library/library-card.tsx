import { Box, Flex, HStack, Icon, IconButton, Menu, Portal, Stack, Text } from '@chakra-ui/react'
import { Archive, ArrowRight, Clock3, MoreHorizontal } from 'lucide-react'
import { useState } from 'react'
import type { LibraryItemRow } from '../../../../shared/types'
import { formatDate } from '../../utils/format'
import { formatLibraryKind, libraryKindIcon } from './library-kind'

export function LibraryCard({
  busy,
  item,
  onArchive,
  onOpen
}: {
  busy: boolean
  item: LibraryItemRow
  onArchive: () => void
  onOpen: () => void
}): JSX.Element {
  const [menuOpen, setMenuOpen] = useState(false)

  return (
    <Flex
      aria-label={`Open ${item.title}`}
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
        <HStack
          alignSelf="flex-start"
          bg="track"
          borderColor="trackBorder"
          borderRadius="full"
          borderWidth="1px"
          color="muted"
          gap="1.5"
          px="2.5"
          py="1"
        >
          <Icon as={libraryKindIcon(item.kind)} boxSize="3.5" color="accent" />
          <Text fontSize="11px" fontWeight="700">
            {formatLibraryKind(item.kind)}
          </Text>
        </HStack>
        <Text textStyle="cardTitle" color="fg" lineClamp="2" minW="0" overflow="hidden">
          {item.title}
        </Text>
        <Text color="muted" fontSize="13px" fontWeight="500" lineClamp="3" minH="54px">
          {item.preview_text || 'No preview yet.'}
        </Text>
      </Stack>

      <Stack gap="3">
        <Box bg="border" h="1px" />
        <Flex align="center" justify="space-between">
          <HStack color="faint" gap="1.5" minW="0">
            <Icon as={Clock3} boxSize="3.5" />
            <Text fontSize="12.5px" fontWeight="500" overflow="hidden" textOverflow="ellipsis" whiteSpace="nowrap">
              {formatDate(item.updated_at)}
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
              aria-label="Library item actions"
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
                  value="archive"
                  borderRadius="7px"
                  gap="2"
                  onClick={(event) => {
                    event.stopPropagation()
                    onArchive()
                  }}
                >
                  <Icon as={Archive} boxSize="3.5" />
                  <Text fontSize="sm">Archive</Text>
                </Menu.Item>
              </Menu.Content>
            </Menu.Positioner>
          </Portal>
        </Menu.Root>
      </Box>
    </Flex>
  )
}
