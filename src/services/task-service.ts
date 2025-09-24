import { USE_MOCK_TASKS } from '@/config/constants'

export interface Task {
  id: string
  name: string
  icon: string
  points: number
  status: 'pending' | 'completed'
  completed_by?: string
  completed_by_name?: string
  completed_at?: Date
  category?: string
  difficulty?: 'easy' | 'medium' | 'hard'
  estimated_time?: number
  created_at: Date
  updated_at: Date
  created_by: string
  assigned_to?: string[]
  recurrence?: 'none' | 'daily' | 'weekly' | 'monthly'
  sync_status?: 'local' | 'synced' | 'pending' | 'error'
}

export interface CreateTaskRequest {
  name: string
  icon: string
  points: number
  category?: string
  difficulty?: 'easy' | 'medium' | 'hard'
  estimated_time?: number
  assigned_to?: string[]
  recurrence?: 'none' | 'daily' | 'weekly' | 'monthly'
}

export interface CompleteTaskRequest {
  completed_by: string
  completed_by_name: string
  actual_time?: number
  notes?: string
}

export interface TaskStats {
  total_tasks: number
  completed_tasks: number
  pending_tasks: number
  completion_rate: number
  total_points_earned: number
  avg_completion_time: number
  tasks_by_category: Record<string, number>
  tasks_by_user: Record<string, number>
}

// Mock data
const INITIAL_MOCK_TASKS: Task[] = [
  // Kids tasks
  { 
    id: 'brush-teeth-morning', 
    name: 'Escovar Dentes (Manhã)', 
    icon: '🦷', 
    points: 10, 
    status: 'pending',
    category: 'higiene',
    difficulty: 'easy',
    estimated_time: 5,
    created_at: new Date(),
    updated_at: new Date(),
    created_by: 'system',
    recurrence: 'daily',
    sync_status: 'synced'
  },
  { 
    id: 'brush-teeth-night', 
    name: 'Escovar Dentes (Noite)', 
    icon: '🌙', 
    points: 10, 
    status: 'pending',
    category: 'higiene',
    difficulty: 'easy',
    estimated_time: 5,
    created_at: new Date(),
    updated_at: new Date(),
    created_by: 'system',
    recurrence: 'daily',
    sync_status: 'synced'
  },
  { 
    id: 'take-shower', 
    name: 'Tomar Banho', 
    icon: '🚿', 
    points: 15, 
    status: 'completed',
    completed_by: 'louise',
    completed_by_name: 'Louise',
    completed_at: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
    category: 'higiene',
    difficulty: 'easy',
    estimated_time: 15,
    created_at: new Date(),
    updated_at: new Date(),
    created_by: 'system',
    recurrence: 'daily',
    sync_status: 'synced'
  },
  { 
    id: 'make-bed', 
    name: 'Arrumar a Cama', 
    icon: '🛏️', 
    points: 10, 
    status: 'completed',
    completed_by: 'benicio',
    completed_by_name: 'Benício',
    completed_at: new Date(Date.now() - 1 * 60 * 60 * 1000), // 1 hour ago
    category: 'organização',
    difficulty: 'easy',
    estimated_time: 10,
    created_at: new Date(),
    updated_at: new Date(),
    created_by: 'system',
    recurrence: 'daily',
    sync_status: 'synced'
  },
  { 
    id: 'breakfast', 
    name: 'Tomar Café', 
    icon: '🥣', 
    points: 5, 
    status: 'completed',
    completed_by: 'louise',
    completed_by_name: 'Louise',
    completed_at: new Date(Date.now() - 3 * 60 * 60 * 1000), // 3 hours ago
    category: 'alimentação',
    difficulty: 'easy',
    estimated_time: 20,
    created_at: new Date(),
    updated_at: new Date(),
    created_by: 'system',
    recurrence: 'daily',
    sync_status: 'synced'
  },
  { 
    id: 'homework', 
    name: 'Fazer Lição de Casa', 
    icon: '📚', 
    points: 20, 
    status: 'pending',
    category: 'estudos',
    difficulty: 'medium',
    estimated_time: 60,
    created_at: new Date(),
    updated_at: new Date(),
    created_by: 'system',
    recurrence: 'weekly',
    sync_status: 'synced'
  },
  { 
    id: 'organize-toys', 
    name: 'Guardar Brinquedos', 
    icon: '🧸', 
    points: 10, 
    status: 'pending',
    category: 'organização',
    difficulty: 'easy',
    estimated_time: 15,
    created_at: new Date(),
    updated_at: new Date(),
    created_by: 'system',
    recurrence: 'daily',
    sync_status: 'synced'
  },
  { 
    id: 'feed-pet', 
    name: 'Alimentar o Pet', 
    icon: '🐕', 
    points: 10, 
    status: 'pending',
    category: 'cuidados',
    difficulty: 'easy',
    estimated_time: 10,
    created_at: new Date(),
    updated_at: new Date(),
    created_by: 'system',
    recurrence: 'daily',
    sync_status: 'synced'
  },
  { 
    id: 'clean-room', 
    name: 'Limpar o Quarto', 
    icon: '🧹', 
    points: 15, 
    status: 'pending',
    category: 'organização',
    difficulty: 'medium',
    estimated_time: 30,
    created_at: new Date(),
    updated_at: new Date(),
    created_by: 'system',
    recurrence: 'weekly',
    sync_status: 'synced'
  },
  
  // Adult tasks  
  { 
    id: 'laundry', 
    name: 'Lavar Roupas', 
    icon: '👔', 
    points: 0, 
    status: 'pending',
    category: 'casa',
    difficulty: 'easy',
    estimated_time: 120,
    created_at: new Date(),
    updated_at: new Date(),
    created_by: 'system',
    recurrence: 'weekly',
    sync_status: 'local'
  },
  { 
    id: 'dishes', 
    name: 'Lavar Louça', 
    icon: '🍽️', 
    points: 0, 
    status: 'completed',
    completed_by: 'adult1',
    completed_by_name: 'Jon',
    completed_at: new Date(Date.now() - 30 * 60 * 1000), // 30 minutes ago
    category: 'casa',
    difficulty: 'easy',
    estimated_time: 20,
    created_at: new Date(),
    updated_at: new Date(),
    created_by: 'system',
    recurrence: 'daily',
    sync_status: 'synced'
  },
  { 
    id: 'vacuum', 
    name: 'Aspirar a Casa', 
    icon: '🧹', 
    points: 0, 
    status: 'pending',
    category: 'casa',
    difficulty: 'medium',
    estimated_time: 45,
    created_at: new Date(),
    updated_at: new Date(),
    created_by: 'system',
    recurrence: 'weekly',
    sync_status: 'synced'
  },
]

class TaskService {
  private mock_tasks: Task[] = [...INITIAL_MOCK_TASKS]

  // Get all tasks
  async getTasks(filters?: {
    status?: 'pending' | 'completed'
    assigned_to?: string
    category?: string
  }): Promise<Task[]> {
    if (USE_MOCK_TASKS) {
      await new Promise(resolve => setTimeout(resolve, 500)) // Simulate API delay
      
      let filtered_tasks = [...this.mock_tasks]
      
      if (filters?.status) {
        filtered_tasks = filtered_tasks.filter(task => task.status === filters.status)
      }
      
      if (filters?.assigned_to) {
        filtered_tasks = filtered_tasks.filter(task => 
          task.assigned_to?.includes(filters.assigned_to!) || 
          task.completed_by === filters.assigned_to
        )
      }
      
      if (filters?.category) {
        filtered_tasks = filtered_tasks.filter(task => task.category === filters.category)
      }
      
      return filtered_tasks
    }

    try {
      const url = new URL('/api/tasks', process.env.NEXT_PUBLIC_API_URL)
      
      if (filters) {
        Object.entries(filters).forEach(([key, value]) => {
          if (value) url.searchParams.append(key, value)
        })
      }
      
      const response = await fetch(url.toString())
      
      if (!response.ok) {
        throw new Error('Failed to fetch tasks')
      }
      
      return await response.json()
    } catch (error) {
      console.error('Error fetching tasks:', error)
      return []
    }
  }

  // Create new task
  async createTask(request: CreateTaskRequest): Promise<Task> {
    const new_task: Task = {
      ...request,
      id: `task_${Date.now()}`,
      status: 'pending',
      created_at: new Date(),
      updated_at: new Date(),
      created_by: 'user',
      sync_status: 'pending'
    }

    if (USE_MOCK_TASKS) {
      await new Promise(resolve => setTimeout(resolve, 800))
      
      this.mock_tasks.push(new_task)
      return { ...new_task, sync_status: 'synced' }
    }

    try {
      const response = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(new_task)
      })

      if (!response.ok) {
        throw new Error('Failed to create task')
      }

      return await response.json()
    } catch (error) {
      console.error('Error creating task:', error)
      throw error
    }
  }

  // Complete task
  async completeTask(task_id: string, request: CompleteTaskRequest): Promise<Task> {
    if (USE_MOCK_TASKS) {
      await new Promise(resolve => setTimeout(resolve, 600))
      
      const task_index = this.mock_tasks.findIndex(t => t.id === task_id)
      if (task_index === -1) {
        throw new Error('Task not found')
      }
      
      this.mock_tasks[task_index] = {
        ...this.mock_tasks[task_index],
        status: 'completed',
        completed_by: request.completed_by,
        completed_by_name: request.completed_by_name,
        completed_at: new Date(),
        updated_at: new Date()
      }
      
      return this.mock_tasks[task_index]
    }

    try {
      const response = await fetch(`/api/tasks/${task_id}/complete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(request)
      })

      if (!response.ok) {
        throw new Error('Failed to complete task')
      }

      return await response.json()
    } catch (error) {
      console.error('Error completing task:', error)
      throw error
    }
  }

  // Uncomplete task (move back to pending)
  async uncompleteTask(task_id: string): Promise<Task> {
    if (USE_MOCK_TASKS) {
      await new Promise(resolve => setTimeout(resolve, 400))
      
      const task_index = this.mock_tasks.findIndex(t => t.id === task_id)
      if (task_index === -1) {
        throw new Error('Task not found')
      }
      
      this.mock_tasks[task_index] = {
        ...this.mock_tasks[task_index],
        status: 'pending',
        completed_by: undefined,
        completed_by_name: undefined,
        completed_at: undefined,
        updated_at: new Date()
      }
      
      return this.mock_tasks[task_index]
    }

    try {
      const response = await fetch(`/api/tasks/${task_id}/uncomplete`, {
        method: 'POST'
      })

      if (!response.ok) {
        throw new Error('Failed to uncomplete task')
      }

      return await response.json()
    } catch (error) {
      console.error('Error uncompleting task:', error)
      throw error
    }
  }

  // Get task statistics
  async getTaskStats(): Promise<TaskStats> {
    if (USE_MOCK_TASKS) {
      await new Promise(resolve => setTimeout(resolve, 300))
      
      const total_tasks = this.mock_tasks.length
      const completed_tasks = this.mock_tasks.filter(t => t.status === 'completed').length
      const pending_tasks = total_tasks - completed_tasks
      const completion_rate = total_tasks > 0 ? Math.round((completed_tasks / total_tasks) * 100) : 0
      
      const total_points_earned = this.mock_tasks
        .filter(t => t.status === 'completed')
        .reduce((sum, t) => sum + t.points, 0)
      
      const tasks_by_category: Record<string, number> = {}
      const tasks_by_user: Record<string, number> = {}
      
      this.mock_tasks.forEach(task => {
        if (task.category) {
          tasks_by_category[task.category] = (tasks_by_category[task.category] || 0) + 1
        }
        
        if (task.completed_by) {
          tasks_by_user[task.completed_by] = (tasks_by_user[task.completed_by] || 0) + 1
        }
      })
      
      return {
        total_tasks,
        completed_tasks,
        pending_tasks,
        completion_rate,
        total_points_earned,
        avg_completion_time: 15, // Mock average
        tasks_by_category,
        tasks_by_user
      }
    }

    try {
      const response = await fetch('/api/tasks/stats')
      
      if (!response.ok) {
        throw new Error('Failed to fetch task stats')
      }
      
      return await response.json()
    } catch (error) {
      console.error('Error fetching task stats:', error)
      throw error
    }
  }

  // Get service status
  getServiceStatus() {
    return {
      is_mock_mode: USE_MOCK_TASKS,
      backend_connected: !USE_MOCK_TASKS,
      total_tasks: USE_MOCK_TASKS ? this.mock_tasks.length : 0,
      last_sync: USE_MOCK_TASKS ? new Date().toISOString() : null
    }
  }
}

export const task_service = new TaskService()