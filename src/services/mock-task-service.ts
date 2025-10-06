'use client'

import { Task, CreateTaskRequest, CompleteTaskRequest } from './firestore-task-service'
import { DEFAULT_TASKS } from '@/config/constants'

export class MockTaskService {
  private familyId: string = ''
  private listeners: ((tasks: Task[]) => void)[] = []

  // Set family ID for all operations
  setFamilyId(familyId: string) {
    this.familyId = familyId
  }

  private getStorageKey() {
    return `mock_tasks_${this.familyId}`
  }

  private getStoredTasks(): Task[] {
    if (typeof window === 'undefined') return []

    try {
      const stored = localStorage.getItem(this.getStorageKey())
      if (stored) {
        return JSON.parse(stored)
      }

      // Initialize with default tasks
      const defaultTasks = this.generateDefaultTasks()
      this.setTasks(defaultTasks)
      return defaultTasks
    } catch (error) {
      console.error('Error getting tasks from localStorage:', error)
      return this.generateDefaultTasks()
    }
  }

  private setTasks(tasks: Task[]) {
    if (typeof window === 'undefined') return

    try {
      localStorage.setItem(this.getStorageKey(), JSON.stringify(tasks))
      this.notifyListeners(tasks)
    } catch (error) {
      console.error('Error saving tasks to localStorage:', error)
    }
  }

  private notifyListeners(tasks: Task[]) {
    this.listeners.forEach(listener => {
      try {
        listener(tasks)
      } catch (error) {
        console.error('Error in task listener:', error)
      }
    })
  }

  private generateDefaultTasks(): Task[] {
    const now = new Date()
    const tasks: Task[] = []

    // Add kids tasks with points
    DEFAULT_TASKS.KIDS.forEach((task, index) => {
      tasks.push({
        id: `mock_${task.task_id}`,
        name: task.task_name,
        icon: task.icon_value,
        points: task.points_value,
        status: 'pending',
        category: this.getCategoryFromTaskId(task.task_id),
        difficulty: 'easy',
        estimated_time: 15,
        created_at: new Date(now.getTime() - (index * 60000)), // Spread over time
        updated_at: new Date(now.getTime() - (index * 60000)),
        created_by: 'mock_admin',
        assigned_to: [],
        recurrence: 'daily',
        family_id: this.familyId
      })
    })

    // Add adult tasks (no points)
    DEFAULT_TASKS.ADULTS.forEach((task, index) => {
      tasks.push({
        id: `mock_adult_${task.task_id}`,
        name: task.task_name,
        icon: task.icon_value,
        points: 0,
        status: 'pending',
        category: this.getCategoryFromTaskId(task.task_id),
        difficulty: 'medium',
        estimated_time: 30,
        created_at: new Date(now.getTime() - ((index + 20) * 60000)),
        updated_at: new Date(now.getTime() - ((index + 20) * 60000)),
        created_by: 'mock_admin',
        assigned_to: [],
        recurrence: 'daily',
        family_id: this.familyId
      })
    })

    return tasks
  }

  private getCategoryFromTaskId(taskId: string): string {
    if (taskId.includes('teeth') || taskId.includes('shower')) return 'higiene'
    if (taskId.includes('bed') || taskId.includes('toys') || taskId.includes('room')) return 'organização'
    if (taskId.includes('breakfast') || taskId.includes('cook')) return 'alimentação'
    if (taskId.includes('homework')) return 'estudos'
    if (taskId.includes('pet')) return 'cuidados'
    if (taskId.includes('laundry') || taskId.includes('dishes') || taskId.includes('vacuum') || taskId.includes('trash')) return 'casa'
    return 'geral'
  }

  // Get all tasks for the family
  async getTasks(filters?: {
    status?: 'pending' | 'completed'
    assigned_to?: string
    category?: string
  }): Promise<Task[]> {
    let tasks = this.getStoredTasks()

    if (filters?.status) {
      tasks = tasks.filter(task => task.status === filters.status)
    }

    if (filters?.assigned_to) {
      tasks = tasks.filter(task =>
        task.assigned_to?.includes(filters.assigned_to!) ||
        task.completed_by === filters.assigned_to
      )
    }

    if (filters?.category) {
      tasks = tasks.filter(task => task.category === filters.category)
    }

    return tasks
  }

  // Subscribe to real-time task updates
  subscribeToTasks(
    callback: (tasks: Task[]) => void,
    filters?: {
      status?: 'pending' | 'completed'
      assigned_to?: string
      category?: string
    }
  ) {
    const wrappedCallback = (tasks: Task[]) => {
      let filteredTasks = tasks

      if (filters?.status) {
        filteredTasks = filteredTasks.filter(task => task.status === filters.status)
      }

      if (filters?.assigned_to) {
        filteredTasks = filteredTasks.filter(task =>
          task.assigned_to?.includes(filters.assigned_to!) ||
          task.completed_by === filters.assigned_to
        )
      }

      if (filters?.category) {
        filteredTasks = filteredTasks.filter(task => task.category === filters.category)
      }

      callback(filteredTasks)
    }

    this.listeners.push(wrappedCallback)

    // Send initial data
    setTimeout(() => {
      wrappedCallback(this.getStoredTasks())
    }, 100)

    // Return unsubscribe function
    return () => {
      const index = this.listeners.indexOf(wrappedCallback)
      if (index > -1) {
        this.listeners.splice(index, 1)
      }
    }
  }

  // Create new task
  async createTask(request: CreateTaskRequest, createdBy: string): Promise<Task> {
    const tasks = this.getStoredTasks()
    const newTask: Task = {
      id: `mock_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name: request.name,
      icon: request.icon,
      points: request.points,
      status: 'pending',
      category: request.category,
      difficulty: request.difficulty,
      estimated_time: request.estimated_time,
      created_at: new Date(),
      updated_at: new Date(),
      created_by: createdBy,
      assigned_to: request.assigned_to || [],
      recurrence: request.recurrence || 'none',
      family_id: this.familyId
    }

    const updatedTasks = [...tasks, newTask]
    this.setTasks(updatedTasks)

    return newTask
  }

  // Complete task
  async completeTask(taskId: string, request: CompleteTaskRequest): Promise<Task> {
    const tasks = this.getStoredTasks()
    const taskIndex = tasks.findIndex(t => t.id === taskId)

    if (taskIndex === -1) {
      throw new Error('Task not found')
    }

    const updatedTask: Task = {
      ...tasks[taskIndex],
      status: 'completed',
      completed_by: request.completed_by,
      completed_by_name: request.completed_by_name,
      completed_at: new Date(),
      updated_at: new Date()
    }

    const updatedTasks = [...tasks]
    updatedTasks[taskIndex] = updatedTask
    this.setTasks(updatedTasks)

    return updatedTask
  }

  // Uncomplete task (move back to pending)
  async uncompleteTask(taskId: string): Promise<Task> {
    const tasks = this.getStoredTasks()
    const taskIndex = tasks.findIndex(t => t.id === taskId)

    if (taskIndex === -1) {
      throw new Error('Task not found')
    }

    const updatedTask: Task = {
      ...tasks[taskIndex],
      status: 'pending',
      completed_by: undefined,
      completed_by_name: undefined,
      completed_at: undefined,
      updated_at: new Date()
    }

    const updatedTasks = [...tasks]
    updatedTasks[taskIndex] = updatedTask
    this.setTasks(updatedTasks)

    return updatedTask
  }

  // Delete task
  async deleteTask(taskId: string): Promise<void> {
    const tasks = this.getStoredTasks()
    const updatedTasks = tasks.filter(t => t.id !== taskId)
    this.setTasks(updatedTasks)
  }

  // Get today's tasks
  async getTodayTasks(): Promise<Task[]> {
    return this.getStoredTasks()
  }

  // Complete a task instance (for daily tasks)
  async completeTaskInstance(taskId: string, completedBy: string, completedByName: string): Promise<void> {
    await this.completeTask(taskId, {
      completed_by: completedBy,
      completed_by_name: completedByName
    })
  }

  // Initialize daily system
  async initializeDailySystem(createdBy: string): Promise<void> {
    // Already initialized in generateDefaultTasks
    console.log('Mock daily system initialized')
  }

  // Check daily tasks
  async checkDailyTasks(): Promise<{ created: number; date: string }> {
    // Mock implementation - no new tasks needed
    return {
      created: 0,
      date: new Date().toISOString().split('T')[0]
    }
  }

  // Get service status
  getServiceStatus() {
    return {
      is_mock_mode: true,
      backend_connected: false,
      family_id: this.familyId,
      last_sync: new Date().toISOString()
    }
  }
}

export const mockTaskService = new MockTaskService()