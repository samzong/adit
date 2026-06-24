import { contextBridge, ipcRenderer } from 'electron'
import { IPC } from '../shared/ipc'
import type {
  ArchiveNoteRequest,
  CreateSessionRequest,
  NoteRow,
  NotesListRequest,
  OpenSessionRequest,
  RenameNoteRequest,
  SessionSelectionResult,
  SessionState,
  ToastMessage
} from '../shared/types'

type Unsubscribe = () => void

function onChannel<T>(channel: string, handler: (payload: T) => void): Unsubscribe {
  const listener = (_event: Electron.IpcRendererEvent, payload: T): void => handler(payload)
  ipcRenderer.on(channel, listener)
  return () => ipcRenderer.off(channel, listener)
}

const api = {
  listNotes: (request?: NotesListRequest): Promise<NoteRow[]> => ipcRenderer.invoke(IPC.notesList, request),
  renameNote: (request: RenameNoteRequest): Promise<NoteRow> => ipcRenderer.invoke(IPC.notesRename, request),
  archiveNote: (request: ArchiveNoteRequest): Promise<NoteRow> => ipcRenderer.invoke(IPC.notesArchive, request),
  unarchiveNote: (request: ArchiveNoteRequest): Promise<NoteRow> => ipcRenderer.invoke(IPC.notesUnarchive, request),
  createSession: (request: CreateSessionRequest): Promise<SessionState> =>
    ipcRenderer.invoke(IPC.sessionCreate, request),
  openSession: (request: OpenSessionRequest): Promise<SessionState> => ipcRenderer.invoke(IPC.sessionOpen, request),
  closeSession: (): Promise<SessionState> => ipcRenderer.invoke(IPC.sessionClose),
  getSessionState: (): Promise<SessionState> => ipcRenderer.invoke(IPC.sessionState),
  sessionReadSelection: (): Promise<SessionSelectionResult> => ipcRenderer.invoke(IPC.sessionReadSelection),
  onNotesChanged: (handler: () => void): Unsubscribe => onChannel<void>(IPC.notesChanged, handler),
  onSessionStateChanged: (handler: (state: SessionState) => void): Unsubscribe =>
    onChannel<SessionState>(IPC.sessionStateChanged, handler),
  onSessionTitleUpdated: (handler: (note: NoteRow) => void): Unsubscribe =>
    onChannel<NoteRow>(IPC.sessionTitleUpdated, handler),
  onLoginRequired: (handler: (provider: string) => void): Unsubscribe =>
    onChannel<string>(IPC.sessionLoginRequired, handler),
  onToast: (handler: (message: ToastMessage) => void): Unsubscribe => onChannel<ToastMessage>(IPC.appToast, handler)
}

contextBridge.exposeInMainWorld('adit', api)
