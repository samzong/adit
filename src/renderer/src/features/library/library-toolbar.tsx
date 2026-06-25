import { Box, Flex, HStack, Icon, Input, Text } from '@chakra-ui/react'
import { Plus, Search } from 'lucide-react'

export function LibraryToolbar({
  busy,
  query,
  setQuery,
  onCreateItem
}: {
  busy: boolean
  query: string
  setQuery: (value: string) => void
  onCreateItem: () => void
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
          placeholder="Search Library"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          _placeholder={{ color: 'faint' }}
          _focus={{ bg: 'cardBg', borderColor: 'focusRing' }}
        />
      </Box>

      <HStack gap="2.5">
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
            onClick={onCreateItem}
            _hover={{ bg: 'accentHover' }}
          >
            <Icon as={Plus} boxSize="4" />
            <Text as="span">New note</Text>
          </Flex>
        </Flex>
      </HStack>
    </Flex>
  )
}
