'use client'

import { useEffect } from 'react'
import { useTaskStore } from '@/store/task-store'
import { useHydration } from '@/hooks/use-hydration'
import { UserSelector } from '@/components/common/user-selector'
import { ScoreBoard } from '@/components/common/score-board'
import { TaskList } from '@/components/tasks/task-list'
import { DEFAULT_USERS } from '@/config/constants'
import { Button } from '@/components/ui/button'
import { RefreshCw } from 'lucide-react'
import { cn } from '@/lib/utils'
import { TaskStatus, TaskAssignment } from '@/types'

export default function Home() {
  const is_hydrated = useHydration()
  
  // Always call hooks in the same order - never conditionally
  const {
    pending_tasks,
    completed_tasks,
    selected_user,
    active_tab,
    scores,
    warning_visible,
    select_user,
    switch_tab,
    move_task,
    reset_tasks,
    initialize_default_tasks,
    show_warning
  } = useTaskStore()

  // Show loading state during hydration
  if (!is_hydrated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-500 via-purple-600 to-purple-700 p-5 flex items-center justify-center">
        <div className="text-white text-center">
          <div className="text-6xl mb-4">🏠</div>
          <div className="text-xl font-semibold">Carregando Tarefas da Família...</div>
        </div>
      </div>
    )
  }

  // Initialize default tasks on first load
  useEffect(() => {
    if (pending_tasks.length === 0 && completed_tasks.length === 0) {
      initialize_default_tasks()
    }
  }, [pending_tasks.length, completed_tasks.length, initialize_default_tasks])

  // Get current date
  const get_formatted_date = () => {
    const now = new Date()
    const options: Intl.DateTimeFormatOptions = { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    }
    const dateStr = now.toLocaleDateString('pt-BR', options)
    return dateStr.charAt(0).toUpperCase() + dateStr.slice(1)
  }

  // Filter tasks by active tab
  const get_filtered_tasks = (status: 'pending' | 'completed') => {
    const tasks = status === 'pending' ? pending_tasks : completed_tasks
    
    if (active_tab === 'kids') {
      return tasks.filter(task => task.points_value > 0)
    } else {
      return tasks.filter(task => task.points_value === 0)
    }
  }

  const handle_task_move = (task: TaskAssignment, target_status: 'pending' | 'completed') => {
    if (!selected_user && active_tab === 'kids') {
      show_warning()
      return
    }
    
    move_task(task, target_status as TaskStatus)
  }

  const handle_reset = () => {
    const confirm_reset = window.confirm(
      'Deseja resetar todas as tarefas? Isso irá zerar as pontuações também.'
    )
    if (confirm_reset) {
      reset_tasks()
    }
  }

  const current_users = active_tab === 'kids' ? DEFAULT_USERS.KIDS : DEFAULT_USERS.ADULTS
  const kids_with_scores = DEFAULT_USERS.KIDS.map(user => ({
    ...user,
    points: scores[user.user_id] || 0
  }))

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-500 via-purple-600 to-purple-700 p-5">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center text-white mb-8 animate-fadeIn">
          <h1 className="text-4xl md:text-5xl font-bold mb-3 drop-shadow-lg">
            🏠 Tarefas da Família
          </h1>
          <div className="text-lg md:text-xl opacity-90">
            {get_formatted_date()}
          </div>
        </div>

        {/* Tabs */}
        <div className="flex justify-center mb-8 gap-3">
          <Button
            onClick={() => switch_tab('kids')}
            className={cn(
              'px-8 py-4 font-bold text-lg rounded-3xl transition-all duration-300 shadow-lg',
              'bg-gradient-to-r from-pink-400 via-blue-400 to-green-400',
              {
                'scale-100 shadow-2xl': active_tab === 'kids',
                'scale-95 opacity-70': active_tab !== 'kids'
              }
            )}
            variant="ghost"
          >
            🧒 Crianças
          </Button>
          <Button
            onClick={() => switch_tab('adults')}
            className={cn(
              'px-8 py-4 font-bold text-lg rounded-3xl transition-all duration-300 shadow-lg',
              'bg-gradient-to-r from-pink-500 to-rose-500',
              {
                'scale-100 shadow-2xl': active_tab === 'adults',
                'scale-95 opacity-70': active_tab !== 'adults'
              }
            )}
            variant="ghost"
          >
            👨‍👩‍👧 Adultos
          </Button>
        </div>

        {/* Main Content */}
        <div className="space-y-6">
          {/* User Selector */}
          <UserSelector
            users={current_users}
            selected_user={selected_user}
            onUserSelect={select_user}
          />

          {/* Warning */}
          {warning_visible && (
            <div className="bg-orange-500 text-white px-4 py-3 rounded-xl text-center animate-pulse">
              ⚠️ Selecione quem vai fazer a tarefa antes de arrastar!
            </div>
          )}

          {/* Score Board (only for kids) */}
          {active_tab === 'kids' && (
            <ScoreBoard users={kids_with_scores} />
          )}

          {/* Task Lists */}
          <div className="grid lg:grid-cols-2 gap-8">
            <TaskList
              tasks={get_filtered_tasks('pending')}
              title={active_tab === 'kids' ? '📝 Para Fazer' : '📋 Para Fazer'}
              type="pending"
              onTaskMove={handle_task_move}
            />
            
            <TaskList
              tasks={get_filtered_tasks('completed')}
              title="✅ Concluído"
              type="completed"
              onTaskMove={handle_task_move}
            />
          </div>
        </div>

        {/* Reset Button */}
        <Button
          onClick={handle_reset}
          className={cn(
            'fixed bottom-6 right-6 w-14 h-14 rounded-full',
            'bg-white/90 hover:bg-white shadow-xl hover:shadow-2xl',
            'transition-all duration-300 hover:rotate-180'
          )}
          variant="ghost"
        >
          <RefreshCw className="w-6 h-6 text-gray-700" />
        </Button>
      </div>
    </div>
  )
}
