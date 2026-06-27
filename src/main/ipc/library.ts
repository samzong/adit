import { writeFile } from 'node:fs/promises'
import { BrowserWindow, dialog, ipcMain } from 'electron'
import { IPC } from '../../shared/ipc'
import type {
  AddLibraryImageAttachmentRequest,
  ArchiveLibraryItemRequest,
  CreateImageLibraryItemRequest,
  CreateMarkdownLibraryItemRequest,
  ExportMarkdownLibraryItemRequest,
  GetLibraryItemRequest,
  LibraryListRequest,
  UpdateLibraryItemContentRequest,
  UpdateLibraryItemTitleRequest
} from '../../shared/types'
import type { LibraryStore } from '../db/library'
import {
  assertItemId,
  assertString,
  assertStringValue,
  sanitizeCreateMarkdownRequest,
  sanitizeLibraryListRequest
} from './validation'
import { markdownForImageAttachment, prepareLibraryImage } from '../library-assets'

export function registerLibraryIpc(library: LibraryStore): void {
  ipcMain.handle(IPC.libraryList, (_event, request: LibraryListRequest = {}) =>
    library.listItems(sanitizeLibraryListRequest(request))
  )

  ipcMain.handle(IPC.libraryGet, (_event, request: GetLibraryItemRequest) => {
    assertItemId(request?.id)
    return library.getItem(request.id)
  })

  ipcMain.handle(IPC.libraryCreateMarkdown, (event, request: CreateMarkdownLibraryItemRequest = {}) => {
    const detail = library.createMarkdownItem(sanitizeCreateMarkdownRequest(request))
    event.sender.send(IPC.libraryChanged)
    return detail
  })

  ipcMain.handle(IPC.libraryCreateImage, async (event, request: CreateImageLibraryItemRequest) => {
    const image = await prepareLibraryImage(request?.image)
    const detail = library.createImageItem(image)
    event.sender.send(IPC.libraryChanged)
    return detail
  })

  ipcMain.handle(IPC.libraryAddImageAttachment, async (event, request: AddLibraryImageAttachmentRequest) => {
    assertItemId(request?.itemId)
    const image = await prepareLibraryImage(request.image)
    const result = library.addImageAttachment(request.itemId, image)
    event.sender.send(IPC.libraryChanged)
    return {
      ...result,
      markdown: markdownForImageAttachment(result.attachment)
    }
  })

  ipcMain.handle(IPC.libraryUpdateTitle, (event, request: UpdateLibraryItemTitleRequest) => {
    assertItemId(request?.id)
    assertString(request?.title, 'Title is required')
    const detail = library.updateTitle(request.id, request.title)
    event.sender.send(IPC.libraryChanged)
    return detail
  })

  ipcMain.handle(IPC.libraryUpdateContent, (event, request: UpdateLibraryItemContentRequest) => {
    assertItemId(request?.id)
    assertStringValue(request?.bodyText, 'Content is required')
    if (request.contentId !== undefined) {
      assertItemId(request.contentId)
    }
    const detail = library.updateContent(request.id, request.bodyText, request.contentId)
    event.sender.send(IPC.libraryChanged)
    return detail
  })

  ipcMain.handle(IPC.libraryArchive, (event, request: ArchiveLibraryItemRequest) => {
    assertItemId(request?.id)
    const detail = library.setArchived(request.id, true)
    event.sender.send(IPC.libraryChanged)
    return detail
  })

  ipcMain.handle(IPC.libraryUnarchive, (event, request: ArchiveLibraryItemRequest) => {
    assertItemId(request?.id)
    const detail = library.setArchived(request.id, false)
    event.sender.send(IPC.libraryChanged)
    return detail
  })

  ipcMain.handle(IPC.libraryTouchOpened, (event, request: GetLibraryItemRequest) => {
    assertItemId(request?.id)
    const detail = library.touchOpened(request.id)
    event.sender.send(IPC.libraryChanged)
    return detail
  })

  ipcMain.handle(IPC.libraryExportMarkdown, async (event, request: ExportMarkdownLibraryItemRequest) => {
    assertItemId(request?.id)
    const detail = library.getItem(request.id)

    if (!detail) {
      throw new Error('Library item not found')
    }

    const markdown = detail.contents.find((content) => content.role === 'primary' && content.format === 'markdown')

    if (!markdown) {
      throw new Error('Library item has no Markdown content')
    }

    const browserWindow = BrowserWindow.fromWebContents(event.sender)
    const options = {
      defaultPath: `${safeMarkdownFileName(detail.item.title)}.md`,
      filters: [{ name: 'Markdown', extensions: ['md'] }]
    }
    const result = browserWindow
      ? await dialog.showSaveDialog(browserWindow, options)
      : await dialog.showSaveDialog(options)

    if (result.canceled || !result.filePath) {
      return { canceled: true }
    }

    await writeFile(result.filePath, markdown.body_text ?? '', 'utf8')
    return { canceled: false, filePath: result.filePath }
  })
}

function safeMarkdownFileName(title: string): string {
  const reservedCharacters = '<>:"/\\|?*'
  const clean = Array.from(title, (character) =>
    reservedCharacters.includes(character) || character.charCodeAt(0) < 32 ? ' ' : character
  )
    .join('')
    .replace(/\s+/g, ' ')
    .trim()
  return clean || 'Untitled note'
}
