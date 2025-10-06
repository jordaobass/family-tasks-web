'use client'

import { collection, getDocs } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { dailyTaskService } from '@/services/daily-task-service'

export class FamilyBatchService {
  // Get all family IDs from Firestore
  async getAllFamilyIds(): Promise<string[]> {
    try {
      const familiesCollection = collection(db, 'families')
      const snapshot = await getDocs(familiesCollection)

      const familyIds: string[] = []
      snapshot.forEach((doc) => {
        familyIds.push(doc.id)
      })

      console.log(`Found ${familyIds.length} families`)
      return familyIds
    } catch (error) {
      console.error('Error getting family IDs:', error)
      throw error
    }
  }

  // Process daily tasks for all families
  async processAllFamiliesDailyTasks(): Promise<{
    totalFamilies: number
    processedFamilies: number
    totalTasksCreated: number
    errors: string[]
  }> {
    try {
      const familyIds = await this.getAllFamilyIds()

      const results = {
        totalFamilies: familyIds.length,
        processedFamilies: 0,
        totalTasksCreated: 0,
        errors: [] as string[]
      }

      console.log(`🔄 Processing daily tasks for ${familyIds.length} families...`)

      // Process each family
      for (const familyId of familyIds) {
        try {
          console.log(`Processing family: ${familyId}`)

          // Set family ID and generate tasks
          dailyTaskService.setFamilyId(familyId)
          const result = await dailyTaskService.checkAndGenerateDailyTasks()

          results.processedFamilies++
          results.totalTasksCreated += result.created

          if (result.created > 0) {
            console.log(`✅ Family ${familyId}: Created ${result.created} tasks`)
          } else {
            console.log(`ℹ️ Family ${familyId}: No new tasks needed`)
          }

        } catch (error: unknown) {
          const message = error instanceof Error ? error.message : String(error)
          const errorMessage = `Family ${familyId}: ${message}`
          results.errors.push(errorMessage)
          console.error(`❌ ${errorMessage}`)
        }
      }

      console.log(`🏁 Completed processing ${results.processedFamilies}/${results.totalFamilies} families`)
      console.log(`📊 Total tasks created: ${results.totalTasksCreated}`)

      if (results.errors.length > 0) {
        console.log(`⚠️ ${results.errors.length} errors occurred:`, results.errors)
      }

      return results

    } catch (error) {
      console.error('❌ Error in processAllFamiliesDailyTasks:', error)
      throw error
    }
  }

  // Test method to check if a specific family has active templates
  async checkFamilyTemplates(familyId: string): Promise<{
    familyId: string
    activeTemplates: number
    dailyTemplates: number
    needsProcessing: boolean
  }> {
    try {
      dailyTaskService.setFamilyId(familyId)

      const activeTemplates = await dailyTaskService.getActiveTemplates()
      const dailyTemplates = await dailyTaskService.getDailyTemplates()

      return {
        familyId,
        activeTemplates: activeTemplates.length,
        dailyTemplates: dailyTemplates.length,
        needsProcessing: dailyTemplates.length > 0
      }
    } catch (error) {
      console.error(`Error checking family ${familyId} templates:`, error)
      throw error
    }
  }
}

export const familyBatchService = new FamilyBatchService()