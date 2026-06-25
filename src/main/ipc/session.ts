import { ipcMain } from 'electron'
import { IPC } from '../../shared/ipc'
import type {
  CreateSessionRequest,
  OpenSessionRequest,
  SetSessionSelectionActionAvailabilityRequest,
  WorkspaceLayoutRequest
} from '../../shared/types'
import { isProviderId } from '../providers'
import type { SessionController } from '../session-controller'
import { assertSparkId } from './validation'

export function registerSessionIpc(sessions: SessionController): void {
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
  ipcMain.handle(
    IPC.sessionSelectionActionAvailabilitySet,
    (_event, request: SetSessionSelectionActionAvailabilityRequest) => {
      sessions.setSelectionActionEnabled(request?.enabled === true)
    }
  )
  ipcMain.handle(IPC.workspaceLayoutSet, (_event, request: WorkspaceLayoutRequest) =>
    sessions.setWorkspaceLayout(request)
  )
}
