'use client'

/**
 * Painel operacional da geração diária.
 *
 * Duas coisas mudaram em relação à versão anterior:
 * - o disparo manual é o **POST** de `/api/cron/daily-tasks` (o GET passou a ser o
 *   gerador chamado pelo cron da Vercel);
 * - o texto explicativo descrevia um agendador de navegador (`useDailyTasksScheduler`)
 *   que não era montado em página nenhuma. Quem garante o dia hoje é o cron do
 *   servidor às 00:05 (horário de Brasília) e o próprio painel, que gera o dia ao
 *   abrir se ele estiver faltando.
 */

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { DataError, hojeFamilia, useFamilyData, type Day } from '@/data'

/**
 * Campos que a rota pode devolver. Todos opcionais de propósito: o painel mostra
 * o que existir e o JSON bruto sempre, em vez de inventar zeros para o que faltar.
 */
interface ResultadoGeracao {
  totalFamilies?: number
  processedFamilies?: number
  totalTasksCreated?: number
  executionTime?: string
  startTime?: string
  endTime?: string
  errors?: string[]
  familyId?: string
  date?: string
}

interface RespostaApi {
  success?: boolean
  message?: string
  error?: string
  results?: ResultadoGeracao
}

/** Mensagem legível para a tela; a causa real fica registrada no console. */
function mensagemAmigavel(erro: unknown, padrao: string): string {
  console.error(`[admin/daily-tasks] ${padrao}`, erro)
  if (erro instanceof DataError) return erro.message
  if (erro instanceof Error) return `${padrao} (${erro.message})`
  return padrao
}

function mensagemDeFalha(resposta: Response, corpo: RespostaApi): string {
  if (resposta.status === 401 || resposta.status === 403) {
    return 'A rota recusou o disparo manual (não autorizado). Confira a variável CRON_SECRET do ambiente.'
  }
  return corpo.error ?? `A rota respondeu ${resposta.status}.`
}

// ---------------------------------------------------------------------------
// Estado
// ---------------------------------------------------------------------------

function useDisparoManual() {
  const [processando, setProcessando] = useState(false)
  const [resposta, setResposta] = useState<RespostaApi | null>(null)
  const [erro, setErro] = useState<string | null>(null)

  const disparar = async (familyId?: string) => {
    setProcessando(true)
    setErro(null)
    setResposta(null)
    try {
      const alvo = familyId?.trim()
      const url = alvo
        ? `/api/cron/daily-tasks?familyId=${encodeURIComponent(alvo)}`
        : '/api/cron/daily-tasks'
      const requisicao = await fetch(url, { method: 'POST' })
      const corpo: RespostaApi = await requisicao.json()

      if (!requisicao.ok || corpo.success === false) {
        setErro(mensagemDeFalha(requisicao, corpo))
        console.error('[admin/daily-tasks] disparo manual recusado', requisicao.status, corpo)
        return
      }
      setResposta(corpo)
    } catch (falha) {
      setErro(mensagemAmigavel(falha, 'Não foi possível falar com a rota de geração.'))
    } finally {
      setProcessando(false)
    }
  }

  return { processando, resposta, erro, disparar }
}

function useEstadoDeHoje() {
  const dados = useFamilyData()
  const [hoje] = useState(hojeFamilia)
  const [dia, setDia] = useState<Day | null>(null)
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState<string | null>(null)

  const recarregar = useCallback(async () => {
    setCarregando(true)
    try {
      setDia(await dados.getDay(hoje))
      setErro(null)
    } catch (falha) {
      setErro(mensagemAmigavel(falha, 'Não foi possível ler o dia de hoje.'))
    } finally {
      setCarregando(false)
    }
  }, [dados, hoje])

  useEffect(() => {
    void recarregar()
  }, [recarregar])

  return { familyId: dados.familyId, hoje, dia, carregando, erro, recarregar }
}

// ---------------------------------------------------------------------------
// Página
// ---------------------------------------------------------------------------

export default function DailyTasksAdminPage() {
  const disparo = useDisparoManual()
  const estado = useEstadoDeHoje()
  const [familiaAlvo, setFamiliaAlvo] = useState('')

  const dispararEAtualizar = async (familyId?: string) => {
    await disparo.disparar(familyId)
    await estado.recarregar()
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-pink-50">
      <CabecalhoAdmin />
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        <EstadoDeHoje estado={estado} />
        <DisparoManual
          processando={disparo.processando}
          familiaAlvo={familiaAlvo}
          onFamiliaAlvoChange={setFamiliaAlvo}
          onDisparar={dispararEAtualizar}
        />
        <BlocoErro mensagem={disparo.erro} />
        {disparo.resposta && <Resultados resposta={disparo.resposta} />}
        <ComoFunciona />
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Componentes
// ---------------------------------------------------------------------------

function CabecalhoAdmin() {
  return (
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
            <h1 className="text-2xl font-bold text-gray-900">🔧 Admin — geração diária</h1>
            <p className="text-gray-600 text-sm">
              Estado do dia de hoje e disparo manual da geração de tarefas.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

function BlocoErro({ mensagem }: { mensagem: string | null }) {
  if (!mensagem) return null
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-red-200 p-6" role="alert">
      <h2 className="text-lg font-bold text-red-800 mb-2">❌ Não deu certo</h2>
      <p className="text-red-700 text-sm">{mensagem}</p>
    </div>
  )
}

type Estado = ReturnType<typeof useEstadoDeHoje>

function EstadoDeHoje({ estado }: { estado: Estado }) {
  const concluidas = estado.dia?.items.filter((i) => i.status === 'concluida').length ?? 0
  const total = estado.dia?.items.length ?? 0

  return (
    <section className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <h2 className="text-lg font-bold text-gray-900">📅 Hoje ({estado.hoje})</h2>
        <Button variant="outline" onClick={() => void estado.recarregar()} disabled={estado.carregando}>
          {estado.carregando ? '⏳ Lendo...' : '🔄 Atualizar'}
        </Button>
      </div>
      <BlocoErro mensagem={estado.erro} />
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Indicador rotulo="Família" valor={estado.familyId} />
        <Indicador rotulo="Dia gerado" valor={estado.dia ? `sim (${estado.dia.generatedBy})` : 'ainda não'} />
        <Indicador rotulo="Tarefas" valor={estado.dia ? `${concluidas} de ${total} concluídas` : '—'} />
      </div>
      {!estado.carregando && !estado.dia && (
        <p className="mt-4 text-sm text-gray-600">
          O dia ainda não existe. Abrir o painel já o cria; o botão abaixo faz o mesmo pelo servidor.
        </p>
      )}
    </section>
  )
}

function Indicador({ rotulo, valor }: { rotulo: string; valor: string }) {
  return (
    <div className="bg-gray-50 rounded-xl p-4">
      <div className="text-xs uppercase tracking-wide text-gray-500">{rotulo}</div>
      <div className="text-base font-semibold text-gray-900 break-words">{valor}</div>
    </div>
  )
}

function DisparoManual({
  processando,
  familiaAlvo,
  onFamiliaAlvoChange,
  onDisparar,
}: {
  processando: boolean
  familiaAlvo: string
  onFamiliaAlvoChange: (valor: string) => void
  onDisparar: (familyId?: string) => Promise<void>
}) {
  return (
    <section className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
      <h2 className="text-lg font-bold text-gray-900 mb-1">🚀 Disparo manual</h2>
      <p className="text-sm text-gray-600 mb-4">
        Chama <code>POST /api/cron/daily-tasks</code>. É idempotente: se o dia já existe, nada é
        recriado.
      </p>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-end">
        <Button onClick={() => void onDisparar()} disabled={processando} className="w-full h-12">
          {processando ? '⏳ Processando...' : '🌍 Gerar para todas as famílias'}
        </Button>
        <div className="space-y-2">
          <Label htmlFor="familia-alvo">🎯 Só uma família (opcional)</Label>
          <div className="flex gap-2">
            <Input
              id="familia-alvo"
              value={familiaAlvo}
              onChange={(evento) => onFamiliaAlvoChange(evento.target.value)}
              placeholder="ID da família"
            />
            <Button
              variant="outline"
              className="h-10 shrink-0"
              disabled={processando || !familiaAlvo.trim()}
              onClick={() => void onDisparar(familiaAlvo)}
            >
              Gerar
            </Button>
          </div>
        </div>
      </div>
    </section>
  )
}

function Resultados({ resposta }: { resposta: RespostaApi }) {
  const resultados = resposta.results
  return (
    <section className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
      <h2 className="text-lg font-bold text-gray-900 mb-4">📊 Resultado do disparo</h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Indicador rotulo="Famílias" valor={texto(resultados?.totalFamilies)} />
        <Indicador rotulo="Processadas" valor={texto(resultados?.processedFamilies)} />
        <Indicador rotulo="Tarefas criadas" valor={texto(resultados?.totalTasksCreated)} />
      </div>
      <div className="bg-gray-50 rounded-xl p-4 text-sm text-gray-700 space-y-1">
        <div><strong>Duração:</strong> {resultados?.executionTime ?? '—'}</div>
        <div><strong>Início:</strong> {formatarInstante(resultados?.startTime)}</div>
        <div><strong>Fim:</strong> {formatarInstante(resultados?.endTime)}</div>
      </div>
      <ErrosDoLote erros={resultados?.errors} />
      <details className="mt-4">
        <summary className="cursor-pointer font-semibold text-gray-700 hover:text-gray-900">
          🔍 Ver JSON completo
        </summary>
        <pre className="mt-2 text-xs bg-gray-100 p-4 rounded-lg overflow-auto max-h-96">
          {JSON.stringify(resposta, null, 2)}
        </pre>
      </details>
    </section>
  )
}

function ErrosDoLote({ erros }: { erros?: string[] }) {
  if (!erros || erros.length === 0) return null
  return (
    <div className="bg-red-50 rounded-xl p-4 mt-4">
      <h3 className="font-semibold text-red-800 mb-2">⚠️ Erros ({erros.length})</h3>
      <ul className="text-red-700 text-sm space-y-1">
        {erros.map((erro) => (
          <li key={erro}>• {erro}</li>
        ))}
      </ul>
    </div>
  )
}

function texto(valor?: number): string {
  return typeof valor === 'number' ? String(valor) : '—'
}

function formatarInstante(valor?: string): string {
  if (!valor) return '—'
  const instante = new Date(valor)
  return Number.isNaN(instante.getTime()) ? valor : instante.toLocaleString('pt-BR')
}

/**
 * Descrição do que o sistema realmente faz. O texto anterior citava um hook de
 * agendamento no navegador que nunca era montado — informação falsa sobre o sistema.
 */
function ComoFunciona() {
  return (
    <section className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
      <h2 className="text-lg font-bold text-gray-900 mb-4">⚙️ Como o dia é gerado</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <h3 className="font-semibold text-gray-700 mb-2">🔄 Cron do servidor</h3>
          <ul className="text-sm text-gray-600 space-y-1">
            <li>• Roda todo dia às <strong>00:05 (horário de Brasília)</strong>.</li>
            <li>• Chama <code>GET /api/cron/daily-tasks</code>, autenticado por <code>CRON_SECRET</code>.</li>
            <li>• Cria o documento do dia em todas as famílias, sem depender de ninguém online.</li>
          </ul>
        </div>
        <div>
          <h3 className="font-semibold text-gray-700 mb-2">🖥️ O próprio painel</h3>
          <ul className="text-sm text-gray-600 space-y-1">
            <li>• Ao abrir, o painel gera o dia se ele estiver faltando — o cron pode falhar, a cozinha não pode ficar sem tarefas.</li>
            <li>• Com o painel ligado, a virada da meia-noite troca o dia sozinha.</li>
            <li>• A criação é idempotente: cron e painel juntos produzem um documento só.</li>
          </ul>
        </div>
      </div>
      <p className="text-sm text-gray-600 mt-4">
        Entram no dia os templates ativos: os diários todo dia, e os semanais apenas nos dias da
        semana marcados em <strong>Gerenciar tarefas recorrentes</strong>.
      </p>
    </section>
  )
}
