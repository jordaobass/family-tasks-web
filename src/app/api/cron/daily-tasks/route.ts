/**
 * Geração das tarefas do dia — o cron do painel.
 *
 * GET  = o cron da Vercel. A Vercel dispara **GET** nos cron jobs; antes toda a
 *        lógica morava no POST, então o cron nunca gerou uma única tarefa.
 *        Autenticado por `Authorization: Bearer ${CRON_SECRET}` — cabeçalho que a
 *        própria Vercel injeta quando a variável `CRON_SECRET` existe no projeto.
 * POST = disparo manual da tela `/admin/daily-tasks`. Aceita `?familyId=` opcional.
 *
 * Agendamento (`vercel.json`): `"5 3 * * *"`. O cron da Vercel roda em **UTC**, e
 * 03:05 UTC = 00:05 em America/Sao_Paulo (offset fixo −03:00, sem horário de verão
 * desde 2019). Os 5 minutos são folga para cold start. O valor antigo, `"0 0 * * *"`,
 * era meia-noite UTC = 21h no Brasil — geraria "o dia seguinte" ainda na noite anterior.
 * `vercel.json` é JSON puro e não aceita comentário; por isso a justificativa vive aqui.
 *
 * Por que os imports apontam para os arquivos e não para o barril `@/data`: o
 * `index.ts` reexporta `provider.tsx`, que é `'use client'`. Rota de servidor não pode
 * arrastar módulo de cliente — foi exatamente esse o defeito da versão anterior, que
 * importava dois serviços de `src/services/` marcados `'use client'`.
 *
 * As chaves da resposta seguem em inglês de propósito: é o contrato que a tela de
 * admin já consome (`success` / `results` / `errors: string[]`). Comentários, logs e
 * mensagens ficam em PT-BR.
 */

import { NextResponse, type NextRequest } from 'next/server'

import { hojeFamilia } from '@/data/date'
import { createFirestoreFamilyData, listFamilyIds } from '@/data/firestore-family-data'

export const dynamic = 'force-dynamic'

interface ResultadoGeracao {
  date: string
  totalFamilies: number
  processedFamilies: number
  daysCreated: number
  /** Itens materializados nos dias criados agora. Nome mantido para a tela de admin. */
  totalTasksCreated: number
  errors: string[]
}

function mensagemDoErro(erro: unknown): string {
  return erro instanceof Error ? erro.message : String(erro)
}

/**
 * Autenticação do cron.
 *
 * `?.trim()` sem fallback é proposital: segredo com valor padrão é o mesmo que não
 * ter segredo, e variável salva em branco vale como AUSENTE — com `||`/`??` a string
 * vazia passaria e o header viraria um `Bearer ` que qualquer chamador reproduz.
 * Variável ausente vira 500, nunca porta aberta, e não há pulo de checagem por
 * ambiente: em desenvolvimento a rota exige o mesmo Bearer que em produção.
 */
function negarSePreciso(req: NextRequest): NextResponse | null {
  const segredo = process.env.CRON_SECRET?.trim()

  if (!segredo) {
    console.error('[cron/daily-tasks] CRON_SECRET ausente ou em branco — chamada recusada')
    return NextResponse.json(
      { success: false, error: 'CRON_SECRET não configurada no ambiente' },
      { status: 500 },
    )
  }

  if (req.headers.get('authorization') !== `Bearer ${segredo}`) {
    return NextResponse.json({ success: false, error: 'Não autorizado' }, { status: 401 })
  }

  return null
}

/**
 * Garante o dia de uma família.
 *
 * O `getDay` antes do `ensureDay` existe só para o relatório saber distinguir
 * "criei agora" de "já existia" — `ensureDay` é idempotente e não duplicaria nada
 * se o painel já tivesse gerado o dia.
 */
async function garantirDiaDaFamilia(familyId: string, date: string) {
  const dados = createFirestoreFamilyData(familyId)

  if (await dados.getDay(date)) return { criouDia: false, itensGerados: 0 }

  const dia = await dados.ensureDay(date, 'cron')
  return { criouDia: true, itensGerados: dia.items.length }
}

/** Uma família que falha não pode abortar as outras: coleta o erro e segue. */
async function processarFamilias(familyIds: string[], date: string): Promise<ResultadoGeracao> {
  const errors: string[] = []
  let processedFamilies = 0
  let daysCreated = 0
  let totalTasksCreated = 0

  for (const familyId of familyIds) {
    try {
      const { criouDia, itensGerados } = await garantirDiaDaFamilia(familyId, date)
      if (criouDia) daysCreated++
      totalTasksCreated += itensGerados
      processedFamilies++
    } catch (erro) {
      // Log com a causa REAL e o familyId afetado — engolir a causa impede o diagnóstico.
      console.error(`[cron/daily-tasks] falha na família "${familyId}" em ${date}:`, erro)
      errors.push(`${familyId}: ${mensagemDoErro(erro)}`)
    }
  }

  return {
    date,
    totalFamilies: familyIds.length,
    processedFamilies,
    daysCreated,
    totalTasksCreated,
    errors,
  }
}

/** Falha total vira 500; falha parcial devolve 200 com a lista de erros no corpo. */
function statusDaGeracao(resultado: ResultadoGeracao): number {
  const todasFalharam = resultado.totalFamilies > 0 && resultado.processedFamilies === 0
  return todasFalharam ? 500 : 200
}

/** Família pedida por querystring só é aceita se existir — ver a nota de auth do POST. */
async function resolverFamilias(pedida: string | null): Promise<string[] | null> {
  const todas = await listFamilyIds()
  const alvo = pedida?.trim()

  if (!alvo) return todas
  return todas.includes(alvo) ? [alvo] : null
}

function montarResposta(
  resultado: ResultadoGeracao,
  inicio: Date,
  fim: Date,
): NextResponse {
  console.log(
    `[cron/daily-tasks] ${resultado.date}: ` +
      `${resultado.processedFamilies}/${resultado.totalFamilies} famílias, ` +
      `${resultado.daysCreated} dia(s) criado(s), ${resultado.totalTasksCreated} tarefa(s), ` +
      `${resultado.errors.length} erro(s)`,
  )

  return NextResponse.json(
    {
      success: resultado.errors.length === 0,
      message: `Geração de tarefas concluída para ${resultado.date}`,
      results: {
        ...resultado,
        executionTime: `${fim.getTime() - inicio.getTime()}ms`,
        startTime: inicio.toISOString(),
        endTime: fim.toISOString(),
      },
      timestamp: fim.toISOString(),
    },
    { status: statusDaGeracao(resultado) },
  )
}

async function executarGeracao(familyIdPedido: string | null): Promise<NextResponse> {
  const inicio = new Date()
  const date = hojeFamilia()
  const familias = await resolverFamilias(familyIdPedido)

  if (!familias) {
    return NextResponse.json(
      { success: false, error: `Família não encontrada: ${familyIdPedido?.trim()}` },
      { status: 404 },
    )
  }

  const resultado = await processarFamilias(familias, date)
  return montarResposta(resultado, inicio, new Date())
}

async function responderGeracao(familyIdPedido: string | null): Promise<NextResponse> {
  try {
    return await executarGeracao(familyIdPedido)
  } catch (erro) {
    console.error('[cron/daily-tasks] falha geral na geração:', erro)
    return NextResponse.json(
      { success: false, error: mensagemDoErro(erro), timestamp: new Date().toISOString() },
      { status: 500 },
    )
  }
}

/** O cron da Vercel. Sem o Bearer correto não passa — nem em desenvolvimento. */
export async function GET(req: NextRequest) {
  const negado = negarSePreciso(req)
  if (negado) return negado

  return responderGeracao(req.nextUrl.searchParams.get('familyId'))
}

/**
 * Disparo manual da tela de admin, com `?familyId=` opcional.
 *
 * NÃO exige o Bearer, e isso é decisão consciente: a tela é pública e roda no
 * navegador, então guardar o `CRON_SECRET` nela significaria embutir o segredo no
 * bundle — trocar uma porta aberta por um segredo vazado. O que este verbo faz é
 * `ensureDay`, que é idempotente e não destrutivo: no pior caso cria o documento do
 * dia que o próprio painel criaria ao abrir. Nada é apagado ou sobrescrito, e
 * `familyId` inexistente é recusado com 404, para chamada anônima não conseguir
 * criar documento sob id inventado. Se a tela de admin ganhar login, mover a
 * checagem para cá.
 */
export async function POST(req: NextRequest) {
  return responderGeracao(req.nextUrl.searchParams.get('familyId'))
}
