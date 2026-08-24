/**
 * Fronteira pública do módulo de dados.
 *
 * As telas importam SOMENTE daqui (`@/data`). Nada de `firebase/firestore` fora
 * de `src/data/` e `src/lib/firebase.ts` — é o que torna a troca por API própria
 * uma reescrita de um arquivo só.
 */

export type {
  CompletionMode,
  Day,
  DayItem,
  DataErrorCode,
  Difficulty,
  IsoDate,
  IsoDateTime,
  ItemCompletion,
  ItemStatus,
  Member,
  MemberRole,
  NewOneOffItemInput,
  NewTemplateInput,
  PeriodStats,
  Recurrence,
  TaskTemplate,
  Unsubscribe,
} from './types'

export { DataError } from './types'

export type { FamilyData, FamilyDataFactory } from './family-data'

export { createFirestoreFamilyData, listFamilyIds } from './firestore-family-data'

export { FamilyDataProvider, useFamilyData, resolveFamilyId } from './provider'

export {
  FUSO_FAMILIA,
  diaDaSemanaDaData,
  diaDaSemanaFamilia,
  ehDataValida,
  formatarDataFamilia,
  hojeFamilia,
  somarDias,
} from './date'
