import { BrowserWindow, WebContentsView, session, type WebPreferences } from 'electron'
import { isAllowedProviderUrl, type ProviderConfig } from './providers'

const HEADER_HEIGHT = 64
const chromeUserAgent =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36'

const configuredPartitions = new Set<string>()

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

  window.contentView.addChildView(view)
  resizeProviderView(window, view)
  return view
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
  window.contentView.removeChildView(view)

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
