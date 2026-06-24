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
} from '../../shared/types'

type Unsubscribe = () => void

declare global {
  interface Window {
    adit: {
      listSparks: (request?: SparkListRequest) => Promise<SparkRow[]>
      renameSpark: (request: RenameSparkRequest) => Promise<SparkRow>
      archiveSpark: (request: ArchiveSparkRequest) => Promise<SparkRow>
      unarchiveSpark: (request: ArchiveSparkRequest) => Promise<SparkRow>
      createSession: (request: CreateSessionRequest) => Promise<SessionState>
      openSession: (request: OpenSessionRequest) => Promise<SessionState>
      closeSession: () => Promise<SessionState>
      getSessionState: () => Promise<SessionState>
      sessionReadSelection: () => Promise<SessionSelectionResult>
      setWorkspaceLayout: (request: WorkspaceLayoutRequest) => Promise<void>
      onSparksChanged: (handler: () => void) => Unsubscribe
      onSessionStateChanged: (handler: (state: SessionState) => void) => Unsubscribe
      onSessionTitleUpdated: (handler: (spark: SparkRow) => void) => Unsubscribe
      onLoginRequired: (handler: (provider: string) => void) => Unsubscribe
      onToast: (handler: (message: ToastMessage) => void) => Unsubscribe
    }
  }
}
