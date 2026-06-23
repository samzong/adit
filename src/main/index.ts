import { app, Menu } from 'electron'
import log from 'electron-log/main'
import { openDatabase } from './db/connection'
import { NoteStore } from './db/notes'
import { registerIpc } from './ipc'
import { SessionController } from './session-controller'
import { createMainWindow } from './window'

let sessions: SessionController | null = null

log.initialize()

app.setName('Adit')

app.whenReady().then(() => {
  const database = openDatabase()
  const store = new NoteStore(database)
  const window = createMainWindow()
  sessions = new SessionController(window, store)

  registerIpc(store, sessions)
  configureMenu()

  window.on('resize', () => sessions?.resize())
  window.on('close', () => sessions?.flushSync())

})

app.on('before-quit', () => {
  sessions?.flushSync()
})

app.on('window-all-closed', () => {
  app.quit()
})

function configureMenu(): void {
  const menu = Menu.buildFromTemplate([
    {
      label: 'Adit',
      submenu: [
        { role: 'about' },
        { type: 'separator' },
        {
          label: 'Quit Adit',
          accelerator: 'CommandOrControl+Q',
          click: () => app.quit()
        }
      ]
    },
    {
      label: 'File',
      submenu: [
        {
          label: 'Close Session',
          accelerator: 'CommandOrControl+W',
          click: () => sessions?.close()
        }
      ]
    },
    {
      label: 'Edit',
      submenu: [
        { role: 'undo' },
        { role: 'redo' },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' },
        { role: 'selectAll' }
      ]
    },
    {
      label: 'View',
      submenu: [{ role: 'reload' }, { role: 'toggleDevTools' }, { type: 'separator' }, { role: 'resetZoom' }]
    }
  ])

  Menu.setApplicationMenu(menu)
}
