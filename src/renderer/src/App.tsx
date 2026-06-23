import { useCallback, useEffect, useMemo, useState } from 'react'
import type { NoteRow, SessionState, ToastMessage } from '../../shared/types'

const emptyState: SessionState = {
  mode: 'list',
  provider: null,
  noteId: null,
  sessionUrl: null,
  title: null
}

export function App(): JSX.Element {
  if (!window.adit) {
    return <StandaloneNotice />
  }

  return <ElectronApp />
}

function ElectronApp(): JSX.Element {
  const [notes, setNotes] = useState<NoteRow[]>([])
  const [archived, setArchived] = useState(false)
  const [query, setQuery] = useState('')
  const [sessionState, setSessionState] = useState<SessionState>(emptyState)
  const [toast, setToast] = useState<ToastMessage | null>(null)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const loadNotes = useCallback(async () => {
    setError(null)
    const nextNotes = await window.adit.listNotes({ archived, query })
    setNotes(nextNotes)
  }, [archived, query])

  useEffect(() => {
    let cancelled = false

    async function boot(): Promise<void> {
      try {
        const [nextNotes, nextState] = await Promise.all([
          window.adit.listNotes({ archived, query }),
          window.adit.getSessionState()
        ])

        if (!cancelled) {
          setNotes(nextNotes)
          setSessionState(nextState)
        }
      } catch (reason) {
        if (!cancelled) {
          setError(reason instanceof Error ? reason.message : 'Failed to load Adit.')
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    void boot()
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      void loadNotes().catch((reason) => setError(reason instanceof Error ? reason.message : 'Failed to load notes.'))
    }, 120)

    return () => window.clearTimeout(timeout)
  }, [loadNotes])

  useEffect(() => {
    const unsubscribers = [
      window.adit.onNotesChanged(() => {
        void loadNotes().catch((reason) => setError(reason instanceof Error ? reason.message : 'Failed to load notes.'))
      }),
      window.adit.onSessionStateChanged(setSessionState),
      window.adit.onToast((message) => {
        setToast(message)
        window.setTimeout(() => setToast(null), 4000)
      })
    ]

    return () => unsubscribers.forEach((unsubscribe) => unsubscribe())
  }, [loadNotes])

  const activeTitle = useMemo(() => {
    if (sessionState.title) {
      return sessionState.title
    }

    if (sessionState.provider === 'chatgpt') {
      return 'New ChatGPT session'
    }

    if (sessionState.provider === 'grok') {
      return 'New Grok session'
    }

    return 'Adit'
  }, [sessionState.provider, sessionState.title])

  async function runAction(action: () => Promise<void>): Promise<void> {
    setBusy(true)
    setError(null)

    try {
      await action()
      await loadNotes()
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Action failed.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <main className={sessionState.mode === 'list' ? 'app-shell' : 'app-shell session-active'}>
      <header className="topbar">
        <div className="brand">
          <div className="mark">A</div>
          <div>
            <h1>Adit</h1>
            <p>Local entrances back into provider conversations.</p>
          </div>
        </div>

        {sessionState.mode === 'list' ? (
          <button
            className="primary"
            disabled={busy}
            onClick={() => runAction(async () => setSessionState(await window.adit.createSession({ provider: 'chatgpt' })))}
          >
            New ChatGPT
          </button>
        ) : (
          <div className="session-bar">
            <div>
              <strong>{activeTitle}</strong>
              <span>{sessionState.sessionUrl ? 'Captured' : 'Waiting for the first message URL'}</span>
            </div>
            <button disabled={busy} onClick={() => runAction(async () => setSessionState(await window.adit.closeSession()))}>
              Close
            </button>
          </div>
        )}
      </header>

      {sessionState.mode === 'list' && (
        <section className="workspace">
          <div className="controls">
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search titles" />
            <div className="segmented">
              <button className={!archived ? 'selected' : ''} onClick={() => setArchived(false)}>
                Active
              </button>
              <button className={archived ? 'selected' : ''} onClick={() => setArchived(true)}>
                Archive
              </button>
            </div>
          </div>

          <p className="login-note">Use email and password when a provider asks you to sign in.</p>

          {error && <div className="notice error">{error}</div>}
          {toast && <div className={`notice ${toast.level}`}>{toast.message}</div>}

          {loading ? (
            <div className="empty">Loading notes...</div>
          ) : notes.length === 0 ? (
            <div className="empty">
              <h2>{archived ? 'No archived notes' : 'No saved sessions yet'}</h2>
              <p>Start a ChatGPT session. Adit saves it only after the provider creates a conversation URL.</p>
            </div>
          ) : (
            <ul className="note-list">
              {notes.map((note) => (
                <li key={note.id}>
                  <button className="note-row" onClick={() => runAction(async () => setSessionState(await window.adit.openSession({ id: note.id })))}>
                    <span className="provider">{note.provider === 'chatgpt' ? 'ChatGPT' : 'Grok'}</span>
                    <span className="note-title">{note.title}</span>
                    <span className="note-url">{note.session_url}</span>
                    <span className="note-date">{formatDate(note.updated_at)}</span>
                  </button>
                  <div className="row-actions">
                    <button
                      onClick={() => {
                        const title = window.prompt('Rename note', note.title)
                        if (title) {
                          void runAction(async () => {
                            await window.adit.renameNote({ id: note.id, title })
                          })
                        }
                      }}
                    >
                      Rename
                    </button>
                    <button
                      onClick={() =>
                        runAction(async () => {
                          if (archived) {
                            await window.adit.unarchiveNote({ id: note.id })
                          } else {
                            await window.adit.archiveNote({ id: note.id })
                          }
                        })
                      }
                    >
                      {archived ? 'Restore' : 'Archive'}
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}
    </main>
  )
}

function formatDate(value: number): string {
  return new Intl.DateTimeFormat('en', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }).format(value)
}

function StandaloneNotice(): JSX.Element {
  return (
    <main className="app-shell">
      <header className="topbar">
        <div className="brand">
          <div className="mark">A</div>
          <div>
            <h1>Adit</h1>
            <p>Local entrances back into provider conversations.</p>
          </div>
        </div>
      </header>
      <section className="workspace">
        <div className="empty">
          <h2>Open Adit in Electron</h2>
          <p>The browser renderer is only a shell. SQLite, session capture, and provider windows run through Electron.</p>
        </div>
      </section>
    </main>
  )
}
