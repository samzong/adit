import { contextBridge, ipcRenderer } from 'electron'
import { IPC } from '../shared/ipc'
import type {
  ArchiveSparkRequest,
  CreateSessionRequest,
  SparkRow,
  SparkListRequest,
  OpenSessionRequest,
  RenameSparkRequest,
  SessionSelectionResult,
  SessionState,
  ToastMessage,
  WorkspaceLayoutRequest
} from '../shared/types'

type Unsubscribe = () => void

function onChannel<T>(channel: string, handler: (payload: T) => void): Unsubscribe {
  const listener = (_event: Electron.IpcRendererEvent, payload: T): void => handler(payload)
  ipcRenderer.on(channel, listener)
  return () => ipcRenderer.off(channel, listener)
}

const api = {
  listSparks: (request?: SparkListRequest): Promise<SparkRow[]> => ipcRenderer.invoke(IPC.sparksList, request),
  renameSpark: (request: RenameSparkRequest): Promise<SparkRow> => ipcRenderer.invoke(IPC.sparksRename, request),
  archiveSpark: (request: ArchiveSparkRequest): Promise<SparkRow> => ipcRenderer.invoke(IPC.sparksArchive, request),
  unarchiveSpark: (request: ArchiveSparkRequest): Promise<SparkRow> => ipcRenderer.invoke(IPC.sparksUnarchive, request),
  createSession: (request: CreateSessionRequest): Promise<SessionState> =>
    ipcRenderer.invoke(IPC.sessionCreate, request),
  openSession: (request: OpenSessionRequest): Promise<SessionState> => ipcRenderer.invoke(IPC.sessionOpen, request),
  closeSession: (): Promise<SessionState> => ipcRenderer.invoke(IPC.sessionClose),
  getSessionState: (): Promise<SessionState> => ipcRenderer.invoke(IPC.sessionState),
  sessionReadSelection: (): Promise<SessionSelectionResult> => ipcRenderer.invoke(IPC.sessionReadSelection),
  setWorkspaceLayout: (request: WorkspaceLayoutRequest): Promise<void> =>
    ipcRenderer.invoke(IPC.workspaceLayoutSet, request),
  onSparksChanged: (handler: () => void): Unsubscribe => onChannel<void>(IPC.sparksChanged, handler),
  onSessionStateChanged: (handler: (state: SessionState) => void): Unsubscribe =>
    onChannel<SessionState>(IPC.sessionStateChanged, handler),
  onSessionTitleUpdated: (handler: (spark: SparkRow) => void): Unsubscribe =>
    onChannel<SparkRow>(IPC.sessionTitleUpdated, handler),
  onLoginRequired: (handler: (provider: string) => void): Unsubscribe =>
    onChannel<string>(IPC.sessionLoginRequired, handler),
  onToast: (handler: (message: ToastMessage) => void): Unsubscribe => onChannel<ToastMessage>(IPC.appToast, handler)
}

contextBridge.exposeInMainWorld('adit', api)
