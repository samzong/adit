import type { ProviderId } from '../../shared/types'

export interface ProviderConfig {
  id: ProviderId
  label: string
  homeUrl: string
  partition: string
  allowedHosts: string[]
  sessionUrlPattern: RegExp
  loginUrlPatterns: RegExp[]
}

const UUID_PATTERN = '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}'

export function sessionUrlPatternFor(host: string): RegExp {
  const escapedHost = host.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  return new RegExp(`^https://${escapedHost}/c/(${UUID_PATTERN})(?:[/?#]|$)`, 'i')
}

export const providers = {
  chatgpt: {
    id: 'chatgpt',
    label: 'ChatGPT',
    homeUrl: 'https://chatgpt.com/',
    partition: 'persist:chatgpt',
    allowedHosts: ['chatgpt.com', 'auth.openai.com', 'chat.openai.com'],
    sessionUrlPattern: sessionUrlPatternFor('chatgpt.com'),
    loginUrlPatterns: [/auth\.openai\.com/i, /\/log-?in/i]
  },
  grok: {
    id: 'grok',
    label: 'Grok',
    homeUrl: 'https://grok.com/',
    partition: 'persist:grok',
    allowedHosts: ['grok.com', 'x.com', 'accounts.x.com'],
    sessionUrlPattern: sessionUrlPatternFor('grok.com'),
    loginUrlPatterns: [/x\.com\/i\/(oauth2|flow\/login)/i, /\/log-?in/i]
  }
} satisfies Record<ProviderId, ProviderConfig>

export function getProvider(providerId: ProviderId): ProviderConfig {
  return providers[providerId]
}

export function isProviderId(value: unknown): value is ProviderId {
  return value === 'chatgpt' || value === 'grok'
}

export function isAllowedProviderUrl(provider: ProviderConfig, value: string): boolean {
  let url: URL

  try {
    url = new URL(value)
  } catch {
    return false
  }

  if (url.protocol === 'about:') {
    return true
  }

  if (url.protocol !== 'https:') {
    return false
  }

  return provider.allowedHosts.some((host) => url.hostname === host || url.hostname.endsWith(`.${host}`))
}

export function isLoginUrl(provider: ProviderConfig, value: string): boolean {
  return provider.loginUrlPatterns.some((pattern) => pattern.test(value))
}
