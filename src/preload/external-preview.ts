import { contextBridge, ipcRenderer } from 'electron'

const externalPreviewClose = 'external-preview:close'
const externalPreviewOpenExternal = 'external-preview:open-external'

contextBridge.exposeInMainWorld('aditExternalPreview', {
  close: (): void => {
    ipcRenderer.send(externalPreviewClose)
  },
  openExternal: (): void => {
    ipcRenderer.send(externalPreviewOpenExternal)
  }
})
