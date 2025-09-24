'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { DEFAULT_USERS, DEFAULT_TASKS } from '@/config/constants'

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
  
  const all_users = [...DEFAULT_USERS.KIDS, ...DEFAULT_USERS.ADULTS]

  const stats: StatCard[] = useMemo(() => [
    {
      title: 'Tarefas Concluídas',
      current_value: 45,
      previous_value: 38,
      format: 'number',
      emoji: '✅'
    },
    {
      title: 'Pontos Conquistados',
      current_value: 450,
      previous_value: 380,
      format: 'number',
      emoji: '⭐'
    }
  ], [])

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

            {/* User Filter */}
            <div className="flex-1">
              <label className="block text-sm font-semibold text-gray-700 mb-3">
                👥 Membro da Família
              </label>
              <div className="flex rounded-xl bg-gray-100 p-1">
                <button
                  onClick={() => set_selected_user('all')}
                  className={`px-4 py-2 rounded-lg font-medium transition-all ${
                    selected_user === 'all'
                      ? 'bg-white text-purple-700 shadow-sm'
                      : 'text-gray-600 hover:text-gray-800'
                  }`}
                >
                  Todos
                </button>
                {all_users.map((user) => (
                  <button
                    key={user.user_id}
                    onClick={() => set_selected_user(user.user_id)}
                    className={`px-4 py-2 rounded-lg font-medium transition-all ${
                      selected_user === user.user_id
                        ? 'bg-white text-purple-700 shadow-sm'
                        : 'text-gray-600 hover:text-gray-800'
                    }`}
                  >
                    {user.user_name}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Stats Grid */}
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
                            (stat.current_value / (stat.current_value + stat.previous_value)) * 100,
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

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Tasks Completion Chart */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-6 flex items-center">
              📈 Tarefas por Categoria
            </h3>
            
            <div className="space-y-4">
              {[
                { name: 'Higiene', value: 35, color: 'from-blue-500 to-cyan-500' },
                { name: 'Organização', value: 28, color: 'from-purple-500 to-pink-500' },
                { name: 'Estudos', value: 22, color: 'from-green-500 to-emerald-500' },
                { name: 'Tarefas', value: 15, color: 'from-orange-500 to-yellow-500' }
              ].map((category, index) => (
                <div key={index} className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium text-gray-700">
                      {category.name}
                    </span>
                    <span className="text-sm text-gray-600">
                      {category.value}%
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-3">
                    <div
                      className={`bg-gradient-to-r ${category.color} h-3 rounded-full transition-all duration-1000`}
                      style={{ width: `${category.value}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Points Progress Chart */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-6 flex items-center">
              ⭐ Pontos por Membro
            </h3>
            
            <div className="space-y-4">
              {all_users.map((user, index) => {
                const max_points = 500
                const user_points = [380, 280, 150, 100][index] || 100
                const percentage = (user_points / max_points) * 100

                return (
                  <div key={user.user_id} className="space-y-2">
                    <div className="flex justify-between items-center">
                      <div className="flex items-center space-x-2">
                        <span className="text-lg">{user.user_avatar}</span>
                        <span className="text-sm font-medium text-gray-700">
                          {user.user_name}
                        </span>
                      </div>
                      <span className="text-sm text-gray-600">
                        {user_points} pts
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-3">
                      <div
                        className={`h-3 rounded-full transition-all duration-1000`}
                        style={{
                          width: `${percentage}%`,
                          background: user.profile_color || '#6366f1'
                        }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}