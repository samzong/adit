import { app, Menu, type BrowserWindow } from 'electron'
import log from 'electron-log/main'
import { openDatabase, type DatabaseConnection } from './db/connection'
import { NoteStore } from './db/notes'
import { registerIpc } from './ipc'
import { SessionController } from './session-controller'
import { createMainWindow } from './window'

const acquiredSingleInstanceLock = app.requestSingleInstanceLock()

let database: DatabaseConnection | null = null
let sessions: SessionController | null = null
let mainWindow: BrowserWindow | null = null

log.initialize()

app.setName('Adit')

if (!acquiredSingleInstanceLock) {
  app.quit()
} else {
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) {
        mainWindow.restore()
      }
      mainWindow.focus()
    }
  })

  void app.whenReady().then(() => {
    database = openDatabase()
    const store = new NoteStore(database)
    mainWindow = createMainWindow()
    sessions = new SessionController(mainWindow, store)

    registerIpc(store, sessions)
    configureMenu()

    mainWindow.on('resize', () => sessions?.resize())
    mainWindow.on('closed', () => {
      mainWindow = null
    })
  })

  app.on('before-quit', (event) => {
    if (sessions && database) {
      event.preventDefault()
      sessions.flushSync()
      sessions = null
      try {
        database.close()
      } catch (reason) {
        log.error('Failed to close database', reason)
      }
      database = null
      app.quit()
    }
  })

  app.on('window-all-closed', () => {
    app.quit()
  })
}

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
