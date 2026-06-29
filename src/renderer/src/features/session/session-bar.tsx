import { Box, Button, Flex, HStack, Icon, Portal, Text, Tooltip } from '@chakra-ui/react'
import { Circle } from 'lucide-react'
import type { SessionState } from '../../../../shared/types'
import type { RunAction } from '../../app/types'

export function SessionBar({
  sessionState,
  runAction,
  setSessionState,
  notePanelOpen,
  onToggleNotePanel
}: {
  sessionState: SessionState
  runAction: RunAction
  setSessionState: (state: SessionState) => void
  notePanelOpen: boolean
  onToggleNotePanel: () => void
}): JSX.Element {
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
            title="Toggle Note (⌘⇧N)"
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
