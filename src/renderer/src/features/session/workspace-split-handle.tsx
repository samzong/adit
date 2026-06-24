import { Box } from '@chakra-ui/react'
import type { PointerEvent as ReactPointerEvent } from 'react'
import { WORKSPACE_SPLIT_HANDLE_WIDTH } from '../../../../shared/workspace-layout'

export function WorkspaceSplitHandle({
  active,
  onPointerDown
}: {
  active: boolean
  onPointerDown: (event: ReactPointerEvent<HTMLDivElement>) => void
}): JSX.Element {
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
      <Box
        data-split-grip
        bg="borderStrong"
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
