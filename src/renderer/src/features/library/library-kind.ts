import { File, FileText, Image as ImageIcon } from 'lucide-react'
import type { LibraryItemKind } from '../../../../shared/types'

export function formatLibraryKind(kind: LibraryItemKind): string {
  switch (kind) {
    case 'markdown_doc':
      return 'Document'
    case 'image_asset':
      return 'Image'
    case 'file_asset':
      return 'File'
    case 'code_asset':
      return 'Code'
    case 'web_capture':
      return 'Web'
  }
}

export function libraryKindIcon(kind: LibraryItemKind): typeof FileText {
  switch (kind) {
    case 'markdown_doc':
      return FileText
    case 'image_asset':
      return ImageIcon
    case 'file_asset':
      return File
    case 'code_asset':
    case 'web_capture':
      return FileText
  }
}
