import { NextResponse } from 'next/server'
import { firestoreTaskService } from '@/services/firestore-task-service'

export async function GET() {
  try {
    console.log('🧪 Testando operações de tarefas...')

    // Set family ID for testing
    const testFamilyId = 'test_family_123'
    firestoreTaskService.setFamilyId(testFamilyId)

    // Test 1: Create a task
    console.log('🧪 Teste 1: Criando uma tarefa...')
    const newTask = await firestoreTaskService.createTask({
      name: 'Tarefa de Teste',
      icon: '🧪',
      points: 10,
      category: 'test',
      difficulty: 'easy',
      estimated_time: 15,
      recurrence: 'daily'
    }, 'test_user')

    console.log('✅ Tarefa criada:', newTask.id)

    // Test 2: Get tasks
    console.log('🧪 Teste 2: Carregando tarefas...')
    const tasks = await firestoreTaskService.getTasks()
    console.log('✅ Tarefas carregadas:', tasks.length)

    // Test 3: Initialize daily system
    console.log('🧪 Teste 3: Inicializando sistema diário...')
    await firestoreTaskService.initializeDailySystem('test_user')
    console.log('✅ Sistema diário inicializado')

    // Test 4: Get today's tasks
    console.log('🧪 Teste 4: Carregando tarefas de hoje...')
    const todayTasks = await firestoreTaskService.getTodayTasks()
    console.log('✅ Tarefas de hoje:', todayTasks.length)

    return NextResponse.json({
      success: true,
      message: 'Todos os testes de tarefas passaram!',
      results: {
        taskCreated: { success: true, taskId: newTask.id },
        tasksLoaded: { success: true, count: tasks.length },
        dailySystemInit: { success: true },
        todayTasksLoaded: { success: true, count: todayTasks.length }
      },
      data: {
        allTasks: tasks,
        todayTasks: todayTasks
      },
      timestamp: new Date().toISOString()
    })

  } catch (error: unknown) {
    console.error('❌ Erro nos testes de tarefas:', error)
    const message = error instanceof Error ? error.message : String(error)
    const code = error && typeof error === 'object' && 'code' in error ? String(error.code) : undefined
    const stack = error instanceof Error ? error.stack : undefined

    return NextResponse.json({
      success: false,
      error: message,
      code,
      stack,
      details: String(error),
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}