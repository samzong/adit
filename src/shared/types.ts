import type { AdapterCapturedSelection, ProviderBridgeErrorCode } from './provider-bridge-protocol'

export type ProviderId = 'chatgpt' | 'grok'

export interface NoteRow {
  id: string
  provider: ProviderId
  session_url: string | null
  title: string
  is_title_manual: number
  created_at: number
  updated_at: number
  last_opened_at: number | null
  archived: number
}

export interface NotesListRequest {
  archived?: boolean
  query?: string
}

export interface RenameNoteRequest {
  id: string
  title: string
}

export interface ArchiveNoteRequest {
  id: string
}

export interface CreateSessionRequest {
  provider: ProviderId
}

export interface OpenSessionRequest {
  id: string
}

export type SessionMode = 'list' | 'creating' | 'active_ephemeral' | 'active_saved' | 'closing'

export interface SessionState {
  mode: SessionMode
  provider: ProviderId | null
  noteId: string | null
  sessionUrl: string | null
  title: string | null
}

export interface CaptureSource {
  provider: ProviderId
  url: string
  title: string | null
  capturedAt: number
}

export interface SessionSelectionResult {
  selection: AdapterCapturedSelection | null
  source: CaptureSource
}

export interface SessionSelectionError {
  code: ProviderBridgeErrorCode
  message?: string
}

export type ToastLevel = 'info' | 'error'

export interface ToastMessage {
  level: ToastLevel
  message: string
}
