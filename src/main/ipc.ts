import { ipcMain } from 'electron'
import log from 'electron-log/main'
import { IPC } from '../shared/ipc'
import type {
  ArchiveSparkRequest,
  CreateSessionRequest,
  SparkListRequest,
  OpenSessionRequest,
  RenameSparkRequest
} from '../shared/types'
import type { SparkStore } from './db/sparks'
import { isProviderId } from './providers'
import type { SessionController } from './session-controller'

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export function registerIpc(store: SparkStore, sessions: SessionController): void {
  ipcMain.handle(IPC.sparksList, (_event, request: SparkListRequest = {}) =>
    store.listSparks(sanitizeSparkListRequest(request))
  )

  ipcMain.handle(IPC.sparksRename, (_event, request: RenameSparkRequest) => {
    assertSparkId(request?.id)
    assertString(request?.title, 'Title is required')
    return store.renameSpark(request.id, request.title)
  })

  ipcMain.handle(IPC.sparksArchive, (_event, request: ArchiveSparkRequest) => {
    assertSparkId(request?.id)
    return store.setArchived(request.id, true)
  })

  ipcMain.handle(IPC.sparksUnarchive, (_event, request: ArchiveSparkRequest) => {
    assertSparkId(request?.id)
    return store.setArchived(request.id, false)
  })

  ipcMain.handle(IPC.sessionCreate, (_event, request: CreateSessionRequest) => {
    if (!isProviderId(request?.provider)) {
      throw new Error('Unsupported provider')
    }

    return sessions.create(request.provider)
  })

  ipcMain.handle(IPC.sessionOpen, (_event, request: OpenSessionRequest) => {
    assertSparkId(request?.id)
    return sessions.open(request.id)
  })

  ipcMain.handle(IPC.sessionClose, () => sessions.close())
  ipcMain.handle(IPC.sessionState, () => sessions.getState())
  ipcMain.handle(IPC.sessionReadSelection, () => sessions.readSelection())
}

function sanitizeSparkListRequest(request: SparkListRequest): SparkListRequest {
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

function assertSparkId(value: unknown): asserts value is string {
  if (typeof value !== 'string' || !UUID_PATTERN.test(value)) {
    log.warn('Rejected IPC request with malformed Spark id', value)
    throw new Error('Valid Spark id is required')
  }
}
