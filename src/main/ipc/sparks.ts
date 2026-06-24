import { ipcMain } from 'electron'
import { IPC } from '../../shared/ipc'
import type { ArchiveSparkRequest, RenameSparkRequest, SparkListRequest } from '../../shared/types'
import type { SparkStore } from '../db/sparks'
import { assertSparkId, assertString, sanitizeSparkListRequest } from './validation'

export function registerSparkIpc(store: SparkStore): void {
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
}
