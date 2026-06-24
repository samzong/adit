import { ipcRenderer, webFrame } from 'electron'
import { providerPageAdapterForHost } from '../shared/provider-page-adapters'
import { providerBridgeHello, PROTOCOL_VERSION } from '../shared/provider-bridge-protocol'

if (window.top === window) {
  const adapter = providerPageAdapterForHost(window.location.hostname)

  if (adapter) {
    webFrame.insertCSS(adapter.css)

    const runtimeId = crypto.randomUUID()
    ipcRenderer.send(providerBridgeHello, { protocolVersion: PROTOCOL_VERSION, runtimeId })

    ipcRenderer.on(providerBridgeHello, (event) => {
      const port = event.ports[0]
      if (!port) {
        return
      }
      port.start()
    })
  }
}
