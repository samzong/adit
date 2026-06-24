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
} from '../../shared/types'

type Unsubscribe = () => void

declare global {
  interface Window {
    adit: {
      listNotes: (request?: NotesListRequest) => Promise<NoteRow[]>
      renameNote: (request: RenameNoteRequest) => Promise<NoteRow>
      archiveNote: (request: ArchiveNoteRequest) => Promise<NoteRow>
      unarchiveNote: (request: ArchiveNoteRequest) => Promise<NoteRow>
      createSession: (request: CreateSessionRequest) => Promise<SessionState>
      openSession: (request: OpenSessionRequest) => Promise<SessionState>
      closeSession: () => Promise<SessionState>
      getSessionState: () => Promise<SessionState>
      sessionReadSelection: () => Promise<SessionSelectionResult>
      onNotesChanged: (handler: () => void) => Unsubscribe
      onSessionStateChanged: (handler: (state: SessionState) => void) => Unsubscribe
      onSessionTitleUpdated: (handler: (note: NoteRow) => void) => Unsubscribe
      onLoginRequired: (handler: (provider: string) => void) => Unsubscribe
      onToast: (handler: (message: ToastMessage) => void) => Unsubscribe
    }
  }
}
