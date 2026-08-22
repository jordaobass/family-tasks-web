'use client'

/**
 * Tarefa avulsa do dia — vale só para hoje e não vira template.
 *
 * O seletor de recorrência saiu: `addOneOffItem` não guarda recorrência nenhuma,
 * e um campo que o banco ignora é pior do que campo nenhum — ele mente para quem
 * está preenchendo. Tarefa que se repete se cadastra em "Gerenciar tarefas".
 */

import { useEffect, useState } from 'react'

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { MemberRole, NewOneOffItemInput } from '@/data'
import { cn } from '@/lib/utils'

interface NewTaskModalProps {
  open: boolean
  onOpenChange: (aberto: boolean) => void
  /** Devolve `true` só quando a tarefa foi mesmo gravada. */
  onCriar: (entrada: NewOneOffItemInput) => Promise<boolean>
  /** Em qual aba a tarefa vai aparecer. */
  audiencia: MemberRole
}

const ICONES = [
  '🦷', '🚿', '🛏️', '🥣', '📚', '🧸', '🐕', '🧹', '🍳', '🧽',
  '🧼', '🍎', '💧', '🧴', '🎒', '✏️', '📝', '🖍️', '📖', '⚽',
  '🎨', '🧩', '🎵', '🎮', '🚗', '🌱', '🗑️', '💳', '🍽️', '🛒',
  '👔', '🧦', '👗', '👕', '👖', '🧥', '👞', '🧢', '🕶️', '⌚',
  '🎯', '🏆', '⭐', '💎', '🔥', '💪', '✨', '🎉', '🎊', '🌟',
]

const OPCOES_DE_PONTOS = [
  { valor: 5, rotulo: '5 pontos — muito fácil' },
  { valor: 10, rotulo: '10 pontos — fácil' },
  { valor: 15, rotulo: '15 pontos — médio' },
  { valor: 20, rotulo: '20 pontos — difícil' },
  { valor: 25, rotulo: '25 pontos — muito difícil' },
]

const ICONE_PADRAO = '📝'

export function NewTaskModal({ open, onOpenChange, onCriar, audiencia }: NewTaskModalProps) {
  const ehCrianca = audiencia === 'crianca'
  const [nome, setNome] = useState('')
  const [icone, setIcone] = useState(ICONE_PADRAO)
  const [pontos, setPontos] = useState(ehCrianca ? 10 : 0)
  const [salvando, setSalvando] = useState(false)
  const [falha, setFalha] = useState<string | null>(null)

  // Reabrir o modal (ou trocar de aba) sempre começa com o formulário limpo.
  useEffect(() => {
    if (!open) return
    setNome('')
    setIcone(ICONE_PADRAO)
    setPontos(audiencia === 'crianca' ? 10 : 0)
    setFalha(null)
    setSalvando(false)
  }, [open, audiencia])

  const enviar = async (evento: React.FormEvent) => {
    evento.preventDefault()
    if (!nome.trim() || salvando) return

    setSalvando(true)
    setFalha(null)
    const gravou = await onCriar({
      name: nome.trim(),
      icon: icone,
      points: ehCrianca ? pontos : 0,
      audience: audiencia,
      category: ehCrianca ? 'geral' : 'casa',
    })
    setSalvando(false)

    if (gravou) onOpenChange(false)
    else setFalha('Não deu para salvar agora. Tente de novo em alguns segundos.')
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-[560px]">
        <DialogHeader>
          <DialogTitle className="text-center text-xl font-bold">
            ➕ Nova tarefa de hoje
          </DialogTitle>
          <DialogDescription className="text-center">
            Vale só para hoje. Para uma tarefa que se repete todo dia, cadastre em
            &quot;Gerenciar tarefas&quot;.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={enviar} className="space-y-6">
          <SeletorDeIcone selecionado={icone} aoSelecionar={setIcone} />

          <div className="space-y-2">
            <Label htmlFor="nome-tarefa" className="text-sm font-semibold">
              📝 Nome da tarefa
            </Label>
            <Input
              id="nome-tarefa"
              type="text"
              value={nome}
              onChange={(evento) => setNome(evento.target.value)}
              placeholder="Ex.: guardar os brinquedos"
              className="h-12 w-full text-base"
              autoComplete="off"
              required
            />
          </div>

          {ehCrianca && <SeletorDePontos valor={pontos} aoMudar={setPontos} />}

          {falha && (
            <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
              {falha}
            </p>
          )}

          <DialogFooter className="flex gap-3">
            <Button
              type="button"
              onClick={() => onOpenChange(false)}
              // `hover:` igual ao estado normal: no iOS o hover gruda depois do toque.
              className="h-14 flex-1 border border-gray-300 bg-gray-100 text-base font-semibold text-gray-800 hover:bg-gray-100 active:bg-gray-200"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={salvando || !nome.trim()}
              className="h-14 flex-1 border-none bg-gradient-to-r from-blue-500 to-purple-600 text-base font-bold text-white hover:bg-transparent active:scale-[0.98]"
            >
              {salvando ? 'Salvando…' : '➕ Criar tarefa'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function SeletorDeIcone({
  selecionado,
  aoSelecionar,
}: {
  selecionado: string
  aoSelecionar: (icone: string) => void
}) {
  return (
    <div className="space-y-3">
      <span className="block text-sm font-semibold">🎨 Ícone da tarefa</span>
      <div className="flex items-start gap-3">
        <div
          aria-hidden
          className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl border-2 border-gray-200 bg-gray-100 text-3xl"
        >
          {selecionado}
        </div>
        <div className="grid max-h-40 flex-1 grid-cols-6 gap-2 overflow-y-auto rounded-lg border bg-gray-50 p-2 sm:grid-cols-8">
          {ICONES.map((icone) => (
            <button
              key={icone}
              type="button"
              aria-label={`Usar o ícone ${icone}`}
              aria-pressed={selecionado === icone}
              onClick={() => aoSelecionar(icone)}
              className={cn(
                'flex h-12 w-12 items-center justify-center rounded-lg text-2xl transition-transform active:scale-90',
                selecionado === icone
                  ? 'border-2 border-blue-500 bg-blue-100'
                  : 'border border-gray-200 bg-white',
              )}
            >
              {icone}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

function SeletorDePontos({
  valor,
  aoMudar,
}: {
  valor: number
  aoMudar: (pontos: number) => void
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor="pontos-tarefa" className="text-sm font-semibold">
        ⭐ Pontos
      </Label>
      <Select value={String(valor)} onValueChange={(novo) => aoMudar(Number(novo))}>
        <SelectTrigger id="pontos-tarefa" className="h-12 text-base">
          <SelectValue placeholder="Quantos pontos vale" />
        </SelectTrigger>
        <SelectContent>
          {OPCOES_DE_PONTOS.map((opcao) => (
            <SelectItem key={opcao.valor} value={String(opcao.valor)}>
              {opcao.rotulo}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}
