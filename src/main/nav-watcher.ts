import type { WebContents } from 'electron'
import { captureSessionUrlForProvider } from './capturers/session-url'
import { isAllowedProviderUrl, isLoginUrl, type ProviderConfig } from './providers'

export interface NavWatcherHandlers {
  onSessionUrl: (sessionUrl: string) => void
  onLoginRequired: () => void
  onBlockedNavigation: (url: string) => void
}

export function watchNavigation(
  webContents: WebContents,
  provider: ProviderConfig,
  handlers: NavWatcherHandlers
): () => void {
  const inspectUrl = (value: string): void => {
    const sessionUrl = captureSessionUrlForProvider(provider, value)

    if (sessionUrl) {
      handlers.onSessionUrl(sessionUrl)
    }

    if (isLoginUrl(provider, value)) {
      handlers.onLoginRequired()
    }
  }

  const didNavigate = (_event: Electron.Event, url: string): void => inspectUrl(url)
  const didNavigateInPage = (_event: Electron.Event, url: string): void => inspectUrl(url)
  const willNavigate = (event: Electron.Event, url: string): void => {
    if (!isAllowedProviderUrl(provider, url)) {
      event.preventDefault()
      handlers.onBlockedNavigation(url)
    }
  }

  webContents.on('did-navigate', didNavigate)
  webContents.on('did-navigate-in-page', didNavigateInPage)
  webContents.on('will-navigate', willNavigate)

  return () => {
    webContents.off('did-navigate', didNavigate)
    webContents.off('did-navigate-in-page', didNavigateInPage)
    webContents.off('will-navigate', willNavigate)
  }
}
