import type { LibraryItemContentRow, LibraryItemDetail } from '../../../shared/types'

export function primaryMarkdownContent(detail: LibraryItemDetail | null): LibraryItemContentRow | null {
  if (!detail) {
    return null
  }

  return (
    detail.contents.find((content) => content.format === 'markdown' && content.role === 'primary') ??
    detail.contents.find((content) => content.format === 'markdown') ??
    null
  )
}

export function markdownFromLibraryDetail(detail: LibraryItemDetail | null): string {
  return primaryMarkdownContent(detail)?.body_text ?? ''
}

export function markdownPreview(markdown: string): string | null {
  const preview = markdown.replace(/\s+/g, ' ').trim().slice(0, 320)
  return preview || null
}

export function applyMarkdownToDetail(
  detail: LibraryItemDetail,
  markdown: string,
  updatedAt = Date.now()
): LibraryItemDetail {
  const primary = primaryMarkdownContent(detail)

  if (!primary) {
    return detail
  }

  return {
    ...detail,
    item: {
      ...detail.item,
      preview_text: markdownPreview(markdown),
      updated_at: updatedAt
    },
    contents: detail.contents.map((content) =>
      content.id === primary.id
        ? {
            ...content,
            body_text: markdown,
            updated_at: updatedAt
          }
        : content
    )
  }
}
