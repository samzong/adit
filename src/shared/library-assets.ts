export const LIBRARY_ASSET_SCHEME = 'adit-library'

export function libraryAttachmentUrl(id: string): string {
  return `${LIBRARY_ASSET_SCHEME}://attachment/${id}`
}
