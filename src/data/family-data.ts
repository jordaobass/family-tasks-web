/**
 * A fronteira única de acesso a dados da família.
 *
 * Toda tela fala com esta interface e com mais nada. Trocar o Firestore por uma API
 * própria depois é escrever outra implementação deste contrato — nenhuma tela muda.
 *
 * REGRA DURA: nenhum tipo do SDK do Firebase pode aparecer aqui.
 */

import type {
  Day,
  DataError,
  IsoDate,
  Member,
  NewOneOffItemInput,
  NewTemplateInput,
  PeriodStats,
  TaskTemplate,
  Unsubscribe,
} from './types'

export interface FamilyData {
  readonly familyId: string

  // ---- dia (o painel vive aqui) ----

  /**
   * Devolve o dia, criando-o a partir dos templates ativos se ainda não existir.
   * Idempotente: dois clientes chamando ao mesmo tempo geram um documento só.
   * `origem` só marca quem criou, para diagnóstico.
   */
  ensureDay(date: IsoDate, origem?: 'cron' | 'panel'): Promise<Day>

  getDay(date: IsoDate): Promise<Day | null>

  /**
   * Assina o dia. Emite o estado atual imediatamente e depois cada mudança.
   * `null` não é erro — significa "dia ainda não gerado"; reaja com `ensureDay`.
   */
  watchDay(
    date: IsoDate,
    onData: (day: Day | null) => void,
    onError?: (err: DataError) => void,
  ): Unsubscribe

  /** Conclui o item e credita os pontos ao membro, atomicamente. */
  completeItem(date: IsoDate, itemId: string, memberId: string): Promise<void>

  /** Devolve o item para pendente e estorna os pontos, atomicamente. */
  uncompleteItem(date: IsoDate, itemId: string): Promise<void>

  /** Zera o dia inteiro e estorna os pontos de todos os membros, atomicamente. */
  resetDay(date: IsoDate): Promise<void>

  /** Tarefa avulsa, que vale só para este dia e não vira template. */
  addOneOffItem(date: IsoDate, input: NewOneOffItemInput): Promise<DayItemCriado>

  removeItem(date: IsoDate, itemId: string): Promise<void>

  // ---- templates ----

  listTemplates(opts?: { onlyActive?: boolean }): Promise<TaskTemplate[]>
  createTemplate(input: NewTemplateInput, createdBy: string): Promise<TaskTemplate>
  updateTemplate(id: string, patch: Partial<NewTemplateInput>): Promise<void>
  setTemplateActive(id: string, active: boolean): Promise<void>

  // ---- membros ----

  listMembers(): Promise<Member[]>
  watchMembers(
    onData: (members: Member[]) => void,
    onError?: (err: DataError) => void,
  ): Unsubscribe
  updateMember(
    id: string,
    patch: Partial<Pick<Member, 'name' | 'avatar' | 'colorKey' | 'active' | 'sortOrder'>>,
  ): Promise<void>

  // ---- histórico / estatísticas ----

  /** Custa uma leitura por dia do intervalo — um mês são no máximo 31. */
  getDaysInRange(start: IsoDate, end: IsoDate): Promise<Day[]>
  getStats(start: IsoDate, end: IsoDate): Promise<PeriodStats>
}

/** Reexport local para não obrigar a tela a importar de dois lugares. */
export type DayItemCriado = import('./types').DayItem

export type FamilyDataFactory = (familyId: string) => FamilyData
