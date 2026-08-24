'use client'

/**
 * Gestão dos membros da família.
 *
 * Por que existe: Louise, Benício, Jon e Prin nasceram da migração e nunca
 * puderam ser editados — não havia tela nenhuma para isso. Trocar um nome ou pôr
 * a foto de um filho exigia mexer no banco.
 *
 * Por que **não** fica no painel: o painel da cozinha é aparelho compartilhado,
 * sem login, ao alcance de qualquer criança. Esta tela pede conta Google
 * justamente para uma criança não trocar a foto da outra — o mesmo portão de
 * `/manage-tasks`.
 *
 * Só fala com `@/data`. Nenhum import de `firebase/*` nem de `@/services/*`.
 *
 * Crescimento previsto (`../docs/design-multi-familia.md`, seção 7): convite de
 * adulto, aparelhos pareados, PIN e login de membro moram nesta rota, como
 * SEÇÕES desta mesma página — por isso o corpo já é uma pilha de seções, e não
 * uma lista solta. Nada disso está construído aqui.
 */

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'

import { CartaoMembro } from '@/components/familia/cartao-membro'
import { ModalMembro, useEditorMembro } from '@/components/familia/editor-membro'
import { TITULO_SECAO } from '@/components/familia/rotulos'
import { Button } from '@/components/ui/button'
import { useAuthContext } from '@/providers/auth-provider'
import { DataError, useFamilyData, type Member, type MemberRole } from '@/data'

const PAPEIS: MemberRole[] = ['crianca', 'adulto']

/**
 * Assina os membros em tempo real. `watchMembers` já entrega ordenado por
 * `sort_order`, e emitir de novo a cada gravação é o que faz o cartão refletir a
 * foto nova sem recarregar a tela.
 */
function useMembros(habilitado: boolean) {
  const dados = useFamilyData()
  const [membros, setMembros] = useState<Member[]>([])
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState<string | null>(null)

  useEffect(() => {
    if (!habilitado) return
    return dados.watchMembers(
      (lista) => {
        setMembros(lista)
        setErro(null)
        setCarregando(false)
      },
      (falha: DataError) => {
        console.error('[familia] falha ao assinar os membros', falha)
        setErro(falha.message)
        setCarregando(false)
      },
    )
  }, [dados, habilitado])

  return { dados, membros, carregando, erro }
}

export default function FamiliaPage() {
  const router = useRouter()
  const { user, loading, isAuthenticated } = useAuthContext()
  const autorizado = !loading && isAuthenticated && Boolean(user)
  const { dados, membros, carregando, erro } = useMembros(autorizado)
  const editor = useEditorMembro(dados)

  useEffect(() => {
    if (loading) return
    if (!isAuthenticated || !user) router.push('/login')
  }, [loading, isAuthenticated, user, router])

  const porPapel = useMemo(
    () => PAPEIS.map((papel) => ({ papel, lista: membros.filter((m) => m.role === papel) })),
    [membros],
  )

  if (!autorizado) return <TelaCarregando texto="Carregando..." />

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 p-4">
      <div className="mx-auto max-w-5xl">
        <Cabecalho onVoltar={() => router.push('/')} />
        <Aviso mensagem={erro} />
        {carregando ? (
          <TelaCarregando texto="Carregando a família..." />
        ) : membros.length === 0 ? (
          <SemMembros />
        ) : (
          porPapel.map(({ papel, lista }) => (
            <SecaoMembros key={papel} titulo={TITULO_SECAO[papel]} membros={lista} onEditar={editor.abrir} />
          ))
        )}
        <ModalMembro editor={editor} />
      </div>
    </div>
  )
}

function Cabecalho({ onVoltar }: { onVoltar: () => void }) {
  return (
    <header className="mb-8">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-4">
        <Button
          onClick={onVoltar}
          className="min-h-[44px] rounded-2xl bg-gray-500 px-4 text-white hover:bg-gray-600"
        >
          ← Voltar ao painel
        </Button>
        <h1 className="text-3xl font-bold text-gray-900 md:text-4xl">👨‍👩‍👧‍👦 A família</h1>
      </div>
      <p className="max-w-3xl text-gray-700">
        Quem aparece no painel da cozinha. A foto vale mais que o nome para quem ainda não lê —
        ela é reduzida aqui no aparelho antes de ser salva, então pode vir direto da câmera.
      </p>
    </header>
  )
}

function SecaoMembros({
  titulo,
  membros,
  onEditar,
}: {
  titulo: string
  membros: Member[]
  onEditar: (membro: Member) => void
}) {
  if (membros.length === 0) return null
  return (
    <section className="mb-8" aria-label={titulo}>
      <h2 className="mb-4 text-xl font-bold text-gray-900">
        {titulo} <span className="font-normal text-gray-600">({membros.length})</span>
      </h2>
      <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
        {membros.map((membro) => (
          <CartaoMembro key={membro.id} membro={membro} onEditar={onEditar} />
        ))}
      </div>
    </section>
  )
}

function SemMembros() {
  return (
    <div className="rounded-3xl bg-white py-12 text-center shadow-lg">
      <div className="mb-4 text-6xl" aria-hidden="true">
        👪
      </div>
      <h2 className="mb-2 text-xl font-semibold text-gray-900">Nenhum membro nesta família ainda</h2>
      <p className="mx-auto max-w-md text-gray-600">
        Abra o painel uma vez: os perfis da casa são criados no primeiro acesso e aparecem aqui em
        seguida, prontos para receber nome e foto.
      </p>
    </div>
  )
}

function TelaCarregando({ texto }: { texto: string }) {
  return (
    <div className="py-12 text-center" role="status" aria-live="polite">
      <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-b-2 border-indigo-600" />
      <p className="text-gray-600">{texto}</p>
    </div>
  )
}

function Aviso({ mensagem }: { mensagem: string | null }) {
  if (!mensagem) return null
  return (
    <div
      className="mb-6 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-red-800"
      role="alert"
    >
      ⚠️ {mensagem}
    </div>
  )
}
