import { join } from 'node:path'
import { BrowserWindow, WebContentsView, session, type WebPreferences } from 'electron'
import type { WorkspaceLayoutRequest } from '../shared/types'
import { calculateWorkspaceProviderBounds } from '../shared/workspace-layout'
import { isAllowedProviderUrl, type ProviderConfig } from './providers'
import { configureProviderPermissions } from './provider-permissions'
import { isPreviewableExternalUrl } from './external-link'

const HEADER_HEIGHT = 46
const PROVIDER_LOADING_BACKGROUND = '#111315'
const chromeMajorVersion = process.versions.chrome?.split('.')[0] ?? '142'
const chromeUserAgent = `Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${chromeMajorVersion}.0.0.0 Safari/537.36`

const configuredPartitions = new Set<string>()
const attachedProviderViews = new WeakSet<WebContentsView>()
const providerAdapterPreloadPath = join(__dirname, '../preload/provider-adapter.js')

export function createProviderView(
  window: BrowserWindow,
  provider: ProviderConfig,
  handlers: { onExternalLink: (url: string) => void }
): WebContentsView {
  configurePartition(provider)

  const view = new WebContentsView({
    webPreferences: providerWebPreferences(provider)
  })

  view.setBackgroundColor(PROVIDER_LOADING_BACKGROUND)

  view.webContents.setUserAgent(chromeUserAgent)
  view.webContents.setWindowOpenHandler(({ url }) => {
    if (!isAllowedProviderUrl(provider, url)) {
      if (isPreviewableExternalUrl(url)) {
        handlers.onExternalLink(url)
      }

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

  return view
}

export function attachProviderView(window: BrowserWindow, view: WebContentsView, layout: WorkspaceLayoutRequest): void {
  if (!attachedProviderViews.has(view)) {
    window.contentView.addChildView(view)
    attachedProviderViews.add(view)
  }

  resizeProviderView(window, view, layout)
}

export function resizeProviderView(window: BrowserWindow, view: WebContentsView, layout: WorkspaceLayoutRequest): void {
  const bounds = window.getContentBounds()
  const providerBounds = calculateWorkspaceProviderBounds(bounds.width, layout)

  view.setBounds({
    x: providerBounds.x,
    y: HEADER_HEIGHT,
    width: providerBounds.width,
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
  configureProviderPermissions(providerSession, provider)
  providerSession.registerPreloadScript({
    id: 'adit-provider-adapter',
    type: 'frame',
    filePath: providerAdapterPreloadPath
  })
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
