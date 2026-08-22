'use client'

/**
 * Estatísticas da família.
 *
 * Fala SÓ com o módulo `@/data`. O `familyId` não aparece aqui de propósito: ele é
 * resolvido uma única vez no provider. Antes, esta tela lia `user.familyId` do login
 * enquanto a home escrevia em `default_family` — duas telas olhando famílias diferentes.
 *
 * Datas vêm de `hojeFamilia`/`somarDias` (fuso America/Sao_Paulo). Descobrir "hoje" pela
 * data UTC do navegador está proibido: a partir das 21h no Brasil ela devolve o dia errado.
 */

import { useEffect, useMemo, useState, type ReactNode } from 'react'
import Link from 'next/link'

import {
  DataError,
  diaDaSemanaDaData,
  hojeFamilia,
  somarDias,
  useFamilyData,
  type FamilyData,
  type IsoDate,
  type Member,
  type PeriodStats,
} from '@/data'

type Periodo = 'dias' | 'semana' | 'mes'

interface Intervalo {
  inicio: IsoDate
  fim: IsoDate
}

/** O período escolhido e o período imediatamente anterior, para comparação. */
interface Comparacao {
  atual: Intervalo
  anterior: Intervalo
}

const PERIODOS: Periodo[] = ['dias', 'semana', 'mes']

const ROTULOS: Record<Periodo, { botao: string; atual: string; anterior: string }> = {
  dias: { botao: 'Dia', atual: 'Hoje', anterior: 'Ontem' },
  semana: { botao: 'Semana', atual: 'Esta semana', anterior: 'Semana passada' },
  mes: { botao: 'Mês', atual: 'Este mês', anterior: 'Mês passado' },
}

const NOMES_CATEGORIA: Record<string, string> = {
  higiene: 'Higiene',
  organizacao: 'Organização',
  estudos: 'Estudos',
  casa: 'Casa',
  cuidados: 'Cuidados',
}

/** `colorKey` do membro → classe Tailwind. Cor nunca vai em `style` inline. */
const CLASSES_DE_COR: Record<string, string> = {
  louise: 'bg-pink-500',
  benicio: 'bg-blue-500',
  adult1: 'bg-indigo-500',
  adult2: 'bg-emerald-500',
}

/** Usada quando o membro tem um `colorKey` que a UI ainda não conhece. */
const PALETA_RESERVA = [
  'bg-violet-500',
  'bg-amber-500',
  'bg-teal-500',
  'bg-rose-500',
  'bg-cyan-500',
  'bg-lime-500',
]

const CORES_CATEGORIA = [
  'bg-blue-500',
  'bg-purple-500',
  'bg-green-500',
  'bg-orange-500',
  'bg-red-500',
  'bg-indigo-500',
]

// ---------------------------------------------------------------------------
// Intervalos de data (sempre no fuso da família)
// ---------------------------------------------------------------------------

function intervalosDoDia(hoje: IsoDate): Comparacao {
  const ontem = somarDias(hoje, -1)
  return {
    atual: { inicio: hoje, fim: hoje },
    anterior: { inicio: ontem, fim: ontem },
  }
}

/** Semana de domingo a sábado, como no calendário brasileiro impresso. */
function intervalosDaSemana(hoje: IsoDate): Comparacao {
  const inicio = somarDias(hoje, -diaDaSemanaDaData(hoje))
  return {
    atual: { inicio, fim: somarDias(inicio, 6) },
    anterior: { inicio: somarDias(inicio, -7), fim: somarDias(inicio, -1) },
  }
}

function primeiroDiaDoMes(data: IsoDate): IsoDate {
  return `${data.slice(0, 7)}-01`
}

function intervalosDoMes(hoje: IsoDate): Comparacao {
  const inicio = primeiroDiaDoMes(hoje)
  // +31 dias a partir do dia 1 sempre cai no mês seguinte (mês tem no máximo 31 dias);
  // voltar um dia do primeiro dia daquele mês dá o último dia deste, sem tabela de meses.
  const fim = somarDias(primeiroDiaDoMes(somarDias(inicio, 31)), -1)
  const fimAnterior = somarDias(inicio, -1)
  return {
    atual: { inicio, fim },
    anterior: { inicio: primeiroDiaDoMes(fimAnterior), fim: fimAnterior },
  }
}

function intervalosDoPeriodo(periodo: Periodo): Comparacao {
  const hoje = hojeFamilia()
  if (periodo === 'dias') return intervalosDoDia(hoje)
  if (periodo === 'semana') return intervalosDaSemana(hoje)
  return intervalosDoMes(hoje)
}

/** `2026-08-22` → `22/08`. */
function formatarDiaMes(data: IsoDate): string {
  return `${data.slice(8, 10)}/${data.slice(5, 7)}`
}

function descreverIntervalo(intervalo: Intervalo): string {
  if (intervalo.inicio === intervalo.fim) return formatarDiaMes(intervalo.inicio)
  return `${formatarDiaMes(intervalo.inicio)} a ${formatarDiaMes(intervalo.fim)}`
}

// ---------------------------------------------------------------------------
// Carregamento
// ---------------------------------------------------------------------------

interface Estatisticas {
  atual: PeriodStats
  anterior: PeriodStats
  membros: Member[]
}

function mensagemAmigavel(causa: unknown): string {
  if (causa instanceof DataError) {
    if (causa.code === 'indisponivel') {
      return 'Sem conexão com o servidor. Confira a internet e tente de novo.'
    }
    return causa.message
  }
  return 'Não foi possível carregar as estatísticas. Tente de novo em instantes.'
}

/** Os dois períodos e os membros em paralelo — três leituras, uma espera só. */
function carregarEstatisticas(dados: FamilyData, intervalos: Comparacao): Promise<Estatisticas> {
  return Promise.all([
    dados.getStats(intervalos.atual.inicio, intervalos.atual.fim),
    dados.getStats(intervalos.anterior.inicio, intervalos.anterior.fim),
    dados.listMembers(),
  ]).then(([atual, anterior, membros]) => ({ atual, anterior, membros }))
}

function useEstatisticas(intervalos: Comparacao) {
  const dados = useFamilyData()
  const [estatisticas, setEstatisticas] = useState<Estatisticas | null>(null)
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState<string | null>(null)

  useEffect(() => {
    let cancelado = false
    setCarregando(true)
    setErro(null)

    carregarEstatisticas(dados, intervalos)
      .then((resultado) => {
        if (!cancelado) setEstatisticas(resultado)
      })
      .catch((causa: unknown) => {
        // Mensagem amigável na tela, causa real no console — sem isso o diagnóstico morre.
        console.error('[estatisticas] falha ao carregar', intervalos, causa)
        if (!cancelado) setErro(mensagemAmigavel(causa))
      })
      .finally(() => {
        if (!cancelado) setCarregando(false)
      })

    return () => {
      cancelado = true
    }
  }, [dados, intervalos])

  return { estatisticas, carregando, erro }
}

// ---------------------------------------------------------------------------
// Indicadores
// ---------------------------------------------------------------------------

interface Indicador {
  titulo: string
  emoji: string
  atual: number
  anterior: number
  sufixo?: string
}

function montarIndicadores(atual: PeriodStats, anterior: PeriodStats): Indicador[] {
  return [
    {
      titulo: 'Tarefas concluídas',
      emoji: '✅',
      atual: atual.completedItems,
      anterior: anterior.completedItems,
    },
    {
      titulo: 'Pontos conquistados',
      emoji: '⭐',
      atual: atual.pointsEarned,
      anterior: anterior.pointsEarned,
    },
    {
      titulo: 'Taxa de conclusão',
      emoji: '📈',
      atual: atual.completionRate,
      anterior: anterior.completionRate,
      sufixo: '%',
    },
  ]
}

/** `null` quando não há base de comparação — melhor do que exibir "0%" falso. */
function variacaoPercentual(atual: number, anterior: number): number | null {
  if (anterior === 0) return null
  return Math.round(((atual - anterior) / anterior) * 100)
}

function larguraRelativa(valor: number, maximo: number): string {
  if (maximo <= 0) return '0%'
  return `${Math.min(Math.round((valor / maximo) * 100), 100)}%`
}

// ---------------------------------------------------------------------------
// Componentes
// ---------------------------------------------------------------------------

function SeloVariacao({ atual, anterior }: { atual: number; anterior: number }) {
  const variacao = variacaoPercentual(atual, anterior)

  if (variacao === null) {
    return (
      <span className="inline-flex items-center rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-600">
        sem comparação
      </span>
    )
  }

  const subiu = variacao >= 0
  const classes = subiu ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'

  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${classes}`}>
      {subiu ? '↗' : '↘'} {Math.abs(variacao)}%
    </span>
  )
}

function LinhaValor({
  rotulo,
  valor,
  sufixo,
  destaque,
}: {
  rotulo: string
  valor: number
  sufixo: string
  destaque?: boolean
}) {
  const classes = destaque ? 'text-lg font-bold text-gray-900' : 'text-sm text-gray-500'

  return (
    <div className="flex items-baseline justify-between">
      <span className={destaque ? 'text-sm text-gray-600' : 'text-sm text-gray-500'}>{rotulo}</span>
      <span className={classes}>
        {valor}
        {sufixo}
      </span>
    </div>
  )
}

function CartaoIndicador({
  indicador,
  rotulos,
}: {
  indicador: Indicador
  rotulos: { atual: string; anterior: string }
}) {
  const sufixo = indicador.sufixo ?? ''
  const maximo = Math.max(indicador.atual, indicador.anterior)

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <span className="text-2xl">{indicador.emoji}</span>
        <SeloVariacao atual={indicador.atual} anterior={indicador.anterior} />
      </div>

      <h3 className="font-semibold text-gray-900">{indicador.titulo}</h3>

      <div className="mt-2 space-y-1">
        <LinhaValor rotulo={rotulos.atual} valor={indicador.atual} sufixo={sufixo} destaque />
        <LinhaValor rotulo={rotulos.anterior} valor={indicador.anterior} sufixo={sufixo} />
      </div>

      <div className="mt-3 h-2 w-full rounded-full bg-gray-200">
        <div
          className="h-2 rounded-full bg-gradient-to-r from-purple-500 to-blue-500 transition-all duration-500"
          style={{ width: larguraRelativa(indicador.atual, maximo) }}
        />
      </div>
    </div>
  )
}

function Painel({ titulo, children }: { titulo: string; children: ReactNode }) {
  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
      <h3 className="mb-6 text-left text-lg font-bold text-gray-900">{titulo}</h3>
      {children}
    </section>
  )
}

function Vazio({ emoji, texto }: { emoji: string; texto: string }) {
  return (
    <div className="py-8 text-center text-gray-500">
      <div className="mb-2 text-2xl">{emoji}</div>
      <p>{texto}</p>
    </div>
  )
}

/** Uma linha de barra: rótulo à esquerda, medida à direita, barra embaixo. */
function LinhaBarra({
  rotulo,
  medida,
  largura,
  classeDaBarra,
}: {
  rotulo: ReactNode
  medida: string
  largura: string
  classeDaBarra: string
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-gray-700">{rotulo}</span>
        <span className="text-sm text-gray-600">{medida}</span>
      </div>
      <div className="h-3 w-full rounded-full bg-gray-200">
        <div
          className={`h-3 rounded-full transition-all duration-700 ${classeDaBarra}`}
          style={{ width: largura }}
        />
      </div>
    </div>
  )
}

function ListaCategorias({ porCategoria }: { porCategoria: Record<string, number> }) {
  const linhas = Object.entries(porCategoria).sort(([, a], [, b]) => b - a).slice(0, 6)
  const total = Object.values(porCategoria).reduce((soma, valor) => soma + valor, 0)

  if (linhas.length === 0) {
    return <Vazio emoji="📊" texto="Nenhuma tarefa com categoria neste período" />
  }

  return (
    <div className="space-y-4">
      {linhas.map(([categoria, quantidade], indice) => {
        const percentual = total > 0 ? Math.round((quantidade / total) * 100) : 0
        return (
          <LinhaBarra
            key={categoria}
            rotulo={NOMES_CATEGORIA[categoria] ?? categoria}
            medida={`${quantidade} (${percentual}%)`}
            largura={`${percentual}%`}
            classeDaBarra={CORES_CATEGORIA[indice % CORES_CATEGORIA.length]}
          />
        )
      })}
    </div>
  )
}

function classeDeCor(membro: Member | undefined, indice: number): string {
  const chave = membro?.colorKey
  return (chave && CLASSES_DE_COR[chave]) || PALETA_RESERVA[indice % PALETA_RESERVA.length]
}

function ListaMembros({
  porMembro,
  membros,
}: {
  porMembro: Record<string, { count: number; points: number }>
  membros: Member[]
}) {
  const linhas = Object.entries(porMembro).sort(([, a], [, b]) => b.count - a.count).slice(0, 6)
  const maiorContagem = Math.max(0, ...linhas.map(([, valor]) => valor.count))

  if (linhas.length === 0) {
    return <Vazio emoji="👥" texto="Nenhuma tarefa concluída neste período" />
  }

  return (
    <div className="space-y-4">
      {linhas.map(([membroId, valor], indice) => {
        // O histórico guarda o id do membro; nome e avatar vêm sempre do cadastro.
        const membro = membros.find((candidato) => candidato.id === membroId)
        return (
          <LinhaBarra
            key={membroId}
            rotulo={
              <span className="flex items-center gap-2">
                <span className="text-lg">{membro?.avatar ?? '👤'}</span>
                {membro?.name ?? membroId}
              </span>
            }
            medida={`${valor.count} ${valor.count === 1 ? 'tarefa' : 'tarefas'} · ${valor.points} pts`}
            largura={larguraRelativa(valor.count, maiorContagem)}
            classeDaBarra={classeDeCor(membro, indice)}
          />
        )
      })}
    </div>
  )
}

function FiltroPeriodo({
  periodo,
  aoTrocar,
  descricao,
}: {
  periodo: Periodo
  aoTrocar: (novo: Periodo) => void
  descricao: string
}) {
  return (
    <div className="mb-8 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
      <div className="mb-3 flex items-baseline justify-between">
        <span className="text-sm font-semibold text-gray-700">📅 Período</span>
        <span className="text-sm text-gray-500">{descricao}</span>
      </div>
      <div className="flex rounded-xl bg-gray-100 p-1" role="group" aria-label="Período">
        {PERIODOS.map((opcao) => (
          <button
            key={opcao}
            type="button"
            onClick={() => aoTrocar(opcao)}
            aria-pressed={periodo === opcao}
            className={`flex-1 rounded-lg px-4 py-2 font-medium transition-all ${
              periodo === opcao
                ? 'bg-white text-purple-700 shadow-sm'
                : 'text-gray-600 hover:text-gray-800'
            }`}
          >
            {ROTULOS[opcao].botao}
          </button>
        ))}
      </div>
    </div>
  )
}

function Cabecalho() {
  return (
    <header className="sticky top-0 z-10 border-b border-gray-200 bg-white/80 backdrop-blur-sm">
      <div className="mx-auto flex max-w-6xl items-center gap-4 px-4 py-4 sm:px-6 lg:px-8">
        <Link
          href="/"
          className="inline-flex items-center rounded-xl bg-gray-100 px-4 py-2 font-medium text-gray-700 transition-colors hover:bg-gray-200"
        >
          ← Voltar
        </Link>
        <div>
          <h1 className="bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-2xl font-bold text-transparent">
            📊 Estatísticas da Família
          </h1>
          <p className="text-sm text-gray-600">Acompanhe o progresso e as conquistas de todos</p>
        </div>
      </div>
    </header>
  )
}

function Aviso({ emoji, texto, tom = 'neutro' }: { emoji: string; texto: string; tom?: 'neutro' | 'erro' }) {
  const borda = tom === 'erro' ? 'border-red-200' : 'border-gray-200'
  const cor = tom === 'erro' ? 'text-red-600' : 'text-gray-600'

  return (
    <div className={`rounded-2xl border bg-white p-8 text-center shadow-sm ${borda}`} role={tom === 'erro' ? 'alert' : undefined}>
      <div className="mb-2 text-2xl">{emoji}</div>
      <p className={cor}>{texto}</p>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Página
// ---------------------------------------------------------------------------

function Conteudo({
  dados,
  rotulos,
}: {
  dados: Estatisticas
  rotulos: { atual: string; anterior: string }
}) {
  // Sem nada em nenhum dos dois períodos não há o que comparar — melhor dizer isso
  // do que mostrar três cartões zerados como se fosse desempenho ruim.
  if (dados.atual.totalItems === 0 && dados.anterior.totalItems === 0) {
    return (
      <Aviso
        emoji="🗓️"
        texto="Nenhuma tarefa registrada neste período. Assim que o quadro do dia for usado, os números aparecem aqui."
      />
    )
  }

  return (
    <>
      <div className="mb-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {montarIndicadores(dados.atual, dados.anterior).map((indicador) => (
          <CartaoIndicador key={indicador.titulo} indicador={indicador} rotulos={rotulos} />
        ))}
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
        <Painel titulo="📈 Tarefas por categoria">
          <ListaCategorias porCategoria={dados.atual.byCategory} />
        </Painel>
        <Painel titulo="⭐ Tarefas por membro">
          <ListaMembros porMembro={dados.atual.byMember} membros={dados.membros} />
        </Painel>
      </div>
    </>
  )
}

export default function EstatisticasPage() {
  const [periodo, setPeriodo] = useState<Periodo>('mes')
  const intervalos = useMemo(() => intervalosDoPeriodo(periodo), [periodo])
  const { estatisticas, carregando, erro } = useEstatisticas(intervalos)

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-pink-50">
      <Cabecalho />

      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        <FiltroPeriodo
          periodo={periodo}
          aoTrocar={setPeriodo}
          descricao={descreverIntervalo(intervalos.atual)}
        />

        {carregando && <Aviso emoji="⏳" texto="Carregando estatísticas..." />}
        {!carregando && erro && <Aviso emoji="❌" texto={erro} tom="erro" />}
        {!carregando && !erro && estatisticas && (
          <Conteudo dados={estatisticas} rotulos={ROTULOS[periodo]} />
        )}
      </main>
    </div>
  )
}
