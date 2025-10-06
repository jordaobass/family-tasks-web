import {
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  getDocs,
  query,
  where,
  orderBy,
  onSnapshot,
  serverTimestamp,
  Timestamp
} from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { TaskTemplate, TaskInstance } from '@/types/task.types'

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
  family_id: string // New field for family-based permissions
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

// Helper function to convert Firestore timestamps to Date
const convertTimestamp = (timestamp: Timestamp | Date | string | number): Date => {
  if (timestamp instanceof Timestamp) {
    return timestamp.toDate()
  }
  if (timestamp instanceof Date) {
    return timestamp
  }
  return new Date(timestamp)
}

class FirestoreTaskService {
  private familyId: string = ''

  // Set family ID for all operations
  setFamilyId(familyId: string) {
    this.familyId = familyId
  }

  // Get collection reference for family tasks
  private getTasksCollection() {
    if (!this.familyId) {
      throw new Error('Family ID not set. Please authenticate first.')
    }
    return collection(db, 'families', this.familyId, 'tasks')
  }

  // Get all tasks for the family
  async getTasks(filters?: {
    status?: 'pending' | 'completed'
    assigned_to?: string
    category?: string
  }): Promise<Task[]> {
    try {
      let q = query(
        this.getTasksCollection(),
        orderBy('created_at', 'desc')
      )

      // Apply filters
      if (filters?.status) {
        q = query(q, where('status', '==', filters.status))
      }

      if (filters?.category) {
        q = query(q, where('category', '==', filters.category))
      }

      const querySnapshot = await getDocs(q)
      const tasks: Task[] = []

      querySnapshot.forEach((doc) => {
        const data = doc.data()
        const task: Task = {
          id: doc.id,
          name: data.name,
          icon: data.icon,
          points: data.points || 0,
          status: data.status || 'pending',
          completed_by: data.completed_by,
          completed_by_name: data.completed_by_name,
          completed_at: data.completed_at ? convertTimestamp(data.completed_at) : undefined,
          category: data.category,
          difficulty: data.difficulty,
          estimated_time: data.estimated_time,
          created_at: convertTimestamp(data.created_at),
          updated_at: convertTimestamp(data.updated_at),
          created_by: data.created_by,
          assigned_to: data.assigned_to || [],
          recurrence: data.recurrence || 'none',
          family_id: this.familyId
        }

        // Apply client-side filters that are harder to do in Firestore
        if (filters?.assigned_to) {
          if (task.assigned_to?.includes(filters.assigned_to) ||
              task.completed_by === filters.assigned_to) {
            tasks.push(task)
          }
        } else {
          tasks.push(task)
        }
      })

      return tasks
    } catch (error) {
      console.error('Error fetching tasks:', error)
      throw error
    }
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
    try {
      let q = query(
        this.getTasksCollection(),
        orderBy('created_at', 'desc')
      )

      // Apply filters
      if (filters?.status) {
        q = query(q, where('status', '==', filters.status))
      }

      if (filters?.category) {
        q = query(q, where('category', '==', filters.category))
      }

      return onSnapshot(q, (querySnapshot) => {
        const tasks: Task[] = []

        querySnapshot.forEach((doc) => {
          const data = doc.data()
          const task: Task = {
            id: doc.id,
            name: data.name,
            icon: data.icon,
            points: data.points || 0,
            status: data.status || 'pending',
            completed_by: data.completed_by,
            completed_by_name: data.completed_by_name,
            completed_at: data.completed_at ? convertTimestamp(data.completed_at) : undefined,
            category: data.category,
            difficulty: data.difficulty,
            estimated_time: data.estimated_time,
            created_at: convertTimestamp(data.created_at),
            updated_at: convertTimestamp(data.updated_at),
            created_by: data.created_by,
            assigned_to: data.assigned_to || [],
            recurrence: data.recurrence || 'none',
            family_id: this.familyId
          }

          // Apply client-side filters
          if (filters?.assigned_to) {
            if (task.assigned_to?.includes(filters.assigned_to) ||
                task.completed_by === filters.assigned_to) {
              tasks.push(task)
            }
          } else {
            tasks.push(task)
          }
        })

        callback(tasks)
      })
    } catch (error) {
      console.error('Error subscribing to tasks:', error)
      throw error
    }
  }

  // Create new task
  async createTask(request: CreateTaskRequest, createdBy: string): Promise<Task> {
    try {
      const taskData = {
        ...request,
        status: 'pending',
        created_at: serverTimestamp(),
        updated_at: serverTimestamp(),
        created_by: createdBy,
        recurrence: request.recurrence || 'none',
        assigned_to: request.assigned_to || []
      }

      const docRef = await addDoc(this.getTasksCollection(), taskData)

      // Return the created task
      const newTask: Task = {
        id: docRef.id,
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

      return newTask
    } catch (error) {
      console.error('Error creating task:', error)
      throw error
    }
  }

  // Complete task
  async completeTask(taskId: string, request: CompleteTaskRequest): Promise<Task> {
    try {
      const taskRef = doc(this.getTasksCollection(), taskId)

      await updateDoc(taskRef, {
        status: 'completed',
        completed_by: request.completed_by,
        completed_by_name: request.completed_by_name,
        completed_at: serverTimestamp(),
        updated_at: serverTimestamp()
      })

      // Get updated task
      const tasks = await this.getTasks()
      const updatedTask = tasks.find(t => t.id === taskId)

      if (!updatedTask) {
        throw new Error('Task not found after update')
      }

      return updatedTask
    } catch (error) {
      console.error('Error completing task:', error)
      throw error
    }
  }

  // Uncomplete task (move back to pending)
  async uncompleteTask(taskId: string): Promise<Task> {
    try {
      const taskRef = doc(this.getTasksCollection(), taskId)

      await updateDoc(taskRef, {
        status: 'pending',
        completed_by: null,
        completed_by_name: null,
        completed_at: null,
        updated_at: serverTimestamp()
      })

      // Get updated task
      const tasks = await this.getTasks()
      const updatedTask = tasks.find(t => t.id === taskId)

      if (!updatedTask) {
        throw new Error('Task not found after update')
      }

      return updatedTask
    } catch (error) {
      console.error('Error uncompleting task:', error)
      throw error
    }
  }

  // Delete task
  async deleteTask(taskId: string): Promise<void> {
    try {
      const taskRef = doc(this.getTasksCollection(), taskId)
      await deleteDoc(taskRef)
    } catch (error) {
      console.error('Error deleting task:', error)
      throw error
    }
  }

  // Get task statistics
  async getTaskStats(): Promise<TaskStats> {
    try {
      const tasks = await this.getTasks()

      const total_tasks = tasks.length
      const completed_tasks = tasks.filter(t => t.status === 'completed').length
      const pending_tasks = total_tasks - completed_tasks
      const completion_rate = total_tasks > 0 ? Math.round((completed_tasks / total_tasks) * 100) : 0

      const total_points_earned = tasks
        .filter(t => t.status === 'completed')
        .reduce((sum, t) => sum + t.points, 0)

      const tasks_by_category: Record<string, number> = {}
      const tasks_by_user: Record<string, number> = {}

      tasks.forEach(task => {
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
        avg_completion_time: 15, // Could be calculated from actual data
        tasks_by_category,
        tasks_by_user
      }
    } catch (error) {
      console.error('Error getting task stats:', error)
      throw error
    }
  }

  // Initialize default tasks for a new family
  async initializeDefaultTasks(createdBy: string): Promise<void> {
    const defaultTasks = [
      // Kids tasks
      { name: 'Escovar Dentes (Manhã)', icon: '🦷', points: 10, category: 'higiene' },
      { name: 'Escovar Dentes (Noite)', icon: '🌙', points: 10, category: 'higiene' },
      { name: 'Tomar Banho', icon: '🚿', points: 15, category: 'higiene' },
      { name: 'Arrumar a Cama', icon: '🛏️', points: 10, category: 'organização' },
      { name: 'Tomar Café', icon: '🥣', points: 5, category: 'alimentação' },
      { name: 'Fazer Lição de Casa', icon: '📚', points: 20, category: 'estudos' },
      { name: 'Guardar Brinquedos', icon: '🧸', points: 10, category: 'organização' },
      { name: 'Alimentar o Pet', icon: '🐕', points: 10, category: 'cuidados' },
      { name: 'Limpar o Quarto', icon: '🧹', points: 15, category: 'organização' },

      // Adult tasks
      { name: 'Lavar Roupas', icon: '👔', points: 0, category: 'casa' },
      { name: 'Lavar Louça', icon: '🍽️', points: 0, category: 'casa' },
      { name: 'Aspirar a Casa', icon: '🧹', points: 0, category: 'casa' },
      { name: 'Fazer Compras', icon: '🛒', points: 0, category: 'casa' },
      { name: 'Preparar Almoço', icon: '🍳', points: 0, category: 'casa' },
      { name: 'Preparar Jantar', icon: '🍽️', points: 0, category: 'casa' }
    ]

    try {
      const promises = defaultTasks.map(task =>
        this.createTask({
          ...task,
          difficulty: 'easy',
          recurrence: task.points > 0 ? 'daily' : 'weekly'
        }, createdBy)
      )

      await Promise.all(promises)
    } catch (error) {
      console.error('Error initializing default tasks:', error)
      throw error
    }
  }

  // Get today's tasks (simplified version)
  async getTodayTasks(): Promise<Task[]> {
    try {
      // Just return all tasks for now
      return this.getTasks()
    } catch (error) {
      console.error('Error getting today tasks:', error)
      return []
    }
  }

  // Complete a task instance (simplified version)
  async completeTaskInstance(taskId: string, completedBy: string, completedByName: string): Promise<void> {
    try {
      // Handle regular tasks
      await this.completeTask(taskId, { completed_by: completedBy, completed_by_name: completedByName })
    } catch (error) {
      console.error('Error completing task instance:', error)
      throw error
    }
  }

  // Initialize daily task system (simplified)
  async initializeDailySystem(createdBy: string): Promise<void> {
    try {
      await this.initializeDefaultTasks(createdBy)
      console.log('Task system initialized')
    } catch (error) {
      console.error('Error initializing task system:', error)
      throw error
    }
  }

  // Check and generate daily tasks manually (simplified)
  async checkDailyTasks(): Promise<{ created: number; date: string }> {
    try {
      // Simple implementation - just return success
      return {
        created: 0,
        date: new Date().toISOString().split('T')[0]
      }
    } catch (error) {
      console.error('Error checking daily tasks:', error)
      throw error
    }
  }

  // Get tasks for a specific date range
  async getTasksForPeriod(startDate: string, endDate: string): Promise<Task[]> {
    try {
      const q = query(
        this.getTasksCollection(),
        orderBy('created_at', 'desc')
      )

      const querySnapshot = await getDocs(q)
      const tasks: Task[] = []

      querySnapshot.forEach((doc) => {
        const data = doc.data()
        const taskDate = convertTimestamp(data.created_at).toISOString().split('T')[0]

        if (taskDate >= startDate && taskDate <= endDate) {
          const task: Task = {
            id: doc.id,
            name: data.name,
            icon: data.icon,
            points: data.points || 0,
            status: data.status || 'pending',
            completed_by: data.completed_by,
            completed_by_name: data.completed_by_name,
            completed_at: data.completed_at ? convertTimestamp(data.completed_at) : undefined,
            category: data.category,
            difficulty: data.difficulty,
            estimated_time: data.estimated_time,
            created_at: convertTimestamp(data.created_at),
            updated_at: convertTimestamp(data.updated_at),
            created_by: data.created_by,
            assigned_to: data.assigned_to || [],
            recurrence: data.recurrence || 'none',
            family_id: this.familyId
          }
          tasks.push(task)
        }
      })

      return tasks
    } catch (error) {
      console.error('Error fetching tasks for period:', error)
      throw error
    }
  }

  // Get historical statistics with date comparison
  async getHistoricalStats(currentPeriod: { start: string; end: string }, previousPeriod: { start: string; end: string }): Promise<{
    current: TaskStats;
    previous: TaskStats;
  }> {
    try {
      const [currentTasks, previousTasks] = await Promise.all([
        this.getTasksForPeriod(currentPeriod.start, currentPeriod.end),
        this.getTasksForPeriod(previousPeriod.start, previousPeriod.end)
      ])

      const calculateStats = (tasks: Task[]): TaskStats => {
        const total_tasks = tasks.length
        const completed_tasks = tasks.filter(t => t.status === 'completed').length
        const pending_tasks = total_tasks - completed_tasks
        const completion_rate = total_tasks > 0 ? Math.round((completed_tasks / total_tasks) * 100) : 0

        const total_points_earned = tasks
          .filter(t => t.status === 'completed')
          .reduce((sum, t) => sum + t.points, 0)

        const tasks_by_category: Record<string, number> = {}
        const tasks_by_user: Record<string, number> = {}

        tasks.forEach(task => {
          if (task.category) {
            const categoryKey = task.category
            tasks_by_category[categoryKey] = (tasks_by_category[categoryKey] || 0) + 1
          }

          if (task.completed_by) {
            tasks_by_user[task.completed_by] = (tasks_by_user[task.completed_by] || 0) + 1
          }
        })

        const completedTasksWithTime = tasks.filter(t =>
          t.status === 'completed' &&
          t.completed_at &&
          t.estimated_time
        )

        const avg_completion_time = completedTasksWithTime.length > 0
          ? completedTasksWithTime.reduce((sum, t) => sum + (t.estimated_time || 0), 0) / completedTasksWithTime.length
          : 0

        return {
          total_tasks,
          completed_tasks,
          pending_tasks,
          completion_rate,
          total_points_earned,
          avg_completion_time,
          tasks_by_category,
          tasks_by_user
        }
      }

      return {
        current: calculateStats(currentTasks),
        previous: calculateStats(previousTasks)
      }
    } catch (error) {
      console.error('Error getting historical stats:', error)
      throw error
    }
  }

  // Get service status
  getServiceStatus() {
    return {
      is_mock_mode: false,
      backend_connected: true,
      family_id: this.familyId,
      last_sync: new Date().toISOString()
    }
  }
}

export const firestoreTaskService = new FirestoreTaskService()