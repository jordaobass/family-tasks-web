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
export type ItemStatus = 'pendente' | 'concluida'
export type Difficulty = 'easy' | 'medium' | 'hard'

export interface Member {
  id: string
  name: string
  avatar: string
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
  status: ItemStatus
  completedBy?: string
  completedByName?: string
  completedAt?: IsoDateTime
  /** Pontos congelados na conclusão — imunes a edição posterior do template. */
  pointsEarned?: number
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
