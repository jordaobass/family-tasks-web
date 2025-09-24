import { CalendarEvent, GoogleCalendarEvent, SyncCalendarResponse } from '@/types/calendar.types'
import { USE_MOCK_CALENDAR, DEFAULT_TIMEZONE } from '@/config/constants'
import { DEFAULT_USERS } from '@/config/constants'

// Mock data for testing
const MOCK_GOOGLE_EVENTS: CalendarEvent[] = [
  {
    id: 'google_1',
    title: 'Consulta Dentista - Louise',
    description: 'Consulta de rotina',
    location: 'Clínica Odontológica',
    start_date: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000), // Tomorrow
    end_date: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000),
    start_time: '14:00',
    end_time: '15:00',
    timezone: DEFAULT_TIMEZONE,
    is_all_day: false,
    recurrence_type: 'none',
    emoji: '🦷',
    type: 'event',
    user_id: 'louise',
    user_name: 'Louise',
    user_color: DEFAULT_USERS.KIDS[0].profile_color || '#6366f1',
    status: 'confirmed',
    sync_status: 'synced',
    google_event_id: 'google_event_1',
    google_calendar_id: 'primary',
    created_at: new Date(),
    updated_at: new Date(),
    created_by: 'system'
  },
  {
    id: 'google_2',
    title: 'Reunião Escolar - Benício',
    description: 'Reunião de pais',
    location: 'Escola ABC',
    start_date: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000), // In 3 days
    end_date: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
    start_time: '19:00',
    end_time: '20:30',
    timezone: DEFAULT_TIMEZONE,
    is_all_day: false,
    recurrence_type: 'none',
    emoji: '🏫',
    type: 'event',
    user_id: 'benicio',
    user_name: 'Benício',
    user_color: DEFAULT_USERS.KIDS[1].profile_color || '#6366f1',
    status: 'confirmed',
    sync_status: 'synced',
    google_event_id: 'google_event_2',
    google_calendar_id: 'primary',
    created_at: new Date(),
    updated_at: new Date(),
    created_by: 'system'
  },
  {
    id: 'google_3',
    title: 'Aniversário Vovô',
    description: 'Festa de aniversário do vovô',
    location: 'Casa da família',
    start_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // In a week
    end_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    start_time: undefined,
    end_time: undefined,
    timezone: DEFAULT_TIMEZONE,
    is_all_day: true,
    recurrence_type: 'yearly',
    emoji: '🎂',
    type: 'event',
    user_id: 'adult1',
    user_name: 'Jon',
    user_color: DEFAULT_USERS.ADULTS[0].profile_color || '#6366f1',
    status: 'confirmed',
    sync_status: 'synced',
    google_event_id: 'google_event_3',
    google_calendar_id: 'family_calendar',
    created_at: new Date(),
    updated_at: new Date(),
    created_by: 'adult1'
  }
]

class CalendarService {
  private mock_events: CalendarEvent[] = [...MOCK_GOOGLE_EVENTS]

  // Sync with Google Calendar
  async syncGoogleCalendar(): Promise<SyncCalendarResponse> {
    if (USE_MOCK_CALENDAR) {
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 1500))
      
      return {
        success: true,
        events_synced: this.mock_events.length,
        events_created: 1,
        events_updated: 0,
        events_deleted: 0,
        last_sync: new Date().toISOString(),
      }
    }

    try {
      // Real Google Calendar API call would go here
      const response = await fetch('/api/calendar/sync', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        }
      })

      if (!response.ok) {
        throw new Error('Failed to sync Google Calendar')
      }

      return await response.json()
    } catch (error) {
      console.error('Error syncing Google Calendar:', error)
      throw error
    }
  }

  // Get Google Calendar events
  async getGoogleEvents(): Promise<CalendarEvent[]> {
    if (USE_MOCK_CALENDAR) {
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 800))
      return [...this.mock_events]
    }

    try {
      const response = await fetch('/api/calendar/events')
      
      if (!response.ok) {
        throw new Error('Failed to fetch Google Calendar events')
      }

      return await response.json()
    } catch (error) {
      console.error('Error fetching Google Calendar events:', error)
      return []
    }
  }

  // Create event (and sync to Google Calendar if enabled)
  async createEvent(event: Omit<CalendarEvent, 'id' | 'created_at' | 'updated_at' | 'created_by'>): Promise<CalendarEvent> {
    const new_event: CalendarEvent = {
      ...event,
      id: `event_${Date.now()}`,
      created_at: new Date(),
      updated_at: new Date(),
      created_by: event.user_id,
      google_event_id: USE_MOCK_CALENDAR ? `mock_${Date.now()}` : undefined
    }

    if (USE_MOCK_CALENDAR) {
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      // Add to mock events
      this.mock_events.push(new_event)
      
      // Simulate Google Calendar sync
      if (event.sync_status === 'pending') {
        new_event.sync_status = 'synced'
        new_event.google_event_id = `google_mock_${Date.now()}`
      }
      
      return new_event
    }

    try {
      const response = await fetch('/api/calendar/events', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(new_event)
      })

      if (!response.ok) {
        throw new Error('Failed to create event')
      }

      return await response.json()
    } catch (error) {
      console.error('Error creating event:', error)
      throw error
    }
  }

  // Update event
  async updateEvent(event_id: string, updates: Partial<CalendarEvent>): Promise<CalendarEvent> {
    if (USE_MOCK_CALENDAR) {
      await new Promise(resolve => setTimeout(resolve, 800))
      
      const event_index = this.mock_events.findIndex(e => e.id === event_id)
      if (event_index === -1) {
        throw new Error('Event not found')
      }
      
      this.mock_events[event_index] = {
        ...this.mock_events[event_index],
        ...updates,
        updated_at: new Date()
      }
      
      return this.mock_events[event_index]
    }

    try {
      const response = await fetch(`/api/calendar/events/${event_id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updates)
      })

      if (!response.ok) {
        throw new Error('Failed to update event')
      }

      return await response.json()
    } catch (error) {
      console.error('Error updating event:', error)
      throw error
    }
  }

  // Delete event
  async deleteEvent(event_id: string): Promise<void> {
    if (USE_MOCK_CALENDAR) {
      await new Promise(resolve => setTimeout(resolve, 500))
      
      this.mock_events = this.mock_events.filter(e => e.id !== event_id)
      return
    }

    try {
      const response = await fetch(`/api/calendar/events/${event_id}`, {
        method: 'DELETE'
      })

      if (!response.ok) {
        throw new Error('Failed to delete event')
      }
    } catch (error) {
      console.error('Error deleting event:', error)
      throw error
    }
  }

  // Get calendar status
  getCalendarStatus() {
    return {
      is_mock_mode: USE_MOCK_CALENDAR,
      google_calendar_connected: !USE_MOCK_CALENDAR,
      last_sync: USE_MOCK_CALENDAR ? new Date().toISOString() : null,
      total_events: USE_MOCK_CALENDAR ? this.mock_events.length : 0
    }
  }
}

export const calendar_service = new CalendarService()