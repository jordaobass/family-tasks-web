'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import Link from 'next/link'

interface DailyTaskResults {
  totalFamilies?: number
  processedFamilies?: number
  totalTasksCreated?: number
  executionTime?: string
  startTime?: string
  endTime?: string
  errors?: string[]
}

interface ApiResponse {
  success: boolean
  results?: DailyTaskResults
  error?: string
}

export default function DailyTasksAdminPage() {
  const [loading, setLoading] = useState(false)
  const [results, setResults] = useState<ApiResponse | null>(null)
  const [error, setError] = useState<string | null>(null)

  const testDailyTasksGeneration = async (familyId?: string) => {
    setLoading(true)
    setError(null)
    setResults(null)

    try {
      const url = familyId
        ? `/api/cron/daily-tasks?familyId=${familyId}`
        : '/api/cron/daily-tasks'

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          // In development, no auth token needed
        }
      })

      const data = await response.json()

      if (data.success) {
        setResults(data)
        console.log('✅ Teste concluído:', data)
      } else {
        setError(data.error || 'Erro desconhecido')
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err)
      setError(`Erro na requisição: ${message}`)
      console.error('❌ Erro no teste:', err)
    } finally {
      setLoading(false)
    }
  }

  const testSpecificFamily = () => {
    const familyId = prompt('Digite o ID da família para testar:')
    if (familyId) {
      testDailyTasksGeneration(familyId)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-pink-50">
      {/* Header */}
      <div className="bg-white/80 backdrop-blur-sm border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center space-x-4">
            <Link
              href="/"
              className="inline-flex items-center px-4 py-2 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium transition-colors"
            >
              ← Voltar
            </Link>
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-2xl">🔧</span>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
                  Admin - Tarefas Diárias
                </h1>
              </div>
              <p className="text-gray-600 text-sm">
                Teste e monitore o sistema de geração automática de tarefas
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

        {/* Test Buttons */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 mb-8">
          <h2 className="text-lg font-bold text-gray-900 mb-4">🧪 Testes do Sistema</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Button
              onClick={() => testDailyTasksGeneration()}
              disabled={loading}
              className="w-full h-12"
            >
              {loading ? '⏳ Processando...' : '🌍 Processar Todas as Famílias'}
            </Button>

            <Button
              onClick={testSpecificFamily}
              disabled={loading}
              variant="outline"
              className="w-full h-12"
            >
              {loading ? '⏳ Processando...' : '🎯 Testar Família Específica'}
            </Button>
          </div>

          <div className="mt-4 p-4 bg-yellow-50 rounded-lg">
            <h3 className="font-semibold text-yellow-800 mb-2">ℹ️ Como Funciona:</h3>
            <ul className="text-yellow-700 text-sm space-y-1">
              <li>• <strong>Processamento automático:</strong> Executa todos os dias às 00:00 UTC</li>
              <li>• <strong>Busca templates:</strong> Encontra templates com recurrence=&quot;daily&quot;</li>
              <li>• <strong>Verifica instâncias:</strong> Checa se já existem tarefas para hoje</li>
              <li>• <strong>Cria instâncias:</strong> Gera novas tarefas apenas se necessário</li>
              <li>• <strong>Cliente também verifica:</strong> Hook roda no navegador como backup</li>
            </ul>
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <div className="bg-white rounded-2xl shadow-sm border border-red-200 p-6 mb-8">
            <h3 className="text-lg font-bold text-red-800 mb-4">❌ Erro</h3>
            <pre className="text-red-700 text-sm bg-red-50 p-4 rounded-lg overflow-auto">
              {error}
            </pre>
          </div>
        )}

        {/* Results Display */}
        {results && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-4">📊 Resultados</h3>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div className="bg-blue-50 rounded-lg p-4 text-center">
                <div className="text-2xl font-bold text-blue-600">
                  {results.results?.totalFamilies || 0}
                </div>
                <div className="text-blue-700 text-sm">Famílias Total</div>
              </div>

              <div className="bg-green-50 rounded-lg p-4 text-center">
                <div className="text-2xl font-bold text-green-600">
                  {results.results?.processedFamilies || 0}
                </div>
                <div className="text-green-700 text-sm">Processadas</div>
              </div>

              <div className="bg-purple-50 rounded-lg p-4 text-center">
                <div className="text-2xl font-bold text-purple-600">
                  {results.results?.totalTasksCreated || 0}
                </div>
                <div className="text-purple-700 text-sm">Tarefas Criadas</div>
              </div>
            </div>

            {/* Execution Info */}
            <div className="bg-gray-50 rounded-lg p-4 mb-4">
              <h4 className="font-semibold text-gray-700 mb-2">⏱️ Informações de Execução:</h4>
              <div className="text-sm text-gray-600 space-y-1">
                <div><strong>Tempo:</strong> {results.results?.executionTime}</div>
                <div><strong>Início:</strong> {results.results?.startTime ? new Date(results.results.startTime).toLocaleString() : 'N/A'}</div>
                <div><strong>Fim:</strong> {results.results?.endTime ? new Date(results.results.endTime).toLocaleString() : 'N/A'}</div>
              </div>
            </div>

            {/* Errors */}
            {results.results?.errors && results.results.errors.length > 0 && (
              <div className="bg-red-50 rounded-lg p-4 mb-4">
                <h4 className="font-semibold text-red-700 mb-2">⚠️ Erros ({results.results.errors.length}):</h4>
                <ul className="text-red-600 text-sm space-y-1">
                  {results.results.errors.map((error: string, index: number) => (
                    <li key={index}>• {error}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Raw JSON */}
            <details className="mt-4">
              <summary className="cursor-pointer font-semibold text-gray-700 hover:text-gray-900">
                🔍 Ver JSON Completo
              </summary>
              <pre className="mt-2 text-xs bg-gray-100 p-4 rounded-lg overflow-auto max-h-96">
                {JSON.stringify(results, null, 2)}
              </pre>
            </details>
          </div>
        )}

        {/* System Info */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 mt-8">
          <h3 className="text-lg font-bold text-gray-900 mb-4">⚙️ Configuração do Sistema</h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-semibold text-gray-700 mb-2">🔄 Automação Servidor (Produção)</h4>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• <strong>Vercel Cron:</strong> Executa às 00:00 UTC</li>
                <li>• <strong>Endpoint:</strong> /api/cron/daily-tasks</li>
                <li>• <strong>Processa:</strong> Todas as famílias automaticamente</li>
                <li>• <strong>Confiável:</strong> Executa mesmo sem usuários online</li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold text-gray-700 mb-2">🖥️ Hook Cliente (Backup)</h4>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• <strong>useDailyTasksScheduler:</strong> Hook React</li>
                <li>• <strong>Execução:</strong> Quando usuário abre app</li>
                <li>• <strong>Agendamento:</strong> setTimeout até meia-noite</li>
                <li>• <strong>Backup:</strong> Caso servidor falhe</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}