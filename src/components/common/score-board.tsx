'use client'

import { FC } from 'react'
import { ScoreBoardProps } from '@/types'
import { cn } from '@/lib/utils'
import { Star } from 'lucide-react'

export const ScoreBoard: FC<ScoreBoardProps> = ({
  users,
  className
}) => {
  return (
    <div className={cn('bg-white/95 rounded-3xl p-6 shadow-xl', className)}>
      <h3 className="text-lg font-semibold text-gray-800 text-center mb-4">
        🏆 Pontuação
      </h3>
      
      <div className="flex justify-around flex-wrap gap-4">
        {users.map((user) => (
          <div
            key={user.user_id}
            className="text-center p-4 bg-white rounded-2xl shadow-md min-w-[120px]"
          >
            <div className={cn(
              'font-bold text-lg mb-2',
              {
                'text-pink-500': user.user_id === 'louise',
                'text-teal-500': user.user_id === 'benicio',
                'text-indigo-500': user.user_id === 'adult1',
                'text-pink-600': user.user_id === 'adult2'
              }
            )}>
              {user.user_name}
            </div>
            <div className="flex items-center justify-center gap-1 text-xl font-bold text-gray-800">
              <Star className="w-5 h-5 text-yellow-500" fill="currentColor" />
              <span>{user.points}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}