import { ipcMain } from 'electron'
import { IPC } from '../shared/ipc'
import type {
  ArchiveNoteRequest,
  CreateSessionRequest,
  NotesListRequest,
  OpenSessionRequest,
  RenameNoteRequest
} from '../shared/types'
import type { NoteStore } from './db/notes'
import { isProviderId } from './providers'
import type { SessionController } from './session-controller'

export function registerIpc(store: NoteStore, sessions: SessionController): void {
  ipcMain.handle(IPC.notesList, (_event, request: NotesListRequest = {}) => store.listNotes(sanitizeListRequest(request)))

  ipcMain.handle(IPC.notesRename, (_event, request: RenameNoteRequest) => {
    assertString(request?.id, 'Note id is required')
    assertString(request?.title, 'Title is required')
    return store.renameNote(request.id, request.title)
  })

  ipcMain.handle(IPC.notesArchive, (_event, request: ArchiveNoteRequest) => {
    assertString(request?.id, 'Note id is required')
    return store.setArchived(request.id, true)
  })

  ipcMain.handle(IPC.notesUnarchive, (_event, request: ArchiveNoteRequest) => {
    assertString(request?.id, 'Note id is required')
    return store.setArchived(request.id, false)
  })

  ipcMain.handle(IPC.sessionCreate, (_event, request: CreateSessionRequest) => {
    if (!isProviderId(request?.provider)) {
      throw new Error('Unsupported provider')
    }

    return sessions.create(request.provider)
  })

  ipcMain.handle(IPC.sessionOpen, (_event, request: OpenSessionRequest) => {
    assertString(request?.id, 'Note id is required')
    return sessions.open(request.id)
  })

  ipcMain.handle(IPC.sessionClose, () => sessions.close())
  ipcMain.handle(IPC.sessionState, () => sessions.getState())
}

function sanitizeListRequest(request: NotesListRequest): NotesListRequest {
  return {
    archived: Boolean(request.archived),
    query: typeof request.query === 'string' ? request.query : ''
  }
}

function assertString(value: unknown, message: string): asserts value is string {
  if (typeof value !== 'string' || value.trim() === '') {
    throw new Error(message)
  }
}
