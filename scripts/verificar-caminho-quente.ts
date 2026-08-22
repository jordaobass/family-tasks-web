/**
 * Prova do caminho quente contra o emulador do Firestore.
 *
 * Exercita exatamente os defeitos que esta rodada existiu para corrigir:
 *  1. concluir tarefa -> RECARREGAR -> continua concluída (antes ressuscitava)
 *  2. pontos creditados de verdade no membro (antes só existiam na tela)
 *  3. desfazer -> RECARREGAR -> continua pendente E os pontos foram estornados
 *  4. resetar o dia -> RECARREGAR -> tudo pendente e placar zerado
 *  5. virada do dia -> o dia novo nasce vazio e o de ontem fica intacto
 *
 * "Recarregar" é simulado criando uma instância NOVA do módulo de dados, que
 * não compartilha nenhum estado em memória com a anterior — é o que um F5 faz.
 */

import { createFirestoreFamilyData } from '@/data/firestore-family-data'
import { hojeFamilia, somarDias } from '@/data/date'

const FAMILIA = `teste_${Date.now()}`
let falhas = 0

function verificar(descricao: string, condicao: boolean, detalhe = '') {
  const marca = condicao ? '  OK  ' : ' FALHA'
  console.log(`${marca} | ${descricao}${detalhe ? ` -> ${detalhe}` : ''}`)
  if (!condicao) falhas++
}

/** Instância nova = sessão nova. É a simulação do F5. */
function apósRecarregar() {
  return createFirestoreFamilyData(FAMILIA)
}

async function main() {
  const hoje = hojeFamilia()
  const amanha = somarDias(hoje, 1)
  console.log(`\nFamília de teste: ${FAMILIA}`)
  console.log(`Hoje (America/Sao_Paulo): ${hoje}\n`)

  // --- preparação: dois templates, um de criança e um de adulto ---
  const dados = createFirestoreFamilyData(FAMILIA)
  await dados.createTemplate(
    { name: 'Escovar os dentes', icon: '🦷', points: 10, audience: 'crianca', recurrence: 'daily' },
    'teste',
  )
  await dados.createTemplate(
    { name: 'Lavar a louça', icon: '🍽️', points: 0, audience: 'adulto', recurrence: 'daily' },
    'teste',
  )
  // Semeia os membros (louise, benicio, adult1, adult2).
  await dados.listMembers()

  // --- 1. o dia nasce a partir dos templates ---
  const dia = await dados.ensureDay(hoje)
  verificar('ensureDay gera o dia a partir dos templates', dia.items.length === 2, `${dia.items.length} itens`)

  const tarefaCrianca = dia.items.find((i) => i.audience === 'crianca')!
  verificar('item da criança carrega os pontos do template', tarefaCrianca.points === 10)

  // --- 2. ensureDay é idempotente (cron + painel podem correr juntos) ---
  const deNovo = await apósRecarregar().ensureDay(hoje)
  verificar('ensureDay chamado de novo NÃO duplica itens', deNovo.items.length === 2, `${deNovo.items.length} itens`)

  // --- 3. concluir -> recarregar -> persiste ---
  await dados.completeItem(hoje, tarefaCrianca.id, 'louise')

  const depoisDoF5 = apósRecarregar()
  const diaRecarregado = await depoisDoF5.getDay(hoje)
  const itemRecarregado = diaRecarregado!.items.find((i) => i.id === tarefaCrianca.id)!
  verificar(
    'CONCLUIR sobrevive ao recarregar',
    itemRecarregado.status === 'concluida',
    `status=${itemRecarregado.status}`,
  )
  verificar('registra quem concluiu', itemRecarregado.completedBy === 'louise', `por=${itemRecarregado.completedBy}`)
  verificar('congela os pontos ganhos', itemRecarregado.pointsEarned === 10, `pontos=${itemRecarregado.pointsEarned}`)

  const membrosDepois = await depoisDoF5.listMembers()
  const louise = membrosDepois.find((m) => m.id === 'louise')!
  verificar('pontos creditados no membro', louise.pointsTotal === 10, `total=${louise.pointsTotal}`)

  // --- 4. concluir de novo não credita em dobro ---
  await depoisDoF5.completeItem(hoje, tarefaCrianca.id, 'louise')
  const louiseDobro = (await apósRecarregar().listMembers()).find((m) => m.id === 'louise')!
  verificar('concluir duas vezes NÃO credita em dobro', louiseDobro.pointsTotal === 10, `total=${louiseDobro.pointsTotal}`)

  // --- 5. desfazer -> recarregar -> persiste e estorna ---
  await apósRecarregar().uncompleteItem(hoje, tarefaCrianca.id)

  const aposDesfazer = apósRecarregar()
  const diaDesfeito = await aposDesfazer.getDay(hoje)
  const itemDesfeito = diaDesfeito!.items.find((i) => i.id === tarefaCrianca.id)!
  verificar(
    'DESFAZER sobrevive ao recarregar (era o bug principal)',
    itemDesfeito.status === 'pendente',
    `status=${itemDesfeito.status}`,
  )
  const louiseEstornada = (await aposDesfazer.listMembers()).find((m) => m.id === 'louise')!
  verificar('pontos estornados no membro', louiseEstornada.pointsTotal === 0, `total=${louiseEstornada.pointsTotal}`)

  // --- 6. resetar o dia -> recarregar -> tudo pendente e placar zerado ---
  await apósRecarregar().completeItem(hoje, tarefaCrianca.id, 'benicio')
  await apósRecarregar().resetDay(hoje)

  const aposReset = apósRecarregar()
  const diaResetado = await aposReset.getDay(hoje)
  verificar(
    'RESETAR sobrevive ao recarregar',
    diaResetado!.items.every((i) => i.status === 'pendente'),
    `${diaResetado!.items.filter((i) => i.status === 'concluida').length} ainda concluídas`,
  )
  const benicio = (await aposReset.listMembers()).find((m) => m.id === 'benicio')!
  verificar('reset estorna os pontos do dia', benicio.pointsTotal === 0, `total=${benicio.pointsTotal}`)

  // --- 7. virada do dia ---
  await apósRecarregar().completeItem(hoje, tarefaCrianca.id, 'louise')
  const diaDeAmanha = await apósRecarregar().ensureDay(amanha)
  verificar(
    'o dia seguinte nasce com tudo pendente',
    diaDeAmanha.items.every((i) => i.status === 'pendente'),
  )
  const ontemAindaLa = await apósRecarregar().getDay(hoje)
  verificar(
    'o dia anterior continua existindo com o histórico',
    ontemAindaLa!.items.some((i) => i.status === 'concluida'),
  )

  // --- 8. estatística do período ---
  const stats = await apósRecarregar().getStats(hoje, amanha)
  verificar('estatística soma os dois dias', stats.totalItems === 4, `${stats.totalItems} itens`)
  verificar('estatística conta os pontos ganhos', stats.pointsEarned === 10, `${stats.pointsEarned} pontos`)
  verificar('estatística atribui ao membro certo', stats.byMember['louise']?.points === 10)

  console.log(`\n${falhas === 0 ? '✅ TODAS AS VERIFICAÇÕES PASSARAM' : `❌ ${falhas} VERIFICAÇÃO(ÕES) FALHARAM`}\n`)
  process.exit(falhas === 0 ? 0 : 1)
}

main().catch((erro) => {
  console.error('\n❌ Erro não tratado:', erro)
  process.exit(1)
})
