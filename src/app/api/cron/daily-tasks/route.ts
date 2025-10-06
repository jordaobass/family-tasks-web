import { NextRequest, NextResponse } from 'next/server'
import { familyBatchService } from '@/services/family-batch-service'
import { dailyTaskService } from '@/services/daily-task-service'

// API endpoint para gerar tarefas diárias automaticamente
// Chamado automaticamente às 00:00 pelo Vercel Cron
export async function POST(req: NextRequest) {
  const startTime = new Date()

  try {
    console.log('🕐 Executando geração automática de tarefas diárias...', startTime.toISOString())

    // Get authorization header for basic security
    const authHeader = req.headers.get('authorization')
    const expectedToken = process.env.CRON_SECRET_TOKEN || 'default_secret_token'

    // Skip auth check in development
    if (process.env.NODE_ENV === 'production' && authHeader !== `Bearer ${expectedToken}`) {
      return NextResponse.json({
        success: false,
        error: 'Unauthorized'
      }, { status: 401 })
    }

    // Check if this is for a specific family (optional parameter)
    const familyId = req.nextUrl.searchParams.get('familyId')

    let results

    if (familyId) {
      // Process single family
      console.log(`🎯 Processing single family: ${familyId}`)

      try {
        dailyTaskService.setFamilyId(familyId)
        const result = await dailyTaskService.checkAndGenerateDailyTasks()

        results = {
          totalFamilies: 1,
          processedFamilies: 1,
          totalTasksCreated: result.created,
          errors: [],
          familyId,
          date: result.date
        }

        console.log(`✅ Family ${familyId}: Created ${result.created} tasks for ${result.date}`)
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error)
        results = {
          totalFamilies: 1,
          processedFamilies: 0,
          totalTasksCreated: 0,
          errors: [`Family ${familyId}: ${message}`],
          familyId
        }
      }
    } else {
      // Process all families
      console.log('🌍 Processing all families...')
      results = await familyBatchService.processAllFamiliesDailyTasks()
    }

    const endTime = new Date()
    const duration = endTime.getTime() - startTime.getTime()

    console.log(`🏁 Processamento concluído em ${duration}ms`)

    return NextResponse.json({
      success: true,
      message: 'Daily tasks generation completed',
      results: {
        ...results,
        executionTime: `${duration}ms`,
        startTime: startTime.toISOString(),
        endTime: endTime.toISOString()
      },
      timestamp: new Date().toISOString()
    })

  } catch (error: unknown) {
    console.error('❌ Error in daily tasks cron job:', error)
    const message = error instanceof Error ? error.message : String(error)

    return NextResponse.json({
      success: false,
      error: message,
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}

// Health check endpoint
export async function GET() {
  return NextResponse.json({
    success: true,
    message: 'Daily tasks cron endpoint is healthy',
    timestamp: new Date().toISOString()
  })
}