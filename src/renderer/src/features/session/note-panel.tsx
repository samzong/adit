import { Box, Button, Flex, Icon, IconButton, Input, Menu, Portal, Stack, Text } from '@chakra-ui/react'
import { ChevronLeft, Download, Folder, Image as ImageIcon, MoreHorizontal, Plus, Search } from 'lucide-react'
import { useMemo, useState, type RefObject } from 'react'
import type { LibraryImageInput, LibraryItemDetail, LibraryItemRow } from '../../../../shared/types'
import { WORKSPACE_NOTE_MIN_WIDTH } from '../../../../shared/workspace-layout'
import { markdownFromLibraryDetail } from '../../editor/library-markdown'
import { MarkdownDocumentEditor, type MarkdownDocumentEditorHandle } from '../../editor/markdown-document-editor'
import { AditEmptyState } from '../../ui/empty-state'
import { formatDate } from '../../utils/format'
import { formatLibraryKind, libraryKindIcon } from '../library/library-kind'
import { hasImageDrop, hasPossibleImageDrop, imageInputFromDrop } from './image-drop'

export type NotePanelMode = 'chooser' | 'editor'

export function NotePanel({
  active,
  editorRef,
  items,
  loading,
  mode,
  note,
  onCreateNote,
  onDropImage,
  onExportNote,
  onOpenNote,
  onSwitchNote,
  onUpdateMarkdown
}: {
  active: boolean
  editorRef: RefObject<MarkdownDocumentEditorHandle>
  items: LibraryItemRow[]
  loading: boolean
  mode: NotePanelMode
  note: LibraryItemDetail | null
  onCreateNote: () => void
  onDropImage: (image: LibraryImageInput, insertMarkdown?: (markdown: string) => boolean) => void
  onExportNote: () => void
  onOpenNote: (id: string) => void
  onSwitchNote: () => void
  onUpdateMarkdown: (markdown: string) => void
}): JSX.Element {
  const showEditor = mode === 'editor' && note
  const markdown = markdownFromLibraryDetail(note)
  const [dropActive, setDropActive] = useState(false)
  const [dropError, setDropError] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const normalizedQuery = query.trim().toLowerCase()
  const visibleItems = useMemo(() => {
    if (!normalizedQuery) {
      return items
    }

    return items.filter((item) => {
      const preview = item.preview_text ?? ''
      return item.title.toLowerCase().includes(normalizedQuery) || preview.toLowerCase().includes(normalizedQuery)
    })
  }, [items, normalizedQuery])

  return (
    <Flex
      as="aside"
      bg="cardBg"
      borderLeftColor="border"
      borderLeftWidth="1px"
      direction="column"
      flex="1"
      minW={`${WORKSPACE_NOTE_MIN_WIDTH}px`}
      overflow="hidden"
      pointerEvents={active ? 'auto' : 'none'}
      position="relative"
      onDragLeave={(event) => {
        const related = event.relatedTarget
        if (related instanceof Node && event.currentTarget.contains(related)) {
          return
        }
        setDropActive(false)
      }}
      onDragOver={(event) => {
        if (!hasPossibleImageDrop(event.dataTransfer)) {
          return
        }
        event.preventDefault()
        event.dataTransfer.dropEffect = 'copy'
        setDropActive(true)
      }}
      onDrop={(event) => {
        event.preventDefault()
        if (!hasImageDrop(event.dataTransfer)) {
          setDropActive(false)
          setDropError('Unsupported image drag payload.')
          return
        }

        setDropActive(false)
        void imageInputFromDrop(event.dataTransfer)
          .then((image) => {
            if (!image) {
              throw new Error('Unsupported image drag payload.')
            }
            setDropError(null)
            onDropImage(image, showEditor ? (value) => editorRef.current?.insertMarkdown(value) ?? false : undefined)
          })
          .catch((reason) => {
            setDropError(reason instanceof Error ? reason.message : 'Unsupported image drag payload.')
          })
      }}
    >
      {dropActive && (
        <Flex
          align="center"
          bg="track"
          borderColor="accent"
          borderRadius="12px"
          borderStyle="dashed"
          borderWidth="1px"
          color="accent"
          gap="2"
          inset="3"
          justify="center"
          pointerEvents="none"
          position="absolute"
          shadow="cardHover"
          zIndex="2"
        >
          <Icon as={ImageIcon} boxSize="5" />
          <Text fontSize="sm" fontWeight="700">
            {showEditor ? 'Drop to insert image' : 'Drop to save image'}
          </Text>
        </Flex>
      )}
      {dropError && (
        <Box
          bg="cardBg"
          borderColor="borderStrong"
          borderRadius="10px"
          borderWidth="1px"
          bottom="3"
          color="muted"
          left="3"
          px="3"
          py="2"
          position="absolute"
          right="3"
          shadow="menu"
          zIndex="3"
        >
          <Text fontSize="xs" fontWeight="600">
            {dropError}
          </Text>
        </Box>
      )}
      {showEditor ? (
        <>
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
              aria-label="Switch note"
              color="muted"
              fontSize="xs"
              fontWeight="600"
              gap="0.5"
              h="7"
              onClick={onSwitchNote}
              px="2"
              variant="ghost"
              _hover={{ bg: 'track', color: 'fg' }}
            >
              <Icon as={ChevronLeft} boxSize="3.5" />
              <Text as="span">Notes</Text>
            </Button>
            <Text
              color="muted"
              fontSize="xs"
              fontWeight="600"
              left="50%"
              lineHeight="1"
              maxW="calc(100% - 148px)"
              overflow="hidden"
              position="absolute"
              textOverflow="ellipsis"
              top="50%"
              transform="translate(-50%, -50%)"
              whiteSpace="nowrap"
            >
              {note.item.title}
            </Text>
            <Menu.Root positioning={{ placement: 'bottom-end' }}>
              <Menu.Trigger asChild>
                <IconButton
                  aria-label="Note actions"
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
                    <Menu.Item value="export-markdown" borderRadius="7px" gap="2" onClick={onExportNote}>
                      <Icon as={Download} boxSize="3.5" />
                      <Text fontSize="sm">Export Markdown</Text>
                    </Menu.Item>
                  </Menu.Content>
                </Menu.Positioner>
              </Portal>
            </Menu.Root>
          </Flex>
          <MarkdownDocumentEditor
            ref={editorRef}
            documentId={note.item.id}
            markdown={markdown}
            onChange={onUpdateMarkdown}
          />
        </>
      ) : (
        <>
          <Stack flex="1" gap="3" minH="0" overflow="auto" p="4">
            {loading ? (
              <AditEmptyState description="Loading saved Library items..." icon={<Folder />} title="Loading Library" />
            ) : items.length > 0 ? (
              <>
                <Flex align="center" borderBottomColor="border" borderBottomWidth="1px" gap="2.5" pb="3" w="full">
                  <Box flex="1" minW="0" position="relative">
                    <Icon
                      as={Search}
                      boxSize="3.5"
                      color="faint"
                      left="3"
                      pointerEvents="none"
                      position="absolute"
                      top="50%"
                      transform="translateY(-50%)"
                      zIndex="1"
                    />
                    <Input
                      bg="panelHeader"
                      borderColor="border"
                      borderRadius="9px"
                      color="fg"
                      fontSize="sm"
                      fontWeight="500"
                      h="8"
                      pl="8"
                      placeholder="Search Library"
                      value={query}
                      onChange={(event) => setQuery(event.target.value)}
                      _focus={{ bg: 'panelHeader', borderColor: 'focusRing' }}
                      _placeholder={{ color: 'faint' }}
                    />
                  </Box>
                  <Button
                    bg="panelHeader"
                    borderColor="border"
                    borderRadius="9px"
                    borderWidth="1px"
                    color="fgSoft"
                    flexShrink="0"
                    fontSize="xs"
                    fontWeight="600"
                    h="8"
                    lineHeight="1"
                    onClick={onCreateNote}
                    px="3.5"
                    variant="plain"
                    _hover={{ bg: 'track', color: 'fg' }}
                  >
                    <Icon as={Plus} boxSize="3.5" />
                    New note
                  </Button>
                </Flex>
                {visibleItems.length > 0 ? (
                  <Stack as="ul" gap="2" listStyle="none" m="0" p="0">
                    {visibleItems.map((item) => (
                      <Box as="li" key={item.id}>
                        <Flex
                          as="button"
                          align="center"
                          bg="cardBg"
                          borderColor={note?.item.id === item.id ? 'borderStrong' : 'border'}
                          borderRadius="10px"
                          borderWidth="1px"
                          color="fg"
                          cursor="pointer"
                          gap="3"
                          minH="58px"
                          px="3.5"
                          py="2.5"
                          textAlign="left"
                          w="full"
                          onClick={() => onOpenNote(item.id)}
                          _hover={{ bg: 'cardHoverBg', borderColor: 'borderStrong' }}
                        >
                          <Icon as={libraryKindIcon(item.kind)} boxSize="4" color="accent" flexShrink="0" />
                          <Stack gap="0.5" minW="0">
                            <Text
                              fontSize="sm"
                              fontWeight="700"
                              overflow="hidden"
                              textOverflow="ellipsis"
                              whiteSpace="nowrap"
                            >
                              {item.title}
                            </Text>
                            <Text color="muted" fontSize="xs" fontWeight="500" lineClamp="1">
                              {item.preview_text || `${formatLibraryKind(item.kind)} · ${formatDate(item.updated_at)}`}
                            </Text>
                          </Stack>
                        </Flex>
                      </Box>
                    ))}
                  </Stack>
                ) : (
                  <AditEmptyState
                    description="Try another title or preview."
                    icon={<Search />}
                    title="No matching items"
                  />
                )}
              </>
            ) : (
              <AditEmptyState
                action={
                  <Button
                    bg="panelHeader"
                    borderColor="border"
                    borderRadius="9px"
                    borderWidth="1px"
                    color="fgSoft"
                    fontSize="xs"
                    fontWeight="600"
                    h="8"
                    onClick={onCreateNote}
                    px="3.5"
                    variant="plain"
                    _hover={{ bg: 'track', color: 'fg' }}
                  >
                    <Icon as={Plus} boxSize="3.5" />
                    New note
                  </Button>
                }
                description="Create a document, then keep editing it beside this Spark."
                icon={<Folder />}
                title="No notes yet"
              />
            )}
          </Stack>
        </>
      )}
    </Flex>
  )
}
