'use client'

import { FC } from 'react'
import { TaskListProps } from '@/types'
import { cn } from '@/lib/utils'
import { TaskCard } from './task-card'

export const TaskList: FC<TaskListProps> = ({
  tasks,
  title,
  type,
  onTaskMove,
  className
}) => {
  const handle_drop = (e: React.DragEvent) => {
    e.preventDefault()
    e.currentTarget.classList.remove('drag-over')
    
    const task_data = e.dataTransfer.getData('task_data')
    if (task_data && onTaskMove) {
      const task = JSON.parse(task_data)
      const target_status = type === 'pending' ? 'pending' : 'completed'
      onTaskMove(task, target_status)
    }
  }

  const handle_drag_over = (e: React.DragEvent) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    e.currentTarget.classList.add('drag-over')
  }

  const handle_drag_leave = (e: React.DragEvent) => {
    e.currentTarget.classList.remove('drag-over')
  }

  const is_completed = type === 'completed'

  return (
    <div className={cn('bg-white/95 rounded-3xl p-6 shadow-xl', className)}>
      <h2 className={cn(
        'text-xl font-bold text-center mb-6 px-4 py-3 rounded-xl text-white',
        {
          'bg-gradient-to-r from-yellow-400 to-red-500': !is_completed,
          'bg-gradient-to-r from-green-500 to-emerald-600': is_completed
        }
      )}>
        {title}
      </h2>
      
      <div
        className={cn(
          'min-h-[200px] p-3 rounded-2xl bg-black/5 space-y-3',
          'border-2 border-dashed border-transparent transition-all duration-300',
          'drop-zone'
        )}
        onDrop={handle_drop}
        onDragOver={handle_drag_over}
        onDragLeave={handle_drag_leave}
      >
        {tasks.length === 0 ? (
          <div className="flex items-center justify-center h-32 text-gray-400 text-center">
            <p className="text-sm">
              {is_completed ? '🎉 Nenhuma tarefa concluída ainda' : '📝 Arraste as tarefas aqui'}
            </p>
          </div>
        ) : (
          tasks.map((task) => (
            <TaskCard
              key={task.task_id}
              task={task}
            />
          ))
        )}
      </div>
    </div>
  )
}