'use client'

import { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import { useAuthContext } from '@/providers/auth-provider'
import { firestoreTaskService, TaskStats } from '@/services/firestore-task-service'

type PeriodFilter = 'dias' | 'semana' | 'mes'

interface StatCard {
  title: string
  current_value: number
  previous_value: number
  format?: 'number' | 'percentage' | 'time'
  emoji: string
}

export default function EstatisticasPage() {
  const [selected_period, set_selected_period] = useState<PeriodFilter>('mes')
  const [selected_user, set_selected_user] = useState<string>('all')
  const [currentStats, setCurrentStats] = useState<TaskStats | null>(null)
  const [previousStats, setPreviousStats] = useState<TaskStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const { user } = useAuthContext()
  const familyId = user?.familyId

  // Function to get date periods based on filter
  const getDatePeriods = (period: PeriodFilter) => {
    const now = new Date()
    const today = now.toISOString().split('T')[0]

    switch (period) {
      case 'dias': {
        const yesterday = new Date(now)
        yesterday.setDate(now.getDate() - 1)
        return {
          current: { start: today, end: today },
          previous: { start: yesterday.toISOString().split('T')[0], end: yesterday.toISOString().split('T')[0] }
        }
      }
      case 'semana': {
        const startOfWeek = new Date(now)
        startOfWeek.setDate(now.getDate() - now.getDay())
        const endOfWeek = new Date(startOfWeek)
        endOfWeek.setDate(startOfWeek.getDate() + 6)

        const startOfPrevWeek = new Date(startOfWeek)
        startOfPrevWeek.setDate(startOfWeek.getDate() - 7)
        const endOfPrevWeek = new Date(endOfWeek)
        endOfPrevWeek.setDate(endOfWeek.getDate() - 7)

        return {
          current: {
            start: startOfWeek.toISOString().split('T')[0],
            end: endOfWeek.toISOString().split('T')[0]
          },
          previous: {
            start: startOfPrevWeek.toISOString().split('T')[0],
            end: endOfPrevWeek.toISOString().split('T')[0]
          }
        }
      }
      case 'mes': {
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
        const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0)

        const startOfPrevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)
        const endOfPrevMonth = new Date(now.getFullYear(), now.getMonth(), 0)

        return {
          current: {
            start: startOfMonth.toISOString().split('T')[0],
            end: endOfMonth.toISOString().split('T')[0]
          },
          previous: {
            start: startOfPrevMonth.toISOString().split('T')[0],
            end: endOfPrevMonth.toISOString().split('T')[0]
          }
        }
      }
    }
  }

  // Load statistics data
  useEffect(() => {
    const loadStats = async () => {
      if (!familyId) return

      try {
        setLoading(true)
        setError(null)

        firestoreTaskService.setFamilyId(familyId)

        const periods = getDatePeriods(selected_period)
        const { current, previous } = await firestoreTaskService.getHistoricalStats(
          periods.current,
          periods.previous
        )

        setCurrentStats(current)
        setPreviousStats(previous)
      } catch (err) {
        console.error('Error loading stats:', err)
        setError('Erro ao carregar estatísticas')
      } finally {
        setLoading(false)
      }
    }

    loadStats()
  }, [familyId, selected_period])

  const stats: StatCard[] = useMemo(() => {
    if (!currentStats || !previousStats) return []

    return [
      {
        title: 'Tarefas Concluídas',
        current_value: currentStats.completed_tasks,
        previous_value: previousStats.completed_tasks,
        format: 'number',
        emoji: '✅'
      },
      {
        title: 'Pontos Conquistados',
        current_value: currentStats.total_points_earned,
        previous_value: previousStats.total_points_earned,
        format: 'number',
        emoji: '⭐'
      },
      {
        title: 'Taxa de Conclusão',
        current_value: currentStats.completion_rate,
        previous_value: previousStats.completion_rate,
        format: 'percentage',
        emoji: '📈'
      },
      {
        title: 'Tempo Médio',
        current_value: Math.round(currentStats.avg_completion_time),
        previous_value: Math.round(previousStats.avg_completion_time),
        format: 'time',
        emoji: '⏱️'
      }
    ]
  }, [currentStats, previousStats])

  const format_value = (value: number, format: string = 'number') => {
    switch (format) {
      case 'percentage':
        return `${value}%`
      case 'time':
        return `${value}h`
      default:
        return value.toString()
    }
  }

  const get_change_percentage = (current: number, previous: number) => {
    if (previous === 0) return 0
    return Math.round(((current - previous) / previous) * 100)
  }

  const get_period_label = (period: PeriodFilter) => {
    switch (period) {
      case 'dias':
        return { current: 'Hoje', previous: 'Ontem' }
      case 'semana':
        return { current: 'Esta Semana', previous: 'Semana Passada' }
      case 'mes':
        return { current: 'Este Mês', previous: 'Mês Passado' }
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-pink-50">
      {/* Header */}
      <div className="bg-white/80 backdrop-blur-sm border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Link
                href="/"
                className="inline-flex items-center px-4 py-2 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium transition-colors"
              >
                ← Voltar
              </Link>
              <div>
                <div className="flex items-center space-x-2">
                  <span className="text-2xl">📊</span>
                  <h1 className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
                    Estatísticas da Família
                  </h1>
                </div>
                <p className="text-gray-600 text-sm">
                  Acompanhe o progresso e conquistas de todos
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Filters */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 mb-8">
          <div className="flex flex-col sm:flex-row gap-4">
            {/* Period Filter */}
            <div className="flex-1">
              <label className="block text-sm font-semibold text-gray-700 mb-3">
                📅 Período
              </label>
              <div className="flex rounded-xl bg-gray-100 p-1">
                {(['dias', 'semana', 'mes'] as PeriodFilter[]).map((period) => (
                  <button
                    key={period}
                    onClick={() => set_selected_period(period)}
                    className={`flex-1 px-4 py-2 rounded-lg font-medium transition-all ${
                      selected_period === period
                        ? 'bg-white text-purple-700 shadow-sm'
                        : 'text-gray-600 hover:text-gray-800'
                    }`}
                  >
                    {period.charAt(0).toUpperCase() + period.slice(1)}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Loading/Error States */}
        {loading && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8 mb-8 text-center">
            <div className="text-2xl mb-2">⏳</div>
            <p className="text-gray-600">Carregando estatísticas...</p>
          </div>
        )}

        {error && (
          <div className="bg-white rounded-2xl shadow-sm border border-red-200 p-8 mb-8 text-center">
            <div className="text-2xl mb-2">❌</div>
            <p className="text-red-600">{error}</p>
          </div>
        )}

        {!loading && !error && (!currentStats || !previousStats) && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8 mb-8 text-center">
            <div className="text-2xl mb-2">📊</div>
            <p className="text-gray-600">Nenhum dado encontrado para este período</p>
          </div>
        )}

        {/* Stats Grid */}
        {!loading && !error && currentStats && previousStats && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            {stats.map((stat, index) => {
              const period_labels = get_period_label(selected_period)
              const change_percentage = get_change_percentage(
                stat.current_value,
                stat.previous_value
              )
              const is_positive = change_percentage >= 0

              return (
                <div
                  key={index}
                  className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6"
                >
                  <div className="flex items-center justify-between mb-4">
                    <div className="text-2xl">{stat.emoji}</div>
                    <div
                      className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${
                        is_positive
                          ? 'bg-green-100 text-green-700'
                          : 'bg-red-100 text-red-700'
                      }`}
                    >
                      {is_positive ? '↗' : '↘'} {Math.abs(change_percentage)}%
                    </div>
                  </div>

                  <div className="space-y-2">
                    <h3 className="font-semibold text-gray-900">{stat.title}</h3>

                    <div className="space-y-1">
                      <div className="flex justify-between items-baseline">
                        <span className="text-sm text-gray-600">
                          {period_labels.current}
                        </span>
                        <span className="text-lg font-bold text-gray-900">
                          {format_value(stat.current_value, stat.format)}
                        </span>
                      </div>

                      <div className="flex justify-between items-baseline">
                        <span className="text-sm text-gray-500">
                          {period_labels.previous}
                        </span>
                        <span className="text-sm text-gray-500">
                          {format_value(stat.previous_value, stat.format)}
                        </span>
                      </div>
                    </div>

                    {/* Visual Progress Bar */}
                    <div className="mt-3">
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-gradient-to-r from-purple-500 to-blue-500 h-2 rounded-full transition-all duration-500"
                          style={{
                            width: `${Math.min(
                              stat.current_value > 0 ?
                                (stat.current_value / Math.max(stat.current_value, stat.previous_value)) * 100 :
                                0,
                              100
                            )}%`
                          }}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* Charts Section */}
        {!loading && !error && currentStats && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Tasks Completion Chart */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-6 flex items-center">
                📈 Tarefas por Categoria
              </h3>

              <div className="space-y-4">
                {Object.entries(currentStats.tasks_by_category).length === 0 ? (
                  <div className="text-center text-gray-500 py-8">
                    <div className="text-2xl mb-2">📊</div>
                    <p>Nenhuma tarefa categorizada encontrada</p>
                  </div>
                ) : (
                  Object.entries(currentStats.tasks_by_category)
                    .sort(([,a], [,b]) => b - a)
                    .slice(0, 6)
                    .map(([category, count], index) => {
                      const colors = [
                        'from-blue-500 to-cyan-500',
                        'from-purple-500 to-pink-500',
                        'from-green-500 to-emerald-500',
                        'from-orange-500 to-yellow-500',
                        'from-red-500 to-rose-500',
                        'from-indigo-500 to-violet-500'
                      ]

                      const totalTasks = Object.values(currentStats.tasks_by_category).reduce((sum, c) => sum + c, 0)
                      const percentage = totalTasks > 0 ? Math.round((count / totalTasks) * 100) : 0

                      const categoryNames: Record<string, string> = {
                        'higiene': 'Higiene',
                        'organizacao': 'Organização',
                        'estudos': 'Estudos',
                        'casa': 'Casa',
                        'cuidados': 'Cuidados',
                        'test': 'Teste'
                      }

                      return (
                        <div key={category} className="space-y-2">
                          <div className="flex justify-between items-center">
                            <span className="text-sm font-medium text-gray-700">
                              {categoryNames[category] || category.charAt(0).toUpperCase() + category.slice(1)}
                            </span>
                            <span className="text-sm text-gray-600">
                              {count} ({percentage}%)
                            </span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-3">
                            <div
                              className={`bg-gradient-to-r ${colors[index % colors.length]} h-3 rounded-full transition-all duration-1000`}
                              style={{ width: `${percentage}%` }}
                            />
                          </div>
                        </div>
                      )
                    })
                )}
              </div>
            </div>

            {/* Points Progress Chart */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-6 flex items-center">
                ⭐ Tarefas por Usuário
              </h3>

              <div className="space-y-4">
                {Object.entries(currentStats.tasks_by_user).length === 0 ? (
                  <div className="text-center text-gray-500 py-8">
                    <div className="text-2xl mb-2">👥</div>
                    <p>Nenhuma tarefa concluída encontrada</p>
                  </div>
                ) : (
                  Object.entries(currentStats.tasks_by_user)
                    .sort(([,a], [,b]) => b - a)
                    .slice(0, 6)
                    .map(([userId, count], index) => {
                      const colors = ['#6366f1', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#ef4444']
                      const maxCount = Math.max(...Object.values(currentStats.tasks_by_user))
                      const percentage = maxCount > 0 ? (count / maxCount) * 100 : 0

                      return (
                        <div key={userId} className="space-y-2">
                          <div className="flex justify-between items-center">
                            <div className="flex items-center space-x-2">
                              <span className="text-lg">👤</span>
                              <span className="text-sm font-medium text-gray-700">
                                {userId}
                              </span>
                            </div>
                            <span className="text-sm text-gray-600">
                              {count} tarefas
                            </span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-3">
                            <div
                              className="h-3 rounded-full transition-all duration-1000"
                              style={{
                                width: `${percentage}%`,
                                background: colors[index % colors.length]
                              }}
                            />
                          </div>
                        </div>
                      )
                    })
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}