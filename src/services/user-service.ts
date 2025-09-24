import { USE_MOCK_USERS } from '@/config/constants'
import { DEFAULT_USERS } from '@/config/constants'

export interface User {
  user_id: string
  family_id: string
  email?: string
  first_name: string
  last_name?: string
  user_name: string
  user_type: 'admin' | 'adult' | 'child'
  profile_color: string
  avatar_emoji: string
  avatar_image_url?: string
  points_total: number
  level_current: number
  created_at: Date
  updated_at: Date
  last_active?: Date
  preferences?: UserPreferences
  achievements?: Achievement[]
}

export interface UserPreferences {
  theme: 'light' | 'dark' | 'auto'
  language: string
  timezone: string
  notifications_enabled: boolean
  sound_enabled: boolean
  sound_volume: number
}

export interface Achievement {
  id: string
  title: string
  description: string
  emoji: string
  unlocked_at: Date
  points_earned: number
}

export interface UserStats {
  user_id: string
  tasks_completed_today: number
  tasks_completed_this_week: number
  tasks_completed_this_month: number
  points_earned_today: number
  points_earned_this_week: number
  points_earned_this_month: number
  current_streak: number
  longest_streak: number
  completion_rate: number
  favorite_categories: string[]
  recent_achievements: Achievement[]
}

export interface CreateUserRequest {
  first_name: string
  last_name?: string
  user_type: 'admin' | 'adult' | 'child'
  email?: string
  avatar_emoji: string
  profile_color: string
}

export interface UpdateUserRequest {
  first_name?: string
  last_name?: string
  avatar_emoji?: string
  profile_color?: string
  preferences?: Partial<UserPreferences>
}

// Mock data
const MOCK_USERS: User[] = [
  {
    user_id: 'louise',
    family_id: 'family_1',
    email: 'louise@family.com',
    first_name: 'Louise',
    user_name: 'Louise',
    user_type: 'child',
    profile_color: 'linear-gradient(135deg, #FF6B6B 0%, #FFE66D 100%)',
    avatar_emoji: '👧',
    points_total: 285,
    level_current: 3,
    created_at: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 days ago
    updated_at: new Date(),
    last_active: new Date(),
    preferences: {
      theme: 'light',
      language: 'pt-BR',
      timezone: 'America/Sao_Paulo',
      notifications_enabled: true,
      sound_enabled: true,
      sound_volume: 80
    },
    achievements: [
      {
        id: 'first_task',
        title: 'Primeira Tarefa',
        description: 'Completou sua primeira tarefa!',
        emoji: '🎉',
        unlocked_at: new Date(Date.now() - 25 * 24 * 60 * 60 * 1000),
        points_earned: 10
      },
      {
        id: 'week_streak',
        title: 'Uma Semana',
        description: 'Completou tarefas por 7 dias seguidos!',
        emoji: '🔥',
        unlocked_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
        points_earned: 50
      }
    ]
  },
  {
    user_id: 'benicio',
    family_id: 'family_1',
    email: 'benicio@family.com',
    first_name: 'Benício',
    user_name: 'Benício',
    user_type: 'child',
    profile_color: 'linear-gradient(135deg, #4ECDC4 0%, #44A08D 100%)',
    avatar_emoji: '👦',
    points_total: 195,
    level_current: 2,
    created_at: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
    updated_at: new Date(),
    last_active: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
    preferences: {
      theme: 'light',
      language: 'pt-BR',
      timezone: 'America/Sao_Paulo',
      notifications_enabled: true,
      sound_enabled: true,
      sound_volume: 90
    },
    achievements: [
      {
        id: 'first_task',
        title: 'Primeira Tarefa',
        description: 'Completou sua primeira tarefa!',
        emoji: '🎉',
        unlocked_at: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000),
        points_earned: 10
      }
    ]
  },
  {
    user_id: 'adult1',
    family_id: 'family_1',
    email: 'jon@family.com',
    first_name: 'Jon',
    user_name: 'Jon',
    user_type: 'admin',
    profile_color: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    avatar_emoji: '👨',
    points_total: 0, // Adults don't earn points
    level_current: 0,
    created_at: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000), // 60 days ago
    updated_at: new Date(),
    last_active: new Date(),
    preferences: {
      theme: 'light',
      language: 'pt-BR',
      timezone: 'America/Sao_Paulo',
      notifications_enabled: true,
      sound_enabled: false,
      sound_volume: 50
    },
    achievements: []
  },
  {
    user_id: 'adult2',
    family_id: 'family_1',
    email: 'prin@family.com',
    first_name: 'Prin',
    user_name: 'Prin',
    user_type: 'adult',
    profile_color: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
    avatar_emoji: '👩',
    points_total: 0,
    level_current: 0,
    created_at: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000),
    updated_at: new Date(),
    last_active: new Date(Date.now() - 6 * 60 * 60 * 1000), // 6 hours ago
    preferences: {
      theme: 'light',
      language: 'pt-BR',
      timezone: 'America/Sao_Paulo',
      notifications_enabled: true,
      sound_enabled: true,
      sound_volume: 70
    },
    achievements: []
  }
]

class UserService {
  private mock_users: User[] = [...MOCK_USERS]

  // Get all users in family
  async getUsers(family_id?: string): Promise<User[]> {
    if (USE_MOCK_USERS) {
      await new Promise(resolve => setTimeout(resolve, 400))
      
      return family_id 
        ? this.mock_users.filter(user => user.family_id === family_id)
        : this.mock_users
    }

    try {
      const url = family_id 
        ? `/api/families/${family_id}/users`
        : '/api/users'
      
      const response = await fetch(url)
      
      if (!response.ok) {
        throw new Error('Failed to fetch users')
      }
      
      return await response.json()
    } catch (error) {
      console.error('Error fetching users:', error)
      return []
    }
  }

  // Get user by ID
  async getUser(user_id: string): Promise<User | null> {
    if (USE_MOCK_USERS) {
      await new Promise(resolve => setTimeout(resolve, 200))
      
      return this.mock_users.find(user => user.user_id === user_id) || null
    }

    try {
      const response = await fetch(`/api/users/${user_id}`)
      
      if (!response.ok) {
        if (response.status === 404) return null
        throw new Error('Failed to fetch user')
      }
      
      return await response.json()
    } catch (error) {
      console.error('Error fetching user:', error)
      return null
    }
  }

  // Get user statistics
  async getUserStats(user_id: string): Promise<UserStats | null> {
    if (USE_MOCK_USERS) {
      await new Promise(resolve => setTimeout(resolve, 500))
      
      const user = this.mock_users.find(u => u.user_id === user_id)
      if (!user) return null

      // Mock statistics
      return {
        user_id,
        tasks_completed_today: Math.floor(Math.random() * 5) + 1,
        tasks_completed_this_week: Math.floor(Math.random() * 20) + 5,
        tasks_completed_this_month: Math.floor(Math.random() * 50) + 15,
        points_earned_today: Math.floor(Math.random() * 30) + 5,
        points_earned_this_week: Math.floor(Math.random() * 150) + 30,
        points_earned_this_month: user.points_total,
        current_streak: Math.floor(Math.random() * 10) + 1,
        longest_streak: Math.floor(Math.random() * 15) + 5,
        completion_rate: Math.floor(Math.random() * 40) + 60, // 60-100%
        favorite_categories: ['higiene', 'organização', 'estudos'],
        recent_achievements: user.achievements?.slice(-3) || []
      }
    }

    try {
      const response = await fetch(`/api/users/${user_id}/stats`)
      
      if (!response.ok) {
        if (response.status === 404) return null
        throw new Error('Failed to fetch user stats')
      }
      
      return await response.json()
    } catch (error) {
      console.error('Error fetching user stats:', error)
      return null
    }
  }

  // Create new user
  async createUser(request: CreateUserRequest): Promise<User> {
    const new_user: User = {
      ...request,
      user_id: `user_${Date.now()}`,
      family_id: 'family_1', // Mock family ID
      user_name: request.first_name,
      points_total: 0,
      level_current: 1,
      created_at: new Date(),
      updated_at: new Date(),
      preferences: {
        theme: 'light',
        language: 'pt-BR',
        timezone: 'America/Sao_Paulo',
        notifications_enabled: true,
        sound_enabled: true,
        sound_volume: 80
      },
      achievements: []
    }

    if (USE_MOCK_USERS) {
      await new Promise(resolve => setTimeout(resolve, 800))
      
      this.mock_users.push(new_user)
      return new_user
    }

    try {
      const response = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(new_user)
      })

      if (!response.ok) {
        throw new Error('Failed to create user')
      }

      return await response.json()
    } catch (error) {
      console.error('Error creating user:', error)
      throw error
    }
  }

  // Update user
  async updateUser(user_id: string, updates: UpdateUserRequest): Promise<User> {
    if (USE_MOCK_USERS) {
      await new Promise(resolve => setTimeout(resolve, 600))
      
      const user_index = this.mock_users.findIndex(u => u.user_id === user_id)
      if (user_index === -1) {
        throw new Error('User not found')
      }
      
      const current_user = this.mock_users[user_index]
      
      this.mock_users[user_index] = {
        ...current_user,
        ...updates,
        preferences: updates.preferences 
          ? { ...current_user.preferences, ...updates.preferences } as UserPreferences
          : current_user.preferences,
        updated_at: new Date()
      }
      
      return this.mock_users[user_index]
    }

    try {
      const response = await fetch(`/api/users/${user_id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      })

      if (!response.ok) {
        throw new Error('Failed to update user')
      }

      return await response.json()
    } catch (error) {
      console.error('Error updating user:', error)
      throw error
    }
  }

  // Add points to user
  async addPoints(user_id: string, points: number, reason?: string): Promise<User> {
    if (USE_MOCK_USERS) {
      await new Promise(resolve => setTimeout(resolve, 300))
      
      const user_index = this.mock_users.findIndex(u => u.user_id === user_id)
      if (user_index === -1) {
        throw new Error('User not found')
      }
      
      const user = this.mock_users[user_index]
      const new_total = user.points_total + points
      const new_level = Math.floor(new_total / 100) + 1 // Level up every 100 points
      
      this.mock_users[user_index] = {
        ...user,
        points_total: new_total,
        level_current: new_level,
        updated_at: new Date()
      }
      
      return this.mock_users[user_index]
    }

    try {
      const response = await fetch(`/api/users/${user_id}/points`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ points, reason })
      })

      if (!response.ok) {
        throw new Error('Failed to add points')
      }

      return await response.json()
    } catch (error) {
      console.error('Error adding points:', error)
      throw error
    }
  }

  // Get service status
  getServiceStatus() {
    return {
      is_mock_mode: USE_MOCK_USERS,
      backend_connected: !USE_MOCK_USERS,
      total_users: USE_MOCK_USERS ? this.mock_users.length : 0,
      last_sync: USE_MOCK_USERS ? new Date().toISOString() : null
    }
  }
}

export const user_service = new UserService()