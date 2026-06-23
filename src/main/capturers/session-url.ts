import { getProvider, type ProviderConfig } from '../providers'
import type { ProviderId } from '../../shared/types'

export function captureSessionUrl(providerId: ProviderId, value: string): string | null {
  return captureSessionUrlForProvider(getProvider(providerId), value)
}

export function captureSessionUrlForProvider(provider: ProviderConfig, value: string): string | null {
  const match = provider.sessionUrlPattern.exec(value)

  if (!match?.[1]) {
    return null
  }

  const url = new URL(provider.homeUrl)
  return `https://${url.hostname}/c/${match[1]}`
}
