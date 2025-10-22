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
let firebaseApp: FirebaseApp | null = null
let firestoreDb: Firestore | null = null
let firebaseAuth: Auth | null = null
let googleAuthProvider: GoogleAuthProvider | null = null

function getFirebaseApp(): FirebaseApp {
  if (!firebaseApp) {
    firebaseApp = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp()
  }
  return firebaseApp
}

export function getDb(): Firestore {
  if (!firestoreDb) {
    firestoreDb = getFirestore(getFirebaseApp())
  }
  return firestoreDb
}

export function getFirebaseAuth(): Auth {
  if (!firebaseAuth) {
    firebaseAuth = getAuth(getFirebaseApp())
  }
  return firebaseAuth
}

export function getGoogleProvider(): GoogleAuthProvider {
  if (!googleAuthProvider) {
    googleAuthProvider = new GoogleAuthProvider()
    googleAuthProvider.setCustomParameters({
      prompt: 'select_account'
    })
  }
  return googleAuthProvider
}

// Legacy exports for backward compatibility
export const db = new Proxy({} as Firestore, {
  get(_target, prop) {
    return getDb()[prop as keyof Firestore]
  }
})

export const auth = new Proxy({} as Auth, {
  get(_target, prop) {
    return getFirebaseAuth()[prop as keyof Auth]
  }
})

export const googleProvider = new Proxy({} as GoogleAuthProvider, {
  get(_target, prop) {
    return getGoogleProvider()[prop as keyof GoogleAuthProvider]
  }
})

export default getFirebaseApp()