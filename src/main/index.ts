import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { app, Menu, nativeImage, Tray, type BrowserWindow } from 'electron'
import log from 'electron-log/main'
import { openDatabase, type DatabaseConnection } from './db/connection'
import { SparkStore } from './db/sparks'
import { registerIpc } from './ipc'
import { providers } from './providers'
import { SessionController } from './session-controller'
import { createMainWindow } from './window'
import type { ProviderId } from '../shared/types'

const acquiredSingleInstanceLock = app.requestSingleInstanceLock()

let database: DatabaseConnection | null = null
let sessions: SessionController | null = null
let mainWindow: BrowserWindow | null = null
let menubar: Tray | null = null
let isQuitting = false

log.initialize()

app.setName('Adit')

if (!acquiredSingleInstanceLock) {
  app.quit()
} else {
  app.on('second-instance', () => {
    showMainWindow()
  })

  app.on('activate', () => {
    showMainWindow()
  })

  void app.whenReady().then(() => {
    database = openDatabase()
    const store = new SparkStore(database)
    mainWindow = createMainWindow()
    sessions = new SessionController(mainWindow, store)

    registerIpc(store, sessions)
    configureMenu()
    configureMenubar()

    mainWindow.on('resize', () => sessions?.resize())
    mainWindow.on('close', (event) => {
      if (isQuitting) {
        return
      }

      event.preventDefault()
      mainWindow?.hide()
    })
    mainWindow.on('closed', () => {
      mainWindow = null
    })
  })

  app.on('before-quit', () => {
    isQuitting = true
    menubar?.destroy()
    menubar = null
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
        { role: 'services' },
        { type: 'separator' },
        { role: 'hide' },
        { role: 'hideOthers' },
        { role: 'unhide' },
        { type: 'separator' },
        { role: 'quit' }
      ]
    },
    {
      label: 'File',
      submenu: [{ role: 'close' }]
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
      submenu: [{ role: 'reload' }, { role: 'toggleDevTools' }, { type: 'separator' }, { role: 'togglefullscreen' }]
    },
    {
      label: 'Window',
      submenu: [{ role: 'minimize' }, { role: 'zoom' }, { type: 'separator' }, { role: 'front' }]
    }
  ])

  Menu.setApplicationMenu(menu)
}

function configureMenubar(): void {
  if (process.platform !== 'darwin') {
    return
  }

  const icon = loadTrayIcon()

  if (!icon) {
    log.warn('Tray icon missing; menubar item will be invisible until an icon is available')
    return
  }

  const tray = new Tray(icon)
  tray.setToolTip('Adit')

  const providerEntries = (Object.keys(providers) as ProviderId[]).map((id) => ({
    label: `New ${providers[id].label}`,
    click: () => startSession(id)
  }))

  tray.setContextMenu(
    Menu.buildFromTemplate([
      ...providerEntries,
      { type: 'separator' },
      {
        label: 'Recent Sparks',
        click: () => showRecentSparks()
      },
      { type: 'separator' },
      {
        label: 'Quit Adit',
        accelerator: 'CommandOrControl+Q',
        click: () => app.quit()
      }
    ])
  )

  tray.on('click', () => showMainWindow())

  menubar = tray
}

function loadTrayIcon(): Electron.NativeImage | null {
  const iconPath = resolveTrayIconPath()

  if (!iconPath || !existsSync(iconPath)) {
    return null
  }

  const icon = nativeImage.createFromPath(iconPath)

  if (icon.isEmpty()) {
    return null
  }

  icon.setTemplateImage(true)
  return icon
}

function resolveTrayIconPath(): string | null {
  if (process.env.ELECTRON_RENDERER_URL) {
    return join(__dirname, '../../resources/iconTemplate.png')
  }

  return join(process.resourcesPath, 'iconTemplate.png')
}

function startSession(providerId: ProviderId): void {
  showMainWindow()
  sessions?.create(providerId)
}

function showRecentSparks(): void {
  showMainWindow()
  sessions?.close()
}

function showMainWindow(): void {
  if (!mainWindow) {
    return
  }

  if (mainWindow.isMinimized()) {
    mainWindow.restore()
  }

  if (!mainWindow.isVisible()) {
    mainWindow.show()
  }

  mainWindow.focus()
}
