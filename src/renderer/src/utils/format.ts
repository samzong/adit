const sparkDateFormatter = new Intl.DateTimeFormat(undefined, {
  month: 'short',
  day: 'numeric',
  hour: '2-digit',
  minute: '2-digit'
})

export function formatDate(value: number): string {
  return sparkDateFormatter.format(value)
}

export function formatSessionHost(sessionUrl: string | null): string {
  if (!sessionUrl) {
    return ''
  }

  try {
    return new URL(sessionUrl).hostname
  } catch {
    return ''
  }
}
