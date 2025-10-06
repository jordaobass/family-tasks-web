'use client'

import { useEffect, useState } from 'react'
import { useAuthContext } from '@/providers/auth-provider'
import { firestoreTaskService } from '@/services/firestore-task-service'

interface DebugInfo {
  user: {
    uid: string
    email: string | null
    displayName: string | null
    familyId?: string
  } | null
  loading: boolean
  familyCheck: null
  tasksCheck: { count: number; hasData: boolean } | { error: string } | null
  timestamp: string
}

export function FirebaseDebug() {
  const { user, loading } = useAuthContext()
  const [debugInfo, setDebugInfo] = useState<Partial<DebugInfo>>({})
  const [expanded, setExpanded] = useState(false)

  useEffect(() => {
    const updateDebug = async () => {
      const familyCheck = null
      let tasksCheck: { count: number; hasData: boolean } | { error: string } | null = null

      if (user?.familyId) {
        try {
          firestoreTaskService.setFamilyId(user.familyId)
          const tasks = await firestoreTaskService.getTasks()
          tasksCheck = { count: tasks.length, hasData: tasks.length > 0 }
        } catch (error: unknown) {
          const message = error instanceof Error ? error.message : String(error)
          tasksCheck = { error: message }
        }
      }

      setDebugInfo({
        user: user ? {
          uid: user.uid,
          email: user.email,
          displayName: user.displayName,
          familyId: user.familyId
        } : null,
        loading,
        familyCheck,
        tasksCheck,
        timestamp: new Date().toISOString()
      })
    }

    updateDebug()
  }, [user, loading])

  if (process.env.NODE_ENV === 'production') return null

  return (
    <div className="fixed bottom-4 left-4 bg-black/80 text-white p-2 rounded text-xs max-w-sm z-50">
      <div
        className="font-bold cursor-pointer flex items-center gap-1"
        onClick={() => setExpanded(!expanded)}
      >
        🔧 Firebase Debug {expanded ? '▼' : '▶'}
      </div>
      {expanded && (
        <pre className="text-xs mt-2 overflow-auto max-h-64">
          {JSON.stringify(debugInfo, null, 2)}
        </pre>
      )}
    </div>
  )
}