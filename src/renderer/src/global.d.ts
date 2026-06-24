import type {
  ArchiveLibraryItemRequest,
  ArchiveSparkRequest,
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
  SessionSelectionResult,
  SessionState,
  ToastMessage,
  UpdateLibraryItemContentRequest,
  UpdateLibraryItemTitleRequest,
  WorkspaceLayoutRequest
} from '../../shared/types'
import type { AdapterCapturedSelection } from '../../shared/provider-bridge-protocol'

type Unsubscribe = () => void

declare global {
  interface Window {
    adit: {
      listSparks: (request?: SparkListRequest) => Promise<SparkRow[]>
      renameSpark: (request: RenameSparkRequest) => Promise<SparkRow>
      archiveSpark: (request: ArchiveSparkRequest) => Promise<SparkRow>
      unarchiveSpark: (request: ArchiveSparkRequest) => Promise<SparkRow>
      listLibraryItems: (request?: LibraryListRequest) => Promise<LibraryItemRow[]>
      getLibraryItem: (request: GetLibraryItemRequest) => Promise<LibraryItemDetail | null>
      createMarkdownLibraryItem: (request?: CreateMarkdownLibraryItemRequest) => Promise<LibraryItemDetail>
      updateLibraryItemTitle: (request: UpdateLibraryItemTitleRequest) => Promise<LibraryItemDetail>
      updateLibraryItemContent: (request: UpdateLibraryItemContentRequest) => Promise<LibraryItemDetail>
      archiveLibraryItem: (request: ArchiveLibraryItemRequest) => Promise<LibraryItemDetail>
      unarchiveLibraryItem: (request: ArchiveLibraryItemRequest) => Promise<LibraryItemDetail>
      touchLibraryItemOpened: (request: GetLibraryItemRequest) => Promise<LibraryItemDetail>
      exportMarkdownLibraryItem: (request: ExportMarkdownLibraryItemRequest) => Promise<ExportMarkdownLibraryItemResult>
      createSession: (request: CreateSessionRequest) => Promise<SessionState>
      openSession: (request: OpenSessionRequest) => Promise<SessionState>
      closeSession: () => Promise<SessionState>
      getSessionState: () => Promise<SessionState>
      sessionReadSelection: () => Promise<SessionSelectionResult>
      setSessionSelectionActionAvailability: (request: SetSessionSelectionActionAvailabilityRequest) => Promise<void>
      setWorkspaceLayout: (request: WorkspaceLayoutRequest) => Promise<void>
      onSparksChanged: (handler: () => void) => Unsubscribe
      onLibraryChanged: (handler: () => void) => Unsubscribe
      onSessionStateChanged: (handler: (state: SessionState) => void) => Unsubscribe
      onSessionTitleUpdated: (handler: (spark: SparkRow) => void) => Unsubscribe
      onSessionInsertSelectionRequested: (handler: (selection: AdapterCapturedSelection) => void) => Unsubscribe
      onLoginRequired: (handler: (provider: string) => void) => Unsubscribe
      onToast: (handler: (message: ToastMessage) => void) => Unsubscribe
    }
  }
}
