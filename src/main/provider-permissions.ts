import type { MediaAccessPermissionRequest, PermissionCheckHandlerHandlerDetails, Session } from 'electron'
import { isAllowedProviderUrl, type ProviderConfig } from './providers'

type ProviderPermissionRequestDetails = Pick<
  MediaAccessPermissionRequest,
  'mediaTypes' | 'requestingUrl' | 'securityOrigin'
>
type ProviderPermissionCheckDetails = Pick<
  PermissionCheckHandlerHandlerDetails,
  'embeddingOrigin' | 'mediaType' | 'requestingUrl' | 'securityOrigin'
>

export function configureProviderPermissions(providerSession: Session, provider: ProviderConfig): void {
  providerSession.setPermissionRequestHandler((webContents, permission, callback, details) => {
    callback(shouldAllowProviderPermissionRequest(provider, webContents.getURL(), permission, details))
  })

  providerSession.setPermissionCheckHandler((_webContents, permission, requestingOrigin, details) =>
    shouldAllowProviderPermissionCheck(provider, permission, requestingOrigin, details)
  )
}

export function shouldAllowProviderPermissionRequest(
  provider: ProviderConfig,
  webContentsUrl: string,
  permission: string,
  details: ProviderPermissionRequestDetails
): boolean {
  if (permission !== 'media' || !isAudioOnly(details.mediaTypes)) {
    return false
  }

  if (details.securityOrigin || details.requestingUrl) {
    return areProviderUrls(provider, [details.securityOrigin, details.requestingUrl])
  }

  return areProviderUrls(provider, [webContentsUrl])
}

export function shouldAllowProviderPermissionCheck(
  provider: ProviderConfig,
  permission: string,
  requestingOrigin: string,
  details: ProviderPermissionCheckDetails
): boolean {
  if (permission !== 'media' || details.mediaType !== 'audio') {
    return false
  }

  return areProviderUrls(provider, [
    details.embeddingOrigin,
    details.securityOrigin,
    requestingOrigin,
    details.requestingUrl
  ])
}

function isAudioOnly(mediaTypes: Array<'video' | 'audio'> | undefined): boolean {
  return !!mediaTypes?.length && mediaTypes.every((mediaType) => mediaType === 'audio')
}

function areProviderUrls(provider: ProviderConfig, values: Array<string | undefined>): boolean {
  const urls = values.filter((value): value is string => !!value)
  return urls.length > 0 && urls.every((value) => isAllowedProviderUrl(provider, value))
}
