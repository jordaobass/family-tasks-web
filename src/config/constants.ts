import { UserSummary } from '@/types'

/**
 * Configuração do módulo de calendário — a única parte do app que ainda roda
 * sobre dados simulados. Tarefas, membros e histórico vivem em `@/data`.
 */
export const USE_MOCK_MODE = process.env.NEXT_PUBLIC_USE_MOCK_MODE === 'true'
export const USE_MOCK_CALENDAR =
  USE_MOCK_MODE || process.env.NEXT_PUBLIC_USE_MOCK_CALENDAR === 'true'

export const DEFAULT_TIMEZONE = process.env.NEXT_PUBLIC_TIMEZONE?.trim() || 'America/Sao_Paulo'

/**
 * Usados apenas pelo calendário, que ainda não migrou para `@/data`.
 * O painel de tarefas lê os membros do Firestore (`watchMembers`) — não daqui.
 * Quando o calendário migrar, esta constante morre junto.
 */
export const DEFAULT_USERS: {
  KIDS: UserSummary[]
  ADULTS: UserSummary[]
} = {
  KIDS: [
    {
      user_id: 'louise',
      user_name: 'Louise',
      user_avatar: '👧',
      profile_color: 'linear-gradient(135deg, #FF6B6B 0%, #FFE66D 100%)'
    },
    {
      user_id: 'benicio',
      user_name: 'Benício',
      user_avatar: '👦',
      profile_color: 'linear-gradient(135deg, #4ECDC4 0%, #44A08D 100%)'
    }
  ],
  ADULTS: [
    {
      user_id: 'adult1',
      user_name: 'Jon',
      user_avatar: '👨',
      profile_color: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
    },
    {
      user_id: 'adult2',
      user_name: 'Prin',
      user_avatar: '👩',
      profile_color: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)'
    }
  ]
}
