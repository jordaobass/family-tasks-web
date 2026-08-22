/**
 * Migração do modelo antigo para o esquema v2 (`docs/design-modulo-dados.md`, seção 5).
 *
 * O QUE ESTE SCRIPT FAZ
 *   - escolhe o `familyId` canônico e o imprime (vai para `NEXT_PUBLIC_FAMILY_ID`);
 *   - semeia `families/{canonico}/members` (louise, benicio, adult1, adult2);
 *   - unifica `task_templates` de TODAS as famílias no canônico, deduplicando por nome,
 *     e ACRESCENTA `audience` + `days_of_week`;
 *   - converte as tarefas permanentes (`families/*\/tasks`) em templates e, quando
 *     concluídas, também em `DayItem` no doc do dia da conclusão;
 *   - converte `task_instances` em `DayItem`, mesclando nos mesmos docs `days/{YYYY-MM-DD}`;
 *   - recalcula `points_total` de cada membro a partir dos dias gravados;
 *   - verifica contagens e pontos antes/depois e sai com código != 0 se divergir.
 *
 * O QUE ESTE SCRIPT NUNCA FAZ
 *   - não altera nem apaga `tasks`, `task_instances`, `daily_checks`;
 *   - não apaga `families/default_family` nem qualquer coleção antiga;
 *   - não sobrescreve item de dia que já existe (o que está no banco sempre vence).
 *   Apagar as coleções antigas é decisão manual do dono, dias depois — fora daqui.
 *
 * Uso:
 *   npm run migrate:firestore                                  # dry-run (padrão)
 *   npm run migrate:firestore:apply                            # escreve de verdade
 *   npx --yes tsx scripts/migrate-firestore.ts --family-id=XYZ # força o canônico
 *   npx --yes tsx scripts/migrate-firestore.ts --backup=backups/backup-....json
 *
 * Exige um backup presente (ver `scripts/backup-firestore.ts`) em QUALQUER modo.
 */

import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs'
import { resolve } from 'node:path'

import {
  doc,
  serverTimestamp,
  Timestamp,
  writeBatch,
  type DocumentData,
  type DocumentReference,
  type Firestore,
} from 'firebase/firestore'

import { FUSO_FAMILIA, ehDataValida, formatarDataFamilia } from '../src/data/date'
import type {
  DayItem,
  Difficulty,
  IsoDate,
  IsoDateTime,
  MemberRole,
} from '../src/data/types'
import {
  ErroCli,
  FAMILIA_PADRAO,
  descobrirFamilias,
  executar,
  flag,
  lerDocumento,
  lerSubcolecao,
  listaOpcao,
  opcao,
  titulo,
  type Conexao,
  type DocBruto,
  type Descoberta,
} from './firestore-cli'

// ---------------------------------------------------------------------------
// Constantes
// ---------------------------------------------------------------------------

/**
 * ESPELHO de `MEMBROS_INICIAIS` em `src/data/firestore-family-data.ts:60`.
 * Os ids são os mesmos que o histórico já gravou em `completed_by` — por isso nenhum
 * dado antigo precisa de tradução. Se mudar lá, mudar aqui.
 */
const MEMBROS = [
  { id: 'louise', name: 'Louise', avatar: '👧', role: 'crianca', colorKey: 'louise', sortOrder: 1 },
  { id: 'benicio', name: 'Benício', avatar: '👦', role: 'crianca', colorKey: 'benicio', sortOrder: 2 },
  { id: 'adult1', name: 'Jon', avatar: '👨', role: 'adulto', colorKey: 'adult1', sortOrder: 3 },
  { id: 'adult2', name: 'Prin', avatar: '👩', role: 'adulto', colorKey: 'adult2', sortOrder: 4 },
] as const

const NOME_ORFAO = '(template removido)'
const TAMANHO_LOTE = 400

// ---------------------------------------------------------------------------
// Conversão domínio <-> Firestore
// ESPELHO de `src/data/firestore-family-data.ts` (paraItem / itemParaFirestore).
// O armazenamento é snake_case; gravar camelCase aqui faria o app não enxergar o dado.
// ---------------------------------------------------------------------------

function semUndefined(objeto: Record<string, unknown>): Record<string, unknown> {
  const saida: Record<string, unknown> = {}
  for (const [chave, valor] of Object.entries(objeto)) {
    if (valor !== undefined) saida[chave] = valor
  }
  return saida
}

function paraData(valor: unknown): Date | null {
  if (valor instanceof Timestamp) return valor.toDate()
  if (valor instanceof Date) return valor
  if (typeof valor === 'number') return new Date(valor)
  if (typeof valor === 'string') {
    const data = new Date(valor)
    return Number.isNaN(data.getTime()) ? null : data
  }
  return null
}

function paraIsoDateTime(valor: unknown): IsoDateTime | undefined {
  return paraData(valor)?.toISOString()
}

function paraItemDominio(bruto: DocumentData): DayItem {
  return {
    id: String(bruto.id),
    templateId: bruto.template_id ?? null,
    name: String(bruto.name ?? ''),
    icon: String(bruto.icon ?? '📋'),
    points: Number(bruto.points ?? 0),
    audience: (bruto.audience as MemberRole) ?? 'adulto',
    category: bruto.category ?? undefined,
    difficulty: (bruto.difficulty as Difficulty) ?? undefined,
    estimatedTime: bruto.estimated_time ?? undefined,
    status: bruto.status === 'concluida' ? 'concluida' : 'pendente',
    completedBy: bruto.completed_by ?? undefined,
    completedByName: bruto.completed_by_name ?? undefined,
    completedAt: paraIsoDateTime(bruto.completed_at),
    pointsEarned: bruto.points_earned ?? undefined,
  }
}

function itemParaFirestore(item: DayItem): Record<string, unknown> {
  return semUndefined({
    id: item.id,
    template_id: item.templateId,
    name: item.name,
    icon: item.icon,
    points: item.points,
    audience: item.audience,
    category: item.category,
    difficulty: item.difficulty,
    estimated_time: item.estimatedTime,
    status: item.status,
    completed_by: item.completedBy,
    completed_by_name: item.completedByName,
    // `serverTimestamp()` é proibido dentro de array no Firestore — vai Timestamp mesmo.
    completed_at: item.completedAt ? Timestamp.fromDate(new Date(item.completedAt)) : undefined,
    points_earned: item.pointsEarned,
  })
}

// ---------------------------------------------------------------------------
// Backup obrigatório
// ---------------------------------------------------------------------------

function backupMaisRecente(pasta: string): string | null {
  if (!existsSync(pasta)) return null
  const arquivos = readdirSync(pasta)
    .filter((nome) => nome.startsWith('backup-') && nome.endsWith('.json'))
    .map((nome) => resolve(pasta, nome))
    .sort((a, b) => statSync(b).mtimeMs - statSync(a).mtimeMs)
  return arquivos[0] ?? null
}

/** A migração não roda sem backup — é a única forma de voltar atrás. */
function exigirBackup(projectId: string): void {
  const caminho = opcao('backup') ?? backupMaisRecente(resolve(process.cwd(), 'backups'))
  if (!caminho || !existsSync(caminho)) {
    throw new ErroCli(
      'Nenhum backup encontrado em ./backups. A migração não roda sem âncora de reversibilidade.\n' +
        '  Rode primeiro:  npm run backup:firestore',
    )
  }

  const conteudo = JSON.parse(readFileSync(caminho, 'utf8')) as {
    geradoEm?: string
    projectId?: string
    totalDocumentos?: number
  }
  if (conteudo.projectId && conteudo.projectId !== projectId) {
    throw new ErroCli(
      `O backup é do projeto "${conteudo.projectId}" e você está conectado em "${projectId}". ` +
        'Backup de outro projeto não protege nada — gere um novo.',
    )
  }

  const idade = Date.now() - new Date(conteudo.geradoEm ?? 0).getTime()
  console.log(`Backup: ${caminho}`)
  console.log(`  gerado em ${conteudo.geradoEm} · ${conteudo.totalDocumentos ?? '?'} documentos`)
  if (idade > 24 * 60 * 60 * 1000) console.log('  ! mais de 24h — considere gerar um novo antes de aplicar.')
}

// ---------------------------------------------------------------------------
// Carga da origem
// ---------------------------------------------------------------------------

interface ContagemFamilia {
  tarefas: number
  templates: number
  instancias: number
  checagens: number
  membros: number
  dias: number
}

interface Origem {
  tarefas: DocBruto[]
  templates: DocBruto[]
  instancias: DocBruto[]
  porFamilia: Map<string, ContagemFamilia>
}

async function carregarOrigem(db: Firestore, familias: string[]): Promise<Origem> {
  const origem: Origem = { tarefas: [], templates: [], instancias: [], porFamilia: new Map() }

  for (const familia of familias) {
    const [tarefas, templates, instancias, checagens, membros, dias] = await Promise.all([
      lerSubcolecao(db, familia, 'tasks'),
      lerSubcolecao(db, familia, 'task_templates'),
      lerSubcolecao(db, familia, 'task_instances'),
      lerSubcolecao(db, familia, 'daily_checks'),
      lerSubcolecao(db, familia, 'members'),
      lerSubcolecao(db, familia, 'days'),
    ])
    origem.tarefas.push(...tarefas)
    origem.templates.push(...templates)
    origem.instancias.push(...instancias)
    origem.porFamilia.set(familia, {
      tarefas: tarefas.length,
      templates: templates.length,
      instancias: instancias.length,
      checagens: checagens.length,
      membros: membros.length,
      dias: dias.length,
    })
  }
  return origem
}

function temDados(contagem: ContagemFamilia): boolean {
  return contagem.tarefas + contagem.templates + contagem.instancias + contagem.dias > 0
}

/**
 * Origem completamente vazia é sinal de projeto errado, não de "nada a fazer".
 * Sem esta guarda a migração imprimiria "conferido" com zero itens e sairia com código 0.
 */
function exigirOrigemNaoVazia(origem: Origem, projectId: string): void {
  const total = origem.tarefas.length + origem.templates.length + origem.instancias.length
  if (total > 0) return
  throw new ErroCli(
    `Nenhuma tarefa, template ou instância encontrada no projeto "${projectId}".\n` +
      '  Não há o que migrar — e "nada encontrado" quase sempre significa projeto ou família\n' +
      '  errados, não banco vazio. Confira o NEXT_PUBLIC_FIREBASE_PROJECT_ID e, se souber de\n' +
      '  uma família que a descoberta não achou, passe --familias=<id>.',
  )
}

/**
 * Escolhe o `familyId` canônico (design, passo 1) e **para** quando a escolha é ambígua —
 * errar aqui espalharia o histórico em duas famílias de novo.
 */
function escolherCanonico(descoberta: Descoberta, origem: Origem): string {
  const forcado = opcao('family-id')
  if (forcado) return forcado

  const comDados = [...origem.porFamilia].filter(([, c]) => temDados(c)).map(([familia]) => familia)
  if (comDados.length > 2 && !flag('aceitar-varias-familias')) {
    throw new ErroCli(
      `${comDados.length} famílias têm dados (${comDados.join(', ')}); o design previa no máximo 2.\n` +
        '  Confira antes de prosseguir e então escolha explicitamente: --family-id=<id>\n' +
        '  (ou --aceitar-varias-familias para unificar todas mesmo assim).',
    )
  }

  const idsDeUsuarios = [...new Set(descoberta.usuarios.map((u) => u.familyId).filter(Boolean))]
  if (idsDeUsuarios.length === 1) return idsDeUsuarios[0]
  if (idsDeUsuarios.length === 0) return FAMILIA_PADRAO
  throw new ErroCli(
    `${idsDeUsuarios.length} familyId diferentes entre os usuários (${idsDeUsuarios.join(', ')}).\n` +
      '  Escolha o canônico manualmente: --family-id=<id>',
  )
}

// ---------------------------------------------------------------------------
// Plano de templates
// ---------------------------------------------------------------------------

interface Snapshot {
  name: string
  icon: string
  points: number
  audience: MemberRole
  category?: string
  difficulty?: Difficulty
  estimatedTime?: number
}

interface PlanoTemplate {
  id: string
  rotulo: string
  acao: 'criar' | 'completar' | 'nada'
  dados: Record<string, unknown>
}

interface PlanoTemplates {
  planos: PlanoTemplate[]
  /** `familia/idAntigo` -> id do template no canônico. */
  destinoPorOrigem: Map<string, string>
  /** `familia/idAntigo` -> snapshot do PRÓPRIO doc de origem (fidelidade histórica). */
  snapshotPorOrigem: Map<string, Snapshot>
  duplicados: string[]
  recorrenciasEstranhas: Map<string, number>
}

function normalizarNome(nome: string): string {
  return nome
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // remove acentos: "Benício" e "Benicio" são o mesmo nome
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ')
}

function audienciaDe(pontos: number): MemberRole {
  return pontos > 0 ? 'crianca' : 'adulto'
}

/** `daily` (e tudo que o app trata como diário) -> a semana toda; `weekly` -> sábado. */
function diasDaSemanaDe(recorrencia: unknown): number[] {
  return recorrencia === 'weekly' ? [6] : [0, 1, 2, 3, 4, 5, 6]
}

function snapshotDe(dados: DocumentData): Snapshot {
  const pontos = Number(dados.points ?? 0)
  return {
    name: String(dados.name ?? '').trim(),
    icon: String(dados.icon ?? '📋'),
    points: pontos,
    audience: (dados.audience as MemberRole) ?? audienciaDe(pontos),
    category: dados.category ?? undefined,
    difficulty: (dados.difficulty as Difficulty) ?? undefined,
    estimatedTime: dados.estimated_time ?? undefined,
  }
}

/** Documento completo de template a criar no canônico, a partir de um doc de origem. */
function templateParaFirestore(fonte: DocBruto, colecao: string, canonico: string): Record<string, unknown> {
  const dados = fonte.dados
  const pontos = Number(dados.points ?? 0)
  const recorrencia = dados.recurrence ?? 'daily'
  return semUndefined({
    name: String(dados.name ?? '').trim() || `(sem nome) ${fonte.id}`,
    icon: dados.icon ?? '📋',
    points: pontos,
    audience: dados.audience ?? audienciaDe(pontos),
    recurrence: recorrencia,
    days_of_week: dados.days_of_week ?? diasDaSemanaDe(recorrencia),
    category: dados.category ?? undefined,
    difficulty: dados.difficulty ?? undefined,
    estimated_time: dados.estimated_time ?? undefined,
    is_active: dados.is_active !== false,
    created_at: dados.created_at ?? Timestamp.now(),
    updated_at: dados.updated_at ?? dados.created_at ?? Timestamp.now(),
    created_by: dados.created_by ?? 'migracao',
    family_id: canonico,
    migrado_de: `${fonte.familia}/${colecao}/${fonte.id}`,
  })
}

/** O app só entende `daily` e `weekly`; o resto ele trata como diário. Conta para o relatório. */
function anotarRecorrencia(fonte: DocBruto, estado: PlanoTemplates): void {
  const recorrencia = String(fonte.dados.recurrence ?? 'daily')
  if (recorrencia === 'daily' || recorrencia === 'weekly') return
  const atual = estado.recorrenciasEstranhas.get(recorrencia) ?? 0
  estado.recorrenciasEstranhas.set(recorrencia, atual + 1)
}

type ColecaoOrigem = 'task_templates' | 'tasks'

/** Decide o que fazer com um doc de origem: reaproveitar o nome já visto, ou virar template. */
function classificar(
  fonte: DocBruto, colecao: ColecaoOrigem, canonico: string,
  estado: PlanoTemplates, porNome: Map<string, string>,
): void {
  const rotulo = `${fonte.familia}/${colecao}/${fonte.id}`
  const noCanonico = fonte.familia === canonico && colecao === 'task_templates'
  const chaveOrigem = `${fonte.familia}/${fonte.id}`
  estado.snapshotPorOrigem.set(chaveOrigem, snapshotDe(fonte.dados))
  anotarRecorrencia(fonte, estado)

  const nome = String(fonte.dados.name ?? '').trim() || `(sem nome) ${fonte.id}`
  const chaveNome = normalizarNome(nome)
  const jaVisto = porNome.get(chaveNome)
  if (jaVisto) {
    estado.destinoPorOrigem.set(chaveOrigem, jaVisto)
    estado.duplicados.push(`${rotulo} → reaproveita o template "${nome}" (${jaVisto})`)
    return
  }

  // Id determinístico = id do doc de origem, para re-rodar não duplicar.
  porNome.set(chaveNome, fonte.id)
  estado.destinoPorOrigem.set(chaveOrigem, fonte.id)
  estado.planos.push(
    noCanonico
      ? planoDeCompletar(fonte, rotulo)
      : { id: fonte.id, rotulo, acao: 'criar', dados: templateParaFirestore(fonte, colecao, canonico) },
  )
}

/** Template que já vive no canônico: só ACRESCENTA os campos novos, e só se faltarem. */
function planoDeCompletar(fonte: DocBruto, rotulo: string): PlanoTemplate {
  const falta = semUndefined({
    audience: fonte.dados.audience === undefined ? audienciaDe(Number(fonte.dados.points ?? 0)) : undefined,
    days_of_week: fonte.dados.days_of_week === undefined ? diasDaSemanaDe(fonte.dados.recurrence) : undefined,
  })
  const acao = Object.keys(falta).length > 0 ? 'completar' : 'nada'
  return { id: fonte.id, rotulo, acao, dados: falta }
}

/**
 * Unifica os templates de todas as famílias no canônico, deduplicando por nome
 * normalizado. Ordem fixa (canônico → demais famílias → tarefas permanentes) para que
 * duas execuções produzam exatamente o mesmo resultado.
 */
function planejarTemplates(origem: Origem, canonico: string): PlanoTemplates {
  const estado: PlanoTemplates = {
    planos: [],
    destinoPorOrigem: new Map(),
    snapshotPorOrigem: new Map(),
    duplicados: [],
    recorrenciasEstranhas: new Map(),
  }
  const porNome = new Map<string, string>()
  const ordenar = (docs: DocBruto[]) =>
    [...docs].sort((a, b) => `${a.familia}/${a.id}`.localeCompare(`${b.familia}/${b.id}`))

  const doCanonico = ordenar(origem.templates.filter((t) => t.familia === canonico))
  const deOutras = ordenar(origem.templates.filter((t) => t.familia !== canonico))

  for (const fonte of doCanonico) classificar(fonte, 'task_templates', canonico, estado, porNome)
  for (const fonte of deOutras) classificar(fonte, 'task_templates', canonico, estado, porNome)
  for (const fonte of ordenar(origem.tarefas)) classificar(fonte, 'tasks', canonico, estado, porNome)

  return estado
}

// ---------------------------------------------------------------------------
// Plano dos dias
// ---------------------------------------------------------------------------

type FonteItem = 'existente' | 'tarefa' | 'instancia'

interface ItemDoDia {
  item: DayItem
  fonte: FonteItem
}

type PlanoDias = Map<IsoDate, Map<string, ItemDoDia>>

interface Esperado {
  data: IsoDate
  id: string
  fonte: 'tarefa' | 'instancia'
  rotulo: string
  concluido: boolean
  membro?: string
  pontos: number
}

interface PlanoMigracao {
  dias: PlanoDias
  /** Só os dias que a migração de fato muda — os demais não são reescritos. */
  diasAlterados: Set<IsoDate>
  esperados: Esperado[]
  /** Itens de tarefa permanente removidos porque a instância do mesmo dia+template venceu. */
  substituidos: Set<string>
  avisos: string[]
  naoMigrados: string[]
  tarefasPendentes: number
}

function chaveItem(data: IsoDate, id: string): string {
  return `${data}#${id}`
}

/**
 * Data de calendário de um documento antigo, em America/Sao_Paulo.
 * NUNCA `toISOString()`: ele é UTC e jogaria tudo depois das 21h para o dia seguinte.
 */
function dataDoDocumento(dados: DocumentData, campos: string[]): { data: IsoDate; campo: string } | null {
  for (const campo of campos) {
    const instante = paraData(dados[campo])
    if (instante) return { data: formatarDataFamilia(instante), campo }
  }
  return null
}

/**
 * Insere respeitando duas regras: o que já está no banco vence (idempotência — re-rodar
 * nunca sobrescreve estado vivo); e instância vence tarefa permanente no mesmo dia+template.
 */
function inserirItem(plano: PlanoMigracao, data: IsoDate, entrada: ItemDoDia): void {
  const doDia = plano.dias.get(data) ?? new Map<string, ItemDoDia>()
  plano.dias.set(data, doDia)
  if (doDia.has(entrada.item.id)) return

  if (entrada.fonte === 'instancia' && entrada.item.templateId) {
    for (const [id, existente] of [...doDia]) {
      if (existente.fonte !== 'tarefa') continue
      if (existente.item.templateId !== entrada.item.templateId) continue
      doDia.delete(id)
      plano.substituidos.add(chaveItem(data, id))
    }
  }
  doDia.set(entrada.item.id, entrada)
  plano.diasAlterados.add(data)
}

function ehTarefaConcluida(dados: DocumentData): boolean {
  return dados.status === 'completed'
}

/** Tarefa permanente concluída vira um `DayItem` no dia em que foi concluída. */
function planejarTarefas(origem: Origem, templates: PlanoTemplates, plano: PlanoMigracao): void {
  for (const tarefa of origem.tarefas) {
    if (!ehTarefaConcluida(tarefa.dados)) {
      plano.tarefasPendentes += 1
      continue
    }
    const quando = dataDoDocumento(tarefa.dados, ['completed_at', 'updated_at', 'created_at'])
    if (!quando) {
      plano.naoMigrados.push(`tasks/${tarefa.id} (${tarefa.familia}): concluída sem nenhuma data`)
      continue
    }
    if (quando.campo !== 'completed_at') {
      plano.avisos.push(`tasks/${tarefa.id}: sem completed_at, usei ${quando.campo} → ${quando.data}`)
    }

    const snapshot = templates.snapshotPorOrigem.get(`${tarefa.familia}/${tarefa.id}`)
    const item = itemDeTarefa(tarefa, snapshot, templates)
    inserirItem(plano, quando.data, { item, fonte: 'tarefa' })
    plano.esperados.push({
      data: quando.data,
      id: item.id,
      fonte: 'tarefa',
      rotulo: `${tarefa.familia}/tasks/${tarefa.id}`,
      concluido: true,
      membro: item.completedBy,
      pontos: item.pointsEarned ?? 0,
    })
  }
}

function itemDeTarefa(tarefa: DocBruto, snapshot: Snapshot | undefined, templates: PlanoTemplates): DayItem {
  const base = snapshot ?? snapshotDe(tarefa.dados)
  return {
    // Id determinístico = id do doc antigo: re-rodar não duplica.
    id: tarefa.id,
    templateId: templates.destinoPorOrigem.get(`${tarefa.familia}/${tarefa.id}`) ?? null,
    ...base,
    status: 'concluida',
    completedBy: tarefa.dados.completed_by ?? undefined,
    completedByName: tarefa.dados.completed_by_name ?? undefined,
    completedAt: paraIsoDateTime(tarefa.dados.completed_at ?? tarefa.dados.updated_at),
    pointsEarned: base.points,
  }
}

/** Instância vira `DayItem` no `assigned_date`; órfã de template não é descartada. */
function planejarInstancias(origem: Origem, templates: PlanoTemplates, plano: PlanoMigracao): void {
  for (const instancia of origem.instancias) {
    const data = dataDaInstancia(instancia, plano)
    if (!data) continue

    const item = itemDeInstancia(instancia, templates, plano)
    inserirItem(plano, data, { item, fonte: 'instancia' })
    plano.esperados.push({
      data,
      id: item.id,
      fonte: 'instancia',
      rotulo: `${instancia.familia}/task_instances/${instancia.id}`,
      concluido: item.status === 'concluida',
      membro: item.completedBy,
      pontos: item.status === 'concluida' ? (item.pointsEarned ?? item.points) : 0,
    })
  }
}

function dataDaInstancia(instancia: DocBruto, plano: PlanoMigracao): IsoDate | null {
  const atribuida = String(instancia.dados.assigned_date ?? '')
  // `assigned_date` já é data de calendário gravada pelo sistema antigo: preservada como
  // está. (O gerador antigo a calculava em UTC — ver README; corrigir aqui seria inventar.)
  if (ehDataValida(atribuida)) return atribuida

  const alternativa = dataDoDocumento(instancia.dados, ['created_at'])
  if (alternativa) {
    plano.avisos.push(`task_instances/${instancia.id}: assigned_date inválido, usei created_at → ${alternativa.data}`)
    return alternativa.data
  }
  plano.naoMigrados.push(`task_instances/${instancia.id} (${instancia.familia}): sem data utilizável`)
  return null
}

function itemDeInstancia(instancia: DocBruto, templates: PlanoTemplates, plano: PlanoMigracao): DayItem {
  const chaveOrigem = `${instancia.familia}/${String(instancia.dados.template_id ?? '')}`
  const snapshot = templates.snapshotPorOrigem.get(chaveOrigem)
  const concluida = instancia.dados.status === 'completed'
  const pontosGanhos = Number(instancia.dados.points_earned ?? snapshot?.points ?? 0)

  if (!snapshot) {
    plano.avisos.push(
      `task_instances/${instancia.id}: template ${instancia.dados.template_id} não existe → item "${NOME_ORFAO}"`,
    )
  }

  const base: Snapshot = snapshot ?? {
    name: NOME_ORFAO,
    icon: '❓',
    points: pontosGanhos,
    audience: audienciaDe(pontosGanhos),
  }
  return {
    id: instancia.id,
    templateId: snapshot ? (templates.destinoPorOrigem.get(chaveOrigem) ?? null) : null,
    ...base,
    status: concluida ? 'concluida' : 'pendente',
    completedBy: concluida ? (instancia.dados.completed_by ?? undefined) : undefined,
    completedByName: concluida ? (instancia.dados.completed_by_name ?? undefined) : undefined,
    completedAt: concluida ? paraIsoDateTime(instancia.dados.completed_at) : undefined,
    pointsEarned: concluida ? pontosGanhos : undefined,
  }
}

function carregarDiasExistentes(docs: DocBruto[], plano: PlanoMigracao): void {
  for (const dia of docs) {
    const itens = Array.isArray(dia.dados.items) ? dia.dados.items : []
    const doDia = new Map<string, ItemDoDia>()
    for (const bruto of itens) {
      const item = paraItemDominio(bruto as DocumentData)
      doDia.set(item.id, { item, fonte: 'existente' })
    }
    plano.dias.set(dia.id, doDia)
  }
}

// ---------------------------------------------------------------------------
// Escrita
// ---------------------------------------------------------------------------

interface Escrita {
  ref: DocumentReference
  dados: Record<string, unknown>
}

/** Toda escrita é `merge` — nunca destrói campo que este script não conhece. */
async function gravar(db: Firestore, escritas: Escrita[]): Promise<void> {
  for (let inicio = 0; inicio < escritas.length; inicio += TAMANHO_LOTE) {
    const lote = writeBatch(db)
    for (const escrita of escritas.slice(inicio, inicio + TAMANHO_LOTE)) {
      lote.set(escrita.ref, escrita.dados, { merge: true })
    }
    await lote.commit()
  }
}

async function escritasDaFamilia(db: Firestore, canonico: string): Promise<Escrita[]> {
  const atual = await lerDocumento(db, 'families', canonico)
  // `name` só entra se ainda não houver — não sobrescreve o nome que o dono já deu.
  const nome = atual.exists() && atual.data()?.name ? undefined : 'Família'
  return [
    {
      ref: doc(db, 'families', canonico),
      dados: semUndefined({
        name: nome,
        timezone: FUSO_FAMILIA,
        schema_version: 2,
        migrated_at: serverTimestamp(),
      }),
    },
  ]
}

function escritasDosMembros(db: Firestore, canonico: string): Escrita[] {
  // Sem `points_total` aqui: ele é gravado no fim, a partir dos dias, para não zerar
  // o placar por um instante nem clobberar o valor numa nova execução.
  return MEMBROS.map((membro) => ({
    ref: doc(db, 'families', canonico, 'members', membro.id),
    dados: {
      name: membro.name,
      avatar: membro.avatar,
      role: membro.role,
      color_key: membro.colorKey,
      active: true,
      sort_order: membro.sortOrder,
    },
  }))
}

function escritasDosTemplates(db: Firestore, canonico: string, templates: PlanoTemplates): Escrita[] {
  return templates.planos
    .filter((plano) => plano.acao !== 'nada')
    .map((plano) => ({
      ref: doc(db, 'families', canonico, 'task_templates', plano.id),
      dados: plano.dados,
    }))
}

function escritasDosDias(db: Firestore, canonico: string, plano: PlanoMigracao, existentes: Set<string>): Escrita[] {
  const escritas: Escrita[] = []
  for (const [data, doDia] of plano.dias) {
    // Dia que a migração não muda não é reescrito: segunda execução não toca no banco.
    if (!plano.diasAlterados.has(data)) continue
    const itens = [...doDia.values()].map((entrada) => entrada.item)
    const idsTemplate = itens.map((item) => item.templateId).filter((id): id is string => Boolean(id))
    escritas.push({
      ref: doc(db, 'families', canonico, 'days', data),
      dados: semUndefined({
        date: data,
        family_id: canonico,
        // `created_at`/`generated_by` só em doc novo — não reescreve a origem de um dia já criado.
        created_at: existentes.has(data) ? undefined : serverTimestamp(),
        generated_by: existentes.has(data) ? undefined : 'migration',
        template_ids_generated: [...new Set(idsTemplate)],
        items: itens.map(itemParaFirestore),
      }),
    })
  }
  return escritas
}

// ---------------------------------------------------------------------------
// Pontos e verificação
// ---------------------------------------------------------------------------

function somarPorMembro(entradas: Array<{ membro?: string; pontos: number }>): Map<string, number> {
  const soma = new Map<string, number>()
  for (const entrada of entradas) {
    if (!entrada.membro || entrada.pontos <= 0) continue
    soma.set(entrada.membro, (soma.get(entrada.membro) ?? 0) + entrada.pontos)
  }
  return soma
}

function pontosDosDias(dias: PlanoDias, filtro?: (data: IsoDate, item: DayItem) => boolean): Map<string, number> {
  const entradas: Array<{ membro?: string; pontos: number }> = []
  for (const [data, doDia] of dias) {
    for (const { item } of doDia.values()) {
      if (item.status !== 'concluida') continue
      if (filtro && !filtro(data, item)) continue
      entradas.push({ membro: item.completedBy, pontos: item.pointsEarned ?? item.points })
    }
  }
  return somarPorMembro(entradas)
}

function membrosEnvolvidos(...mapas: Map<string, number>[]): string[] {
  return [...new Set(mapas.flatMap((mapa) => [...mapa.keys()]))].sort((a, b) => a.localeCompare(b))
}

/**
 * Verificação obrigatória do design (passo 7). Divergência ⇒ NÃO prosseguir com o cutover.
 * `dias` aqui é o estado FINAL — relido do Firestore quando houve `--apply`.
 */
function verificar(plano: PlanoMigracao, dias: PlanoDias, relido: boolean, origem: Origem): boolean {
  const vivos = plano.esperados.filter((e) => !plano.substituidos.has(chaveItem(e.data, e.id)))
  const ausentes = vivos.filter((e) => !dias.get(e.data)?.has(e.id))
  const idsVivos = new Set(vivos.map((e) => chaveItem(e.data, e.id)))

  titulo(`Verificação obrigatória ${relido ? '(dias relidos do Firestore)' : '(simulação do dry-run)'}`)
  imprimirContagens(plano, origem, vivos.length, ausentes.length)

  const okPontos = conferirPontos(vivos, dias, idsVivos)
  if (ausentes.length > 0) {
    console.log('\n  Ausentes:')
    for (const item of ausentes.slice(0, 20)) console.log(`    - ${item.rotulo} (esperado em ${item.data})`)
    if (ausentes.length > 20) console.log(`    ... e mais ${ausentes.length - 20}`)
  }
  return ausentes.length === 0 && okPontos && plano.naoMigrados.length === 0
}

/** Contagens ANTES (origem crua) × DEPOIS (itens migrados), como pede o passo 7. */
function imprimirContagens(plano: PlanoMigracao, origem: Origem, vivos: number, ausentes: number): void {
  const tarefas = plano.esperados.filter((e) => e.fonte === 'tarefa')
  const instancias = plano.esperados.filter((e) => e.fonte === 'instancia')
  const substituidas = tarefas.filter((e) => plano.substituidos.has(chaveItem(e.data, e.id)))
  const concluidasNaOrigem = origem.tarefas.filter((t) => ehTarefaConcluida(t.dados)).length

  console.log(`  tarefas antigas concluídas (origem) ..... ${concluidasNaOrigem}`)
  console.log(`    itens migrados ........................ ${tarefas.length - substituidas.length}`)
  console.log(`    substituídas por instância do mesmo dia  ${substituidas.length}`)
  console.log(`    sem data utilizável (NÃO migradas) .... ${concluidasNaOrigem - tarefas.length}`)
  console.log(`  task_instances (origem) ................. ${origem.instancias.length}`)
  console.log(`    itens migrados ........................ ${instancias.length}`)
  console.log(`    sem data utilizável (NÃO migradas) .... ${origem.instancias.length - instancias.length}`)
  console.log(`  itens esperados no destino .............. ${vivos}`)
  console.log(`  itens ausentes no destino ............... ${ausentes}`)
}

function conferirPontos(vivos: Esperado[], dias: PlanoDias, idsVivos: Set<string>): boolean {
  const esperado = somarPorMembro(vivos.filter((e) => e.concluido))
  const apurado = pontosDosDias(dias, (data, item) => idsVivos.has(chaveItem(data, item.id)))

  console.log('\n  Pontos por membro (esperado da origem × apurado no destino):')
  let ok = true
  for (const membro of membrosEnvolvidos(esperado, apurado)) {
    const a = esperado.get(membro) ?? 0
    const b = apurado.get(membro) ?? 0
    if (a !== b) ok = false
    console.log(`    ${membro.padEnd(10)} ${String(a).padStart(6)} × ${String(b).padStart(6)}  ${a === b ? 'ok' : 'DIVERGE'}`)
  }
  if (membrosEnvolvidos(esperado, apurado).length === 0) console.log('    (nenhuma conclusão com membro identificado)')
  return ok
}

// ---------------------------------------------------------------------------
// Relatórios
// ---------------------------------------------------------------------------

function imprimirOrigem(origem: Origem, descoberta: Descoberta): void {
  titulo('Passo 0 — o que existe hoje')
  console.log(`  usuários: ${descoberta.usuarios.length}`)
  for (const usuario of descoberta.usuarios) {
    console.log(`    ${usuario.uid} → familyId="${usuario.familyId || '(vazio)'}"`)
  }
  console.log(`  famílias com documento: ${descoberta.comDocumento.join(', ') || '(nenhuma)'}`)
  for (const [familia, contagem] of origem.porFamilia) {
    const partes = Object.entries(contagem).map(([nome, n]) => `${nome}=${n}`)
    console.log(`    ${familia}: ${partes.join('  ')}${temDados(contagem) ? '' : '  (vazia)'}`)
  }
}

function imprimirPlano(templates: PlanoTemplates, plano: PlanoMigracao, canonico: string): void {
  titulo('Passos 2 a 5 — o que será escrito')
  const criar = templates.planos.filter((p) => p.acao === 'criar')
  const completar = templates.planos.filter((p) => p.acao === 'completar')
  console.log(`  members ..................... ${MEMBROS.length} docs (seed, merge)`)
  console.log(`  task_templates a criar ...... ${criar.length}`)
  console.log(`  task_templates a completar .. ${completar.length} (só audience/days_of_week)`)
  console.log(`  task_templates já prontos ... ${templates.planos.length - criar.length - completar.length}`)
  console.log(`  nomes duplicados unificados . ${templates.duplicados.length}`)
  console.log(`  docs days a gravar .......... ${plano.diasAlterados.size} (de ${plano.dias.size} dias no total)`)
  console.log(`  itens no total .............. ${[...plano.dias.values()].reduce((s, d) => s + d.size, 0)}`)
  console.log(`  tarefas pendentes (viram só template, sem item): ${plano.tarefasPendentes}`)
  console.log(`  família canônica ............ ${canonico}`)

  if (templates.recorrenciasEstranhas.size > 0) {
    console.log('\n  ! recorrências que o app trata como DIÁRIAS (revisar em /manage-tasks):')
    for (const [valor, n] of templates.recorrenciasEstranhas) console.log(`      ${valor}: ${n}`)
  }
  imprimirLista('Duplicados unificados', templates.duplicados)
  imprimirLista('Avisos', plano.avisos)
  imprimirLista('NÃO migrados (nada é descartado em silêncio)', plano.naoMigrados)
}

function imprimirLista(rotulo: string, itens: string[], limite = 25): void {
  if (itens.length === 0) return
  console.log(`\n  ${rotulo} (${itens.length}):`)
  for (const item of itens.slice(0, limite)) console.log(`    - ${item}`)
  if (itens.length > limite) console.log(`    ... e mais ${itens.length - limite}`)
}

// ---------------------------------------------------------------------------
// Execução
// ---------------------------------------------------------------------------

async function aplicar(
  db: Firestore,
  canonico: string,
  templates: PlanoTemplates,
  plano: PlanoMigracao,
  diasExistentes: Set<string>,
): Promise<PlanoDias> {
  titulo('Aplicando (--apply)')
  await gravar(db, await escritasDaFamilia(db, canonico))
  await gravar(db, escritasDosMembros(db, canonico))
  await gravar(db, escritasDosTemplates(db, canonico, templates))
  await gravar(db, escritasDosDias(db, canonico, plano, diasExistentes))
  console.log('  families, members, task_templates e days gravados.')

  // Relê os dias do Firestore: a verificação abaixo mede o que FICOU no banco,
  // não o que o plano em memória dizia que ia ficar.
  const relidos = await lerSubcolecao(db, canonico, 'days')
  const finais: PlanoMigracao = { ...plano, dias: new Map(), diasAlterados: new Set() }
  carregarDiasExistentes(relidos, finais)
  await recalcularPontos(db, canonico, finais.dias)
  return finais.dias
}

/** Passo 6: o placar acumulado sai dos dias gravados, não de um contador herdado. */
async function recalcularPontos(db: Firestore, canonico: string, dias: PlanoDias): Promise<void> {
  const totais = pontosDosDias(dias)
  await gravar(
    db,
    MEMBROS.map((membro) => ({
      ref: doc(db, 'families', canonico, 'members', membro.id),
      dados: { points_total: totais.get(membro.id) ?? 0 },
    })),
  )
  console.log(`  points_total recalculado: ${MEMBROS.map((m) => `${m.id}=${totais.get(m.id) ?? 0}`).join('  ')}`)
}

function planoVazio(): PlanoMigracao {
  return {
    dias: new Map(),
    diasAlterados: new Set(),
    esperados: [],
    substituidos: new Set(),
    avisos: [],
    naoMigrados: [],
    tarefasPendentes: 0,
  }
}

async function main({ db, projectId }: Conexao): Promise<number> {
  const aplicando = flag('apply')
  titulo(aplicando ? 'MIGRAÇÃO — MODO APPLY (escreve no Firestore)' : 'MIGRAÇÃO — DRY-RUN (não escreve nada)')
  exigirBackup(projectId)

  const descoberta = await descobrirFamilias(db, listaOpcao('familias'))
  const origem = await carregarOrigem(db, descoberta.candidatos)
  imprimirOrigem(origem, descoberta)
  exigirOrigemNaoVazia(origem, projectId)

  const canonico = escolherCanonico(descoberta, origem)
  const templates = planejarTemplates(origem, canonico)

  const diasExistentes = await lerSubcolecao(db, canonico, 'days')
  const plano = planoVazio()
  carregarDiasExistentes(diasExistentes, plano)
  planejarTarefas(origem, templates, plano)
  planejarInstancias(origem, templates, plano)
  imprimirPlano(templates, plano, canonico)

  const chavesExistentes = new Set(diasExistentes.map((dia) => dia.id))
  const finais = aplicando ? await aplicar(db, canonico, templates, plano, chavesExistentes) : plano.dias
  const ok = verificar(plano, finais, aplicando, origem)
  return concluir(ok, aplicando, canonico, plano)
}

function concluir(ok: boolean, aplicando: boolean, canonico: string, plano: PlanoMigracao): number {
  titulo('Resultado')
  console.log(`  familyId canônico: ${canonico}`)
  console.log(`  → coloque na Vercel:  NEXT_PUBLIC_FAMILY_ID=${canonico}`)
  console.log('    (NEXT_PUBLIC_* é embutido no BUILD — mudar a variável exige redeploy.)')

  if (!ok) {
    console.log('\n  DIVERGÊNCIA na verificação — NÃO PROSSIGA com o cutover.')
    if (plano.naoMigrados.length > 0) console.log(`  ${plano.naoMigrados.length} documento(s) sem data utilizável.`)
    console.log('  Investigue os itens listados acima antes de qualquer outra coisa.')
    return 1
  }
  console.log(aplicando ? '\n  Migração aplicada e conferida.' : '\n  Dry-run conferido. Rode de novo com --apply para escrever.')
  return 0
}

void executar(main)
