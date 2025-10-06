import { useState, useEffect } from 'react'
import {
  User,
  signInWithPopup,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  GoogleAuthProvider
} from 'firebase/auth'
import { auth, googleProvider } from '@/lib/firebase'
import { doc, setDoc, getDoc } from 'firebase/firestore'
import { db } from '@/lib/firebase'

export interface AuthUser extends User {
  familyId?: string
}

export const useAuth = () => {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        // Get or create user profile
        const userRef = doc(db, 'users', firebaseUser.uid)
        const userDoc = await getDoc(userRef)

        let familyId = ''

        if (!userDoc.exists()) {
          // Create new user profile
          const newUserData = {
            uid: firebaseUser.uid,
            email: firebaseUser.email,
            displayName: firebaseUser.displayName,
            photoURL: firebaseUser.photoURL,
            familyId: generateFamilyId(),
            createdAt: new Date(),
            role: 'admin' // First user becomes admin
          }

          await setDoc(userRef, newUserData)
          familyId = newUserData.familyId
        } else {
          familyId = userDoc.data().familyId
        }

        setUser({ ...firebaseUser, familyId })
      } else {
        setUser(null)
      }
      setLoading(false)
    })

    return () => unsubscribe()
  }, [])

  const signInWithGoogle = async () => {
    try {
      setError(null)
      setLoading(true)
      const result = await signInWithPopup(auth, googleProvider)
      return result.user
    } catch (error) {
      console.error('Error signing in with Google:', error)
      setError('Erro ao fazer login com Google')
      throw error
    } finally {
      setLoading(false)
    }
  }

  const signOut = async () => {
    try {
      await firebaseSignOut(auth)
    } catch (error) {
      console.error('Error signing out:', error)
      setError('Erro ao fazer logout')
    }
  }

  return {
    user,
    loading,
    error,
    signInWithGoogle,
    signOut,
    isAuthenticated: !!user
  }
}

// Generate a simple family ID (you might want to make this more sophisticated)
const generateFamilyId = (): string => {
  return Math.random().toString(36).substring(2, 8).toUpperCase()
}