export const IPC = {
  notesList: 'notes:list',
  notesRename: 'notes:rename',
  notesArchive: 'notes:archive',
  notesUnarchive: 'notes:unarchive',
  notesChanged: 'notes:changed',
  sessionCreate: 'session:create',
  sessionOpen: 'session:open',
  sessionClose: 'session:close',
  sessionState: 'session:state',
  sessionReadSelection: 'session:read-selection',
  sessionStateChanged: 'session:state-changed',
  sessionTitleUpdated: 'session:title-updated',
  sessionLoginRequired: 'session:login-required',
  appToast: 'app:toast'
} as const
