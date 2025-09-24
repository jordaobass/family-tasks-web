// Google Calendar API compatible types
export interface GoogleCalendarEvent {
  // Google Calendar fields
  id?: string                    // Google event ID
  calendar_id?: string          // Google calendar ID
  summary: string               // Event title
  description?: string          // Event description
  location?: string             // Event location
  status?: 'confirmed' | 'tentative' | 'cancelled'
  visibility?: 'default' | 'public' | 'private'
  
  // Date and time
  start: GoogleDateTime
  end: GoogleDateTime
  timezone: string
  
  // Recurrence
  recurrence?: string[]         // RRULE format
  recurring_event_id?: string   // For recurring event instances
  
  // Attendees
  attendees?: GoogleAttendee[]
  
  // Custom fields for our app
  emoji?: string
  user_id?: string
  user_name?: string
  user_color?: string
  type?: 'task' | 'event' | 'reminder'
  
  // Sync metadata
  created_at?: string
  updated_at?: string
  synced_at?: string
  sync_status?: 'pending' | 'synced' | 'error'
}

export interface GoogleDateTime {
  date_time?: string    // RFC3339 timestamp (2023-12-25T10:00:00-08:00)
  date?: string        // Date only (2023-12-25)
  timezone?: string    // IANA timezone (America/Sao_Paulo)
}

export interface GoogleAttendee {
  email: string
  display_name?: string
  response_status?: 'needsAction' | 'declined' | 'tentative' | 'accepted'
  optional?: boolean
}

// Simplified interface for our frontend
export interface CalendarEvent {
  // Internal ID (can be different from Google ID)
  id: string
  
  // Basic event info
  title: string
  description?: string
  location?: string
  
  // Timing
  start_date: Date
  end_date: Date
  start_time?: string
  end_time?: string
  timezone: string
  is_all_day: boolean
  
  // Recurrence
  recurrence_type?: 'none' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'custom'
  recurrence_rule?: string    // RRULE format
  recurrence_end?: Date
  
  // Visual and categorization
  emoji: string
  type: 'task' | 'event' | 'reminder'
  category?: string
  
  // User assignment
  user_id: string
  user_name: string
  user_color: string
  attendees?: string[]        // Array of user IDs or emails
  
  // Status
  status: 'confirmed' | 'tentative' | 'cancelled'
  completion_status?: 'pending' | 'completed' | 'skipped'
  
  // Google Calendar sync
  google_event_id?: string
  google_calendar_id?: string
  sync_status: 'local' | 'synced' | 'pending' | 'error'
  
  // Metadata
  created_at: Date
  updated_at: Date
  created_by: string
}

// API request/response types
export interface CreateEventRequest {
  title: string
  description?: string
  location?: string
  start_date: string          // ISO date
  end_date: string           // ISO date  
  start_time?: string        // HH:MM format
  end_time?: string          // HH:MM format
  timezone: string
  is_all_day: boolean
  recurrence_type?: 'none' | 'daily' | 'weekly' | 'monthly' | 'yearly'
  emoji: string
  type: 'task' | 'event' | 'reminder'
  user_id: string
  attendees?: string[]
  sync_to_google: boolean
}

export interface SyncCalendarResponse {
  success: boolean
  events_synced: number
  events_created: number
  events_updated: number
  events_deleted: number
  last_sync: string
  errors?: Array<{
    event_id: string
    error: string
  }>
}

// Common timezone options for Brazil
export const BRAZIL_TIMEZONES = [
  { value: 'America/Sao_Paulo', label: 'Brasília (UTC-3)' },
  { value: 'America/Manaus', label: 'Manaus (UTC-4)' },
  { value: 'America/Fortaleza', label: 'Fortaleza (UTC-3)' },
  { value: 'America/Recife', label: 'Recife (UTC-3)' },
  { value: 'America/Bahia', label: 'Salvador (UTC-3)' },
] as const

// Recurrence rule helpers
export const RECURRENCE_PATTERNS = [
  { value: 'none', label: 'Não repetir', rrule: '' },
  { value: 'daily', label: 'Todos os dias', rrule: 'FREQ=DAILY' },
  { value: 'weekly', label: 'Toda semana', rrule: 'FREQ=WEEKLY' },
  { value: 'monthly', label: 'Todo mês', rrule: 'FREQ=MONTHLY' },
  { value: 'yearly', label: 'Todo ano', rrule: 'FREQ=YEARLY' },
] as const