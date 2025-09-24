export interface User {
  user_id: string
  family_id: string
  email?: string
  first_name: string
  last_name?: string
  user_type: UserType
  profile_color?: string
  avatar_emoji?: string
  avatar_image_url?: string
  points_total: number
  level_current: number
  created_at: string
}

export interface UserSummary {
  user_id: string
  user_name: string
  user_avatar?: string
  profile_color?: string
}

export type UserType = 
  | 'admin' 
  | 'adult' 
  | 'child'

// Props interfaces
export interface UserSelectorProps {
  users: UserSummary[]
  selected_user?: UserSummary | null
  onUserSelect: (user: UserSummary) => void
  className?: string
}

export interface UserButtonProps {
  user: UserSummary
  selected?: boolean
  onClick: (user: UserSummary) => void
  className?: string
}

export interface ScoreBoardProps {
  users: Array<UserSummary & { points: number }>
  className?: string
}