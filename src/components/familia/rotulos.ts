/**
 * Rótulos e classes de tema compartilhados pela tela `/familia`.
 *
 * Ficam num arquivo só para o cartão e o formulário nunca divergirem — e as
 * classes precisam existir literalmente aqui para o Tailwind gerá-las. Cor nunca
 * vai em `style` inline.
 */

import type { MemberRole } from '@/data'

export const ROTULO_PAPEL: Record<MemberRole, string> = {
  crianca: '🧒 Criança',
  adulto: '🧑 Adulto',
}

export const CLASSE_PAPEL: Record<MemberRole, string> = {
  crianca: 'bg-pink-100 text-pink-800',
  adulto: 'bg-teal-100 text-teal-800',
}

export const TITULO_SECAO: Record<MemberRole, string> = {
  crianca: '🧒 Crianças',
  adulto: '🧑 Adultos',
}
