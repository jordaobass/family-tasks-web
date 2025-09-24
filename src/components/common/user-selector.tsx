'use client'

import { FC } from 'react'
import { UserSelectorProps } from '@/types'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'

export const UserSelector: FC<UserSelectorProps> = ({
  users,
  selected_user,
  onUserSelect,
  className
}) => {
  return (
    <div className={cn('bg-white/95 rounded-3xl p-6 shadow-xl text-center', className)}>
      <h3 className="text-lg font-semibold text-gray-800 mb-4">
        👦👧 Quem está fazendo a tarefa?
      </h3>
      
      <div className="flex gap-4 justify-center flex-wrap">
        {users.map((user) => (
          <Button
            key={user.user_id}
            onClick={() => onUserSelect(user)}
            className={cn(
              'px-6 py-3 font-bold text-white rounded-2xl transition-all duration-300',
              'shadow-lg hover:shadow-xl transform hover:scale-105',
              'border-4 border-transparent',
              {
                'border-yellow-400 scale-110 shadow-2xl': selected_user?.user_id === user.user_id,
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
  )
}