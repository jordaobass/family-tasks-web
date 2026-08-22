'use client'

/**
 * Injeta uma instância única de `FamilyData` na árvore.
 *
 * Por que existe: antes, cada serviço era um singleton com `setFamilyId()` mutável —
 * e foi exatamente isso que permitiu a home operar em `default_family` enquanto
 * `/estatisticas` lia a família do login, na mesma sessão. Com fábrica + provider,
 * o `familyId` é resolvido UMA vez, num lugar só, e nenhuma tela consegue divergir.
 */

import { createContext, useContext, useMemo, type ReactNode } from 'react'

import type { FamilyData } from './family-data'
import { createFirestoreFamilyData } from './firestore-family-data'

const ContextoFamilyData = createContext<FamilyData | null>(null)

/**
 * Resolve o id da família. `?.trim() ||` de propósito: variável de ambiente salva
 * em branco é ausente, e `??` deixaria a string vazia passar.
 */
export function resolveFamilyId(familyIdDoLogin?: string): string {
  return (
    familyIdDoLogin?.trim() ||
    process.env.NEXT_PUBLIC_FAMILY_ID?.trim() ||
    'default_family'
  )
}

export function FamilyDataProvider({
  children,
  familyId,
}: {
  children: ReactNode
  /** Sobrescreve a resolução automática. Usado em teste. */
  familyId?: string
}) {
  const dados = useMemo(() => createFirestoreFamilyData(resolveFamilyId(familyId)), [familyId])

  return <ContextoFamilyData.Provider value={dados}>{children}</ContextoFamilyData.Provider>
}

export function useFamilyData(): FamilyData {
  const dados = useContext(ContextoFamilyData)
  if (!dados) {
    throw new Error('useFamilyData precisa estar dentro de <FamilyDataProvider>')
  }
  return dados
}
