/**
 * Implementação de `FamilyData` sobre o Firestore.
 *
 * Este é o ÚNICO arquivo do app que fala 'firebase/firestore'. Quando a API própria
 * chegar, escreve-se um `http-family-data.ts` irmão e nenhuma tela muda.
 *
 * Convenção de armazenamento: os documentos usam snake_case, para conviver com as
 * coleções que já existem em produção (`task_templates` já grava `is_active`,
 * `created_at`, e o histórico já grava `completed_by`). O domínio é camelCase;
 * a tradução acontece só aqui.
 */

import {
  collection,
  doc,
  getDoc,
  getDocs,
  increment,
  onSnapshot,
  orderBy,
  query,
  runTransaction,
  serverTimestamp,
  setDoc,
  Timestamp,
  updateDoc,
  where,
  writeBatch,
  type DocumentData,
  type Firestore,
} from 'firebase/firestore'

import { obterDb } from '@/lib/firebase'
import { diaDaSemanaDaData } from './date'
import type { FamilyData } from './family-data'
import {
  DataError,
  type CompletionMode,
  type DataErrorCode,
  type Day,
  type DayItem,
  type Difficulty,
  type IsoDate,
  type IsoDateTime,
  type ItemCompletion,
  type ItemStatus,
  type Member,
  type MemberRole,
  type NewOneOffItemInput,
  type NewTemplateInput,
  type PeriodStats,
  type Recurrence,
  type TaskTemplate,
  type Unsubscribe,
} from './types'

// ---------------------------------------------------------------------------
// Membros semeados quando a coleção está vazia.
// Os ids são os mesmos que o histórico em produção já gravou em `completed_by`,
// para que nenhum dado antigo precise de tradução.
// ---------------------------------------------------------------------------

const MEMBROS_INICIAIS: Omit<Member, 'pointsTotal'>[] = [
  { id: 'louise', name: 'Louise', avatar: '👧', role: 'crianca', colorKey: 'louise', active: true, sortOrder: 1 },
  { id: 'benicio', name: 'Benício', avatar: '👦', role: 'crianca', colorKey: 'benicio', active: true, sortOrder: 2 },
  { id: 'adult1', name: 'Jon', avatar: '👨', role: 'adulto', colorKey: 'adult1', active: true, sortOrder: 3 },
  { id: 'adult2', name: 'Prin', avatar: '👩', role: 'adulto', colorKey: 'adult2', active: true, sortOrder: 4 },
]

// ---------------------------------------------------------------------------
// Conversão de erro — nenhum FirebaseError cru escapa da fronteira
// ---------------------------------------------------------------------------

function traduzirErro(erro: unknown, mensagem: string): DataError {
  if (erro instanceof DataError) return erro

  const codigoFirebase =
    typeof erro === 'object' && erro !== null && 'code' in erro
      ? String((erro as { code: unknown }).code)
      : ''

  let codigo: DataErrorCode = 'desconhecido'
  if (codigoFirebase === 'not-found') codigo = 'nao_encontrado'
  else if (codigoFirebase === 'aborted' || codigoFirebase === 'already-exists') codigo = 'conflito'
  else if (codigoFirebase === 'unavailable' || codigoFirebase === 'deadline-exceeded') codigo = 'indisponivel'
  else if (codigoFirebase === 'invalid-argument' || codigoFirebase === 'failed-precondition') codigo = 'invalido'

  // O log registra a causa real; a mensagem do domínio fica legível para a tela.
  console.error(`[family-data] ${mensagem}`, erro)
  return new DataError(codigo, mensagem, erro)
}

async function comErro<T>(mensagem: string, fn: () => Promise<T>): Promise<T> {
  try {
    return await fn()
  } catch (erro) {
    throw traduzirErro(erro, mensagem)
  }
}

// ---------------------------------------------------------------------------
// Conversão Firestore -> domínio
// ---------------------------------------------------------------------------

function paraIsoDateTime(valor: unknown): IsoDateTime | undefined {
  if (!valor) return undefined
  if (valor instanceof Timestamp) return valor.toDate().toISOString()
  if (valor instanceof Date) return valor.toISOString()
  if (typeof valor === 'string') return valor
  return undefined
}

/** Deriva o estado a partir das marcas — nunca é lido do banco. */
function calcularStatus(
  modo: CompletionMode,
  esperados: string[],
  marcas: ItemCompletion[],
): ItemStatus {
  if (marcas.length === 0) return 'pendente'
  if (modo === 'basta_um') return 'concluida'
  const feitos = new Set(marcas.map((m) => m.memberId))
  const faltando = esperados.filter((id) => !feitos.has(id))
  // Sem lista de esperados, uma marca já basta — é o que o dado antigo permite afirmar.
  if (esperados.length === 0) return 'concluida'
  return faltando.length === 0 ? 'concluida' : 'parcial'
}

function paraItem(bruto: DocumentData): DayItem {
  const pontos = Number(bruto.points ?? 0)

  // Formato novo: lista de marcas. Formato antigo (uma conclusão por item):
  // converte-se na leitura, para o histórico já gravado não se perder.
  const marcas: ItemCompletion[] = Array.isArray(bruto.completions)
    ? bruto.completions.map((c: DocumentData) => ({
        memberId: String(c.member_id),
        memberName: String(c.member_name ?? c.member_id),
        at: paraIsoDateTime(c.at) ?? new Date().toISOString(),
        points: Number(c.points ?? pontos),
      }))
    : bruto.status === 'concluida' && bruto.completed_by
      ? [
          {
            memberId: String(bruto.completed_by),
            memberName: String(bruto.completed_by_name ?? bruto.completed_by),
            at: paraIsoDateTime(bruto.completed_at) ?? new Date().toISOString(),
            points: Number(bruto.points_earned ?? pontos),
          },
        ]
      : []

  const modo: CompletionMode = bruto.completion_mode === 'cada_um' ? 'cada_um' : 'basta_um'
  const esperados: string[] = Array.isArray(bruto.expected_member_ids) ? bruto.expected_member_ids : []

  return {
    id: String(bruto.id),
    templateId: bruto.template_id ?? null,
    name: String(bruto.name ?? ''),
    icon: String(bruto.icon ?? '📋'),
    points: pontos,
    audience: (bruto.audience as MemberRole) ?? 'adulto',
    category: bruto.category ?? undefined,
    difficulty: (bruto.difficulty as Difficulty) ?? undefined,
    estimatedTime: bruto.estimated_time ?? undefined,
    completionMode: modo,
    expectedMemberIds: esperados,
    completions: marcas,
    status: calcularStatus(modo, esperados, marcas),
  }
}

function paraDia(bruto: DocumentData, data: IsoDate): Day {
  const itens = Array.isArray(bruto.items) ? bruto.items : []
  return {
    date: bruto.date ?? data,
    items: itens.map(paraItem),
    createdAt: paraIsoDateTime(bruto.created_at) ?? new Date().toISOString(),
    generatedBy: bruto.generated_by ?? 'panel',
  }
}

function paraTemplate(id: string, bruto: DocumentData): TaskTemplate {
  const pontos = Number(bruto.points ?? 0)
  return {
    id,
    name: String(bruto.name ?? ''),
    icon: String(bruto.icon ?? '📋'),
    points: pontos,
    // `audience` só existe a partir do schema v2; para docs antigos, deriva-se do
    // mesmo critério que a tela usava antes (pontos > 0 = criança).
    audience: (bruto.audience as MemberRole) ?? (pontos > 0 ? 'crianca' : 'adulto'),
    // Padrão para template sem o campo: criança faz a sua, adulto basta um.
    // É a regra que a casa já seguia antes de existir o interruptor.
    completionMode:
      bruto.completion_mode === 'cada_um' || bruto.completion_mode === 'basta_um'
        ? bruto.completion_mode
        : ((bruto.audience ?? (pontos > 0 ? 'crianca' : 'adulto')) === 'crianca'
            ? 'cada_um'
            : 'basta_um'),
    recurrence: (bruto.recurrence === 'weekly' ? 'weekly' : 'daily') as Recurrence,
    daysOfWeek: Array.isArray(bruto.days_of_week) ? bruto.days_of_week : [0, 1, 2, 3, 4, 5, 6],
    category: bruto.category ?? undefined,
    difficulty: (bruto.difficulty as Difficulty) ?? undefined,
    estimatedTime: bruto.estimated_time ?? undefined,
    isActive: bruto.is_active !== false,
    createdAt: paraIsoDateTime(bruto.created_at) ?? new Date().toISOString(),
    updatedAt: paraIsoDateTime(bruto.updated_at) ?? new Date().toISOString(),
    createdBy: String(bruto.created_by ?? 'system'),
  }
}

function paraMembro(id: string, bruto: DocumentData): Member {
  return {
    id,
    name: String(bruto.name ?? id),
    avatar: String(bruto.avatar ?? '🙂'),
    role: bruto.role === 'crianca' ? 'crianca' : 'adulto',
    colorKey: String(bruto.color_key ?? id),
    pointsTotal: Number(bruto.points_total ?? 0),
    active: bruto.active !== false,
    sortOrder: Number(bruto.sort_order ?? 99),
  }
}

/** Agrupa pontos por membro, para estornar tudo de uma pessoa numa escrita só. */
function somarPorMembro(marcas: ItemCompletion[]): Map<string, number> {
  const soma = new Map<string, number>()
  for (const m of marcas) {
    if (m.points > 0) soma.set(m.memberId, (soma.get(m.memberId) ?? 0) + m.points)
  }
  return soma
}

/** Firestore rejeita `undefined`; este helper remove as chaves ausentes. */
function semUndefined<T extends Record<string, unknown>>(objeto: T): Record<string, unknown> {
  const saida: Record<string, unknown> = {}
  for (const [chave, valor] of Object.entries(objeto)) {
    if (valor !== undefined) saida[chave] = valor
  }
  return saida
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
    completion_mode: item.completionMode,
    expected_member_ids: item.expectedMemberIds,
    // `status` NÃO é gravado: é derivado das marcas na leitura. Gravar um
    // derivado é criar duas fontes de verdade que um dia discordam.
    completions: item.completions.map((c) => ({
      member_id: c.memberId,
      member_name: c.memberName,
      // ATENÇÃO: `serverTimestamp()` é proibido dentro de array no Firestore.
      // Dentro de `items` o instante vem do cliente, por obrigação do banco.
      at: Timestamp.fromDate(new Date(c.at)),
      points: c.points,
    })),
  })
}

// ---------------------------------------------------------------------------
// Implementação
// ---------------------------------------------------------------------------

class FirestoreFamilyData implements FamilyData {
  private membrosSemeados = false
  private bancoMemorizado?: Firestore

  constructor(
    public readonly familyId: string,
    /** Injetável em teste. Fora de teste, resolve-se sozinho no primeiro uso. */
    private readonly bancoInjetado?: Firestore,
  ) {
    if (!familyId?.trim()) {
      throw new DataError('invalido', 'familyId vazio ao criar o módulo de dados')
    }
  }

  /**
   * A conexão só nasce na primeira operação — nem no import, nem na construção.
   * O provider é montado no layout e portanto instanciado também no prerender
   * do servidor; acordar o Firestore ali quebraria o build e não serviria para
   * nada, porque quem lê e escreve é sempre o navegador.
   */
  private get banco(): Firestore {
    if (!this.bancoMemorizado) {
      this.bancoMemorizado = this.bancoInjetado ?? obterDb()
    }
    return this.bancoMemorizado
  }

  // -- referências --

  private refDia(data: IsoDate) {
    return doc(this.banco, 'families', this.familyId, 'days', data)
  }

  private colDias() {
    return collection(this.banco, 'families', this.familyId, 'days')
  }

  private colTemplates() {
    return collection(this.banco, 'families', this.familyId, 'task_templates')
  }

  private refTemplate(id: string) {
    return doc(this.banco, 'families', this.familyId, 'task_templates', id)
  }

  private colMembros() {
    return collection(this.banco, 'families', this.familyId, 'members')
  }

  private refMembro(id: string) {
    return doc(this.banco, 'families', this.familyId, 'members', id)
  }

  // -- dia --

  async getDay(date: IsoDate): Promise<Day | null> {
    return comErro(`Não foi possível carregar o dia ${date}`, async () => {
      const snap = await getDoc(this.refDia(date))
      return snap.exists() ? paraDia(snap.data(), date) : null
    })
  }

  async ensureDay(date: IsoDate, origem: 'cron' | 'panel' = 'panel'): Promise<Day> {
    return comErro(`Não foi possível preparar o dia ${date}`, async () => {
      const existente = await this.getDay(date)
      if (existente) return existente

      // A query de templates precisa acontecer FORA da transação —
      // transação do Firestore não executa query, só leitura de documento.
      const templates = await this.listTemplates({ onlyActive: true })
      const diaSemana = diaDaSemanaDaData(date)
      const elegiveis = templates.filter(
        (t) => t.recurrence === 'daily' || t.daysOfWeek.includes(diaSemana),
      )

      // Um dia vazio NUNCA é gravado. Se a leitura dos templates vier vazia por
      // queda de rede, o SDK devolve `size=0` do cache em vez de falhar — e como
      // `ensureDay` é idempotente, o dia vazio persistido travaria o quadro pelo
      // dia inteiro. Devolve-se um dia transitório, não gravado, e a próxima
      // chamada tenta de novo.
      if (elegiveis.length === 0) {
        return {
          date,
          items: [],
          createdAt: new Date().toISOString(),
          generatedBy: origem,
        }
      }

      // Quem se espera que faça é congelado agora: quem entrar na família
      // amanhã não passa a dever a tarefa de hoje.
      const membros = await this.listMembers()
      const esperadosPorPapel = (papel: MemberRole) =>
        membros.filter((m) => m.active && m.role === papel).map((m) => m.id)

      const itens: DayItem[] = elegiveis.map((t) => ({
        id: t.id,
        templateId: t.id,
        name: t.name,
        icon: t.icon,
        points: t.points,
        audience: t.audience,
        category: t.category,
        difficulty: t.difficulty,
        estimatedTime: t.estimatedTime,
        completionMode: t.completionMode,
        expectedMemberIds: t.completionMode === 'cada_um' ? esperadosPorPapel(t.audience) : [],
        completions: [],
        status: 'pendente',
      }))

      const ref = this.refDia(date)
      return await runTransaction(this.banco, async (tx) => {
        const snap = await tx.get(ref)
        // Outro cliente (ou o cron) pode ter criado o dia entre a checagem e aqui.
        if (snap.exists()) return paraDia(snap.data(), date)

        tx.set(ref, {
          date,
          family_id: this.familyId,
          created_at: serverTimestamp(),
          generated_by: origem,
          template_ids_generated: elegiveis.map((t) => t.id),
          items: itens.map(itemParaFirestore),
        })

        return {
          date,
          items: itens,
          createdAt: new Date().toISOString(),
          generatedBy: origem,
        }
      })
    })
  }

  watchDay(
    date: IsoDate,
    onData: (day: Day | null) => void,
    onError?: (err: DataError) => void,
  ): Unsubscribe {
    return onSnapshot(
      this.refDia(date),
      (snap) => onData(snap.exists() ? paraDia(snap.data(), date) : null),
      (erro) => onError?.(traduzirErro(erro, `Perdi a conexão com o dia ${date}`)),
    )
  }

  async completeItem(date: IsoDate, itemId: string, memberIds: string[]): Promise<void> {
    const alvos = [...new Set(memberIds.filter(Boolean))]
    if (alvos.length === 0) {
      throw new DataError('invalido', 'Escolha pelo menos uma pessoa para marcar a tarefa')
    }

    await comErro('Não foi possível marcar a tarefa', async () => {
      const refDia = this.refDia(date)

      await runTransaction(this.banco, async (tx) => {
        // Toda leitura vem antes de toda escrita — exigência do Firestore.
        const snapDia = await tx.get(refDia)
        if (!snapDia.exists()) {
          throw new DataError('nao_encontrado', `O dia ${date} ainda não foi gerado`)
        }
        const snapsMembros = await Promise.all(alvos.map((id) => tx.get(this.refMembro(id))))

        const dia = paraDia(snapDia.data(), date)
        const item = dia.items.find((i) => i.id === itemId)
        if (!item) {
          throw new DataError('nao_encontrado', 'Tarefa não encontrada neste dia')
        }

        const jaMarcaram = new Set(item.completions.map((c) => c.memberId))
        const novos = alvos.filter((id) => !jaMarcaram.has(id))
        // Idempotente: quem já marcou não credita de novo.
        if (novos.length === 0) return
        // `basta_um` aceita uma marca só; a primeira que chegar encerra o item.
        if (item.completionMode === 'basta_um' && jaMarcaram.size > 0) return

        const agora = new Date().toISOString()
        const marcasNovas: ItemCompletion[] = novos.map((id) => {
          const snap = snapsMembros[alvos.indexOf(id)]
          return {
            memberId: id,
            memberName: snap.exists() ? String(snap.data().name ?? id) : id,
            at: agora,
            points: item.points,
          }
        })

        const itensAtualizados = dia.items.map((i) =>
          i.id === itemId ? { ...i, completions: [...i.completions, ...marcasNovas] } : i,
        )

        tx.update(refDia, { items: itensAtualizados.map(itemParaFirestore) })
        for (const marca of marcasNovas) {
          if (marca.points > 0) {
            tx.set(this.refMembro(marca.memberId), { points_total: increment(marca.points) }, { merge: true })
          }
        }
      })
    })
  }

  async uncompleteItem(date: IsoDate, itemId: string, memberId?: string): Promise<void> {
    await comErro('Não foi possível desfazer a marca', async () => {
      const refDia = this.refDia(date)

      await runTransaction(this.banco, async (tx) => {
        const snapDia = await tx.get(refDia)
        if (!snapDia.exists()) {
          throw new DataError('nao_encontrado', `O dia ${date} ainda não foi gerado`)
        }

        const dia = paraDia(snapDia.data(), date)
        const item = dia.items.find((i) => i.id === itemId)
        if (!item) {
          throw new DataError('nao_encontrado', 'Tarefa não encontrada neste dia')
        }

        // Sem memberId, desfaz de todo mundo.
        const removidas = memberId
          ? item.completions.filter((c) => c.memberId === memberId)
          : item.completions
        if (removidas.length === 0) return

        const restantes = item.completions.filter((c) => !removidas.includes(c))
        const itensAtualizados = dia.items.map((i) =>
          i.id === itemId ? { ...i, completions: restantes } : i,
        )

        tx.update(refDia, { items: itensAtualizados.map(itemParaFirestore) })
        for (const [membro, pontos] of somarPorMembro(removidas)) {
          tx.set(this.refMembro(membro), { points_total: increment(-pontos) }, { merge: true })
        }
      })
    })
  }

  async resetDay(date: IsoDate): Promise<void> {
    await comErro('Não foi possível resetar o dia', async () => {
      const refDia = this.refDia(date)

      await runTransaction(this.banco, async (tx) => {
        const snapDia = await tx.get(refDia)
        if (!snapDia.exists()) return

        const dia = paraDia(snapDia.data(), date)
        const estornoPorMembro = somarPorMembro(dia.items.flatMap((i) => i.completions))

        const itensZerados = dia.items.map((i) => ({
          ...i,
          completions: [],
          status: 'pendente' as const,
        }))

        tx.update(refDia, { items: itensZerados.map(itemParaFirestore) })
        for (const [membroId, pontos] of estornoPorMembro) {
          tx.set(this.refMembro(membroId), { points_total: increment(-pontos) }, { merge: true })
        }
      })
    })
  }

  async addOneOffItem(date: IsoDate, input: NewOneOffItemInput): Promise<DayItem> {
    return comErro('Não foi possível adicionar a tarefa', async () => {
      const modo: CompletionMode =
        input.completionMode ?? (input.audience === 'crianca' ? 'cada_um' : 'basta_um')
      const membros = modo === 'cada_um' ? await this.listMembers() : []

      const novo: DayItem = {
        id: `avulsa_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        templateId: null,
        name: input.name,
        icon: input.icon,
        points: input.points,
        audience: input.audience,
        category: input.category,
        completionMode: modo,
        expectedMemberIds: membros
          .filter((m) => m.active && m.role === input.audience)
          .map((m) => m.id),
        completions: [],
        status: 'pendente',
      }

      const refDia = this.refDia(date)
      await runTransaction(this.banco, async (tx) => {
        const snapDia = await tx.get(refDia)
        if (!snapDia.exists()) {
          throw new DataError('nao_encontrado', `O dia ${date} ainda não foi gerado`)
        }
        const dia = paraDia(snapDia.data(), date)
        tx.update(refDia, {
          items: [...dia.items, novo].map(itemParaFirestore),
        })
      })

      return novo
    })
  }

  async removeItem(date: IsoDate, itemId: string): Promise<void> {
    await comErro('Não foi possível remover a tarefa', async () => {
      const refDia = this.refDia(date)
      await runTransaction(this.banco, async (tx) => {
        const snapDia = await tx.get(refDia)
        if (!snapDia.exists()) return

        const dia = paraDia(snapDia.data(), date)
        const item = dia.items.find((i) => i.id === itemId)
        // Remover item já marcado estorna os pontos, senão o placar fica inflado.
        for (const [membro, pontos] of somarPorMembro(item?.completions ?? [])) {
          tx.set(this.refMembro(membro), { points_total: increment(-pontos) }, { merge: true })
        }

        tx.update(refDia, {
          items: dia.items.filter((i) => i.id !== itemId).map(itemParaFirestore),
        })
      })
    })
  }

  // -- templates --

  async listTemplates(opts?: { onlyActive?: boolean }): Promise<TaskTemplate[]> {
    return comErro('Não foi possível carregar as tarefas recorrentes', async () => {
      // Sem `orderBy` de propósito: combinado com o `where` exigiria índice
      // composto, e são poucas dezenas de documentos — ordena-se no cliente.
      const consulta = opts?.onlyActive
        ? query(this.colTemplates(), where('is_active', '==', true))
        : query(this.colTemplates())

      const snap = await getDocs(consulta)
      return snap.docs
        .map((d) => paraTemplate(d.id, d.data()))
        .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'))
    })
  }

  async createTemplate(input: NewTemplateInput, createdBy: string): Promise<TaskTemplate> {
    return comErro('Não foi possível criar a tarefa recorrente', async () => {
      const ref = doc(this.colTemplates())
      const agora = new Date().toISOString()

      await setDoc(
        ref,
        semUndefined({
          name: input.name,
          icon: input.icon,
          points: input.points,
          audience: input.audience,
          completion_mode: input.completionMode,
          recurrence: input.recurrence,
          days_of_week: input.daysOfWeek ?? [0, 1, 2, 3, 4, 5, 6],
          category: input.category,
          difficulty: input.difficulty,
          estimated_time: input.estimatedTime,
          is_active: true,
          created_at: serverTimestamp(),
          updated_at: serverTimestamp(),
          created_by: createdBy,
          family_id: this.familyId,
        }),
      )

      return {
        id: ref.id,
        name: input.name,
        icon: input.icon,
        points: input.points,
        audience: input.audience,
        completionMode: input.completionMode,
        recurrence: input.recurrence,
        daysOfWeek: input.daysOfWeek ?? [0, 1, 2, 3, 4, 5, 6],
        category: input.category,
        difficulty: input.difficulty,
        estimatedTime: input.estimatedTime,
        isActive: true,
        createdAt: agora,
        updatedAt: agora,
        createdBy,
      }
    })
  }

  async updateTemplate(id: string, patch: Partial<NewTemplateInput>): Promise<void> {
    await comErro('Não foi possível atualizar a tarefa recorrente', async () => {
      await updateDoc(
        this.refTemplate(id),
        semUndefined({
          name: patch.name,
          icon: patch.icon,
          points: patch.points,
          audience: patch.audience,
          completion_mode: patch.completionMode,
          recurrence: patch.recurrence,
          days_of_week: patch.daysOfWeek,
          category: patch.category,
          difficulty: patch.difficulty,
          estimated_time: patch.estimatedTime,
          updated_at: serverTimestamp(),
        }),
      )
    })
  }

  async setTemplateActive(id: string, active: boolean): Promise<void> {
    await comErro('Não foi possível ativar/desativar a tarefa', async () => {
      await updateDoc(this.refTemplate(id), {
        is_active: active,
        updated_at: serverTimestamp(),
      })
    })
  }

  // -- membros --

  /**
   * Semeia os 4 membros quando a coleção está vazia. Rede de segurança para
   * ambiente novo; em produção quem semeia é o script de migração.
   */
  private async semearMembrosSeVazio(): Promise<void> {
    if (this.membrosSemeados) return
    this.membrosSemeados = true

    const lote = writeBatch(this.banco)
    for (const membro of MEMBROS_INICIAIS) {
      lote.set(
        this.refMembro(membro.id),
        {
          name: membro.name,
          avatar: membro.avatar,
          role: membro.role,
          color_key: membro.colorKey,
          points_total: 0,
          active: membro.active,
          sort_order: membro.sortOrder,
        },
        { merge: true },
      )
    }
    await lote.commit()
  }

  async listMembers(): Promise<Member[]> {
    return comErro('Não foi possível carregar os membros da família', async () => {
      let snap = await getDocs(query(this.colMembros(), orderBy('sort_order')))

      if (snap.empty) {
        await this.semearMembrosSeVazio()
        snap = await getDocs(query(this.colMembros(), orderBy('sort_order')))
      }

      return snap.docs.map((d) => paraMembro(d.id, d.data()))
    })
  }

  watchMembers(
    onData: (members: Member[]) => void,
    onError?: (err: DataError) => void,
  ): Unsubscribe {
    return onSnapshot(
      query(this.colMembros(), orderBy('sort_order')),
      (snap) => {
        if (snap.empty) {
          // Semeia uma vez; o próprio listener recebe os documentos criados.
          void this.semearMembrosSeVazio().catch((erro) =>
            onError?.(traduzirErro(erro, 'Não foi possível criar os membros da família')),
          )
          onData([])
          return
        }
        onData(snap.docs.map((d) => paraMembro(d.id, d.data())))
      },
      (erro) => onError?.(traduzirErro(erro, 'Perdi a conexão com os membros da família')),
    )
  }

  async updateMember(
    id: string,
    patch: Partial<Pick<Member, 'name' | 'avatar' | 'colorKey' | 'active' | 'sortOrder'>>,
  ): Promise<void> {
    await comErro('Não foi possível atualizar o membro', async () => {
      await updateDoc(
        this.refMembro(id),
        semUndefined({
          name: patch.name,
          avatar: patch.avatar,
          color_key: patch.colorKey,
          active: patch.active,
          sort_order: patch.sortOrder,
        }),
      )
    })
  }

  // -- histórico --

  async getDaysInRange(start: IsoDate, end: IsoDate): Promise<Day[]> {
    return comErro('Não foi possível carregar o histórico', async () => {
      const snap = await getDocs(
        query(this.colDias(), where('date', '>=', start), where('date', '<=', end), orderBy('date')),
      )
      return snap.docs.map((d) => paraDia(d.data(), d.id))
    })
  }

  async getStats(start: IsoDate, end: IsoDate): Promise<PeriodStats> {
    const dias = await this.getDaysInRange(start, end)
    const itens = dias.flatMap((d) => d.items)

    const concluidos = itens.filter((i) => i.status === 'concluida')
    // Uma tarefa que cada criança faz a sua vale UMA marca por criança: contar
    // itens esconderia metade do esforço.
    const marcas = itens.flatMap((i) => i.completions)
    const byCategory: Record<string, number> = {}
    const byMember: Record<string, { count: number; points: number }> = {}

    for (const item of itens) {
      if (item.category) {
        byCategory[item.category] = (byCategory[item.category] ?? 0) + 1
      }
    }

    for (const marca of marcas) {
      const atual = byMember[marca.memberId] ?? { count: 0, points: 0 }
      byMember[marca.memberId] = { count: atual.count + 1, points: atual.points + marca.points }
    }

    return {
      totalItems: itens.length,
      completedItems: concluidos.length,
      pendingItems: itens.length - concluidos.length,
      completionRate: itens.length > 0 ? Math.round((concluidos.length / itens.length) * 100) : 0,
      pointsEarned: marcas.reduce((soma, m) => soma + m.points, 0),
      byCategory,
      byMember,
    }
  }

}

/** Fábrica — a primitiva. O provider React é só açúcar em cima disto. */
export function createFirestoreFamilyData(familyId: string): FamilyData {
  return new FirestoreFamilyData(familyId)
}

/**
 * Ids de todas as famílias. Usado pelo cron, que precisa varrer todas —
 * mora aqui para nenhuma rota precisar importar 'firebase/firestore'.
 */
export async function listFamilyIds(): Promise<string[]> {
  return comErro('Não foi possível listar as famílias', async () => {
    const snap = await getDocs(collection(obterDb(), 'families'))
    return snap.docs.map((d) => d.id)
  })
}

export type { FirestoreFamilyData }
