import { contextBridge, ipcRenderer } from 'electron'
import { IPC } from '../shared/ipc'
import type {
  AddLibraryImageAttachmentRequest,
  AddLibraryImageAttachmentResult,
  ArchiveLibraryItemRequest,
  ArchiveSparkRequest,
  CreateImageLibraryItemRequest,
  CreateMarkdownLibraryItemRequest,
  CreateSessionRequest,
  ExportMarkdownLibraryItemRequest,
  ExportMarkdownLibraryItemResult,
  GetLibraryItemRequest,
  LibraryItemDetail,
  LibraryItemRow,
  LibraryListRequest,
  SparkRow,
  SparkListRequest,
  OpenSessionRequest,
  RenameSparkRequest,
  SetSessionSelectionActionAvailabilityRequest,
  SessionState,
  ToastMessage,
  UpdateLibraryItemContentRequest,
  UpdateLibraryItemTitleRequest,
  WorkspaceLayoutRequest
} from '../shared/types'
import type { AdapterCapturedSelection } from '../shared/provider-bridge-protocol'

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
  listLibraryItems: (request?: LibraryListRequest): Promise<LibraryItemRow[]> =>
    ipcRenderer.invoke(IPC.libraryList, request),
  getLibraryItem: (request: GetLibraryItemRequest): Promise<LibraryItemDetail | null> =>
    ipcRenderer.invoke(IPC.libraryGet, request),
  createMarkdownLibraryItem: (request?: CreateMarkdownLibraryItemRequest): Promise<LibraryItemDetail> =>
    ipcRenderer.invoke(IPC.libraryCreateMarkdown, request),
  createImageLibraryItem: (request: CreateImageLibraryItemRequest): Promise<LibraryItemDetail> =>
    ipcRenderer.invoke(IPC.libraryCreateImage, request),
  addLibraryImageAttachment: (request: AddLibraryImageAttachmentRequest): Promise<AddLibraryImageAttachmentResult> =>
    ipcRenderer.invoke(IPC.libraryAddImageAttachment, request),
  updateLibraryItemTitle: (request: UpdateLibraryItemTitleRequest): Promise<LibraryItemDetail> =>
    ipcRenderer.invoke(IPC.libraryUpdateTitle, request),
  updateLibraryItemContent: (request: UpdateLibraryItemContentRequest): Promise<LibraryItemDetail> =>
    ipcRenderer.invoke(IPC.libraryUpdateContent, request),
  archiveLibraryItem: (request: ArchiveLibraryItemRequest): Promise<LibraryItemDetail> =>
    ipcRenderer.invoke(IPC.libraryArchive, request),
  unarchiveLibraryItem: (request: ArchiveLibraryItemRequest): Promise<LibraryItemDetail> =>
    ipcRenderer.invoke(IPC.libraryUnarchive, request),
  touchLibraryItemOpened: (request: GetLibraryItemRequest): Promise<LibraryItemDetail> =>
    ipcRenderer.invoke(IPC.libraryTouchOpened, request),
  exportMarkdownLibraryItem: (request: ExportMarkdownLibraryItemRequest): Promise<ExportMarkdownLibraryItemResult> =>
    ipcRenderer.invoke(IPC.libraryExportMarkdown, request),
  createSession: (request: CreateSessionRequest): Promise<SessionState> =>
    ipcRenderer.invoke(IPC.sessionCreate, request),
  openSession: (request: OpenSessionRequest): Promise<SessionState> => ipcRenderer.invoke(IPC.sessionOpen, request),
  closeSession: (): Promise<SessionState> => ipcRenderer.invoke(IPC.sessionClose),
  getSessionState: (): Promise<SessionState> => ipcRenderer.invoke(IPC.sessionState),
  setSessionSelectionActionAvailability: (request: SetSessionSelectionActionAvailabilityRequest): Promise<void> =>
    ipcRenderer.invoke(IPC.sessionSelectionActionAvailabilitySet, request),
  setWorkspaceLayout: (request: WorkspaceLayoutRequest): Promise<void> =>
    ipcRenderer.invoke(IPC.workspaceLayoutSet, request),
  onSparksChanged: (handler: () => void): Unsubscribe => onChannel<void>(IPC.sparksChanged, handler),
  onLibraryChanged: (handler: () => void): Unsubscribe => onChannel<void>(IPC.libraryChanged, handler),
  onSessionStateChanged: (handler: (state: SessionState) => void): Unsubscribe =>
    onChannel<SessionState>(IPC.sessionStateChanged, handler),
  onSessionTitleUpdated: (handler: (spark: SparkRow) => void): Unsubscribe =>
    onChannel<SparkRow>(IPC.sessionTitleUpdated, handler),
  onSessionInsertSelectionRequested: (handler: (selection: AdapterCapturedSelection) => void): Unsubscribe =>
    onChannel<AdapterCapturedSelection>(IPC.sessionInsertSelectionRequested, handler),
  onSessionToggleNoteRequested: (handler: () => void): Unsubscribe =>
    onChannel<void>(IPC.sessionToggleNoteRequested, handler),
  onLoginRequired: (handler: (provider: string) => void): Unsubscribe =>
    onChannel<string>(IPC.sessionLoginRequired, handler),
  onToast: (handler: (message: ToastMessage) => void): Unsubscribe => onChannel<ToastMessage>(IPC.appToast, handler)
}

contextBridge.exposeInMainWorld('adit', api)
