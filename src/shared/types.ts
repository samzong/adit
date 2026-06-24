import type { AdapterCapturedSelection, ProviderBridgeErrorCode } from './provider-bridge-protocol'

export type ProviderId = 'chatgpt' | 'grok'

export interface SparkRow {
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

export interface SparkListRequest {
  archived?: boolean
  query?: string
}

export type LibraryItemKind = 'markdown_doc' | 'image_asset' | 'file_asset' | 'code_asset' | 'web_capture'
export type LibraryContentFormat = 'markdown' | 'plain_text' | 'html' | 'code' | 'image' | 'file'
export type LibraryContentRole = 'primary' | 'body' | 'preview' | 'source_snapshot'
export type LibraryAttachmentRole = 'primary' | 'inline' | 'source' | 'export'

export interface LibraryItemRow {
  id: string
  kind: LibraryItemKind
  title: string
  preview_text: string | null
  archived: number
  pinned: number
  created_at: number
  updated_at: number
  last_opened_at: number | null
}

export interface LibraryItemContentRow {
  id: string
  item_id: string
  role: LibraryContentRole
  format: LibraryContentFormat
  body_text: string | null
  attachment_id: string | null
  language: string | null
  sort_order: number
  metadata_json: string | null
  created_at: number
  updated_at: number
}

export interface LibraryAttachmentRow {
  id: string
  item_id: string
  role: LibraryAttachmentRole
  file_path: string
  original_name: string | null
  mime_type: string | null
  byte_size: number | null
  sha256: string | null
  width: number | null
  height: number | null
  created_at: number
  metadata_json: string | null
}

export interface LibraryItemSourceRow {
  id: string
  item_id: string
  spark_id: string | null
  provider: ProviderId | null
  source_url: string | null
  source_title: string | null
  captured_at: number
  metadata_json: string | null
}

export interface LibraryItemDetail {
  item: LibraryItemRow
  contents: LibraryItemContentRow[]
  attachments: LibraryAttachmentRow[]
  sources: LibraryItemSourceRow[]
}

export interface LibraryListRequest {
  archived?: boolean
  query?: string
  kind?: LibraryItemKind | 'all'
}

export interface GetLibraryItemRequest {
  id: string
}

export interface CreateMarkdownLibraryItemRequest {
  title?: string
  markdown?: string
  source?: {
    sparkId?: string | null
    provider?: ProviderId | null
    url?: string | null
    title?: string | null
    capturedAt?: number
  }
}

export interface UpdateLibraryItemTitleRequest {
  id: string
  title: string
}

export interface UpdateLibraryItemContentRequest {
  id: string
  contentId?: string
  bodyText: string
}

export interface ArchiveLibraryItemRequest {
  id: string
}

export interface ExportMarkdownLibraryItemRequest {
  id: string
}

export interface ExportMarkdownLibraryItemResult {
  canceled: boolean
  filePath?: string
}

export interface RenameSparkRequest {
  id: string
  title: string
}

export interface ArchiveSparkRequest {
  id: string
}

export interface CreateSessionRequest {
  provider: ProviderId
}

export interface OpenSessionRequest {
  id: string
}

export interface SetSessionSelectionActionAvailabilityRequest {
  enabled: boolean
}

export type SessionMode = 'list' | 'creating' | 'active_ephemeral' | 'active_saved' | 'closing'
export type PrimarySurface = 'spark' | 'note'
export type SecondarySurface = 'note' | 'spark' | null

export interface WorkspaceLayoutRequest {
  primarySurface: PrimarySurface
  secondarySurface: SecondarySurface
  secondaryCollapsed: boolean
  splitRatio: number
}

export interface SessionState {
  mode: SessionMode
  provider: ProviderId | null
  sparkId: string | null
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
