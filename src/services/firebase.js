import { initializeApp } from 'firebase/app'
import {
  browserLocalPersistence,
  getAuth,
  inMemoryPersistence,
  setPersistence,
} from 'firebase/auth'
import { initializeFirestore } from 'firebase/firestore'

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
}

function assertFirebaseConfig(cfg) {
  const missing = Object.entries(cfg)
    .filter(([, value]) => !value)
    .map(([key]) => key)
  if (missing.length) {
    throw new Error(
      `Missing Firebase env vars: ${missing.join(', ')}. Check .env/.env.local`,
    )
  }
}

assertFirebaseConfig(firebaseConfig)

if (import.meta.env.DEV) {
  // Helps diagnose misconfigured Firebase projects without exposing secrets.
  console.info('Firebase config:', {
    projectId: firebaseConfig.projectId,
    authDomain: firebaseConfig.authDomain,
    storageBucket: firebaseConfig.storageBucket,
  })
}

const app = initializeApp(firebaseConfig)

export const auth = getAuth(app)
// Ensure persistent session across reloads.
// In some environments (private mode, strict policies), IndexedDB can be blocked;
// fall back to in-memory persistence rather than failing module initialization.
try {
  await setPersistence(auth, browserLocalPersistence)
} catch (err) {
  console.warn('Firebase Auth persistence unavailable; falling back to in-memory.', err)
  await setPersistence(auth, inMemoryPersistence)
}

const firestoreOptions = import.meta.env.DEV
  ? {
      // Be more aggressive in dev to reduce "client is offline" issues on localhost.
      experimentalForceLongPolling: true,
    }
  : {
      // Helps in environments where Firestore's default transport is blocked
      // (VPNs, strict corporate proxies, some browser privacy settings).
      experimentalAutoDetectLongPolling: true,
    }

export const db = initializeFirestore(app, firestoreOptions)
