'use client'

/**
 * Cartão de um membro na tela `/familia`.
 *
 * A foto vem grande de propósito: aqui o adulto confere se o rosto ficou
 * reconhecível NO TAMANHO em que a criança vai vê-lo. Miniatura esconderia
 * justamente o defeito que se veio corrigir — recorte fora do rosto.
 */

import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import type { Member } from '@/data'

import { AvatarMembro } from '@/components/common/avatar-membro'
import { CLASSE_PAPEL, ROTULO_PAPEL } from './rotulos'

export function CartaoMembro({
  membro,
  onEditar,
}: {
  membro: Member
  onEditar: (membro: Member) => void
}) {
  return (
    <div
      className={cn(
        'rounded-3xl bg-white p-5 shadow-lg transition-shadow hover:shadow-xl',
        !membro.active && 'opacity-70',
      )}
    >
      <div className="flex items-start gap-4">
        <AvatarMembro
          nome={membro.name}
          emoji={membro.avatar}
          foto={membro.photo}
          className="h-28 w-28"
          classeEmoji="text-5xl"
        />
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-xl font-bold text-gray-900">{membro.name}</h3>
          <Etiquetas membro={membro} />
          <p className="mt-3 text-sm text-gray-600">
            ⭐ {membro.pointsTotal} {membro.pointsTotal === 1 ? 'ponto' : 'pontos'} acumulados
          </p>
        </div>
      </div>
      <Button
        onClick={() => onEditar(membro)}
        aria-label={`Editar ${membro.name}`}
        className="mt-4 min-h-[44px] w-full rounded-xl bg-indigo-100 text-sm font-semibold text-indigo-800 hover:bg-indigo-200"
      >
        ✏️ Editar
      </Button>
    </div>
  )
}

function Etiquetas({ membro }: { membro: Member }) {
  return (
    <div className="mt-2 flex flex-wrap items-center gap-2">
      <span className={cn('rounded-full px-3 py-1 text-xs font-semibold', CLASSE_PAPEL[membro.role])}>
        {ROTULO_PAPEL[membro.role]}
      </span>
      <span
        className={cn(
          'rounded-full px-3 py-1 text-xs font-semibold',
          membro.active ? 'bg-green-100 text-green-800' : 'bg-gray-200 text-gray-700',
        )}
      >
        {membro.active ? '✅ No painel' : '⏸️ Fora do painel'}
      </span>
      {!membro.photo && (
        <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-800">
          📷 Sem foto
        </span>
      )}
    </div>
  )
}
