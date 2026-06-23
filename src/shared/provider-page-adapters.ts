import type { ProviderId } from './types'

export interface ProviderPageAdapter {
  provider: ProviderId
  hosts: string[]
  css: string
}

const chatgptAdapterCss = `
:root {
  --sidebar-width: 0px !important;
  --sidebar-rail-width: 0px !important;
}

#stage-slideover-sidebar,
#stage-sidebar-tiny-bar,
.stage-sidebar-pure-surface {
  display: none !important;
  width: 0 !important;
  min-width: 0 !important;
  max-width: 0 !important;
  flex: 0 0 0 !important;
  border: 0 !important;
}
`

const grokAdapterCss = `
:root {
  --sidebar-width: 0px !important;
  --sidebar-width-icon: 0px !important;
}

body div:has(> #grok-content-area) > :not(#grok-content-area) {
  display: none !important;
  width: 0 !important;
  min-width: 0 !important;
  max-width: 0 !important;
  flex: 0 0 0 !important;
}

#grok-content-area {
  width: 100% !important;
  max-width: none !important;
  flex: 1 1 auto !important;
}
`

export const providerPageAdapters = [
  {
    provider: 'chatgpt',
    hosts: ['chatgpt.com'],
    css: chatgptAdapterCss
  },
  {
    provider: 'grok',
    hosts: ['grok.com'],
    css: grokAdapterCss
  }
] satisfies ProviderPageAdapter[]

export function providerPageAdapterForHost(hostname: string): ProviderPageAdapter | null {
  return providerPageAdapters.find((adapter) => adapter.hosts.some((host) => hostname === host || hostname.endsWith(`.${host}`))) ?? null
}
