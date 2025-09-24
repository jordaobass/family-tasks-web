'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Task, CreateTaskRequest } from '@/services/task-service'

interface NewTaskModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onTaskCreate: (task: CreateTaskRequest) => void
  activeTab: 'kids' | 'adults'
}

const EMOJI_OPTIONS = [
  '🦷', '🚿', '🛏️', '🥣', '📚', '🧸', '🐕', '🧹', '🍳', '🧽',
  '🧼', '🍎', '💧', '🧴', '🎒', '✏️', '📝', '🖍️', '📖', '⚽',
  '🎨', '🧩', '🎵', '🎮', '🚗', '🌱', '🗑️', '💳', '🍽️', '🛒',
  '👔', '🧦', '👗', '👕', '👖', '🧥', '👞', '🧢', '🕶️', '⌚',
  '🎯', '🏆', '⭐', '💎', '🔥', '💪', '✨', '🎉', '🎊', '🌟'
]

const RECURRENCE_OPTIONS = [
  { value: 'once', label: 'Uma vez' },
  { value: 'daily', label: 'Diário' },
  { value: 'weekly', label: 'Semanal' },
  { value: 'weekdays', label: 'Dias úteis' },
  { value: 'weekends', label: 'Fins de semana' },
  { value: 'custom', label: 'Personalizado' }
]

export function NewTaskModal({ open, onOpenChange, onTaskCreate, activeTab }: NewTaskModalProps) {
  const [task_name, set_task_name] = useState('')
  const [selected_emoji, set_selected_emoji] = useState('📝')
  const [points_value, set_points_value] = useState(activeTab === 'kids' ? 10 : 0)
  const [recurrence, set_recurrence] = useState('daily')

  const handle_submit = (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!task_name.trim()) return

    const new_task: CreateTaskRequest = {
      name: task_name.trim(),
      icon: selected_emoji,
      points: points_value,
      category: activeTab === 'kids' ? 'general' : 'household',
      difficulty: 'easy',
      estimated_time: 15
    }

    onTaskCreate(new_task)
    
    // Reset form
    set_task_name('')
    set_selected_emoji('📝')
    set_points_value(activeTab === 'kids' ? 10 : 0)
    set_recurrence('daily')
    onOpenChange(false)
  }

  const handle_cancel = () => {
    // Reset form
    set_task_name('')
    set_selected_emoji('📝')
    set_points_value(activeTab === 'kids' ? 10 : 0)
    set_recurrence('daily')
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-center">
            ➕ Adicionar Nova Tarefa
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handle_submit} className="space-y-6">
          {/* Emoji Selection */}
          <div className="space-y-3">
            <Label htmlFor="emoji" className="text-sm font-semibold">
              📱 Ícone da Tarefa
            </Label>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-gray-100 rounded-xl flex items-center justify-center text-2xl border-2 border-gray-200">
                {selected_emoji}
              </div>
              <div className="flex-1 grid grid-cols-8 gap-2 max-h-24 overflow-y-auto p-2 border rounded-lg bg-gray-50">
                {EMOJI_OPTIONS.map((emoji) => (
                  <button
                    key={emoji}
                    type="button"
                    onClick={() => set_selected_emoji(emoji)}
                    className={`w-8 h-8 rounded-lg flex items-center justify-center text-lg hover:bg-white transition-colors ${
                      selected_emoji === emoji ? 'bg-blue-100 border-2 border-blue-400' : 'bg-white border border-gray-200'
                    }`}
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Task Name */}
          <div className="space-y-2">
            <Label htmlFor="task_name" className="text-sm font-semibold">
              📝 Nome da Tarefa
            </Label>
            <Input
              id="task_name"
              type="text"
              value={task_name}
              onChange={(e) => set_task_name(e.target.value)}
              placeholder="Ex: Escovar os dentes, Lavar louça..."
              className="w-full"
              required
            />
          </div>

          {/* Points (only for kids) */}
          {activeTab === 'kids' && (
            <div className="space-y-2">
              <Label htmlFor="points" className="text-sm font-semibold">
                ⭐ Pontos
              </Label>
              <Select value={points_value.toString()} onValueChange={(value) => set_points_value(Number(value))}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione os pontos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="5">5 pontos - Muito fácil</SelectItem>
                  <SelectItem value="10">10 pontos - Fácil</SelectItem>
                  <SelectItem value="15">15 pontos - Médio</SelectItem>
                  <SelectItem value="20">20 pontos - Difícil</SelectItem>
                  <SelectItem value="25">25 pontos - Muito difícil</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Recurrence */}
          <div className="space-y-2">
            <Label htmlFor="recurrence" className="text-sm font-semibold">
              🔄 Recorrência
            </Label>
            <Select value={recurrence} onValueChange={set_recurrence}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione a recorrência" />
              </SelectTrigger>
              <SelectContent>
                {RECURRENCE_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <DialogFooter className="flex gap-3">
            <Button
              type="button"
              onClick={handle_cancel}
              className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-800 border border-gray-300 font-semibold"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              className="flex-1 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white font-bold border-none"
            >
              ➕ Criar Tarefa
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}