const FALLBACK = 'Authentication failed. Please try again.'

export function formatFirebaseAuthError(err) {
  if (!err) return FALLBACK

  // Firebase errors typically look like: { code: 'auth/invalid-credential', message: 'Firebase: ...' }
  const code = typeof err === 'object' && err && 'code' in err ? String(err.code) : ''

  switch (code) {
    case 'auth/invalid-email':
      return 'That email address looks invalid.'
    case 'auth/missing-email':
      return 'Please enter your email.'
    case 'auth/missing-password':
      return 'Please enter your password.'
    case 'auth/weak-password':
      return 'Password is too weak. Use at least 6 characters.'
    case 'auth/email-already-in-use':
      return 'An account already exists for that email.'
    case 'auth/user-not-found':
    case 'auth/wrong-password':
    case 'auth/invalid-credential':
      return 'Incorrect email or password.'
    case 'auth/too-many-requests':
      return 'Too many attempts. Please wait and try again.'
    case 'auth/network-request-failed':
      return 'Network error. Check your connection and try again.'
    case 'auth/operation-not-allowed':
      return 'Email/password sign-in is disabled for this Firebase project. Enable it in Firebase Console → Authentication.'
    case 'auth/invalid-api-key':
      return 'Firebase API key is invalid. Double-check your .env.local Firebase settings.'
    case 'auth/app-not-authorized':
      return 'This domain is not authorized for Firebase Auth. Add localhost to Firebase Console → Authentication → Settings → Authorized domains.'
    case 'auth/configuration-not-found':
      return (
        'Firebase Auth configuration not found for this project. ' +
        'Double-check your Firebase web config in .env.local (API key + authDomain + projectId) and ensure Authentication is enabled in Firebase Console.'
      )
    default:
      break
  }

  const message =
    typeof err === 'object' && err && 'message' in err ? String(err.message) : ''

  // If we don't recognize the code, surface it in dev to speed up debugging.
  if (import.meta?.env?.DEV) {
    const suffix = code ? ` (${code})` : ''
    return (message || FALLBACK) + suffix
  }

  return message || FALLBACK
}
