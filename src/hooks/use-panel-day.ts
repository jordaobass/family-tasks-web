'use client'

/**
 * Ciclo de vida do dia no painel da cozinha.
 *
 * O painel é um aparelho fixo que fica ligado o dia inteiro, então este hook
 * cuida de três coisas que a tela não deveria ter de saber:
 *
 * 1. garantir que o documento do dia exista (`ensureDay`) sem entrar em laço com
 *    o `watchDay`, que emite `null` justamente quando o dia ainda não foi gerado;
 * 2. manter dia e membros em tempo real — tarefa criada no celular do pai aparece
 *    na parede sozinha;
 * 3. atravessar a meia-noite com a tela ligada: um relógio de 60 s (e o
 *    `visibilitychange`) recomputa a data e troca a assinatura. Não se usa
 *    `setTimeout` longo de propósito — ele sofre drift, que é o defeito do
 *    agendador antigo.
 *
 * Só fala com `@/data`. Nenhum import de `firebase/*` mora aqui.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import {
  DataError,
  hojeFamilia,
  useFamilyData,
  type Day,
  type DayItem,
  type IsoDate,
  type Member,
  type NewOneOffItemInput,
} from '@/data'

/** De quanto em quanto tempo o painel confere se a data virou. */
const INTERVALO_RELOGIO_MS = 60_000

export interface PainelDoDia {
  /** Data de hoje no fuso da família — muda sozinha à meia-noite. */
  hoje: IsoDate
  dia: Day | null
  itens: DayItem[]
  /** Somente os membros ativos, já na ordem definida em `sortOrder`. */
  membros: Member[]
  carregando: boolean
  erro: string | null
  limparErro: () => void
  /** Todas as ações devolvem `true` só quando a escrita foi confirmada. */
  concluir: (itemId: string, membroId: string) => Promise<boolean>
  desfazer: (itemId: string) => Promise<boolean>
  resetar: () => Promise<boolean>
  adicionarAvulsa: (entrada: NewOneOffItemInput) => Promise<boolean>
}

export function usePanelDay(): PainelDoDia {
  const dados = useFamilyData()
  const [hoje, setHoje] = useState<IsoDate>(() => hojeFamilia())
  const [dia, setDia] = useState<Day | null>(null)
  const [membros, setMembros] = useState<Member[]>([])
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState<string | null>(null)

  /** Guarda a última data para a qual já pedimos `ensureDay` — trava do laço. */
  const diaGarantido = useRef<IsoDate | null>(null)

  const registrarFalha = useCallback((falha: unknown, contexto: string) => {
    // A frase que o usuário lê é amigável; o console guarda a causa real.
    console.error(`[painel] ${contexto}`, falha)
    setErro(falha instanceof DataError ? falha.message : contexto)
  }, [])

  const limparErro = useCallback(() => setErro(null), [])

  useRelogioDaVirada(setHoje)
  useMembrosEmTempoReal(dados, setMembros, registrarFalha)

  const garantirDia = useCallback(
    (data: IsoDate) => {
      if (diaGarantido.current === data) return
      diaGarantido.current = data
      dados.ensureDay(data, 'panel').catch((falha) => {
        // Libera nova tentativa: sem isto, uma falha de rede deixaria o painel
        // vazio até alguém recarregar a página.
        diaGarantido.current = null
        registrarFalha(falha, 'Não consegui preparar as tarefas de hoje')
      })
    },
    [dados, registrarFalha],
  )

  useEffect(() => {
    setCarregando(true)
    setDia(null)

    const cancelar = dados.watchDay(
      hoje,
      (recebido) => {
        setDia(recebido)
        setCarregando(false)
        // `null` não é erro — é "o dia ainda não foi gerado". `garantirDia` só
        // dispara uma vez por data, senão o próprio snapshot realimentaria o laço.
        if (recebido === null) garantirDia(hoje)
      },
      (falha) => {
        setCarregando(false)
        registrarFalha(falha, `Perdi a conexão com o dia ${hoje}`)
      },
    )

    return cancelar
  }, [dados, hoje, garantirDia, registrarFalha])

  const executar = useCallback(
    async (contexto: string, acao: () => Promise<unknown>): Promise<boolean> => {
      try {
        setErro(null)
        await acao()
        return true
      } catch (falha) {
        registrarFalha(falha, contexto)
        return false
      }
    },
    [registrarFalha],
  )

  const concluir = useCallback(
    (itemId: string, membroId: string) =>
      executar('Não consegui concluir a tarefa', () => dados.completeItem(hoje, itemId, membroId)),
    [dados, hoje, executar],
  )

  const desfazer = useCallback(
    (itemId: string) =>
      executar('Não consegui desfazer a conclusão', () => dados.uncompleteItem(hoje, itemId)),
    [dados, hoje, executar],
  )

  const resetar = useCallback(
    () => executar('Não consegui resetar o dia', () => dados.resetDay(hoje)),
    [dados, hoje, executar],
  )

  const adicionarAvulsa = useCallback(
    (entrada: NewOneOffItemInput) =>
      executar('Não consegui adicionar a tarefa', () => dados.addOneOffItem(hoje, entrada)),
    [dados, hoje, executar],
  )

  const itens = useMemo(() => dia?.items ?? [], [dia])

  return {
    hoje,
    dia,
    itens,
    membros,
    carregando,
    erro,
    limparErro,
    concluir,
    desfazer,
    resetar,
    adicionarAvulsa,
  }
}

/**
 * Recomputa a data a cada minuto e sempre que a tela volta a ficar visível.
 * `setHoje` com o mesmo valor não re-renderiza — o React descarta a atualização.
 */
function useRelogioDaVirada(setHoje: (atualizar: (atual: IsoDate) => IsoDate) => void): void {
  useEffect(() => {
    const conferirData = () => {
      const agora = hojeFamilia()
      setHoje((atual) => (agora === atual ? atual : agora))
    }

    const timer = window.setInterval(conferirData, INTERVALO_RELOGIO_MS)
    document.addEventListener('visibilitychange', conferirData)

    return () => {
      window.clearInterval(timer)
      document.removeEventListener('visibilitychange', conferirData)
    }
  }, [setHoje])
}

/** Assina os membros da família; mantém só os ativos, na ordem do `sortOrder`. */
function useMembrosEmTempoReal(
  dados: ReturnType<typeof useFamilyData>,
  setMembros: (membros: Member[]) => void,
  registrarFalha: (falha: unknown, contexto: string) => void,
): void {
  useEffect(() => {
    const cancelar = dados.watchMembers(
      (recebidos) => setMembros(recebidos.filter((membro) => membro.active)),
      (falha) => registrarFalha(falha, 'Não consegui carregar quem mora aqui'),
    )
    return cancelar
  }, [dados, setMembros, registrarFalha])
}
