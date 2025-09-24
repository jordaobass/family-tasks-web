'use client'

import { useState, useEffect } from 'react'
import { DEFAULT_USERS } from '@/config/constants'
import { Button } from '@/components/ui/button'
import { RefreshCw } from 'lucide-react'
import { cn } from '@/lib/utils'

export default function HomeClean() {
  const [is_mounted, set_is_mounted] = useState(false)
  const [active_tab, set_active_tab] = useState<'kids' | 'adults'>('kids')

  useEffect(() => {
    set_is_mounted(true)
  }, [])

  if (!is_mounted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-500 via-purple-600 to-purple-700 p-5 flex items-center justify-center">
        <div className="text-white text-center">
          <div className="text-6xl mb-4">🏠</div>
          <div className="text-xl font-semibold">Carregando Tarefas da Família...</div>
        </div>
      </div>
    )
  }

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

  const current_users = active_tab === 'kids' ? DEFAULT_USERS.KIDS : DEFAULT_USERS.ADULTS

  // Mock tasks for display
  const sample_tasks = [
    { id: '1', name: 'Escovar Dentes (Manhã)', icon: '🦷', points: 10 },
    { id: '2', name: 'Tomar Banho', icon: '🚿', points: 15 },
    { id: '3', name: 'Arrumar a Cama', icon: '🛏️', points: 10 },
  ]

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
            onClick={() => set_active_tab('kids')}
            className={cn(
              'px-8 py-4 font-bold text-lg rounded-3xl transition-all duration-300 shadow-lg',
              'bg-gradient-to-r from-pink-400 via-blue-400 to-green-400 text-white',
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
            onClick={() => set_active_tab('adults')}
            className={cn(
              'px-8 py-4 font-bold text-lg rounded-3xl transition-all duration-300 shadow-lg',
              'bg-gradient-to-r from-pink-500 to-rose-500 text-white',
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
          <div className="bg-white/95 rounded-3xl p-6 shadow-xl text-center">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">
              👦👧 Quem está fazendo a tarefa?
            </h3>
            
            <div className="flex gap-4 justify-center flex-wrap">
              {current_users.map((user) => (
                <Button
                  key={user.user_id}
                  className={cn(
                    'px-6 py-3 font-bold text-white rounded-2xl transition-all duration-300',
                    'shadow-lg hover:shadow-xl transform hover:scale-105',
                    {
                      'bg-gradient-to-r from-pink-400 to-yellow-300': user.user_id === 'louise',
                      'bg-gradient-to-r from-teal-400 to-emerald-600': user.user_id === 'benicio', 
                      'bg-gradient-to-r from-indigo-500 to-purple-600': user.user_id === 'adult1',
                      'bg-gradient-to-r from-pink-500 to-rose-500': user.user_id === 'adult2'
                    }
                  )}
                  variant="ghost"
                >
                  {user.user_avatar} {user.user_name}
                </Button>
              ))}
            </div>
          </div>

          {/* Score Board (only for kids) */}
          {active_tab === 'kids' && (
            <div className="bg-white/95 rounded-3xl p-6 shadow-xl">
              <h3 className="text-lg font-semibold text-gray-800 text-center mb-4">
                🏆 Pontuação
              </h3>
              
              <div className="flex justify-around flex-wrap gap-4">
                {DEFAULT_USERS.KIDS.map((user) => (
                  <div
                    key={user.user_id}
                    className="text-center p-4 bg-white rounded-2xl shadow-md min-w-[120px]"
                  >
                    <div className={cn(
                      'font-bold text-lg mb-2',
                      {
                        'text-pink-500': user.user_id === 'louise',
                        'text-teal-500': user.user_id === 'benicio'
                      }
                    )}>
                      {user.user_name}
                    </div>
                    <div className="flex items-center justify-center gap-1 text-xl font-bold text-gray-800">
                      ⭐ <span>0</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Task Lists */}
          <div className="grid lg:grid-cols-2 gap-8">
            <div className="bg-white/95 rounded-3xl p-6 shadow-xl">
              <h2 className="text-xl font-bold text-center mb-6 px-4 py-3 rounded-xl text-white bg-gradient-to-r from-yellow-400 to-red-500">
                📝 Para Fazer
              </h2>
              
              <div className="space-y-3">
                {sample_tasks.map((task) => (
                  <div
                    key={task.id}
                    className="bg-white rounded-2xl p-4 shadow-lg flex items-center gap-3 hover:-translate-y-1 transition-all duration-300 cursor-pointer"
                  >
                    <div className="w-12 h-12 flex items-center justify-center text-2xl flex-shrink-0">
                      {task.icon}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-gray-900 text-sm leading-tight">
                        {task.name}
                      </h3>
                    </div>

                    {active_tab === 'kids' && (
                      <div className="bg-gradient-to-r from-yellow-400 to-orange-400 text-white font-bold px-2 py-1 rounded-full text-xs flex items-center gap-1">
                        ⭐ {task.points}
                      </div>
                    )}

                    {active_tab === 'adults' && (
                      <div className="w-6 h-6 flex items-center justify-center text-green-600">
                        ✓
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
            
            <div className="bg-white/95 rounded-3xl p-6 shadow-xl">
              <h2 className="text-xl font-bold text-center mb-6 px-4 py-3 rounded-xl text-white bg-gradient-to-r from-green-500 to-emerald-600">
                ✅ Concluído
              </h2>
              <div className="flex items-center justify-center h-32 text-gray-400 text-center">
                <p className="text-sm">🎉 Nenhuma tarefa concluída ainda</p>
              </div>
            </div>
          </div>
        </div>

        {/* Reset Button */}
        <Button
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