/**
 * Datas no fuso da família.
 *
 * Por que existe: o código antigo calculava "hoje" com `toISOString()`, que é UTC —
 * a partir das 21h no Brasil o sistema já achava que era o dia seguinte.
 * `Intl` nativo basta; America/Sao_Paulo não tem horário de verão desde 2019.
 */

import type { IsoDate } from './types'

export const FUSO_FAMILIA = 'America/Sao_Paulo'

/** `en-CA` produz exatamente `YYYY-MM-DD`. */
const formatadorData = new Intl.DateTimeFormat('en-CA', {
  timeZone: FUSO_FAMILIA,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
})

const formatadorDiaSemana = new Intl.DateTimeFormat('en-US', {
  timeZone: FUSO_FAMILIA,
  weekday: 'short',
})

const DIAS_SEMANA: Record<string, number> = {
  Sun: 0,
  Mon: 1,
  Tue: 2,
  Wed: 3,
  Thu: 4,
  Fri: 5,
  Sat: 6,
}

/** Data de calendário do instante dado, no fuso da família. */
export function formatarDataFamilia(instante: Date): IsoDate {
  return formatadorData.format(instante)
}

/** A data de hoje no fuso da família. */
export function hojeFamilia(): IsoDate {
  return formatarDataFamilia(new Date())
}

/** Dia da semana (0=domingo) do instante dado, no fuso da família. */
export function diaDaSemanaFamilia(instante: Date): number {
  return DIAS_SEMANA[formatadorDiaSemana.format(instante)] ?? 0
}

/** Dia da semana de uma data `YYYY-MM-DD`, sem depender do fuso do aparelho. */
export function diaDaSemanaDaData(data: IsoDate): number {
  const [ano, mes, dia] = data.split('-').map(Number)
  return new Date(Date.UTC(ano, mes - 1, dia)).getUTCDay()
}

/** Soma (ou subtrai) dias a uma data `YYYY-MM-DD`. */
export function somarDias(data: IsoDate, dias: number): IsoDate {
  const [ano, mes, dia] = data.split('-').map(Number)
  const base = new Date(Date.UTC(ano, mes - 1, dia))
  base.setUTCDate(base.getUTCDate() + dias)
  return base.toISOString().slice(0, 10)
}

/** Valida o formato `YYYY-MM-DD`. */
export function ehDataValida(data: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(data)
}
