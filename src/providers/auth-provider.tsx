'use client'

import { createContext, useContext, ReactNode } from 'react'
import { User } from 'firebase/auth'
import { useAuth, AuthUser } from '@/hooks/useAuth'

interface AuthContextType {
  user: AuthUser | null
  loading: boolean
  error: string | null
  signInWithGoogle: () => Promise<User>
  signOut: () => Promise<void>
  isAuthenticated: boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const auth = useAuth()

  return (
    <AuthContext.Provider value={auth}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuthContext() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuthContext must be used within an AuthProvider')
  }
  return context
}