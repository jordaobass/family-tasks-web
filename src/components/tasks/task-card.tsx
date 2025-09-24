'use client'

import { FC, useState } from 'react'
import { TaskCardProps } from '@/types'
import { cn } from '@/lib/utils'
import { TaskIcon } from './task-icon'
import { Badge } from '@/components/ui/badge'
import { Star } from 'lucide-react'

export const TaskCard: FC<TaskCardProps> = ({
  task,
  isDraggable = true,
  className
}) => {
  const [is_dragging, set_is_dragging] = useState(false)

  const handle_drag_start = (e: React.DragEvent) => {
    if (!isDraggable) return
    
    set_is_dragging(true)
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('task_id', task.task_id)
    e.dataTransfer.setData('task_data', JSON.stringify(task))
  }

  const handle_drag_end = () => {
    set_is_dragging(false)
  }

  const is_completed = task.status === 'completed'

  return (
    <div
      className={cn(
        'relative bg-white rounded-2xl p-4 shadow-lg transition-all duration-300',
        'flex items-center gap-3 cursor-move touch-none',
        'border-2 border-transparent hover:shadow-xl hover:-translate-y-1',
        'transform-gpu will-change-transform',
        {
          'opacity-50 scale-105': is_dragging,
          'bg-gradient-to-br from-green-50 to-emerald-50 border-green-200': is_completed
        },
        className
      )}
      draggable={isDraggable}
      onDragStart={handle_drag_start}
      onDragEnd={handle_drag_end}
      data-task-id={task.task_id}
    >
      {/* Owner badge */}
      {task.owner && (
        <div 
          className={cn(
            'absolute -top-2 -right-2 px-2 py-1 rounded-full text-xs font-bold text-white shadow-lg z-10',
            task.owner.user_id === 'louise' && 'bg-gradient-to-r from-pink-400 to-yellow-300',
            task.owner.user_id === 'benicio' && 'bg-gradient-to-r from-teal-400 to-emerald-600',
            task.owner.user_id === 'adult1' && 'bg-gradient-to-r from-indigo-500 to-purple-600',
            task.owner.user_id === 'adult2' && 'bg-gradient-to-r from-pink-500 to-rose-500'
          )}
        >
          {task.owner.user_name}
        </div>
      )}

      <TaskIcon 
        icon_type={task.icon_type} 
        icon_value={task.icon_value}
        size="medium"
      />
      
      <div className="flex-1 min-w-0">
        <h3 className="font-semibold text-gray-900 text-sm leading-tight">
          {task.task_name}
        </h3>
        {task.task_description && (
          <p className="text-xs text-gray-600 mt-1 line-clamp-2">
            {task.task_description}
          </p>
        )}
      </div>

      {/* Points for kids */}
      {task.points_value > 0 && (
        <Badge 
          variant="secondary" 
          className="bg-gradient-to-r from-yellow-400 to-orange-400 text-white font-bold px-2 py-1 flex items-center gap-1"
        >
          <Star className="w-3 h-3" fill="currentColor" />
          {task.points_value}
        </Badge>
      )}

      {/* Checkmark for adults */}
      {task.points_value === 0 && (
        <div className="w-6 h-6 flex items-center justify-center text-green-600">
          ✓
        </div>
      )}
    </div>
  )
}