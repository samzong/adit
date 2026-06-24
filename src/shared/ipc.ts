export const IPC = {
  sparksList: 'sparks:list',
  sparksRename: 'sparks:rename',
  sparksArchive: 'sparks:archive',
  sparksUnarchive: 'sparks:unarchive',
  sparksChanged: 'sparks:changed',
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
