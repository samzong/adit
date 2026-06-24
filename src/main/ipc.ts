import type { LibraryStore } from './db/library'
import type { SparkStore } from './db/sparks'
import { registerLibraryIpc } from './ipc/library'
import { registerSessionIpc } from './ipc/session'
import { registerSparkIpc } from './ipc/sparks'
import type { SessionController } from './session-controller'

export function registerIpc(store: SparkStore, library: LibraryStore, sessions: SessionController): void {
  registerSparkIpc(store)
  registerLibraryIpc(library)
  registerSessionIpc(sessions)
}
