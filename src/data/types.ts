/**
 * Tipos de domínio do módulo de dados.
 *
 * REGRA DURA: este arquivo não importa NADA de 'firebase/*'.
 * Instantes são strings ISO 8601 e datas de calendário são `IsoDate` de propósito —
 * assim este contrato já é o payload da futura API própria, sem conversão.
 */

/** Data de calendário no fuso da família, formato `YYYY-MM-DD`. */
export type IsoDate = string

/** Instante em ISO 8601 com offset, ex.: `2026-08-22T14:03:00.000-03:00`. */
export type IsoDateTime = string

/** Cancelador de subscrição. Tipo próprio — não é o `Unsubscribe` do Firebase. */
export type Unsubscribe = () => void

export type MemberRole = 'crianca' | 'adulto'
export type Recurrence = 'daily' | 'weekly'
export type Difficulty = 'easy' | 'medium' | 'hard'

/**
 * Quem precisa fazer a tarefa para ela contar como pronta.
 * `cada_um`: toda criança escova os próprios dentes — cada uma marca a sua e
 * cada uma ganha os pontos. `basta_um`: quem lavou a louça, lavou.
 */
export type CompletionMode = 'cada_um' | 'basta_um'

/** `parcial` só existe em `cada_um`: alguém já fez, mas ainda falta gente. */
export type ItemStatus = 'pendente' | 'parcial' | 'concluida'

/** Uma marca de conclusão. Um item pode ter várias, uma por pessoa. */
export interface ItemCompletion {
  memberId: string
  memberName: string
  at: IsoDateTime
  /** Pontos congelados no momento da marca. */
  points: number
}

export interface Member {
  id: string
  name: string
  /** Emoji. Continua sendo a reserva quando não há foto. */
  avatar: string
  /**
   * Foto do membro como data URI, já cortada em quadrado e reduzida no
   * navegador antes de salvar. Vai embutida no documento de propósito: no
   * tamanho de avatar são ~20 KB, e assim ela chega junto com o nome e o
   * placar, sem serviço novo, sem regra nova e sem uma segunda requisição.
   */
  photo?: string
  role: MemberRole
  /** Chave de tema resolvida para classes pela UI — nunca cor hardcoded. */
  colorKey: string
  pointsTotal: number
  active: boolean
  sortOrder: number
}

export interface TaskTemplate {
  id: string
  name: string
  icon: string
  points: number
  audience: MemberRole
  completionMode: CompletionMode
  recurrence: Recurrence
  /** 0=domingo .. 6=sábado. Relevante quando `recurrence === 'weekly'`. */
  daysOfWeek: number[]
  category?: string
  difficulty?: Difficulty
  estimatedTime?: number
  isActive: boolean
  createdAt: IsoDateTime
  updatedAt: IsoDateTime
  createdBy: string
}

/**
 * Item de um dia. É um snapshot denormalizado do template no momento da geração:
 * editar um template amanhã não reescreve o histórico de ontem.
 */
export interface DayItem {
  id: string
  /** `null` quando é tarefa avulsa, criada só para aquele dia. */
  templateId: string | null
  name: string
  icon: string
  points: number
  audience: MemberRole
  category?: string
  difficulty?: Difficulty
  estimatedTime?: number
  completionMode: CompletionMode
  /**
   * Quem se espera que faça, capturado na geração do dia. É snapshot de
   * propósito: entrar um membro novo amanhã não muda o que ontem cobrava.
   * Vazio quando `completionMode === 'basta_um'`.
   */
  expectedMemberIds: string[]
  /** Uma entrada por pessoa que marcou. */
  completions: ItemCompletion[]
  /** Derivado de `completions` e `expectedMemberIds` — nunca gravado. */
  status: ItemStatus
}

export interface Day {
  date: IsoDate
  items: DayItem[]
  createdAt: IsoDateTime
  generatedBy: 'cron' | 'panel' | 'migration'
}

export interface NewTemplateInput {
  name: string
  icon: string
  points: number
  audience: MemberRole
  completionMode: CompletionMode
  recurrence: Recurrence
  daysOfWeek?: number[]
  category?: string
  difficulty?: Difficulty
  estimatedTime?: number
}

export interface NewOneOffItemInput {
  name: string
  icon: string
  points: number
  audience: MemberRole
  completionMode?: CompletionMode
  category?: string
}

export interface PeriodStats {
  totalItems: number
  completedItems: number
  pendingItems: number
  /** 0 a 100. */
  completionRate: number
  pointsEarned: number
  byCategory: Record<string, number>
  byMember: Record<string, { count: number; points: number }>
}

export type DataErrorCode =
  | 'nao_encontrado'
  | 'conflito'
  | 'indisponivel'
  | 'invalido'
  | 'desconhecido'

/**
 * Erro do módulo de dados. O adapter traduz o erro do backend para cá —
 * nenhum `FirebaseError` cru escapa da fronteira.
 */
export class DataError extends Error {
  constructor(
    public readonly code: DataErrorCode,
    message: string,
    public readonly cause?: unknown,
  ) {
    super(message)
    this.name = 'DataError'
  }
}
