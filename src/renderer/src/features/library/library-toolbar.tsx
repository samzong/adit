import { Box, Button, Flex, HStack, Icon, Input, Text } from '@chakra-ui/react'
import { Plus, Search } from 'lucide-react'
import type { LibraryKindFilter } from '../../app/types'

const libraryKindFilters: Array<{ value: LibraryKindFilter; label: string }> = [
  { value: 'all', label: 'All' },
  { value: 'markdown_doc', label: 'Documents' },
  { value: 'image_asset', label: 'Images' },
  { value: 'file_asset', label: 'Files' }
]

export function LibraryToolbar({
  busy,
  kind,
  query,
  setKind,
  setQuery,
  onCreateItem
}: {
  busy: boolean
  kind: LibraryKindFilter
  query: string
  setKind: (kind: LibraryKindFilter) => void
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
        <HStack bg="track" borderColor="trackBorder" borderRadius="9px" borderWidth="1px" gap="1" h="38px" p="1">
          {libraryKindFilters.map((filter) => {
            const active = kind === filter.value
            return (
              <Button
                key={filter.value}
                bg={active ? 'trackActive' : 'transparent'}
                borderColor={active ? 'border' : 'transparent'}
                borderRadius="7px"
                borderWidth="1px"
                color={active ? 'fg' : 'muted'}
                fontSize="12px"
                fontWeight="700"
                h="28px"
                minW="auto"
                onClick={() => setKind(filter.value)}
                px="2.5"
                shadow={active ? 'trackActive' : 'none'}
                variant="plain"
                _hover={{ color: active ? 'fg' : 'fgSoft' }}
              >
                {filter.label}
              </Button>
            )
          })}
        </HStack>
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
