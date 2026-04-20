import {
  createUserWithEmailAndPassword,
  deleteUser,
  EmailAuthProvider,
  onAuthStateChanged,
  reauthenticateWithCredential,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
} from 'firebase/auth'
import { doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore'
import {
  createContext,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import { auth, db } from '../services/firebase.js'
import { deleteAllUserData } from '../services/db.js'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [authReady, setAuthReady] = useState(false)
  const [authError, setAuthError] = useState(null)
  const [userProfile, setUserProfile] = useState(null)
  const [profileReady, setProfileReady] = useState(false)

  const unsubRef = useRef(null)

  useEffect(() => {
    unsubRef.current = onAuthStateChanged(
      auth,
      async (nextUser) => {
        setUser(nextUser)
        if (!nextUser) {
          setUserProfile(null)
          setProfileReady(true)
          setAuthReady(true)
          return
        }

        setProfileReady(false)
        try {
          const profileSnap = await getDoc(doc(db, 'users', nextUser.uid))
          if (profileSnap.exists()) {
            setUserProfile(profileSnap.data())
          } else {
            const bootstrap = {
              uid: nextUser.uid,
              email: nextUser.email,
              displayName: nextUser.displayName || '',
              onboardingComplete: false,
              createdAt: serverTimestamp(),
              updatedAt: serverTimestamp(),
            }
            await setDoc(doc(db, 'users', nextUser.uid), bootstrap, { merge: true })
            setUserProfile({ ...bootstrap, createdAt: null, updatedAt: null })
          }
        } catch (err) {
          setAuthError(err)
          setUserProfile(null)
        } finally {
          setProfileReady(true)
        }
        setAuthReady(true)
      },
      (err) => {
        setAuthError(err)
        setAuthReady(true)
      },
    )

    return () => {
      unsubRef.current?.()
    }
  }, [])

  const signup = useCallback(async ({ email, password, displayName }) => {
    setAuthError(null)
    const cred = await createUserWithEmailAndPassword(auth, email, password)
    if (displayName) {
      await updateProfile(cred.user, { displayName })
    }

    await setDoc(
      doc(db, 'users', cred.user.uid),
      {
        uid: cred.user.uid,
        email: cred.user.email,
        displayName: displayName || cred.user.displayName || '',
        onboardingComplete: false,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      },
      { merge: true },
    )

    return cred.user
  }, [])

  const login = useCallback(async ({ email, password }) => {
    setAuthError(null)
    const cred = await signInWithEmailAndPassword(auth, email, password)
    return cred.user
  }, [])

  const logout = useCallback(async () => {
    setAuthError(null)
    await signOut(auth)
  }, [])

  const reauthenticateWithPassword = useCallback(async ({ password }) => {
    setAuthError(null)
    const current = auth.currentUser
    if (!current) throw new Error('No authenticated user')
    if (!current.email) throw new Error('Missing user email')

    const usesPasswordProvider = (current.providerData || []).some(
      (p) => p?.providerId === 'password',
    )
    if (!usesPasswordProvider) {
      throw new Error('Please sign in again to confirm this action.')
    }

    const cred = EmailAuthProvider.credential(current.email, password)
    await reauthenticateWithCredential(current, cred)
  }, [])

  const deleteAccount = useCallback(async () => {
    setAuthError(null)
    const current = auth.currentUser
    if (!current) throw new Error('No authenticated user')

    await deleteAllUserData({ userId: current.uid })
    await deleteUser(current)
  }, [])

  const refreshUserProfile = useCallback(async () => {
    if (!auth.currentUser) return null
    const snap = await getDoc(doc(db, 'users', auth.currentUser.uid))
    const profile = snap.exists() ? snap.data() : null
    setUserProfile(profile)
    setProfileReady(true)
    return profile
  }, [])

  const updateUserProfile = useCallback(async (updates) => {
    if (!auth.currentUser) throw new Error('No authenticated user')
    await setDoc(doc(db, 'users', auth.currentUser.uid), {
      uid: auth.currentUser.uid,
      ...updates,
      updatedAt: serverTimestamp(),
    }, { merge: true })
    await refreshUserProfile()
  }, [refreshUserProfile])

  const value = useMemo(
    () => ({
      user,
      userProfile,
      authReady,
      profileReady,
      authError,
      signup,
      login,
      logout,
      refreshUserProfile,
      updateUserProfile,
      reauthenticateWithPassword,
      deleteAccount,
    }),
    [
      user,
      userProfile,
      authReady,
      profileReady,
      authError,
      signup,
      login,
      logout,
      refreshUserProfile,
      updateUserProfile,
      reauthenticateWithPassword,
      deleteAccount,
    ],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export { AuthContext }
