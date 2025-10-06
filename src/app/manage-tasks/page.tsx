'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { useAuthContext } from '@/providers/auth-provider'
import { dailyTaskService } from '@/services/daily-task-service'
import { TaskTemplate, RecurrenceType } from '@/types/task.types'
import { cn } from '@/lib/utils'
const RECURRENCE_LABELS = {
  'daily': 'Diário',
  'weekly': 'Semanal',
  'monthly': 'Mensal',
  'once': 'Uma vez',
  'custom': 'Personalizado'
} as const

const DIFFICULTY_LABELS = {
  'easy': 'Fácil',
  'medium': 'Médio',
  'hard': 'Difícil'
} as const

const DIFFICULTY_COLORS = {
  'easy': 'bg-green-100 text-green-800',
  'medium': 'bg-yellow-100 text-yellow-800',
  'hard': 'bg-red-100 text-red-800'
} as const

const RECURRENCE_COLORS = {
  'daily': 'bg-blue-100 text-blue-800',
  'weekly': 'bg-purple-100 text-purple-800',
  'monthly': 'bg-orange-100 text-orange-800',
  'once': 'bg-gray-100 text-gray-800',
  'custom': 'bg-indigo-100 text-indigo-800'
} as const

export default function ManageTasksPage() {
  const router = useRouter()
  const { user, loading, isAuthenticated } = useAuthContext()

  const [templates, setTemplates] = useState<TaskTemplate[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'daily'>('all')

  // Redirect if not authenticated
  useEffect(() => {
    if (loading) return

    if (!isAuthenticated || !user) {
      router.push('/login')
      return
    }

    if (user?.familyId) {
      dailyTaskService.setFamilyId(user.familyId)
      loadTemplates()
    }
  }, [loading, isAuthenticated, user, router])

  const loadTemplates = async () => {
    try {
      setIsLoading(true)
      // Load only daily templates for management
      const allTemplates = await dailyTaskService.getAllTemplates()
      // Filter only daily recurring tasks
      const dailyTemplates = allTemplates.filter(template => template.recurrence === 'daily')
      setTemplates(dailyTemplates)
    } catch (error) {
      console.error('Error loading templates:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleToggleActive = async (template: TaskTemplate) => {
    try {
      await dailyTaskService.toggleTemplateActive(template.id)
      await loadTemplates()
    } catch (error) {
      console.error('Error toggling template status:', error)
    }
  }

  const filteredTemplates = templates.filter(template => {
    if (filter === 'all') return true
    return template.recurrence === 'daily' // Only daily tasks
  })

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <div className="text-xl font-semibold">Carregando...</div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 p-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-4 mb-4">
            <Button
              onClick={() => router.push('/')}
              className="px-4 py-2 bg-gray-500 hover:bg-gray-600 text-white rounded-2xl"
            >
              ← Voltar ao Dashboard
            </Button>
            <h1 className="text-4xl md:text-5xl font-bold drop-shadow-lg">
              🗂️ Gerenciar Tarefas Diárias
            </h1>
          </div>
          <p className="text-lg opacity-80 max-w-2xl mx-auto">
            Gerencie as tarefas que se repetem automaticamente todos os dias
          </p>
        </div>

        {/* Info */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-100 rounded-2xl">
            <span className="text-blue-600 font-semibold">
              📊 {templates.length} tarefas diárias encontradas
            </span>
          </div>
        </div>

        {/* Templates List */}
        {isLoading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Carregando templates...</p>
          </div>
        ) : filteredTemplates.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-3xl shadow-lg">
            <div className="text-6xl mb-4">📝</div>
            <h3 className="text-xl font-semibold mb-2">
              Nenhuma tarefa diária encontrada
            </h3>
            <p className="text-gray-600 mb-4">
              As tarefas diárias são criadas automaticamente quando você adiciona uma nova tarefa com recorrência diária pelo modal de criar tarefa no dashboard principal.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredTemplates.map((template) => (
              <div
                key={template.id}
                className="bg-white rounded-3xl p-6 shadow-lg hover:shadow-xl transition-all duration-300"
              >
                {/* Template Header */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="text-3xl">{template.icon}</div>
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">
                        {template.name}
                      </h3>
                      <div className="flex items-center gap-2 mt-1">
                        <span className={cn(
                          'px-2 py-1 rounded-full text-xs font-semibold',
                          RECURRENCE_COLORS[template.recurrence]
                        )}>
                          {RECURRENCE_LABELS[template.recurrence]}
                        </span>
                        {template.difficulty && (
                          <span className={cn(
                            'px-2 py-1 rounded-full text-xs font-semibold',
                            DIFFICULTY_COLORS[template.difficulty]
                          )}>
                            {DIFFICULTY_LABELS[template.difficulty]}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Active Status */}
                  <div className={cn(
                    'px-3 py-1 rounded-full text-xs font-semibold',
                    template.is_active
                      ? 'bg-green-100 text-green-800'
                      : 'bg-red-100 text-red-800'
                  )}>
                    {template.is_active ? '✅ Ativo' : '❌ Inativo'}
                  </div>
                </div>

                {/* Template Details */}
                <div className="space-y-2 mb-4">
                  {template.points > 0 && (
                    <div className="flex items-center gap-2">
                      <span className="text-yellow-600">⭐</span>
                      <span className="text-sm text-gray-600">
                        {template.points} pontos
                      </span>
                    </div>
                  )}
                  {template.category && (
                    <div className="flex items-center gap-2">
                      <span className="text-blue-600">📂</span>
                      <span className="text-sm text-gray-600 capitalize">
                        {template.category}
                      </span>
                    </div>
                  )}
                  {template.estimated_time && (
                    <div className="flex items-center gap-2">
                      <span className="text-purple-600">⏱️</span>
                      <span className="text-sm text-gray-600">
                        ~{template.estimated_time} min
                      </span>
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="flex gap-2">
                  <Button
                    onClick={() => handleToggleActive(template)}
                    className={cn(
                      'flex-1 px-4 py-2 rounded-xl text-sm font-semibold',
                      template.is_active
                        ? 'bg-red-100 text-red-700 hover:bg-red-200'
                        : 'bg-green-100 text-green-700 hover:bg-green-200'
                    )}
                  >
                    {template.is_active ? '🗑️ Remover' : '↩️ Restaurar'}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}

      </div>
    </div>
  )
}