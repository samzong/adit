import { Button, Flex, Icon, IconButton, Image, Menu, Portal, Stack, Text } from '@chakra-ui/react'
import { ChevronLeft, Download, File, MoreHorizontal } from 'lucide-react'
import { libraryAttachmentUrl } from '../../../../shared/library-assets'
import type { LibraryItemDetail } from '../../../../shared/types'
import { markdownFromLibraryDetail } from '../../editor/library-markdown'
import { MarkdownDocumentEditor } from '../../editor/markdown-document-editor'
import { formatLibraryKind } from './library-kind'

export function LibraryDetailView({
  detail,
  onBack,
  onExport,
  onUpdateMarkdown
}: {
  detail: LibraryItemDetail
  onBack: () => void
  onExport: () => void
  onUpdateMarkdown: (markdown: string) => void
}): JSX.Element {
  const markdown = markdownFromLibraryDetail(detail)

  if (detail.item.kind === 'image_asset') {
    const image = detail.attachments.find((attachment) => attachment.role === 'primary')

    return (
      <Stack
        bg="cardBg"
        borderColor="border"
        borderRadius="panel"
        borderWidth="1px"
        gap="0"
        minH="560px"
        overflow="hidden"
      >
        <LibraryDetailHeader detail={detail} onBack={onBack} onExport={onExport} exportDisabled />
        <Flex align="center" flex="1" justify="center" minH="0" p="6">
          {image ? (
            <Image
              alt={detail.item.title}
              borderRadius="10px"
              maxH="min(620px, 72vh)"
              maxW="full"
              objectFit="contain"
              src={libraryAttachmentUrl(image.id)}
            />
          ) : (
            <Text color="muted" fontSize="sm" fontWeight="600">
              Image attachment missing.
            </Text>
          )}
        </Flex>
      </Stack>
    )
  }

  if (detail.item.kind !== 'markdown_doc') {
    return (
      <Stack
        bg="cardBg"
        borderColor="border"
        borderRadius="panel"
        borderWidth="1px"
        gap="0"
        minH="560px"
        overflow="hidden"
      >
        <LibraryDetailHeader detail={detail} onBack={onBack} onExport={onExport} exportDisabled />
        <Flex align="center" color="muted" flex="1" justify="center" px="6" textAlign="center">
          <Stack align="center" gap="2">
            <Icon as={File} boxSize="6" color="accent" />
            <Text fontSize="md" fontWeight="700">
              {formatLibraryKind(detail.item.kind)}
            </Text>
            <Text fontSize="sm" maxW="360px">
              This Library item type is stored, but its viewer is not implemented in this phase.
            </Text>
          </Stack>
        </Flex>
      </Stack>
    )
  }

  return (
    <Stack
      bg="cardBg"
      borderColor="border"
      borderRadius="panel"
      borderWidth="1px"
      gap="0"
      minH="560px"
      overflow="hidden"
    >
      <LibraryDetailHeader detail={detail} onBack={onBack} onExport={onExport} />
      <MarkdownDocumentEditor documentId={detail.item.id} markdown={markdown} onChange={onUpdateMarkdown} />
    </Stack>
  )
}

function LibraryDetailHeader({
  detail,
  exportDisabled = false,
  onBack,
  onExport
}: {
  detail: LibraryItemDetail
  exportDisabled?: boolean
  onBack: () => void
  onExport: () => void
}): JSX.Element {
  return (
    <Flex
      align="center"
      bg="panelHeader"
      borderBottomColor="border"
      borderBottomWidth="1px"
      flexShrink="0"
      h="10"
      justify="space-between"
      px="2"
      position="relative"
    >
      <Button
        aria-label="Back to Library"
        color="muted"
        fontSize="xs"
        fontWeight="600"
        gap="0.5"
        h="7"
        onClick={onBack}
        px="2"
        variant="ghost"
        _hover={{ bg: 'track', color: 'fg' }}
      >
        <Icon as={ChevronLeft} boxSize="3.5" />
        <Text as="span">Library</Text>
      </Button>
      <Text
        color="muted"
        fontSize="xs"
        fontWeight="600"
        left="50%"
        lineHeight="1"
        maxW="calc(100% - 180px)"
        overflow="hidden"
        position="absolute"
        textOverflow="ellipsis"
        top="50%"
        transform="translate(-50%, -50%)"
        whiteSpace="nowrap"
      >
        {detail.item.title}
      </Text>
      <Menu.Root positioning={{ placement: 'bottom-end' }}>
        <Menu.Trigger asChild>
          <IconButton
            aria-label="Library item actions"
            color="muted"
            minW="7"
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
              minW="176px"
              p="1.5"
              shadow="menu"
            >
              <Menu.Item
                value="export-markdown"
                borderRadius="7px"
                disabled={exportDisabled}
                gap="2"
                onClick={onExport}
              >
                <Icon as={Download} boxSize="3.5" />
                <Text fontSize="sm">Export Markdown</Text>
              </Menu.Item>
            </Menu.Content>
          </Menu.Positioner>
        </Portal>
      </Menu.Root>
    </Flex>
  )
}
