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
import { DEFAULT_USERS } from '@/config/constants'
import { CalendarEvent, BRAZIL_TIMEZONES, RECURRENCE_PATTERNS } from '@/types/calendar.types'

interface NewEventModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onEventCreate: (event: Omit<CalendarEvent, 'id' | 'created_at' | 'updated_at' | 'created_by'>) => void
  selected_date?: Date
}

const EVENT_EMOJI_OPTIONS = [
  '📅', '🎉', '🎂', '🏥', '🏫', '💼', '🚗', '✈️', '🍽️', '🛒',
  '🎭', '🎵', '⚽', '🏊', '🎨', '📚', '💊', '🦷', '👨‍⚕️', '👩‍⚕️',
  '🧑‍🏫', '👶', '🎪', '🎢', '🏖️', '🏔️', '🎯', '🎮', '📺', '🛋️',
  '🧹', '🧺', '🌱', '🐕', '🐱', '🎾', '🏀', '⚾', '🥎', '🏐'
]

const EVENT_TYPES = [
  { value: 'event', label: 'Compromisso' },
  { value: 'task', label: 'Tarefa' },
  { value: 'reminder', label: 'Lembrete' }
]

export function NewEventModal({ open, onOpenChange, onEventCreate, selected_date }: NewEventModalProps) {
  const [event_title, set_event_title] = useState('')
  const [event_description, set_event_description] = useState('')
  const [event_location, set_event_location] = useState('')
  const [selected_emoji, set_selected_emoji] = useState('📅')
  const [event_type, set_event_type] = useState<'task' | 'event' | 'reminder'>('event')
  const [selected_user, set_selected_user] = useState('')
  const [start_date, set_start_date] = useState(
    selected_date ? selected_date.toISOString().split('T')[0] : new Date().toISOString().split('T')[0]
  )
  const [end_date, set_end_date] = useState(
    selected_date ? selected_date.toISOString().split('T')[0] : new Date().toISOString().split('T')[0]
  )
  const [start_time, set_start_time] = useState('')
  const [end_time, set_end_time] = useState('')
  const [is_all_day, set_is_all_day] = useState(false)
  const [timezone, set_timezone] = useState('America/Sao_Paulo')
  const [recurrence_type, set_recurrence_type] = useState('none')
  const [sync_to_google, set_sync_to_google] = useState(true)

  const all_users = [...DEFAULT_USERS.KIDS, ...DEFAULT_USERS.ADULTS]

  const handle_submit = (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!event_title.trim() || !selected_user) return

    const selected_user_data = all_users.find(user => user.user_id === selected_user)
    if (!selected_user_data) return

    // Create start and end dates
    const start_datetime = new Date(start_date)
    const end_datetime = new Date(end_date)

    // Add times if not all-day
    if (!is_all_day && start_time) {
      const [hours, minutes] = start_time.split(':').map(Number)
      start_datetime.setHours(hours, minutes)
    }
    
    if (!is_all_day && end_time) {
      const [hours, minutes] = end_time.split(':').map(Number)
      end_datetime.setHours(hours, minutes)
    } else if (!is_all_day && start_time) {
      // Default to 1 hour duration if no end time
      end_datetime.setTime(start_datetime.getTime() + (60 * 60 * 1000))
    }

    const new_event: Omit<CalendarEvent, 'id' | 'created_at' | 'updated_at' | 'created_by'> = {
      title: event_title.trim(),
      description: event_description.trim() || undefined,
      location: event_location.trim() || undefined,
      start_date: start_datetime,
      end_date: end_datetime,
      start_time: is_all_day ? undefined : start_time,
      end_time: is_all_day ? undefined : end_time,
      timezone,
      is_all_day,
      recurrence_type: recurrence_type as any,
      emoji: selected_emoji,
      type: event_type,
      user_id: selected_user,
      user_name: selected_user_data.user_name,
      user_color: selected_user_data.profile_color || '#6366f1',
      status: 'confirmed',
      sync_status: sync_to_google ? 'pending' : 'local'
    }

    onEventCreate(new_event)
    
    // Reset form
    resetForm()
    onOpenChange(false)
  }

  const resetForm = () => {
    set_event_title('')
    set_event_description('')
    set_event_location('')
    set_selected_emoji('📅')
    set_event_type('event')
    set_selected_user('')
    set_start_time('')
    set_end_time('')
    set_is_all_day(false)
    set_recurrence_type('none')
    set_sync_to_google(true)
  }

  const handle_cancel = () => {
    resetForm()
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] max-h-[80vh] overflow-y-auto bg-white text-gray-900 border-gray-200">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-center text-gray-900">
            📅 Adicionar Evento
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handle_submit} className="space-y-6">
          {/* Emoji Selection */}
          <div className="space-y-3">
            <Label htmlFor="emoji" className="text-sm font-semibold text-gray-900">
              🎨 Ícone do Evento
            </Label>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-gray-100 rounded-xl flex items-center justify-center text-2xl border-2 border-gray-200">
                {selected_emoji}
              </div>
              <div className="flex-1 grid grid-cols-8 gap-2 max-h-24 overflow-y-auto p-2 border rounded-lg bg-gray-50">
                {EVENT_EMOJI_OPTIONS.map((emoji) => (
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

          {/* Event Title */}
          <div className="space-y-2">
            <Label htmlFor="event_title" className="text-sm font-semibold text-gray-900">
              📝 Título do Evento
            </Label>
            <Input
              id="event_title"
              type="text"
              value={event_title}
              onChange={(e) => set_event_title(e.target.value)}
              placeholder="Ex: Consulta médica, Reunião escolar..."
              className="w-full bg-white text-gray-900 border-gray-300"
              required
            />
          </div>

          {/* Event Description */}
          <div className="space-y-2">
            <Label htmlFor="event_description" className="text-sm font-semibold text-gray-900">
              📄 Descrição (opcional)
            </Label>
            <Input
              id="event_description"
              type="text"
              value={event_description}
              onChange={(e) => set_event_description(e.target.value)}
              placeholder="Detalhes adicionais sobre o evento..."
              className="w-full bg-white text-gray-900 border-gray-300"
            />
          </div>

          {/* Event Type */}
          <div className="space-y-2">
            <Label htmlFor="event_type" className="text-sm font-semibold text-gray-900">
              🔖 Tipo
            </Label>
            <Select value={event_type} onValueChange={(value) => set_event_type(value as 'task' | 'event')}>
              <SelectTrigger className="bg-white text-gray-900 border-gray-300">
                <SelectValue placeholder="Selecione o tipo" />
              </SelectTrigger>
              <SelectContent className="bg-white border-gray-200">
                {EVENT_TYPES.map((type) => (
                  <SelectItem key={type.value} value={type.value} className="text-gray-900 hover:bg-blue-50">
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* User Selection */}
          <div className="space-y-2">
            <Label htmlFor="selected_user" className="text-sm font-semibold text-gray-900">
              👤 Responsável
            </Label>
            <Select value={selected_user} onValueChange={set_selected_user}>
              <SelectTrigger className="bg-white text-gray-900 border-gray-300">
                <SelectValue placeholder="Selecione quem é responsável" />
              </SelectTrigger>
              <SelectContent className="bg-white border-gray-200">
                {all_users.map((user) => (
                  <SelectItem key={user.user_id} value={user.user_id} className="text-gray-900 hover:bg-blue-50">
                    {user.user_avatar} {user.user_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Location */}
          <div className="space-y-2">
            <Label htmlFor="event_location" className="text-sm font-semibold text-gray-900">
              📍 Local (opcional)
            </Label>
            <Input
              id="event_location"
              type="text"
              value={event_location}
              onChange={(e) => set_event_location(e.target.value)}
              placeholder="Ex: Casa, Escola, Hospital..."
              className="w-full bg-white text-gray-900 border-gray-300"
            />
          </div>

          {/* All Day Toggle */}
          <div className="flex items-center space-x-2">
            <input
              id="is_all_day"
              type="checkbox"
              checked={is_all_day}
              onChange={(e) => set_is_all_day(e.target.checked)}
              className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded"
            />
            <Label htmlFor="is_all_day" className="text-sm font-semibold text-gray-900">
              📅 Evento do dia todo
            </Label>
          </div>

          {/* Date and Time */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="start_date" className="text-sm font-semibold text-gray-900">
                📅 Data Início
              </Label>
              <Input
                id="start_date"
                type="date"
                value={start_date}
                onChange={(e) => {
                  set_start_date(e.target.value)
                  // Auto-set end date to same day if not set
                  if (!end_date || end_date < e.target.value) {
                    set_end_date(e.target.value)
                  }
                }}
                className="w-full bg-white text-gray-900 border-gray-300"
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="end_date" className="text-sm font-semibold text-gray-900">
                📅 Data Fim
              </Label>
              <Input
                id="end_date"
                type="date"
                value={end_date}
                onChange={(e) => set_end_date(e.target.value)}
                min={start_date}
                className="w-full bg-white text-gray-900 border-gray-300"
                required
              />
            </div>
          </div>

          {!is_all_day && (
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="start_time" className="text-sm font-semibold text-gray-900">
                  ⏰ Hora Início
                </Label>
                <Input
                  id="start_time"
                  type="time"
                  value={start_time}
                  onChange={(e) => set_start_time(e.target.value)}
                  className="w-full bg-white text-gray-900 border-gray-300"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="end_time" className="text-sm font-semibold text-gray-900">
                  ⏰ Hora Fim
                </Label>
                <Input
                  id="end_time"
                  type="time"
                  value={end_time}
                  onChange={(e) => set_end_time(e.target.value)}
                  className="w-full bg-white text-gray-900 border-gray-300"
                />
              </div>
            </div>
          )}

          {/* Recurrence */}
          <div className="space-y-2">
            <Label htmlFor="recurrence_type" className="text-sm font-semibold text-gray-900">
              🔄 Repetir
            </Label>
            <Select value={recurrence_type} onValueChange={set_recurrence_type}>
              <SelectTrigger className="bg-white text-gray-900 border-gray-300">
                <SelectValue placeholder="Frequência de repetição" />
              </SelectTrigger>
              <SelectContent className="bg-white border-gray-200">
                {RECURRENCE_PATTERNS.map((pattern) => (
                  <SelectItem key={pattern.value} value={pattern.value} className="text-gray-900 hover:bg-blue-50">
                    {pattern.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Google Calendar Sync */}
          <div className="flex items-center space-x-2">
            <input
              id="sync_to_google"
              type="checkbox"
              checked={sync_to_google}
              onChange={(e) => set_sync_to_google(e.target.checked)}
              className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded"
            />
            <Label htmlFor="sync_to_google" className="text-sm font-semibold text-gray-900">
              🔄 Sincronizar com Google Calendar
            </Label>
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
              📅 Criar Evento
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}