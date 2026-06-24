import { Box, Text } from '@chakra-ui/react'
import type { ToastMessage } from '../../../shared/types'

export function StatusNotice({ level, message }: ToastMessage): JSX.Element {
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
