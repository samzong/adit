import { BrowserWindow, WebContentsView, session, type WebPreferences } from 'electron'
import log from 'electron-log/main'
import { isAllowedProviderUrl, type ProviderConfig } from './providers'

const HEADER_HEIGHT = 52
const chromeUserAgent =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36'

const configuredPartitions = new Set<string>()
const attachedProviderViews = new WeakSet<WebContentsView>()
const providerCssStates = new WeakMap<WebContentsView, ProviderCssState>()

export function createProviderView(window: BrowserWindow, provider: ProviderConfig): WebContentsView {
  configurePartition(provider)

  const view = new WebContentsView({
    webPreferences: providerWebPreferences(provider)
  })

  view.webContents.setUserAgent(chromeUserAgent)
  view.webContents.setWindowOpenHandler(({ url }) => {
    if (!isAllowedProviderUrl(provider, url)) {
      return { action: 'deny' }
    }

    return {
      action: 'allow',
      overrideBrowserWindowOptions: {
        webPreferences: providerWebPreferences(provider)
      }
    }
  })
  view.webContents.on('did-create-window', (childWindow) => {
    childWindow.webContents.setUserAgent(chromeUserAgent)
  })
  installProviderCss(view, provider)

  resizeProviderView(window, view)
  return view
}

export async function prepareProviderView(view: WebContentsView, provider: ProviderConfig): Promise<void> {
  await insertProviderCss(view, provider)
}

export function attachProviderView(window: BrowserWindow, view: WebContentsView): void {
  if (!attachedProviderViews.has(view)) {
    window.contentView.addChildView(view)
    attachedProviderViews.add(view)
  }

  resizeProviderView(window, view)
}

export function resizeProviderView(window: BrowserWindow, view: WebContentsView): void {
  const bounds = window.getContentBounds()
  view.setBounds({
    x: 0,
    y: HEADER_HEIGHT,
    width: bounds.width,
    height: Math.max(0, bounds.height - HEADER_HEIGHT)
  })
}

export function removeProviderView(window: BrowserWindow, view: WebContentsView): void {
  if (attachedProviderViews.has(view)) {
    window.contentView.removeChildView(view)
    attachedProviderViews.delete(view)
  }

  if (!view.webContents.isDestroyed()) {
    view.webContents.close()
  }
}

function providerWebPreferences(provider: ProviderConfig): WebPreferences {
  return {
    partition: provider.partition,
    nodeIntegration: false,
    contextIsolation: true,
    sandbox: true,
    webSecurity: true
  }
}

function configurePartition(provider: ProviderConfig): void {
  if (configuredPartitions.has(provider.partition)) {
    return
  }

  const providerSession = session.fromPartition(provider.partition)
  providerSession.webRequest.onBeforeSendHeaders((details, callback) => {
    callback({
      requestHeaders: {
        ...details.requestHeaders,
        'User-Agent': chromeUserAgent
      }
    })
  })
  configuredPartitions.add(provider.partition)
}

interface ProviderCssState {
  css: string
  insertedVersion: number
  navVersion: number
  pending: Promise<void> | null
  pendingVersion: number | null
}

function installProviderCss(view: WebContentsView, provider: ProviderConfig): void {
  const css = provider.pageAdapter?.css?.trim()

  if (!css) {
    return
  }

  const state: ProviderCssState = {
    css,
    insertedVersion: -1,
    navVersion: 0,
    pending: null,
    pendingVersion: null
  }
  providerCssStates.set(view, state)

  const reset = (event: Electron.Event<Electron.WebContentsDidStartNavigationEventParams>): void => {
    if (event.isMainFrame && !event.isSameDocument) {
      state.navVersion += 1
      state.insertedVersion = -1
      state.pending = null
      state.pendingVersion = null
    }
  }

  view.webContents.on('did-start-navigation', reset)
  view.webContents.on('dom-ready', () => {
    void insertProviderCss(view, provider)
  })
}

async function insertProviderCss(view: WebContentsView, provider: ProviderConfig): Promise<void> {
  const state = providerCssStates.get(view)

  if (!state || view.webContents.isDestroyed()) {
    return
  }

  if (state.insertedVersion === state.navVersion) {
    return
  }

  if (state.pending && state.pendingVersion === state.navVersion) {
    return state.pending
  }

  const navVersion = state.navVersion
  state.pendingVersion = navVersion
  state.pending = view.webContents
    .insertCSS(state.css, { cssOrigin: 'user' })
    .then(() => {
      if (state.navVersion === navVersion) {
        state.insertedVersion = navVersion
      }
    })
    .catch((reason) => {
      log.warn(`Failed to insert ${provider.id} provider CSS`, reason)
    })
    .finally(() => {
      if (state.pendingVersion === navVersion) {
        state.pending = null
        state.pendingVersion = null
      }
    })

  return state.pending
}
