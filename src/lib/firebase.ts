import { initializeApp, getApps, getApp, type FirebaseApp } from 'firebase/app'
import { getFirestore, type Firestore } from 'firebase/firestore'
import { getAuth, GoogleAuthProvider, type Auth } from 'firebase/auth'

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || '',
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || '',
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || '',
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || '',
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || '',
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || ''
}

// Lazy initialization - only initialize when actually used
let firebaseApp: FirebaseApp | undefined = undefined
let firestoreDb: Firestore | undefined = undefined
let firebaseAuth: Auth | undefined = undefined
let googleAuthProvider: GoogleAuthProvider | undefined = undefined

function getFirebaseApp(): FirebaseApp {
  if (typeof window === 'undefined') {
    // Durante SSR/build, retorna um app mock
    return getApps().length > 0 ? getApp() : initializeApp(firebaseConfig)
  }

  if (!firebaseApp) {
    firebaseApp = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp()
  }
  return firebaseApp
}

// Direct exports - sem Proxy
export const db: Firestore = (() => {
  if (!firestoreDb) {
    firestoreDb = getFirestore(getFirebaseApp())
  }
  return firestoreDb
})()

export const auth: Auth = (() => {
  if (!firebaseAuth) {
    firebaseAuth = getAuth(getFirebaseApp())
  }
  return firebaseAuth
})()

export const googleProvider: GoogleAuthProvider = (() => {
  if (!googleAuthProvider) {
    googleAuthProvider = new GoogleAuthProvider()
    googleAuthProvider.setCustomParameters({
      prompt: 'select_account'
    })
  }
  return googleAuthProvider
})()

export default getFirebaseApp()