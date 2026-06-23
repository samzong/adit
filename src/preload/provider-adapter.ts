import { webFrame } from 'electron'
import { providerPageAdapterForHost } from '../shared/provider-page-adapters'

if (window.top === window) {
  const adapter = providerPageAdapterForHost(window.location.hostname)

  if (adapter) {
    webFrame.insertCSS(adapter.css)
  }
}
