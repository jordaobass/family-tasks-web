'use client'

import { useEffect, useRef } from 'react'
import { dailyTaskService } from '@/services/daily-task-service'

interface UseDailyTasksSchedulerProps {
  familyId?: string
  enabled?: boolean
}

export const useDailyTasksScheduler = ({
  familyId,
  enabled = true
}: UseDailyTasksSchedulerProps) => {
  const intervalRef = useRef<NodeJS.Timeout | null>(null)
  const lastCheckRef = useRef<string | null>(null)

  // Function to check if we need to generate daily tasks
  const checkDailyTasks = async () => {
    if (!familyId || !enabled) return

    try {
      const today = new Date().toISOString().split('T')[0]

      // Only check once per day
      if (lastCheckRef.current === today) return

      console.log('🕐 Verificando tarefas diárias...', today)

      // Set family ID and check for daily tasks
      dailyTaskService.setFamilyId(familyId)
      const result = await dailyTaskService.checkAndGenerateDailyTasks()

      if (result.created > 0) {
        console.log(`✅ Criadas ${result.created} novas tarefas para ${result.date}`)
      } else {
        console.log(`ℹ️ Nenhuma tarefa nova necessária para ${result.date}`)
      }

      lastCheckRef.current = today

    } catch (error) {
      console.error('❌ Erro ao verificar tarefas diárias:', error)
    }
  }

  // Function to calculate milliseconds until next midnight
  const getMillisecondsUntilMidnight = () => {
    const now = new Date()
    const midnight = new Date()
    midnight.setHours(24, 0, 0, 0) // Next midnight
    return midnight.getTime() - now.getTime()
  }

  // Function to schedule the next check at midnight
  const scheduleNextMidnightCheck = () => {
    // Clear any existing timeout
    if (intervalRef.current) {
      clearTimeout(intervalRef.current)
    }

    // Calculate time until next midnight
    const msUntilMidnight = getMillisecondsUntilMidnight()

    console.log(`⏰ Próxima verificação de tarefas em ${Math.round(msUntilMidnight / 1000 / 60)} minutos`)

    // Schedule check at midnight
    intervalRef.current = setTimeout(() => {
      checkDailyTasks()

      // Schedule recurring checks every 24 hours
      intervalRef.current = setInterval(checkDailyTasks, 24 * 60 * 60 * 1000)
    }, msUntilMidnight)
  }

  useEffect(() => {
    if (!familyId || !enabled) {
      // Clean up if disabled
      if (intervalRef.current) {
        clearTimeout(intervalRef.current)
        intervalRef.current = null
      }
      return
    }

    // Check immediately when component mounts
    checkDailyTasks()

    // Schedule automatic checks at midnight
    scheduleNextMidnightCheck()

    // Also check when page becomes visible (user returns to tab)
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        checkDailyTasks()
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)

    // Cleanup function
    return () => {
      if (intervalRef.current) {
        clearTimeout(intervalRef.current)
      }
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [familyId, enabled])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearTimeout(intervalRef.current)
      }
    }
  }, [])

  return {
    checkNow: checkDailyTasks
  }
}