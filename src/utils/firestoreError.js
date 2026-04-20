export function formatFirestoreError(err, fallback = 'Request failed') {
  const message = err instanceof Error ? err.message : ''
  const code = err && typeof err === 'object' && 'code' in err ? String(err.code || '') : ''

  const isPermissionDenied =
    code === 'permission-denied' || /Missing or insufficient permissions/i.test(message)
  if (isPermissionDenied) {
    const codeLine = code ? `\n\nDebug: code=${code}` : ''
    return (
      [
        'Firestore denied the request (missing/insufficient permissions).',
        '',
        'Fix:',
        '- Firebase Console → Firestore Database → Rules → Publish the rules from firestore.rules',
        '- Ensure you are signed in to the app (rules require request.auth)',
        '',
        'Note: The app uses collections `users`, `meals`, and `nutrition_logs` (not `datanutri`).',
      ].join('\n') + codeLine
    )
  }

  const isDbMissing = /Database '\(default\)' not found/i.test(message)
  if (isDbMissing) {
    const codeLine = code ? `\n\nDebug: code=${code}` : ''
    return (
      [
        "Firestore database '(default)' does not exist for this project.",
        '',
        'Fix:',
        '- Firebase Console → Build → Firestore Database → Create database',
        "- Choose a location and start in 'test mode' for local dev (then tighten rules later)",
        '',
        'Also verify `VITE_FIREBASE_PROJECT_ID` matches the project you opened in Firebase Console.',
      ].join('\n') + codeLine
    )
  }

  const isOffline =
    /client is offline/i.test(message) ||
    code === 'unavailable' ||
    /network/i.test(message)

  if (isOffline) {
    const codeLine = code ? `\n\nDebug: code=${code}` : ''
    return [
      'Firestore is unreachable (client appears offline).',
      '',
      'Try:',
      '- Check your internet connection',
      '- Disable VPN/proxy/ad-blockers (or allow Firebase/Google APIs)',
      '- Reload the page and try again',
      '- Ensure Firestore Database is created/enabled in Firebase Console (Build → Firestore Database)',
      '',
      'If this persists on a corporate/school network, Firestore may be blocked.',
    ].join('\n') + codeLine
  }

  if (message) return message
  return fallback
}
