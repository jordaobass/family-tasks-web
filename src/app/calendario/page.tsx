'use client'

import { useState, useMemo, useEffect } from 'react'
import Link from 'next/link'
import { DEFAULT_USERS, USE_MOCK_CALENDAR } from '@/config/constants'
import { Button } from '@/components/ui/button'
import { ChevronLeft, ChevronRight, Plus, RefreshCw, Wifi, WifiOff } from 'lucide-react'
import { NewEventModal } from '@/components/calendar/new-event-modal'
import { calendar_service } from '@/services/calendar-service'
import { CalendarEvent } from '@/types/calendar.types'

type CalendarView = 'week' | 'month'

export default function CalendarioPage() {
  const [current_date, set_current_date] = useState(new Date())
  const [calendar_view, set_calendar_view] = useState<CalendarView>('week')
  const [local_events, set_local_events] = useState<CalendarEvent[]>([])
  const [google_events, set_google_events] = useState<CalendarEvent[]>([])
  const [is_syncing, set_is_syncing] = useState(false)
  const [is_loading_events, set_is_loading_events] = useState(false)
  const [new_event_modal_open, set_new_event_modal_open] = useState(false)
  const [selected_date_for_event, set_selected_date_for_event] = useState<Date | undefined>()
  
  const all_users = [...DEFAULT_USERS.KIDS, ...DEFAULT_USERS.ADULTS]
  const calendar_status = calendar_service.getCalendarStatus()

  // Load Google Calendar events on component mount
  useEffect(() => {
    const load_google_events = async () => {
      set_is_loading_events(true)
      try {
        const events = await calendar_service.getGoogleEvents()
        set_google_events(events)
      } catch (error) {
        console.error('Error loading Google events:', error)
      } finally {
        set_is_loading_events(false)
      }
    }

    load_google_events()
  }, [])

  const get_week_days = (date: Date) => {
    const start_of_week = new Date(date)
    const day = start_of_week.getDay()
    const diff = start_of_week.getDate() - day
    start_of_week.setDate(diff)
    
    const days = []
    for (let i = 0; i < 7; i++) {
      const day_date = new Date(start_of_week)
      day_date.setDate(start_of_week.getDate() + i)
      days.push(day_date)
    }
    return days
  }

  const get_month_days = (date: Date) => {
    const year = date.getFullYear()
    const month = date.getMonth()
    
    const first_day = new Date(year, month, 1)
    const last_day = new Date(year, month + 1, 0)
    const days_in_month = last_day.getDate()
    
    const start_day = first_day.getDay()
    const days = []
    
    // Add empty cells for days before the first day of the month
    for (let i = 0; i < start_day; i++) {
      days.push(null)
    }
    
    // Add all days of the month
    for (let i = 1; i <= days_in_month; i++) {
      days.push(new Date(year, month, i))
    }
    
    return days
  }

  // Combine Google Calendar events with local events
  const all_events = useMemo(() => [...google_events, ...local_events], [google_events, local_events])

  const get_events_for_date = (date: Date) => {
    return all_events.filter(event => 
      event.start_date.toDateString() === date.toDateString()
    )
  }

  // Google Calendar sync function
  const sync_google_calendar = async () => {
    set_is_syncing(true)
    try {
      const sync_result = await calendar_service.syncGoogleCalendar()
      console.log('Sync result:', sync_result)
      
      // Reload events after sync
      const updated_events = await calendar_service.getGoogleEvents()
      set_google_events(updated_events)
    } catch (error) {
      console.error('Error syncing Google Calendar:', error)
    } finally {
      set_is_syncing(false)
    }
  }

  const handle_event_create = async (new_event: Omit<CalendarEvent, 'id' | 'created_at' | 'updated_at' | 'created_by'>) => {
    try {
      const created_event = await calendar_service.createEvent(new_event)
      
      if (created_event.sync_status === 'synced' || created_event.google_event_id) {
        // Event was synced to Google Calendar
        set_google_events(prev => [...prev, created_event])
      } else {
        // Local-only event
        set_local_events(prev => [...prev, created_event])
      }
    } catch (error) {
      console.error('Error creating event:', error)
    }
  }

  const handle_add_event_click = (date?: Date) => {
    set_selected_date_for_event(date)
    set_new_event_modal_open(true)
  }

  const navigate_calendar = (direction: 'prev' | 'next') => {
    const new_date = new Date(current_date)
    
    if (calendar_view === 'week') {
      new_date.setDate(current_date.getDate() + (direction === 'next' ? 7 : -7))
    } else {
      new_date.setMonth(current_date.getMonth() + (direction === 'next' ? 1 : -1))
    }
    
    set_current_date(new_date)
  }

  const format_date_header = () => {
    const options: Intl.DateTimeFormatOptions = calendar_view === 'week' 
      ? { year: 'numeric', month: 'long', day: 'numeric' }
      : { year: 'numeric', month: 'long' }
    
    return current_date.toLocaleDateString('pt-BR', options)
  }

  const is_today = (date: Date) => {
    const today = new Date()
    return date.toDateString() === today.toDateString()
  }

  const week_day_names = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']

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
                  <span className="text-2xl">📅</span>
                  <h1 className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
                    Calendário da Família
                  </h1>
                  {calendar_status.is_mock_mode && (
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                      <WifiOff className="w-3 h-3 mr-1" />
                      Modo Teste
                    </span>
                  )}
                  {!calendar_status.is_mock_mode && (
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                      <Wifi className="w-3 h-3 mr-1" />
                      Google Conectado
                    </span>
                  )}
                </div>
                <p className="text-gray-600 text-sm">
                  {calendar_status.is_mock_mode 
                    ? 'Usando dados de exemplo para testes'
                    : 'Sincronizado com Google Calendar'
                  }
                  {calendar_status.total_events > 0 && (
                    <span className="ml-2">• {calendar_status.total_events} eventos</span>
                  )}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Calendar Controls */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 mb-8">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            {/* Navigation */}
            <div className="flex items-center space-x-4">
              <Button
                onClick={() => navigate_calendar('prev')}
                variant="outline"
                size="sm"
                className="h-10 w-10 p-0"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              
              <h2 className="text-xl font-semibold text-gray-900 min-w-[200px] text-center">
                {format_date_header()}
              </h2>
              
              <Button
                onClick={() => navigate_calendar('next')}
                variant="outline"
                size="sm"
                className="h-10 w-10 p-0"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>

            {/* Action Buttons and View Toggle */}
            <div className="flex items-center space-x-4">
              {/* Sync Button */}
              <Button
                onClick={sync_google_calendar}
                disabled={is_syncing || is_loading_events}
                className={calendar_status.is_mock_mode 
                  ? "bg-yellow-500 hover:bg-yellow-600 text-white" 
                  : "bg-green-500 hover:bg-green-600 text-white"
                }
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${(is_syncing || is_loading_events) ? 'animate-spin' : ''}`} />
                {is_syncing ? 'Sincronizando...' : 
                 is_loading_events ? 'Carregando...' :
                 calendar_status.is_mock_mode ? 'Sync (Mock)' : 'Sincronizar Google'}
              </Button>

              {/* View Toggle */}
              <div className="flex rounded-xl bg-gray-100 p-1">
                <button
                  onClick={() => set_calendar_view('week')}
                  className={`px-4 py-2 rounded-lg font-medium transition-all ${
                    calendar_view === 'week'
                      ? 'bg-white text-purple-700 shadow-sm'
                      : 'text-gray-600 hover:text-gray-800'
                  }`}
                >
                  Semana
                </button>
                <button
                  onClick={() => set_calendar_view('month')}
                  className={`px-4 py-2 rounded-lg font-medium transition-all ${
                    calendar_view === 'month'
                      ? 'bg-white text-purple-700 shadow-sm'
                      : 'text-gray-600 hover:text-gray-800'
                  }`}
                >
                  Mês
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Calendar Grid */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
          {calendar_view === 'week' ? (
            /* Week View */
            <div>
              {/* Week Header */}
              <div className="grid grid-cols-7 border-b border-gray-200">
                {get_week_days(current_date).map((day, index) => (
                  <div key={index} className="p-4 text-center border-r border-gray-200 last:border-r-0">
                    <div className="text-sm font-medium text-gray-500">
                      {week_day_names[day.getDay()]}
                    </div>
                    <div className={`text-lg font-semibold mt-1 ${
                      is_today(day) ? 'text-purple-600' : 'text-gray-900'
                    }`}>
                      {day.getDate()}
                    </div>
                  </div>
                ))}
              </div>
              
              {/* Week Body */}
              <div className="grid grid-cols-7 min-h-[400px]">
                {get_week_days(current_date).map((day, index) => {
                  const day_events = get_events_for_date(day)
                  
                  return (
                    <div key={index} className="border-r border-gray-200 last:border-r-0 p-2">
                      <div className="space-y-1">
                        {day_events.map((event) => (
                          <div
                            key={event.id}
                            className="text-xs p-2 rounded-lg border-l-2 bg-gray-50 hover:bg-gray-100 cursor-pointer transition-colors"
                            style={{ borderLeftColor: event.user_color.includes('gradient') ? '#6366f1' : event.user_color }}
                          >
                            <div className="flex items-center space-x-1">
                              <span>{event.emoji}</span>
                              <span className="font-medium truncate">{event.title}</span>
                            </div>
                            {event.start_time && (
                              <div className="text-gray-500 mt-1">{event.start_time}</div>
                            )}
                            {event.location && (
                              <div className="text-gray-500 text-xs mt-1">📍 {event.location}</div>
                            )}
                            <div className="text-gray-600 mt-1">{event.user_name}</div>
                            {event.sync_status === 'synced' && (
                              <div className="text-xs text-green-600 mt-1">✓ Google</div>
                            )}
                            {event.sync_status === 'local' && (
                              <div className="text-xs text-gray-500 mt-1">📱 Local</div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          ) : (
            /* Month View */
            <div>
              {/* Month Header */}
              <div className="grid grid-cols-7 border-b border-gray-200">
                {week_day_names.map((day, index) => (
                  <div key={index} className="p-4 text-center border-r border-gray-200 last:border-r-0">
                    <div className="text-sm font-medium text-gray-500">{day}</div>
                  </div>
                ))}
              </div>
              
              {/* Month Body */}
              <div className="grid grid-cols-7">
                {get_month_days(current_date).map((day, index) => {
                  if (!day) {
                    return (
                      <div key={index} className="h-24 border-r border-b border-gray-200 last:border-r-0"></div>
                    )
                  }
                  
                  const day_events = get_events_for_date(day)
                  
                  return (
                    <div key={index} className="h-24 border-r border-b border-gray-200 last:border-r-0 p-1">
                      <div className={`text-sm font-medium mb-1 ${
                        is_today(day) ? 'text-purple-600' : 'text-gray-900'
                      }`}>
                        {day.getDate()}
                      </div>
                      <div className="space-y-1">
                        {day_events.slice(0, 2).map((event) => (
                          <div
                            key={event.id}
                            className="text-xs p-1 rounded bg-gray-100 hover:bg-gray-200 cursor-pointer transition-colors truncate"
                          >
                            <span>{event.emoji} {event.title}</span>
                          </div>
                        ))}
                        {day_events.length > 2 && (
                          <div className="text-xs text-gray-500 pl-1">
                            +{day_events.length - 2} mais
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>

        {/* Legend */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 mt-8">
          <h3 className="text-lg font-bold text-gray-900 mb-4">👥 Membros da Família</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {all_users.map((user) => (
              <div key={user.user_id} className="flex items-center space-x-2">
                <div
                  className="w-4 h-4 rounded-full"
                  style={{ background: user.profile_color?.includes('gradient') ? '#6366f1' : (user.profile_color || '#6366f1') }}
                />
                <span className="text-sm font-medium text-gray-700">{user.user_name}</span>
                <span className="text-lg">{user.user_avatar}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Floating Add Event Button */}
      <button
        onClick={() => handle_add_event_click()}
        className="fixed bottom-6 right-6 w-14 h-14 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white rounded-full shadow-lg hover:shadow-xl transition-all duration-300 flex items-center justify-center z-50"
      >
        <Plus className="h-6 w-6" />
      </button>

      {/* New Event Modal */}
      <NewEventModal
        open={new_event_modal_open}
        onOpenChange={set_new_event_modal_open}
        onEventCreate={handle_event_create}
        selected_date={selected_date_for_event}
      />
    </div>
  )
}