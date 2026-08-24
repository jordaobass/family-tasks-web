'use client'

/**
 * Edição de um membro da família: foto, nome, emoji de reserva e ativo/inativo.
 *
 * O que NÃO se edita aqui, e por quê:
 * - **Placar (`pointsTotal`)** — mexer em ponto pela mão é outra conversa. O
 *   número aparece porque quem administra precisa vê-lo, não porque se digita.
 * - **Papel (`role`)** — `FamilyData.updateMember` não aceita esse campo hoje
 *   (`src/data/family-data.ts:81-87`) e o adapter do Firestore não o grava
 *   (`firestore-family-data.ts:769-789`). Fosse oferecido mesmo assim, a tela
 *   mostraria "adulto" e o banco continuaria "criança" — exatamente o estado
 *   falso que o produto proíbe. Aparece só como informação.
 */

import { useState } from 'react'

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
import { cn } from '@/lib/utils'
import { DataError, type FamilyData, type Member } from '@/data'

import { CampoFoto } from './campo-foto'
import { CLASSE_PAPEL, ROTULO_PAPEL } from './rotulos'

/** Reserva quando não há foto — gente, bicho e símbolo, que é o que criança escolhe. */
const EMOJIS = [
  '👧', '👦', '🧒', '👶', '👩', '👨', '🧑', '👵', '👴', '🦸',
  '🐱', '🐶', '🦊', '🐻', '🐼', '🦁', '🐯', '🦄', '🐨', '🐵',
  '🐸', '🐧', '🦉', '🌟', '🌈', '🚀', '⚽', '🎨', '🎵', '🍀',
]

export interface FormularioMembro {
  nome: string
  emoji: string
  ativo: boolean
  /** Data URI, ou `null` para "sem foto". */
  foto: string | null
}

function formularioDoMembro(membro: Member): FormularioMembro {
  return {
    nome: membro.name,
    emoji: membro.avatar,
    ativo: membro.active,
    foto: membro.photo ?? null,
  }
}

/**
 * `photo: undefined` deixa a foto como está; `null` apaga. Comparar com a atual
 * evita reenviar ~30 KB de data URI a cada correção de nome.
 */
function patchDoFormulario(membro: Member, form: FormularioMembro) {
  const fotoAtual = membro.photo ?? null
  return {
    name: form.nome.trim(),
    avatar: form.emoji,
    active: form.ativo,
    photo: form.foto === fotoAtual ? undefined : form.foto,
  }
}

/** Mensagem legível para a tela; a causa real fica registrada no console. */
function mensagemAmigavel(erro: unknown, padrao: string): string {
  console.error(`[familia] ${padrao}`, erro)
  return erro instanceof DataError ? erro.message : padrao
}

export function useEditorMembro(dados: FamilyData, aoSalvar?: () => void) {
  const [membro, setMembro] = useState<Member | null>(null)
  const [form, setForm] = useState<FormularioMembro>({ nome: '', emoji: '🙂', ativo: true, foto: null })
  const [erro, setErro] = useState<string | null>(null)
  const [erroNome, setErroNome] = useState<string | null>(null)
  const [salvando, setSalvando] = useState(false)

  const abrir = (alvo: Member) => {
    setMembro(alvo)
    setForm(formularioDoMembro(alvo))
    setErro(null)
    setErroNome(null)
  }

  const salvar = async () => {
    if (!membro) return
    if (!form.nome.trim()) {
      setErroNome('Dê um nome para esta pessoa.')
      return
    }
    setErroNome(null)
    setSalvando(true)
    try {
      await dados.updateMember(membro.id, patchDoFormulario(membro, form))
      aoSalvar?.()
      setMembro(null)
    } catch (falha) {
      setErro(mensagemAmigavel(falha, 'Não foi possível salvar este membro.'))
    } finally {
      setSalvando(false)
    }
  }

  const atualizar = <C extends keyof FormularioMembro>(campo: C, valor: FormularioMembro[C]) =>
    setForm((atual) => ({ ...atual, [campo]: valor }))

  return { membro, form, erro, erroNome, salvando, abrir, atualizar, salvar, fechar: () => setMembro(null) }
}

type Editor = ReturnType<typeof useEditorMembro>

export function ModalMembro({ editor }: { editor: Editor }) {
  const { membro, form, salvando } = editor

  const enviar = (evento: React.FormEvent) => {
    evento.preventDefault()
    void editor.salvar()
  }

  return (
    <Dialog open={Boolean(membro)} onOpenChange={(aberto) => !aberto && editor.fechar()}>
      <DialogContent className="max-h-[88vh] overflow-y-auto sm:max-w-[560px]">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">✏️ Editar membro</DialogTitle>
          <DialogDescription>
            A foto é o jeito mais rápido de uma criança que ainda não lê se reconhecer no painel.
          </DialogDescription>
        </DialogHeader>
        {membro && (
          <form onSubmit={enviar} className="space-y-5" noValidate>
            <CampoFoto
              nome={form.nome}
              emoji={form.emoji}
              foto={form.foto}
              onMudar={(foto) => editor.atualizar('foto', foto)}
            />
            <CampoNome valor={form.nome} erro={editor.erroNome} onChange={(v) => editor.atualizar('nome', v)} />
            <SeletorEmoji valor={form.emoji} temFoto={Boolean(form.foto)} onChange={(v) => editor.atualizar('emoji', v)} />
            <CampoAtivo valor={form.ativo} onChange={(v) => editor.atualizar('ativo', v)} />
            <InformacoesFixas membro={membro} />
            {editor.erro && (
              <p className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-red-800" role="alert">
                ⚠️ {editor.erro}
              </p>
            )}
            <DialogFooter className="flex gap-3">
              <Button
                type="button"
                onClick={editor.fechar}
                className="min-h-[44px] flex-1 bg-gray-200 font-semibold text-gray-800 hover:bg-gray-300"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={salvando}
                className="min-h-[44px] flex-1 bg-indigo-600 font-bold text-white hover:bg-indigo-700"
              >
                {salvando ? '⏳ Salvando...' : '💾 Salvar'}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  )
}

function CampoNome({
  valor,
  erro,
  onChange,
}: {
  valor: string
  erro: string | null
  onChange: (valor: string) => void
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor="nome-membro">📝 Nome</Label>
      <Input
        id="nome-membro"
        value={valor}
        onChange={(evento) => onChange(evento.target.value)}
        placeholder="Ex.: Louise"
        className="min-h-[44px]"
        aria-invalid={Boolean(erro)}
        aria-describedby={erro ? 'erro-nome-membro' : undefined}
      />
      {erro && (
        <p id="erro-nome-membro" className="text-sm font-medium text-red-700">
          {erro}
        </p>
      )}
    </div>
  )
}

function SeletorEmoji({
  valor,
  temFoto,
  onChange,
}: {
  valor: string
  temFoto: boolean
  onChange: (valor: string) => void
}) {
  return (
    <div className="space-y-2">
      <Label id="rotulo-emoji">🙂 Emoji</Label>
      <p className="text-xs text-gray-600">
        {temFoto
          ? 'Fica de reserva: entra no lugar da foto se ela for removida.'
          : 'É o rosto deste membro no painel enquanto não houver foto.'}
      </p>
      <div
        role="group"
        aria-labelledby="rotulo-emoji"
        className="grid max-h-32 grid-cols-6 gap-2 overflow-y-auto rounded-xl border border-gray-200 bg-gray-50 p-2 sm:grid-cols-10"
      >
        {EMOJIS.map((emoji) => (
          <button
            key={emoji}
            type="button"
            aria-label={`Usar o emoji ${emoji}`}
            aria-pressed={valor === emoji}
            onClick={() => onChange(emoji)}
            className={cn(
              'flex h-11 w-11 items-center justify-center rounded-lg text-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500',
              valor === emoji ? 'border-2 border-indigo-400 bg-indigo-100' : 'border border-gray-200 bg-white',
            )}
          >
            {emoji}
          </button>
        ))}
      </div>
    </div>
  )
}

function CampoAtivo({ valor, onChange }: { valor: boolean; onChange: (valor: boolean) => void }) {
  const opcoes: { chave: boolean; rotulo: string; ajuda: string }[] = [
    { chave: true, rotulo: '✅ Ativo', ajuda: 'Aparece no painel e recebe tarefas novas.' },
    { chave: false, rotulo: '⏸️ Inativo', ajuda: 'Some do painel. O placar e o histórico ficam.' },
  ]

  return (
    <div className="space-y-2">
      <Label id="rotulo-ativo">👀 No painel</Label>
      <div role="group" aria-labelledby="rotulo-ativo" className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {opcoes.map((opcao) => (
          <button
            key={String(opcao.chave)}
            type="button"
            aria-pressed={valor === opcao.chave}
            onClick={() => onChange(opcao.chave)}
            className={cn(
              'min-h-[44px] rounded-xl border px-4 py-3 text-left text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500',
              valor === opcao.chave
                ? 'border-indigo-600 bg-indigo-600 text-white'
                : 'border-gray-300 bg-white text-gray-700 hover:bg-indigo-50',
            )}
          >
            {opcao.rotulo}
            <span className={cn('mt-1 block text-xs font-normal', valor === opcao.chave ? 'text-indigo-100' : 'text-gray-600')}>
              {opcao.ajuda}
            </span>
          </button>
        ))}
      </div>
    </div>
  )
}

/** Papel e placar: mostrados porque quem administra precisa vê-los, não editáveis. */
function InformacoesFixas({ membro }: { membro: Member }) {
  return (
    <dl className="grid grid-cols-1 gap-3 rounded-xl border border-gray-200 bg-gray-50 p-3 sm:grid-cols-2">
      <div>
        <dt className="text-xs font-semibold text-gray-600">Papel na família</dt>
        <dd className="mt-1 flex flex-wrap items-center gap-2">
          <span className={cn('rounded-full px-3 py-1 text-sm font-semibold', CLASSE_PAPEL[membro.role])}>
            {ROTULO_PAPEL[membro.role]}
          </span>
          <span className="text-xs text-gray-600">Ainda não dá para trocar por aqui.</span>
        </dd>
      </div>
      <div>
        <dt className="text-xs font-semibold text-gray-600">Placar acumulado</dt>
        <dd className="mt-1 text-sm font-bold text-gray-900">
          ⭐ {membro.pointsTotal} {membro.pointsTotal === 1 ? 'ponto' : 'pontos'}
        </dd>
      </div>
    </dl>
  )
}
