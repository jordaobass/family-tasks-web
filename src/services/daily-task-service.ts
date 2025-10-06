'use client'

import {
  collection,
  doc,
  addDoc,
  updateDoc,
  getDocs,
  query,
  where,
  orderBy,
  serverTimestamp,
  Timestamp,
  writeBatch
} from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { TaskTemplate, TaskInstance, DailyTaskCheck, RecurrenceType } from '@/types/task.types'

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

// Helper to get today's date in YYYY-MM-DD format
const getTodayString = (): string => {
  return new Date().toISOString().split('T')[0]
}

export class DailyTaskService {
  private familyId: string = ''

  // Set family ID for all operations
  setFamilyId(familyId: string) {
    this.familyId = familyId
  }

  // Get collection references
  private getTemplatesCollection() {
    if (!this.familyId) throw new Error('Family ID not set')
    return collection(db, 'families', this.familyId, 'task_templates')
  }

  private getInstancesCollection() {
    if (!this.familyId) throw new Error('Family ID not set')
    return collection(db, 'families', this.familyId, 'task_instances')
  }

  private getChecksCollection() {
    if (!this.familyId) throw new Error('Family ID not set')
    return collection(db, 'families', this.familyId, 'daily_checks')
  }

  // Create task template
  async createTemplate(template: Omit<TaskTemplate, 'id' | 'created_at' | 'updated_at' | 'family_id'>): Promise<TaskTemplate> {
    try {
      const templateData = {
        ...template,
        created_at: serverTimestamp(),
        updated_at: serverTimestamp(),
        family_id: this.familyId
      }

      const docRef = await addDoc(this.getTemplatesCollection(), templateData)

      return {
        id: docRef.id,
        ...template,
        created_at: new Date(),
        updated_at: new Date(),
        family_id: this.familyId
      }
    } catch (error) {
      console.error('Error creating task template:', error)
      throw error
    }
  }

  // Get all active templates
  async getActiveTemplates(): Promise<TaskTemplate[]> {
    try {
      const q = query(
        this.getTemplatesCollection(),
        where('is_active', '==', true),
        orderBy('created_at', 'desc')
      )

      const snapshot = await getDocs(q)
      const templates: TaskTemplate[] = []

      snapshot.forEach((doc) => {
        const data = doc.data()
        templates.push({
          id: doc.id,
          name: data.name,
          icon: data.icon,
          points: data.points,
          category: data.category,
          difficulty: data.difficulty,
          estimated_time: data.estimated_time,
          recurrence: data.recurrence,
          is_active: data.is_active,
          created_at: convertTimestamp(data.created_at),
          updated_at: convertTimestamp(data.updated_at),
          created_by: data.created_by,
          family_id: data.family_id
        })
      })

      return templates
    } catch (error) {
      console.error('Error fetching templates:', error)
      throw error
    }
  }

  // Get daily templates that should repeat
  async getDailyTemplates(): Promise<TaskTemplate[]> {
    try {
      const q = query(
        this.getTemplatesCollection(),
        where('is_active', '==', true),
        where('recurrence', '==', 'daily' as RecurrenceType)
      )

      const snapshot = await getDocs(q)
      const templates: TaskTemplate[] = []

      snapshot.forEach((doc) => {
        const data = doc.data()
        templates.push({
          id: doc.id,
          name: data.name,
          icon: data.icon,
          points: data.points,
          category: data.category,
          difficulty: data.difficulty,
          estimated_time: data.estimated_time,
          recurrence: data.recurrence,
          is_active: data.is_active,
          created_at: convertTimestamp(data.created_at),
          updated_at: convertTimestamp(data.updated_at),
          created_by: data.created_by,
          family_id: data.family_id
        })
      })

      return templates
    } catch (error) {
      console.error('Error fetching daily templates:', error)
      throw error
    }
  }

  // Get task instances for a specific date
  async getInstancesForDate(date: string): Promise<TaskInstance[]> {
    try {
      const q = query(
        this.getInstancesCollection(),
        where('assigned_date', '==', date),
        orderBy('created_at', 'desc')
      )

      const snapshot = await getDocs(q)
      const instances: TaskInstance[] = []

      snapshot.forEach((doc) => {
        const data = doc.data()
        instances.push({
          id: doc.id,
          template_id: data.template_id,
          assigned_date: data.assigned_date,
          status: data.status,
          completed_by: data.completed_by,
          completed_by_name: data.completed_by_name,
          completed_at: data.completed_at ? convertTimestamp(data.completed_at) : undefined,
          points_earned: data.points_earned,
          created_at: convertTimestamp(data.created_at),
          family_id: data.family_id
        })
      })

      return instances
    } catch (error) {
      console.error('Error fetching instances for date:', error)
      throw error
    }
  }

  // Create task instance from template
  async createInstanceFromTemplate(template: TaskTemplate, assignedDate: string): Promise<TaskInstance> {
    try {
      const instanceData = {
        template_id: template.id,
        assigned_date: assignedDate,
        status: 'pending' as const,
        created_at: serverTimestamp(),
        family_id: this.familyId
      }

      const docRef = await addDoc(this.getInstancesCollection(), instanceData)

      return {
        id: docRef.id,
        template_id: template.id,
        assigned_date: assignedDate,
        status: 'pending',
        created_at: new Date(),
        family_id: this.familyId
      }
    } catch (error) {
      console.error('Error creating task instance:', error)
      throw error
    }
  }

  // Main function: Check and generate daily tasks
  async checkAndGenerateDailyTasks(): Promise<{ created: number; date: string }> {
    const today = getTodayString()

    try {
      // Get daily templates
      const dailyTemplates = await this.getDailyTemplates()
      console.log(`Found ${dailyTemplates.length} daily templates`)

      // Get existing instances for today
      const todayInstances = await this.getInstancesForDate(today)
      console.log(`Found ${todayInstances.length} existing instances for today`)

      // Find templates that don't have instances for today
      const missingTemplates = dailyTemplates.filter(template =>
        !todayInstances.some(instance => instance.template_id === template.id)
      )

      console.log(`Need to create ${missingTemplates.length} new instances`)

      // Create batch for multiple operations
      const batch = writeBatch(db)
      let createdCount = 0

      // Create instances for missing templates
      for (const template of missingTemplates) {
        try {
          const instanceRef = doc(this.getInstancesCollection())
          batch.set(instanceRef, {
            template_id: template.id,
            assigned_date: today,
            status: 'pending',
            created_at: serverTimestamp(),
            family_id: this.familyId
          })
          createdCount++
        } catch (error) {
          console.error(`Error preparing instance for template ${template.id}:`, error)
        }
      }

      // Record the check
      const checkRef = doc(this.getChecksCollection())
      batch.set(checkRef, {
        date: today,
        templates_checked: dailyTemplates.map(t => t.id),
        instances_created: createdCount,
        last_check: serverTimestamp()
      })

      // Execute batch
      if (createdCount > 0) {
        await batch.commit()
        console.log(`Successfully created ${createdCount} daily task instances for ${today}`)
      }

      return { created: createdCount, date: today }
    } catch (error) {
      console.error('Error in checkAndGenerateDailyTasks:', error)
      throw error
    }
  }

  // Get combined view: templates with their today's instances
  async getTodayTasksView(): Promise<Array<TaskTemplate & { instance?: TaskInstance }>> {
    const today = getTodayString()

    try {
      // First ensure daily tasks are generated
      await this.checkAndGenerateDailyTasks()

      // Get all active templates
      const templates = await this.getActiveTemplates()

      // Get today's instances
      const todayInstances = await this.getInstancesForDate(today)

      // Combine templates with their instances
      const tasksView = templates.map(template => {
        const instance = todayInstances.find(i => i.template_id === template.id)
        return {
          ...template,
          instance
        }
      })

      return tasksView
    } catch (error) {
      console.error('Error getting today tasks view:', error)
      throw error
    }
  }

  // Update task template
  async updateTemplate(templateId: string, updates: Partial<Omit<TaskTemplate, 'id' | 'family_id'>>): Promise<void> {
    try {
      const templateRef = doc(this.getTemplatesCollection(), templateId)
      await updateDoc(templateRef, {
        ...updates,
        updated_at: serverTimestamp()
      })
    } catch (error) {
      console.error('Error updating template:', error)
      throw error
    }
  }

  // Toggle template active status
  async toggleTemplateActive(templateId: string): Promise<void> {
    try {
      const templates = await this.getAllTemplates()
      const template = templates.find(t => t.id === templateId)

      if (!template) {
        throw new Error('Template not found')
      }

      const templateRef = doc(this.getTemplatesCollection(), templateId)
      await updateDoc(templateRef, {
        is_active: !template.is_active,
        updated_at: serverTimestamp()
      })
    } catch (error) {
      console.error('Error toggling template active status:', error)
      throw error
    }
  }

  // Delete template (soft delete by setting is_active to false)
  async deleteTemplate(templateId: string): Promise<void> {
    try {
      const templateRef = doc(this.getTemplatesCollection(), templateId)
      await updateDoc(templateRef, {
        is_active: false,
        updated_at: serverTimestamp()
      })
    } catch (error) {
      console.error('Error deleting template:', error)
      throw error
    }
  }

  // Get all templates (including inactive)
  async getAllTemplates(): Promise<TaskTemplate[]> {
    try {
      const q = query(
        this.getTemplatesCollection(),
        orderBy('created_at', 'desc')
      )

      const snapshot = await getDocs(q)
      const templates: TaskTemplate[] = []

      snapshot.forEach((doc) => {
        const data = doc.data()
        templates.push({
          id: doc.id,
          name: data.name,
          icon: data.icon,
          points: data.points,
          category: data.category,
          difficulty: data.difficulty,
          estimated_time: data.estimated_time,
          recurrence: data.recurrence,
          is_active: data.is_active,
          created_at: convertTimestamp(data.created_at),
          updated_at: convertTimestamp(data.updated_at),
          created_by: data.created_by,
          family_id: data.family_id
        })
      })

      return templates
    } catch (error) {
      console.error('Error fetching all templates:', error)
      throw error
    }
  }

  // Initialize default task templates
  async initializeDefaultTemplates(createdBy: string): Promise<void> {
    const defaultTemplates = [
      // Kids tasks (daily)
      { name: 'Escovar Dentes (Manhã)', icon: '🦷', points: 10, recurrence: 'daily' as const },
      { name: 'Escovar Dentes (Noite)', icon: '🌙', points: 10, recurrence: 'daily' as const },
      { name: 'Tomar Banho', icon: '🚿', points: 15, recurrence: 'daily' as const },
      { name: 'Arrumar a Cama', icon: '🛏️', points: 10, recurrence: 'daily' as const },
      { name: 'Tomar Café', icon: '🥣', points: 5, recurrence: 'daily' as const },
      { name: 'Fazer Lição de Casa', icon: '📚', points: 20, recurrence: 'daily' as const },
      { name: 'Guardar Brinquedos', icon: '🧸', points: 10, recurrence: 'daily' as const },
      { name: 'Alimentar o Pet', icon: '🐕', points: 10, recurrence: 'daily' as const },

      // Weekly tasks
      { name: 'Limpar o Quarto', icon: '🧹', points: 15, recurrence: 'weekly' as const },

      // Adult tasks (weekly)
      { name: 'Lavar Roupas', icon: '👔', points: 0, recurrence: 'weekly' as const },
      { name: 'Lavar Louça', icon: '🍽️', points: 0, recurrence: 'daily' as const },
      { name: 'Aspirar a Casa', icon: '🧹', points: 0, recurrence: 'weekly' as const },
      { name: 'Fazer Compras', icon: '🛒', points: 0, recurrence: 'weekly' as const },
      { name: 'Preparar Almoço', icon: '🍳', points: 0, recurrence: 'daily' as const },
      { name: 'Preparar Jantar', icon: '🍽️', points: 0, recurrence: 'daily' as const }
    ]

    try {
      for (const template of defaultTemplates) {
        await this.createTemplate({
          ...template,
          difficulty: 'easy',
          is_active: true,
          created_by: createdBy
        })
      }
      console.log('Default task templates initialized')
    } catch (error) {
      console.error('Error initializing default templates:', error)
      throw error
    }
  }
}

// Create singleton instance
export const dailyTaskService = new DailyTaskService()