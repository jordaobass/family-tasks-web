import { UserSummary } from '@/types'

export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'
export const WS_URL = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:5000'
export const CDN_URL = process.env.NEXT_PUBLIC_CDN_URL || 'https://cdn.familytasks.com'

// Environment Configuration
export const USE_MOCK_MODE = process.env.NEXT_PUBLIC_USE_MOCK_MODE === 'true'
export const USE_MOCK_CALENDAR = USE_MOCK_MODE || process.env.NEXT_PUBLIC_USE_MOCK_CALENDAR === 'true'
export const USE_MOCK_TASKS = USE_MOCK_MODE || process.env.NEXT_PUBLIC_USE_MOCK_TASKS === 'true'
export const USE_MOCK_USERS = USE_MOCK_MODE || process.env.NEXT_PUBLIC_USE_MOCK_USERS === 'true'
export const USE_MOCK_STATS = USE_MOCK_MODE || process.env.NEXT_PUBLIC_USE_MOCK_STATS === 'true'

export const APP_ENV = process.env.NEXT_PUBLIC_APP_ENV || 'development'
export const APP_NAME = process.env.NEXT_PUBLIC_APP_NAME || 'Tarefas da Família'
export const APP_VERSION = process.env.NEXT_PUBLIC_APP_VERSION || '1.0.0'
export const DEFAULT_TIMEZONE = process.env.NEXT_PUBLIC_TIMEZONE || 'America/Sao_Paulo'

// Google Calendar Configuration
export const GOOGLE_CALENDAR_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_CALENDAR_API_KEY
export const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID

export const ROUTES = {
  HOME: '/',
  LOGIN: '/login',
  REGISTER: '/register', 
  DASHBOARD: '/dashboard',
  TASKS: '/tasks',
  ANALYTICS: '/analytics',
  PROFILE: '/profile',
  SETTINGS: '/settings'
} as const

export const QUERY_KEYS = {
  TASKS: 'tasks',
  TODAY_TASKS: 'today_tasks',
  USER: 'user',
  FAMILY: 'family',
  ANALYTICS: 'analytics',
  NOTIFICATIONS: 'notifications'
} as const

export const STORAGE_KEYS = {
  ACCESS_TOKEN: 'access_token',
  REFRESH_TOKEN: 'refresh_token',
  USER_ID: 'user_id',
  FAMILY_ID: 'family_id',
  THEME: 'theme',
  SOUND_ENABLED: 'sound_enabled',
  FAMILY_TASKS_STATE: 'familyTasksState'
} as const

// Users from HTML reference
export const DEFAULT_USERS: {
  KIDS: UserSummary[]
  ADULTS: UserSummary[]
} = {
  KIDS: [
    {
      user_id: 'louise',
      user_name: 'Louise',
      user_avatar: '👧',
      profile_color: 'linear-gradient(135deg, #FF6B6B 0%, #FFE66D 100%)'
    },
    {
      user_id: 'benicio',
      user_name: 'Benício', 
      user_avatar: '👦',
      profile_color: 'linear-gradient(135deg, #4ECDC4 0%, #44A08D 100%)'
    }
  ],
  ADULTS: [
    {
      user_id: 'adult1',
      user_name: 'Jon',
      user_avatar: '👨',
      profile_color: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
    },
    {
      user_id: 'adult2', 
      user_name: 'Prin',
      user_avatar: '👩',
      profile_color: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)'
    }
  ]
}

// Default tasks from HTML reference
export const DEFAULT_TASKS = {
  KIDS: [
    { task_id: 'brush-teeth-morning', task_name: 'Escovar Dentes (Manhã)', icon_value: '🦷', points_value: 10 },
    { task_id: 'brush-teeth-night', task_name: 'Escovar Dentes (Noite)', icon_value: '🌙', points_value: 10 },
    { task_id: 'take-shower', task_name: 'Tomar Banho', icon_value: '🚿', points_value: 15 },
    { task_id: 'make-bed', task_name: 'Arrumar a Cama', icon_value: '🛏️', points_value: 10 },
    { task_id: 'breakfast', task_name: 'Tomar Café', icon_value: '🥣', points_value: 5 },
    { task_id: 'homework', task_name: 'Fazer Lição de Casa', icon_value: '📚', points_value: 20 },
    { task_id: 'organize-toys', task_name: 'Guardar Brinquedos', icon_value: '🧸', points_value: 10 },
    { task_id: 'feed-pet', task_name: 'Alimentar o Pet', icon_value: '🐕', points_value: 10 },
    { task_id: 'clean-room', task_name: 'Limpar o Quarto', icon_value: '🧹', points_value: 15 }
  ],
  ADULTS: [
    { task_id: 'laundry', task_name: 'Lavar Roupas', icon_value: '👔' },
    { task_id: 'dishes', task_name: 'Lavar Louça', icon_value: '🍽️' },
    { task_id: 'vacuum', task_name: 'Aspirar a Casa', icon_value: '🧹' },
    { task_id: 'groceries', task_name: 'Fazer Compras', icon_value: '🛒' },
    { task_id: 'cook-lunch', task_name: 'Preparar Almoço', icon_value: '🍳' },
    { task_id: 'cook-dinner', task_name: 'Preparar Jantar', icon_value: '🍽️' },
    { task_id: 'bills', task_name: 'Pagar Contas', icon_value: '💳' },
    { task_id: 'trash', task_name: 'Levar o Lixo', icon_value: '🗑️' },
    { task_id: 'garden', task_name: 'Cuidar do Jardim', icon_value: '🌱' },
    { task_id: 'car', task_name: 'Lavar o Carro', icon_value: '🚗' }
  ]
} as const

export const USER_COLORS = {
  louise: 'from-pink-400 to-yellow-300',
  benicio: 'from-teal-400 to-emerald-600',
  adult1: 'from-blue-400 to-purple-500',
  adult2: 'from-purple-400 to-pink-500'
} as const