'use client'

/**
 * O rosto do membro: a foto quando existe, o emoji quando não.
 *
 * Para uma criança que ainda não lê, a foto é o identificador mais forte que
 * existe — é o motivo da funcionalidade. Por isso quem chama define o tamanho,
 * e o padrão é grande: miniatura decorativa não serve a quem precisa se
 * reconhecer atravessando a cozinha.
 *
 * O formato muda com o contexto e é a única diferença entre os usos: círculo no
 * painel, onde ele convive com cartões arredondados, e quadrado na tela de
 * família, onde a foto é o assunto.
 */

import { cn } from '@/lib/utils'

interface Props {
  nome: string
  /** Emoji de reserva. */
  emoji: string
  /** Data URI já reduzido, ou vazio quando não há foto. */
  foto?: string | null
  formato?: 'circulo' | 'quadrado'
  /** Classes de tamanho do quadrado, ex.: `h-28 w-28`. */
  className?: string
  /** Classes do tamanho do emoji, quando não há foto. */
  classeEmoji?: string
}

export function AvatarMembro({
  nome,
  emoji,
  foto,
  formato = 'quadrado',
  className,
  classeEmoji,
}: Props) {
  const moldura = cn(
    'flex shrink-0 items-center justify-center overflow-hidden bg-indigo-50 shadow-md',
    formato === 'circulo' ? 'rounded-full border-2 border-white/70' : 'rounded-2xl border-4 border-white',
    className ?? 'h-28 w-28',
  )

  if (!foto) {
    return (
      <div className={moldura}>
        {/* O emoji é decoração: quem lê com leitor de tela recebe o nome do
            membro no texto ao lado, não uma repetição do rostinho. */}
        <span className={cn('leading-none', classeEmoji ?? 'text-5xl')} aria-hidden="true">
          {emoji}
        </span>
      </div>
    )
  }

  return (
    <div className={moldura}>
      {/*
        `<img>` e não `next/image` de propósito: a foto é um data URI embutido no
        documento, e o otimizador do Next só reescreve URLs que ele consegue
        buscar — data URI passa direto, sem otimização nenhuma, e ainda dispara
        aviso no console. Aqui a imagem já chega cortada em 256×256 e abaixo de
        40 KB, então não há o que otimizar.
      */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={foto}
        alt={`Foto de ${nome}`}
        className="h-full w-full object-cover"
        draggable={false}
        decoding="async"
      />
    </div>
  )
}
