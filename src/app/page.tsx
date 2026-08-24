'use client'

/**
 * Painel da cozinha.
 *
 * Contexto de produto: a tela fica fixa num aparelho de toque, ligada o dia todo.
 * Isso manda em cada decisão daqui:
 *
 * - **Toque é o único gesto.** O arrastar nativo do HTML5 foi removido: no Safari
 *   do iPad ele simplesmente não dispara com o dedo. O cartão inteiro é o alvo de
 *   conclusão, não um botãozinho de 36 px.
 * - **`active:` no lugar de `hover:`** nos alvos tocáveis — o iOS mantém o estado
 *   de hover grudado depois do toque, e o cartão ficava aceso sem motivo.
 * - **Nada de `window.confirm`** para resetar: diálogo nativo em painel de cozinha é
 *   um botão OK gigante que criança aperta sem ler.
 * - **Toda leitura e escrita passa por `usePanelDay`**, que fala só com `@/data`.
 *   Des-completar e resetar agora persistem e estornam pontos por transação.
 */

import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import Link from 'next/link'
import {
  AnimatePresence,
  LayoutGroup,
  MotionConfig,
  motion,
  useReducedMotion,
} from 'framer-motion'
import { BarChart3, CalendarDays, Check, Plus, RefreshCw, Undo2 } from 'lucide-react'

import { NewTaskModal } from '@/components/tasks/new-task-modal'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { FUSO_FAMILIA, type DayItem, type IsoDate, type Member, type MemberRole } from '@/data'
import { usePanelDay } from '@/hooks/use-panel-day'
import { cn } from '@/lib/utils'

/**
 * `colorKey` do membro -> par de classes do Tailwind. Cor nunca vem em style inline,
 * e as classes precisam existir literalmente no arquivo para o Tailwind gerá-las.
 */
const GRADIENTE_POR_COR: Record<string, string> = {
  louise: 'from-pink-400 to-yellow-300',
  benicio: 'from-teal-400 to-emerald-600',
  adult1: 'from-indigo-500 to-purple-600',
  adult2: 'from-pink-500 to-rose-500',
}

const GRADIENTE_PADRAO = 'from-slate-400 to-slate-600'

/** Quanto tempo o 🎉 fica na tela. */
const DURACAO_COMEMORACAO_MS = 1800

/** Quanto tempo o aviso de "escolha seu nome" fica na tela. */
const DURACAO_AVISO_MS = 3500

function gradienteDoMembro(colorKey: string): string {
  return GRADIENTE_POR_COR[colorKey] ?? GRADIENTE_PADRAO
}

// ---------------------------------------------------------------------------
// Som de vitória — só WebAudio.
// O WAV em base64 que existia aqui era dado truncado e repetido: falhava sempre
// e caía neste mesmo caminho. Um AudioContext só, reaproveitado, porque o
// navegador limita quantos podem existir ao mesmo tempo.
// ---------------------------------------------------------------------------

type JanelaComWebkit = Window & typeof globalThis & { webkitAudioContext?: typeof AudioContext }

let contextoAudio: AudioContext | null = null

function agendarNota(ctx: AudioContext, frequencia: number, atraso: number, duracao = 0.22): void {
  const oscilador = ctx.createOscillator()
  const ganho = ctx.createGain()
  oscilador.connect(ganho)
  ganho.connect(ctx.destination)

  oscilador.type = 'square'
  oscilador.frequency.value = frequencia

  const inicio = ctx.currentTime + atraso
  ganho.gain.setValueAtTime(0.22, inicio)
  ganho.gain.exponentialRampToValueAtTime(0.01, inicio + duracao)
  oscilador.start(inicio)
  oscilador.stop(inicio + duracao)
}

function tocarSomDeVitoria(): void {
  try {
    const Contexto = window.AudioContext ?? (window as JanelaComWebkit).webkitAudioContext
    if (!Contexto) return
    contextoAudio ??= new Contexto()
    // O iOS deixa o contexto suspenso até um gesto do usuário — o toque é o gesto.
    void contextoAudio.resume()
    const melodia: [number, number][] = [
      [523, 0],
      [659, 0.12],
      [784, 0.24],
      [1047, 0.36],
    ]
    melodia.forEach(([frequencia, atraso]) => agendarNota(contextoAudio!, frequencia, atraso))
  } catch (falha) {
    console.error('[painel] não consegui tocar o som de vitória', falha)
  }
}

// ---------------------------------------------------------------------------
// Formatação
// ---------------------------------------------------------------------------

/** `YYYY-MM-DD` -> "Sábado, 22 de agosto de 2026", sem depender do fuso do aparelho. */
function formatarDataExtenso(data: IsoDate): string {
  const [ano, mes, dia] = data.split('-').map(Number)
  const texto = new Date(Date.UTC(ano, mes - 1, dia)).toLocaleDateString('pt-BR', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: 'UTC',
  })
  return texto.charAt(0).toUpperCase() + texto.slice(1)
}

function formatarHora(instante?: string): string | null {
  if (!instante) return null
  const data = new Date(instante)
  if (Number.isNaN(data.getTime())) return null
  return data.toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: FUSO_FAMILIA,
  })
}

/** Pontos ganhos hoje, por membro. Deriva dos itens do dia — nada de varrer histórico. */
function somarPontosPorMembro(itens: DayItem[]): Record<string, number> {
  const total: Record<string, number> = {}
  for (const item of itens) {
    for (const marca of item.completions) {
      total[marca.memberId] = (total[marca.memberId] ?? 0) + marca.points
    }
  }
  return total
}

/** Quem ainda falta marcar. Vazio quando a tarefa já está pronta. */
function quemFalta(item: DayItem, membros: Member[]): Member[] {
  const jaMarcou = new Set(item.completions.map((c) => c.memberId))
  if (item.completionMode === 'basta_um') {
    return jaMarcou.size > 0 ? [] : membros.filter((m) => m.role === item.audience)
  }
  const esperados = item.expectedMemberIds.length
    ? item.expectedMemberIds
    : membros.filter((m) => m.role === item.audience).map((m) => m.id)
  return esperados
    .filter((id) => !jaMarcou.has(id))
    .map((id) => membros.find((m) => m.id === id))
    .filter((m): m is Member => Boolean(m))
}

// ---------------------------------------------------------------------------
// Tela
// ---------------------------------------------------------------------------

interface Aviso {
  texto: string
  /** Só serve para criar um objeto novo a cada aviso e reiniciar o temporizador. */
  em: number
}

export default function PainelDaFamilia() {
  const painel = usePanelDay()
  const reduzirMovimento = useReducedMotion()

  const [aba, setAba] = useState<MemberRole>('crianca')
  const [membroSelecionadoId, setMembroSelecionadoId] = useState<string | null>(null)
  const [aviso, setAviso] = useState<Aviso | null>(null)
  // Guarda o instante da última conclusão (e não um booleano) para que duas
  // tarefas seguidas reiniciem a comemoração em vez de encurtar a segunda.
  const [comemoradoEm, setComemoradoEm] = useState<number | null>(null)
  const [itemParaMarcar, setItemParaMarcar] = useState<DayItem | null>(null)
  const [modalNovaTarefa, setModalNovaTarefa] = useState(false)
  const [confirmandoReset, setConfirmandoReset] = useState(false)
  const [resetando, setResetando] = useState(false)

  const membrosDaAba = useMemo(
    () => painel.membros.filter((membro) => membro.role === aba),
    [painel.membros, aba],
  )
  const itensDaAba = useMemo(
    () => painel.itens.filter((item) => item.audience === aba),
    [painel.itens, aba],
  )
  const pontosDeHoje = useMemo(() => somarPontosPorMembro(painel.itens), [painel.itens])

  // `parcial` fica em Para Fazer de propósito: ainda falta alguém.
  const pendentes = itensDaAba.filter((item) => item.status !== 'concluida')
  const concluidos = itensDaAba.filter((item) => item.status === 'concluida')
  const membroSelecionado = membrosDaAba.find((membro) => membro.id === membroSelecionadoId) ?? null

  useDesaparecerDepois(comemoradoEm, DURACAO_COMEMORACAO_MS, () => setComemoradoEm(null))
  useDesaparecerDepois(aviso, DURACAO_AVISO_MS, () => setAviso(null))

  const trocarAba = useCallback((nova: MemberRole) => {
    setAba(nova)
    setMembroSelecionadoId(null)
  }, [])

  const marcarTarefa = useCallback(
    async (item: DayItem, membroIds: string[]) => {
      setItemParaMarcar(null)
      if (membroIds.length === 0) return
      // Comemora ANTES da confirmação do banco: a previsão do hook já moveu o
      // cartão, e som que chega três segundos depois do toque não comemora nada.
      setComemoradoEm(Date.now())
      tocarSomDeVitoria()
      await painel.concluir(item.id, membroIds)
    },
    [painel],
  )

  const confirmarReset = useCallback(async () => {
    setResetando(true)
    const deuCerto = await painel.resetar()
    setResetando(false)
    setConfirmandoReset(false)
    if (deuCerto) setMembroSelecionadoId(null)
  }, [painel])

  return (
    <MotionConfig reducedMotion="user">
      <div className="min-h-screen bg-gradient-to-br from-indigo-500 via-purple-600 to-purple-700 p-4 sm:p-5">
        <Comemoracao visivel={comemoradoEm !== null} semAnimacao={Boolean(reduzirMovimento)} />

        <div className="mx-auto max-w-7xl space-y-6 pb-24">
          <Cabecalho data={painel.hoje} />

          {painel.erro && <FaixaDeErro mensagem={painel.erro} aoFechar={painel.limparErro} />}

          <SeletorDeAba aba={aba} aoTrocar={trocarAba} />

          <PainelDeMembros
            aba={aba}
            membros={membrosDaAba}
            selecionadoId={membroSelecionadoId}
            pontosDeHoje={pontosDeHoje}
            aoSelecionar={setMembroSelecionadoId}
          />

          {aviso && <FaixaDeAviso texto={aviso.texto} />}

          {painel.carregando ? (
            <Carregando />
          ) : (
            <LayoutGroup>
              <div className="grid gap-6 lg:grid-cols-2">
                <Coluna
                  titulo="📝 Para Fazer"
                  classeCabecalho="bg-gradient-to-r from-yellow-400 to-red-500"
                  vazio={pendentes.length === 0}
                  textoVazio="Tudo pronto por aqui! 🎉"
                >
                  {pendentes.map((item) => (
                    <ItemAnimado key={item.id} id={item.id}>
                      <CartaoPendente
                        item={item}
                        membros={painel.membros}
                        aoTocar={() => setItemParaMarcar(item)}
                      />
                    </ItemAnimado>
                  ))}
                </Coluna>

                <Coluna
                  titulo="✅ Concluído"
                  classeCabecalho="bg-gradient-to-r from-green-500 to-emerald-600"
                  vazio={concluidos.length === 0}
                  textoVazio="Nenhuma tarefa concluída ainda"
                >
                  {concluidos.map((item) => (
                    <ItemAnimado key={item.id} id={item.id}>
                      <CartaoConcluido
                        item={item}
                        aoDesfazer={(membroId) => painel.desfazer(item.id, membroId)}
                      />
                    </ItemAnimado>
                  ))}
                </Coluna>
              </div>
            </LayoutGroup>
          )}

          <div className="text-center">
            <Button
              onClick={() => setModalNovaTarefa(true)}
              // `hover:bg-transparent` desarma o hover que o Button do shadcn traz:
              // no iOS ele gruda depois do toque e o botão fica aceso sem motivo.
              className="h-16 rounded-3xl bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 px-8 text-lg font-bold text-white shadow-lg transition-transform hover:bg-transparent active:scale-95"
            >
              <Plus className="mr-2 h-5 w-5" />
              Adicionar tarefa de hoje
            </Button>
          </div>
        </div>

        <ModalQuemFez
          item={itemParaMarcar}
          membros={painel.membros}
          preSelecionadoId={membroSelecionadoId}
          aoFechar={() => setItemParaMarcar(null)}
          aoConfirmar={marcarTarefa}
        />

        <NewTaskModal
          open={modalNovaTarefa}
          onOpenChange={setModalNovaTarefa}
          onCriar={painel.adicionarAvulsa}
          audiencia={aba}
        />

        <Button
          onClick={() => setConfirmandoReset(true)}
          aria-label="Recomeçar o dia"
          variant="ghost"
          className="fixed bottom-6 right-6 h-16 w-16 rounded-full bg-white/90 text-gray-700 shadow-xl transition-transform hover:bg-white/90 hover:text-gray-700 active:scale-90"
        >
          <RefreshCw className="h-6 w-6 text-gray-700" />
        </Button>

        <DialogoDeReset
          aberto={confirmandoReset}
          ocupado={resetando}
          aoMudar={setConfirmandoReset}
          aoConfirmar={confirmarReset}
        />
      </div>
    </MotionConfig>
  )
}

/** Some com um estado efêmero depois de `espera` ms. */
function useDesaparecerDepois(gatilho: unknown, espera: number, aoExpirar: () => void): void {
  useEffect(() => {
    if (!gatilho) return
    const timer = window.setTimeout(aoExpirar, espera)
    return () => window.clearTimeout(timer)
    // `aoExpirar` é recriada a cada render; o gatilho é quem manda no ciclo.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gatilho, espera])
}

// ---------------------------------------------------------------------------
// Pedaços da tela
// ---------------------------------------------------------------------------

function Cabecalho({ data }: { data: IsoDate }) {
  return (
    <header className="text-center text-white">
      <div className="mb-4 flex justify-end gap-3">
        <LinkDeNavegacao href="/calendario" rotulo="Calendário">
          <CalendarDays aria-hidden className="h-5 w-5" />
        </LinkDeNavegacao>
        <LinkDeNavegacao href="/estatisticas" rotulo="Estatísticas">
          <BarChart3 aria-hidden className="h-5 w-5" />
        </LinkDeNavegacao>
      </div>
      <h1 className="text-4xl font-bold drop-shadow-lg md:text-5xl">🏠 Tarefas da Família</h1>
      <p className="mt-2 text-lg opacity-90 md:text-xl">{formatarDataExtenso(data)}</p>
    </header>
  )
}

function LinkDeNavegacao({
  href,
  rotulo,
  children,
}: {
  href: string
  rotulo: string
  children: ReactNode
}) {
  return (
    <Link
      href={href}
      className="flex min-h-[56px] items-center gap-2 rounded-2xl bg-white/20 px-5 text-base font-semibold text-white shadow-lg transition-transform active:scale-95 active:bg-white/35"
    >
      {children}
      <span>{rotulo}</span>
    </Link>
  )
}

function SeletorDeAba({
  aba,
  aoTrocar,
}: {
  aba: MemberRole
  aoTrocar: (nova: MemberRole) => void
}) {
  return (
    <div className="flex justify-center gap-3">
      <BotaoDeAba ativa={aba === 'crianca'} aoClicar={() => aoTrocar('crianca')} classeCor="from-pink-400 via-blue-400 to-green-400">
        🧒 Crianças
      </BotaoDeAba>
      <BotaoDeAba ativa={aba === 'adulto'} aoClicar={() => aoTrocar('adulto')} classeCor="from-pink-500 to-rose-500">
        👨‍👩‍👧 Adultos
      </BotaoDeAba>
    </div>
  )
}

function BotaoDeAba({
  ativa,
  aoClicar,
  classeCor,
  children,
}: {
  ativa: boolean
  aoClicar: () => void
  classeCor: string
  children: ReactNode
}) {
  return (
    <button
      type="button"
      aria-pressed={ativa}
      onClick={aoClicar}
      className={cn(
        'min-h-[64px] rounded-3xl bg-gradient-to-r px-8 text-lg font-bold text-white shadow-lg transition-all duration-300 active:scale-95',
        classeCor,
        ativa ? 'scale-100 shadow-2xl ring-4 ring-white/70' : 'scale-95 opacity-70',
      )}
    >
      {children}
    </button>
  )
}

function PainelDeMembros({
  aba,
  membros,
  selecionadoId,
  pontosDeHoje,
  aoSelecionar,
}: {
  aba: MemberRole
  membros: Member[]
  selecionadoId: string | null
  pontosDeHoje: Record<string, number>
  aoSelecionar: (id: string) => void
}) {
  return (
    <section className="rounded-3xl bg-white/95 p-5 text-center shadow-xl">
      <h2 className="mb-4 text-lg font-semibold text-gray-800">
        👆 Quem está fazendo a tarefa?
      </h2>
      {membros.length === 0 ? (
        <p className="text-sm text-gray-500">
          Ninguém cadastrado como {aba === 'crianca' ? 'criança' : 'adulto'} ainda.
        </p>
      ) : (
        <div className="flex flex-wrap justify-center gap-4">
          {membros.map((membro) => (
            <BotaoDeMembro
              key={membro.id}
              membro={membro}
              selecionado={selecionadoId === membro.id}
              pontosDeHoje={pontosDeHoje[membro.id] ?? 0}
              aoSelecionar={() => aoSelecionar(membro.id)}
            />
          ))}
        </div>
      )}
    </section>
  )
}

function BotaoDeMembro({
  membro,
  selecionado,
  pontosDeHoje,
  aoSelecionar,
}: {
  membro: Member
  selecionado: boolean
  pontosDeHoje: number
  aoSelecionar: () => void
}) {
  return (
    <button
      type="button"
      aria-pressed={selecionado}
      onClick={aoSelecionar}
      className={cn(
        'flex min-h-[92px] min-w-[152px] flex-col items-center justify-center gap-1 rounded-2xl border-4 bg-gradient-to-r px-5 py-3 font-bold text-white shadow-lg transition-transform duration-200 active:scale-95',
        gradienteDoMembro(membro.colorKey),
        selecionado ? 'scale-105 border-yellow-300 ring-4 ring-yellow-300' : 'border-white/40 opacity-90',
      )}
    >
      <span aria-hidden className="text-3xl">
        {membro.avatar}
      </span>
      <span className="text-lg">{membro.name}</span>
      {membro.role === 'crianca' && (
        <span className="rounded-full bg-black/25 px-2 py-0.5 text-sm font-semibold">
          ⭐ {pontosDeHoje} hoje · {membro.pointsTotal} no total
        </span>
      )}
    </button>
  )
}

function Coluna({
  titulo,
  classeCabecalho,
  vazio,
  textoVazio,
  children,
}: {
  titulo: string
  classeCabecalho: string
  vazio: boolean
  textoVazio: string
  children: ReactNode
}) {
  return (
    <section className="rounded-3xl bg-white/95 p-4 shadow-xl sm:p-6">
      <h2 className={cn('mb-5 rounded-xl px-4 py-3 text-center text-xl font-bold text-white', classeCabecalho)}>
        {titulo}
      </h2>
      <div className="relative min-h-[220px]">
        {vazio && (
          <p className="absolute inset-0 flex items-center justify-center text-center text-sm text-gray-400">
            {textoVazio}
          </p>
        )}
        <ul className="space-y-3">
          <AnimatePresence initial={false}>{children}</AnimatePresence>
        </ul>
      </div>
    </section>
  )
}

/**
 * O `layoutId` é o que faz o cartão viajar de uma coluna para a outra em vez de
 * sumir de um lado e piscar do outro. Com `prefers-reduced-motion`, o
 * `MotionConfig` da raiz reduz tudo isto a um fade.
 */
function ItemAnimado({ id, children }: { id: string; children: ReactNode }) {
  return (
    <motion.li
      layout
      layoutId={`tarefa-${id}`}
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.96 }}
      transition={{ type: 'spring', stiffness: 340, damping: 32 }}
    >
      {children}
    </motion.li>
  )
}

/**
 * Cartão pendente: o alvo de toque é o cartão inteiro, com 84 px de altura.
 * Quando a tarefa é de "cada um faz a sua", o cartão mostra quem já marcou e
 * quem falta — é a informação que o pai precisa de relance, sem tocar em nada.
 */
function CartaoPendente({
  item,
  membros,
  aoTocar,
}: {
  item: DayItem
  membros: Member[]
  aoTocar: () => void
}) {
  const faltam = quemFalta(item, membros)
  const parcial = item.status === 'parcial'
  const rotulo = parcial
    ? `${item.name} — falta ${faltam.map((m) => m.name).join(' e ')}`
    : `Marcar ${item.name}`

  return (
    <button
      type="button"
      onClick={aoTocar}
      aria-label={rotulo}
      className={cn(
        'flex min-h-[84px] w-full items-center gap-4 rounded-2xl bg-white p-4 text-left shadow-lg',
        'transition-transform duration-150 active:scale-[0.97] active:bg-green-50',
        'focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-green-400',
        parcial && 'ring-2 ring-emerald-300',
      )}
    >
      <span aria-hidden className="text-3xl">
        {item.icon}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-base font-semibold leading-tight text-gray-900">
          {item.name}
        </span>
        {item.completionMode === 'cada_um' && (
          <span className="mt-1 flex flex-wrap items-center gap-1.5">
            {item.completions.map((marca) => (
              <span
                key={marca.memberId}
                className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-800"
              >
                {marca.memberName} ✓
              </span>
            ))}
            {faltam.map((membro) => (
              <span
                key={membro.id}
                className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600"
              >
                {membro.name} —
              </span>
            ))}
          </span>
        )}
      </span>
      <EtiquetaDePontos pontos={item.points} />
      <span
        aria-hidden
        className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-green-500 text-white shadow"
      >
        <Check className="h-6 w-6" />
      </span>
    </button>
  )
}

/**
 * Cartão concluído: o corpo NÃO é tocável de propósito. Desfazer é uma ação
 * separada, com botão próprio — senão o segundo toque de comemoração desfaria
 * a tarefa que a criança acabou de concluir.
 */
function CartaoConcluido({
  item,
  aoDesfazer,
}: {
  item: DayItem
  aoDesfazer: (membroId?: string) => void
}) {
  return (
    <div className="relative flex min-h-[84px] items-center gap-4 rounded-2xl border-2 border-green-200 bg-gradient-to-br from-green-50 to-emerald-50 p-4 shadow-lg">
      <span aria-hidden className="text-3xl">
        {item.icon}
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-base font-semibold leading-tight text-gray-900">{item.name}</p>
        <ul className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1">
          {item.completions.map((marca) => (
            <li key={marca.memberId} className="text-xs text-gray-600">
              <span className="font-semibold text-emerald-800">{marca.memberName}</span>
              {formatarHora(marca.at) && ` às ${formatarHora(marca.at)}`}
            </li>
          ))}
        </ul>
      </div>
      <EtiquetaDePontos pontos={item.points} />
      <button
        type="button"
        onClick={() => aoDesfazer()}
        aria-label={
          item.completions.length > 1
            ? `Desfazer ${item.name} para todos`
            : `Desfazer ${item.name}`
        }
        className="flex h-[60px] w-[60px] shrink-0 items-center justify-center rounded-full bg-white text-gray-600 shadow transition-transform active:scale-90 active:bg-gray-100 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-emerald-400"
      >
        <Undo2 aria-hidden className="h-6 w-6" />
      </button>
    </div>
  )
}

function EtiquetaDePontos({ pontos }: { pontos: number }) {
  if (pontos <= 0) return null
  return (
    <span className="flex shrink-0 items-center gap-1 rounded-full bg-gradient-to-r from-yellow-400 to-orange-400 px-3 py-1 text-sm font-bold text-white">
      ⭐ {pontos}
    </span>
  )
}

function Carregando() {
  return (
    <section className="rounded-3xl bg-white/95 p-10 text-center shadow-xl">
      <p className="text-4xl" aria-hidden>
        🏠
      </p>
      <p role="status" className="mt-3 text-lg font-semibold text-gray-700">
        Carregando as tarefas de hoje…
      </p>
    </section>
  )
}

function Comemoracao({ visivel, semAnimacao }: { visivel: boolean; semAnimacao: boolean }) {
  if (!visivel) return null
  return (
    <div className="pointer-events-none fixed inset-0 z-50 flex items-center justify-center">
      <span aria-hidden className={cn('text-8xl drop-shadow-2xl', !semAnimacao && 'animate-bounce')}>
        🎉
      </span>
      <span role="status" className="sr-only">
        Tarefa concluída!
      </span>
    </div>
  )
}

function FaixaDeErro({ mensagem, aoFechar }: { mensagem: string; aoFechar: () => void }) {
  return (
    <div
      role="alert"
      className="flex items-center gap-3 rounded-2xl border-2 border-red-300 bg-red-50 px-4 py-3 text-red-800 shadow-lg"
    >
      <span aria-hidden className="text-2xl">
        ⚠️
      </span>
      <p className="flex-1 text-sm font-semibold">{mensagem}</p>
      <button
        type="button"
        onClick={aoFechar}
        aria-label="Fechar o aviso de erro"
        className="min-h-[44px] rounded-xl px-4 text-sm font-bold active:bg-red-100"
      >
        Fechar
      </button>
    </div>
  )
}

function FaixaDeAviso({ texto }: { texto: string }) {
  return (
    <p
      role="status"
      className="rounded-2xl bg-orange-500 px-4 py-3 text-center text-lg font-bold text-white shadow-lg"
    >
      {texto}
    </p>
  )
}

function DialogoDeReset({
  aberto,
  ocupado,
  aoMudar,
  aoConfirmar,
}: {
  aberto: boolean
  ocupado: boolean
  aoMudar: (aberto: boolean) => void
  aoConfirmar: () => void
}) {
  return (
    <Dialog open={aberto} onOpenChange={aoMudar}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle className="text-xl">🔄 Recomeçar o dia?</DialogTitle>
          <DialogDescription className="text-base">
            Todas as tarefas de hoje voltam para a coluna Para Fazer e os pontos ganhos hoje são
            devolvidos. Os outros dias não mudam.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="flex gap-3">
          <Button
            type="button"
            onClick={() => aoMudar(false)}
            className="h-14 flex-1 border border-gray-300 bg-gray-100 text-base font-semibold text-gray-800 hover:bg-gray-100 active:bg-gray-200"
          >
            Não, deixa como está
          </Button>
          <Button
            type="button"
            onClick={aoConfirmar}
            disabled={ocupado}
            className="h-14 flex-1 bg-red-600 text-base font-bold text-white hover:bg-red-600 active:scale-[0.98] active:bg-red-700"
          >
            {ocupado ? 'Recomeçando…' : 'Sim, recomeçar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

/**
 * "Quem fez?" — o modal que abre ao tocar numa tarefa.
 *
 * Por que sempre abre, mesmo com alguém já escolhido lá em cima: num painel
 * compartilhado a seleção fica grudada da criança anterior, e a tarefa acabava
 * creditada para quem não fez. Aqui a escolha é sempre deliberada, e quem já
 * marcou aparece desabilitado — é a resposta para "ele já escovou?".
 */
function ModalQuemFez({
  item,
  membros,
  preSelecionadoId,
  aoFechar,
  aoConfirmar,
}: {
  item: DayItem | null
  membros: Member[]
  preSelecionadoId: string | null
  aoFechar: () => void
  aoConfirmar: (item: DayItem, membroIds: string[]) => void
}) {
  const [escolhidos, setEscolhidos] = useState<string[]>([])

  // Reabrir o modal noutra tarefa não pode herdar a escolha da anterior.
  useEffect(() => {
    if (!item) return
    const jaMarcou = new Set(item.completions.map((c) => c.memberId))
    setEscolhidos(preSelecionadoId && !jaMarcou.has(preSelecionadoId) ? [preSelecionadoId] : [])
  }, [item, preSelecionadoId])

  if (!item) return null

  const candidatos = membros.filter((m) => m.role === item.audience)
  const jaMarcou = new Map(item.completions.map((c) => [c.memberId, c] as const))
  const varios = item.completionMode === 'cada_um'

  const alternar = (id: string) =>
    setEscolhidos((atuais) =>
      atuais.includes(id)
        ? atuais.filter((x) => x !== id)
        : varios
          ? [...atuais, id]
          : [id],
    )

  return (
    <Dialog open onOpenChange={(aberto) => !aberto && aoFechar()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-xl">
            <span aria-hidden className="mr-2">
              {item.icon}
            </span>
            Quem fez {item.name}?
          </DialogTitle>
          <DialogDescription>
            {varios
              ? 'Cada um marca a sua — dá para escolher mais de uma pessoa.'
              : 'Basta uma pessoa marcar esta tarefa.'}
          </DialogDescription>
        </DialogHeader>

        <ul className="grid gap-2">
          {candidatos.map((membro) => {
            const marca = jaMarcou.get(membro.id)
            const escolhido = escolhidos.includes(membro.id)
            return (
              <li key={membro.id}>
                <button
                  type="button"
                  disabled={Boolean(marca)}
                  aria-pressed={escolhido}
                  onClick={() => alternar(membro.id)}
                  className={cn(
                    'flex min-h-[64px] w-full items-center gap-3 rounded-2xl border-2 p-3 text-left transition-colors',
                    'focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-purple-300',
                    marca && 'cursor-not-allowed border-emerald-200 bg-emerald-50 opacity-80',
                    !marca && escolhido && 'border-purple-500 bg-purple-50',
                    !marca && !escolhido && 'border-gray-200 bg-white active:bg-gray-50',
                  )}
                >
                  <span aria-hidden className="text-3xl">
                    {membro.avatar}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-base font-bold text-gray-900">{membro.name}</span>
                    {marca && (
                      <span className="block text-xs font-medium text-emerald-700">
                        já marcou{formatarHora(marca.at) ? ` às ${formatarHora(marca.at)}` : ''}
                      </span>
                    )}
                  </span>
                  {marca ? (
                    <Check aria-hidden className="h-6 w-6 shrink-0 text-emerald-600" />
                  ) : (
                    <span
                      aria-hidden
                      className={cn(
                        'flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2',
                        escolhido ? 'border-purple-500 bg-purple-500 text-white' : 'border-gray-300',
                      )}
                    >
                      {escolhido && <Check className="h-4 w-4" />}
                    </span>
                  )}
                </button>
              </li>
            )
          })}
        </ul>

        <DialogFooter className="gap-2 sm:justify-between">
          <Button variant="ghost" onClick={aoFechar} className="h-12">
            Cancelar
          </Button>
          <Button
            onClick={() => aoConfirmar(item, escolhidos)}
            disabled={escolhidos.length === 0}
            className="h-12 bg-gradient-to-r from-green-500 to-emerald-600 px-6 text-base font-bold text-white hover:bg-transparent active:scale-95"
          >
            {escolhidos.length > 1 ? `Marcar para ${escolhidos.length}` : 'Marcar como feita'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
