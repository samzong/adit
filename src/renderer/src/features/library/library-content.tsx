import { Box } from '@chakra-ui/react'
import { Folder } from 'lucide-react'
import type { LibraryItemDetail, LibraryItemRow } from '../../../../shared/types'
import type { RunAction } from '../../app/types'
import { AditEmptyState } from '../../ui/empty-state'
import { LibraryCard } from './library-card'
import { LibraryDetailView } from './library-detail-view'

export function LibraryContent({
  busy,
  detail,
  items,
  loading,
  onBack,
  onExport,
  onOpen,
  onUpdateMarkdown,
  runAction
}: {
  busy: boolean
  detail: LibraryItemDetail | null
  items: LibraryItemRow[]
  loading: boolean
  onBack: () => void
  onExport: () => void
  onOpen: (id: string) => void
  onUpdateMarkdown: (markdown: string) => void
  runAction: RunAction
}): JSX.Element {
  if (loading) {
    return <AditEmptyState description="Loading saved AI notes..." icon={<Folder />} title="Loading Library" />
  }

  if (detail) {
    return <LibraryDetailView detail={detail} onBack={onBack} onExport={onExport} onUpdateMarkdown={onUpdateMarkdown} />
  }

  if (items.length === 0) {
    return (
      <AditEmptyState
        description="Save the AI results worth keeping. Documents, images, files, and code will appear here as Library items."
        icon={<Folder />}
        title="No Library items yet"
      />
    )
  }

  return (
    <Box as="ul" display="grid" gap="4" gridTemplateColumns="repeat(4, minmax(0, 1fr))" listStyle="none" m="0" p="0">
      {items.map((item) => (
        <Box as="li" key={item.id} display="flex">
          <LibraryCard
            busy={busy}
            item={item}
            onArchive={() => {
              void runAction(
                async () => {
                  await window.adit.archiveLibraryItem({ id: item.id })
                },
                { reloadLibrary: true }
              )
            }}
            onOpen={() => onOpen(item.id)}
          />
        </Box>
      ))}
    </Box>
  )
}
