'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { DEFAULT_USERS } from '@/config/constants'
import { cn } from '@/lib/utils'

interface UserSelectionModalProps {
  open: boolean
  onUserSelect: (userId: string, userName: string) => void
  onClose: () => void
}

export function UserSelectionModal({ open, onUserSelect, onClose }: UserSelectionModalProps) {
  const [selectedTab, setSelectedTab] = useState<'kids' | 'adults'>('kids')

  if (!open) return null

  const currentUsers = selectedTab === 'kids' ? DEFAULT_USERS.KIDS : DEFAULT_USERS.ADULTS

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl animate-fadeIn">
        <h3 className="text-2xl font-bold text-center mb-6 text-gray-800">
          👦👧 Quem vai fazer a tarefa?
        </h3>

        {/* Tabs */}
        <div className="flex justify-center mb-6 gap-2">
          <Button
            onClick={() => setSelectedTab('kids')}
            className={cn(
              'px-6 py-3 font-bold rounded-2xl transition-all duration-300',
              {
                'bg-gradient-to-r from-pink-400 via-blue-400 to-green-400 text-white scale-105': selectedTab === 'kids',
                'bg-gray-200 text-gray-600 hover:bg-gray-300': selectedTab !== 'kids'
              }
            )}
            variant="ghost"
          >
            🧒 Crianças
          </Button>
          <Button
            onClick={() => setSelectedTab('adults')}
            className={cn(
              'px-6 py-3 font-bold rounded-2xl transition-all duration-300',
              {
                'bg-gradient-to-r from-orange-400 to-red-500 text-white scale-105': selectedTab === 'adults',
                'bg-gray-200 text-gray-600 hover:bg-gray-300': selectedTab !== 'adults'
              }
            )}
            variant="ghost"
          >
            👫 Adultos
          </Button>
        </div>

        {/* User Buttons */}
        <div className="flex gap-4 justify-center flex-wrap mb-6">
          {currentUsers.map((user) => (
            <Button
              key={user.user_id}
              onClick={() => {
                onUserSelect(user.user_id, user.user_name)
                onClose()
              }}
              className={cn(
                'w-[120px] h-[100px] flex flex-col items-center justify-center',
                'font-bold text-white rounded-2xl transition-all duration-300',
                'shadow-lg hover:shadow-xl transform hover:scale-105 border-4 border-gray-300',
                {
                  'bg-gradient-to-r from-pink-400 to-yellow-300': user.user_id === 'louise',
                  'bg-gradient-to-r from-teal-400 to-emerald-600': user.user_id === 'benicio',
                  'bg-gradient-to-r from-blue-400 to-purple-500': user.user_id === 'adult1',
                  'bg-gradient-to-r from-purple-400 to-pink-500': user.user_id === 'adult2'
                }
              )}
              variant="ghost"
            >
              <div className="text-2xl mb-1">{user.user_avatar}</div>
              <div className="text-sm font-bold text-center">{user.user_name}</div>
            </Button>
          ))}
        </div>

        {/* Close Button */}
        <div className="flex justify-center">
          <Button
            onClick={onClose}
            className="px-6 py-2 bg-gray-500 hover:bg-gray-600 text-white rounded-2xl"
            variant="ghost"
          >
            ✕ Fechar
          </Button>
        </div>
      </div>
    </div>
  )
}