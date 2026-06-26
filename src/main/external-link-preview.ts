import { join } from 'node:path'
import { BrowserWindow, WebContentsView, ipcMain, shell, type IpcMainEvent } from 'electron'
import log from 'electron-log/main'
import { IPC } from '../shared/ipc'
import type { WorkspaceLayoutRequest } from '../shared/types'
import { calculateWorkspaceProviderBounds, defaultWorkspaceLayout } from '../shared/workspace-layout'
import { isPreviewableExternalUrl } from './external-link'

const HEADER_HEIGHT = 46
const TOOLBAR_HEIGHT = 44
const PREVIEW_FRAME_RADIUS = 14
const PREVIEW_LOADING_BACKGROUND = '#f7f1e7'
const PREVIEW_FRAME_BACKGROUND_DARK = '#201c18'
const chromeMajorVersion = process.versions.chrome?.split('.')[0] ?? '142'
const chromeUserAgent = `Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${chromeMajorVersion}.0.0.0 Safari/537.36`
const previewPreloadPath = join(__dirname, '../preload/external-preview.js')

interface PreviewLayout {
  margin: number
  shell: Electron.Rectangle
  page: Electron.Rectangle
}

export class ExternalLinkPreviewController {
  private shellView: WebContentsView | null = null
  private pageView: WebContentsView | null = null
  private currentUrl: string | null = null
  private currentTitle = 'Preview'
  private shellReady = false
  private layout: PreviewLayout | null = null
  private workspaceLayout: WorkspaceLayoutRequest = defaultWorkspaceLayout

  constructor(private readonly window: BrowserWindow) {
    ipcMain.on(IPC.externalPreviewClose, this.handleClose)
    ipcMain.on(IPC.externalPreviewOpenExternal, this.handleOpenExternal)
  }

  open(url: string, workspaceLayout?: WorkspaceLayoutRequest): void {
    if (!isPreviewableExternalUrl(url)) {
      return
    }

    if (workspaceLayout) {
      this.workspaceLayout = workspaceLayout
    }

    this.currentUrl = url
    this.currentTitle = getUrlHost(url)
    this.ensureViews()
    this.resize()
    this.updateShell()

    const pageView = this.pageView

    if (!pageView) {
      return
    }

    void pageView.webContents.loadURL(url).catch((reason) => {
      log.error('External preview load failed', { url, reason: formatError(reason) })
    })
    pageView.webContents.focus()
  }

  close(): void {
    const shellView = this.shellView
    const pageView = this.pageView

    this.shellView = null
    this.pageView = null
    this.currentUrl = null
    this.currentTitle = 'Preview'
    this.shellReady = false
    this.layout = null

    if (shellView) {
      this.removeView(shellView)
    }

    if (pageView) {
      this.removeView(pageView)
    }
  }

  resize(workspaceLayout?: WorkspaceLayoutRequest): void {
    if (!this.shellView || !this.pageView || this.window.isDestroyed()) {
      return
    }

    if (workspaceLayout) {
      this.workspaceLayout = workspaceLayout
    }

    const bounds = this.window.getContentBounds()
    this.layout = calculatePreviewLayout(bounds.width, bounds.height, this.workspaceLayout)
    this.shellView.setBounds(this.layout.shell)
    this.pageView.setBounds(this.layout.page)
    this.updateShell()
  }

  private readonly handleClose = (event: IpcMainEvent): void => {
    if (this.isShellEvent(event)) {
      this.close()
    }
  }

  private readonly handleOpenExternal = (event: IpcMainEvent): void => {
    if (!this.isShellEvent(event) || !this.currentUrl) {
      return
    }

    const url = this.currentUrl

    void shell
      .openExternal(url)
      .then(() => {
        if (this.currentUrl === url) {
          this.close()
        }
      })
      .catch((reason) => {
        log.error('Failed to open external preview URL in browser', { url, reason: formatError(reason) })
      })
  }

  private ensureViews(): void {
    if (this.shellView && this.pageView) {
      this.window.contentView.addChildView(this.shellView)
      this.window.contentView.addChildView(this.pageView)
      return
    }

    const shellView = new WebContentsView({
      webPreferences: {
        preload: previewPreloadPath,
        nodeIntegration: false,
        contextIsolation: true,
        sandbox: true,
        webSecurity: true
      }
    })
    shellView.setBackgroundColor('#00000000')
    shellView.webContents.on('before-input-event', (event, input) => {
      if (input.type === 'keyDown' && input.key === 'Escape') {
        event.preventDefault()
        this.close()
      }
    })
    shellView.webContents.once('did-finish-load', () => {
      this.shellReady = true
      this.updateShell()
    })
    void shellView.webContents.loadURL(buildShellUrl()).catch((reason) => {
      log.error('External preview shell load failed', { reason: formatError(reason) })
    })

    const pageView = new WebContentsView({
      webPreferences: {
        partition: 'external-preview',
        nodeIntegration: false,
        contextIsolation: true,
        sandbox: true,
        webSecurity: true
      }
    })
    pageView.setBackgroundColor(PREVIEW_LOADING_BACKGROUND)
    pageView.webContents.setUserAgent(chromeUserAgent)
    pageView.webContents.setWindowOpenHandler(({ url }) => {
      if (isPreviewableExternalUrl(url)) {
        this.open(url, this.workspaceLayout)
      }

      return { action: 'deny' }
    })
    pageView.webContents.on('before-input-event', (event, input) => {
      if (input.type === 'keyDown' && input.key === 'Escape') {
        event.preventDefault()
        this.close()
      }
    })
    pageView.webContents.on('will-navigate', (event, url) => {
      if (!isPreviewableExternalUrl(url)) {
        event.preventDefault()
        return
      }

      this.currentUrl = url
      this.currentTitle = getUrlHost(url)
      this.updateShell()
    })
    pageView.webContents.on('did-navigate', (_event, url) => this.updatePageUrl(url))
    pageView.webContents.on('did-navigate-in-page', (_event, url) => this.updatePageUrl(url))
    pageView.webContents.on('did-finish-load', () => {
      if (pageView.webContents.isDestroyed()) {
        return
      }

      void pageView.webContents.insertCSS(buildPageMaskCss()).catch((reason) => {
        log.debug('External preview page mask failed', { reason: formatError(reason) })
      })
    })
    pageView.webContents.on('page-title-updated', (_event, title) => {
      this.currentTitle = title || (this.currentUrl ? getUrlHost(this.currentUrl) : 'Preview')
      this.updateShell()
    })

    this.shellView = shellView
    this.pageView = pageView
    this.window.contentView.addChildView(shellView)
    this.window.contentView.addChildView(pageView)
  }

  private updatePageUrl(url: string): void {
    if (!isPreviewableExternalUrl(url)) {
      return
    }

    this.currentUrl = url
    this.updateShell()
  }

  private updateShell(): void {
    if (!this.shellView || !this.shellReady || !this.currentUrl) {
      return
    }

    const state = {
      title: this.currentTitle,
      url: this.currentUrl,
      margin: this.layout?.margin ?? 44,
      toolbarHeight: TOOLBAR_HEIGHT
    }

    void this.shellView.webContents
      .executeJavaScript(`window.setPreviewState(${JSON.stringify(state)})`, true)
      .catch((reason) => {
        log.debug('External preview shell update failed', { reason: formatError(reason) })
      })
  }

  private isShellEvent(event: IpcMainEvent): boolean {
    return Boolean(this.shellView && event.sender.id === this.shellView.webContents.id)
  }

  private removeView(view: WebContentsView): void {
    if (!this.window.isDestroyed()) {
      this.window.contentView.removeChildView(view)
    }

    if (!view.webContents.isDestroyed()) {
      view.webContents.close()
    }
  }
}

export function calculatePreviewLayout(
  contentWidth: number,
  contentHeight: number,
  workspaceLayout: WorkspaceLayoutRequest
): PreviewLayout {
  const providerBounds = calculateWorkspaceProviderBounds(contentWidth, workspaceLayout)
  const overlayHeight = Math.max(0, contentHeight - HEADER_HEIGHT)
  const margin = providerBounds.width < 1200 ? 24 : 44
  const frameWidth = Math.max(0, providerBounds.width - margin * 2)
  const frameHeight = Math.max(0, overlayHeight - margin * 2)

  return {
    margin,
    shell: {
      x: providerBounds.x,
      y: HEADER_HEIGHT,
      width: providerBounds.width,
      height: overlayHeight
    },
    page: {
      x: providerBounds.x + margin + 1,
      y: HEADER_HEIGHT + margin + TOOLBAR_HEIGHT,
      width: Math.max(0, frameWidth - 2),
      height: Math.max(0, frameHeight - TOOLBAR_HEIGHT - 1)
    }
  }
}

function buildShellUrl(): string {
  const html = `<!doctype html>
<html>
<head>
<meta charset="utf-8">
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; script-src 'unsafe-inline';">
<style>
:root {
  --preview-margin: 44px;
  --preview-toolbar-height: 44px;
  color-scheme: light dark;
}
html,
body {
  width: 100%;
  height: 100%;
  margin: 0;
  overflow: hidden;
  font-family: Hanken Grotesk, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
}
.backdrop {
  position: fixed;
  inset: 0;
  background: rgba(16, 15, 13, 0.5);
}
.frame {
  position: fixed;
  inset: var(--preview-margin);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  border: 1px solid rgba(109, 95, 77, 0.28);
  border-radius: ${PREVIEW_FRAME_RADIUS}px;
  background: #f7f1e7;
  box-shadow: 0 24px 70px rgba(0, 0, 0, 0.34);
}
.bar {
  box-sizing: border-box;
  display: flex;
  align-items: center;
  gap: 12px;
  height: var(--preview-toolbar-height);
  min-height: var(--preview-toolbar-height);
  padding: 0 12px 0 16px;
  border-bottom: 1px solid rgba(109, 95, 77, 0.2);
  background: #efe4d5;
}
.title-block {
  min-width: 0;
  flex: 1;
}
.title {
  overflow: hidden;
  color: #2c2822;
  font-size: 13px;
  font-weight: 650;
  line-height: 17px;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.url {
  overflow: hidden;
  color: #766b5d;
  font-size: 11px;
  line-height: 14px;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.actions {
  display: flex;
  align-items: center;
  gap: 8px;
}
button {
  height: 28px;
  border: 1px solid rgba(109, 95, 77, 0.24);
  border-radius: 8px;
  background: rgba(255, 250, 242, 0.72);
  color: #3c352d;
  font: inherit;
  font-size: 12px;
}
button:hover {
  background: #fff8ed;
}
.open {
  padding: 0 12px;
}
.close {
  display: grid;
  place-items: center;
  width: 28px;
  padding: 0;
}
.close svg {
  width: 14px;
  height: 14px;
  stroke-width: 2.2;
}
.body {
  flex: 1;
  background: #fffaf2;
}
@media (prefers-color-scheme: dark) {
  .backdrop {
    background: rgba(0, 0, 0, 0.56);
  }
  .frame {
    border-color: rgba(210, 188, 155, 0.18);
    background: #201c18;
  }
  .bar {
    border-bottom-color: rgba(210, 188, 155, 0.16);
    background: #2a251f;
  }
  .title {
    color: #f4eadb;
  }
  .url {
    color: #b6a995;
  }
  button {
    border-color: rgba(210, 188, 155, 0.2);
    background: rgba(50, 43, 36, 0.86);
    color: #f4eadb;
  }
  button:hover {
    background: #3b332a;
  }
  .body {
    background: #191612;
  }
}
</style>
</head>
<body>
<div class="backdrop"></div>
<section class="frame" role="dialog" aria-modal="true">
  <header class="bar">
    <div class="title-block">
      <div class="title" id="title">Preview</div>
      <div class="url" id="url"></div>
    </div>
    <div class="actions">
      <button class="open" id="open" type="button">Open in Browser</button>
      <button class="close" id="close" type="button" aria-label="Close preview" title="Close (Esc)">
        <svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round">
          <path d="M18 6 6 18"></path>
          <path d="m6 6 12 12"></path>
        </svg>
      </button>
    </div>
  </header>
  <div class="body"></div>
</section>
<script>
const title = document.getElementById('title');
const url = document.getElementById('url');
document.getElementById('open').addEventListener('click', () => window.aditExternalPreview.openExternal());
document.getElementById('close').addEventListener('click', () => window.aditExternalPreview.close());
document.querySelector('.backdrop').addEventListener('click', () => window.aditExternalPreview.close());
window.setPreviewState = (state) => {
  document.documentElement.style.setProperty('--preview-margin', state.margin + 'px');
  document.documentElement.style.setProperty('--preview-toolbar-height', state.toolbarHeight + 'px');
  title.textContent = state.title || 'Preview';
  url.textContent = state.url || '';
};
</script>
</body>
</html>`

  return `data:text/html;charset=utf-8,${encodeURIComponent(html)}`
}

function buildPageMaskCss(): string {
  return `
html::after {
  content: "" !important;
  position: fixed !important;
  z-index: 2147483647 !important;
  left: 0 !important;
  right: 0 !important;
  bottom: 0 !important;
  height: ${PREVIEW_FRAME_RADIUS}px !important;
  pointer-events: none !important;
  background:
    radial-gradient(circle at ${PREVIEW_FRAME_RADIUS}px 0, transparent 0 ${PREVIEW_FRAME_RADIUS - 1}px, ${PREVIEW_LOADING_BACKGROUND} ${PREVIEW_FRAME_RADIUS}px) left bottom / ${PREVIEW_FRAME_RADIUS}px ${PREVIEW_FRAME_RADIUS}px no-repeat,
    radial-gradient(circle at 0 0, transparent 0 ${PREVIEW_FRAME_RADIUS - 1}px, ${PREVIEW_LOADING_BACKGROUND} ${PREVIEW_FRAME_RADIUS}px) right bottom / ${PREVIEW_FRAME_RADIUS}px ${PREVIEW_FRAME_RADIUS}px no-repeat !important;
}
@media (prefers-color-scheme: dark) {
  html::after {
    background:
      radial-gradient(circle at ${PREVIEW_FRAME_RADIUS}px 0, transparent 0 ${PREVIEW_FRAME_RADIUS - 1}px, ${PREVIEW_FRAME_BACKGROUND_DARK} ${PREVIEW_FRAME_RADIUS}px) left bottom / ${PREVIEW_FRAME_RADIUS}px ${PREVIEW_FRAME_RADIUS}px no-repeat,
      radial-gradient(circle at 0 0, transparent 0 ${PREVIEW_FRAME_RADIUS - 1}px, ${PREVIEW_FRAME_BACKGROUND_DARK} ${PREVIEW_FRAME_RADIUS}px) right bottom / ${PREVIEW_FRAME_RADIUS}px ${PREVIEW_FRAME_RADIUS}px no-repeat !important;
  }
}
`
}

function getUrlHost(value: string): string {
  try {
    return new URL(value).hostname
  } catch {
    return 'Preview'
  }
}

function formatError(reason: unknown): string {
  if (reason instanceof Error) {
    return reason.message
  }

  return typeof reason === 'string' ? reason : 'Unknown error'
}
