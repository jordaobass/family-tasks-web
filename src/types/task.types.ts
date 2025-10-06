import { UserSummary } from './user.types'

export interface Task {
  task_id: string
  task_name: string
  task_description?: string
  category: TaskCategory
  sub_category?: string
  icon_type: IconType
  icon_value: string
  points_value: number
  estimated_time_minutes: number
  difficulty_level: DifficultyLevel
  status: TaskStatus
  created_at: string
  updated_at: string
}

export interface TaskAssignment extends Task {
  assignment_id: string
  assigned_to_user_id: string
  assigned_date: string
  scheduled_time?: string
  completed_at?: string
  completed_by?: UserSummary
  points_earned?: number
  bonus_points?: number
  owner?: UserSummary
}

export interface CreateTaskRequest {
  task_name: string
  task_description?: string
  category: TaskCategory
  sub_category?: string
  icon_type: IconType
  icon_value: string
  points_value: number
  estimated_time_minutes: number
  difficulty_level: DifficultyLevel
  instructions?: TaskInstruction[]
  recurrence?: TaskRecurrence
  tags?: string[]
}

export interface CreateTaskResponse {
  task_id: string
  task_name: string
  category: TaskCategory
  points_value: number
  created_at: string
  next_occurrence?: string
}

export interface TaskInstruction {
  step_number: number
  instruction_text: string
  image_url?: string
}

export interface TaskRecurrence {
  recurrence_type: RecurrenceType
  frequency: number
  days_of_week?: number[]
  time_slots?: string[]
  start_date: string
  end_date?: string
}

// Enums based on HTML reference
export type TaskCategory = 
  | 'hygiene' 
  | 'organization' 
  | 'studies' 
  | 'chores' 
  | 'health'
  | 'pets'
  | 'cleaning'
  | 'cooking'
  | 'shopping'

export type TaskStatus = 
  | 'pending' 
  | 'completed' 
  | 'skipped' 
  | 'overdue'

export type DifficultyLevel = 
  | 'easy' 
  | 'medium' 
  | 'hard'

export type IconType = 
  | 'emoji' 
  | 'image' 
  | 'font_awesome'

export type RecurrenceType = 
  | 'once' 
  | 'daily' 
  | 'weekly' 
  | 'monthly' 
  | 'custom'

// Props interfaces for components
export interface TaskCardProps {
  task: TaskAssignment
  user?: UserSummary
  onComplete?: (task: TaskAssignment) => void
  onMove?: (task: TaskAssignment) => void
  isDraggable?: boolean
  showActions?: boolean
  className?: string
}

export interface TaskListProps {
  tasks: TaskAssignment[]
  title: string
  type: 'pending' | 'completed'
  onTaskMove?: (task: TaskAssignment, target_status: 'pending' | 'completed') => void
  className?: string
}

export interface TaskIconProps {
  icon_type: IconType
  icon_value: string
  size?: 'small' | 'medium' | 'large'
  className?: string
}

// New interfaces for Template vs Instance architecture
export interface TaskTemplate {
  id: string
  name: string
  icon: string
  points: number
  category?: string
  difficulty?: 'easy' | 'medium' | 'hard'
  estimated_time?: number
  recurrence: RecurrenceType
  is_active: boolean
  created_at: Date
  updated_at: Date
  created_by: string
  family_id: string
}

export interface TaskInstance {
  id: string
  template_id: string
  assigned_date: string // Format: YYYY-MM-DD
  status: 'pending' | 'completed'
  completed_by?: string
  completed_by_name?: string
  completed_at?: Date
  points_earned?: number
  created_at: Date
  family_id: string
}

// Helper type for daily task management
export interface DailyTaskCheck {
  date: string // YYYY-MM-DD
  templates_checked: string[]
  instances_created: number
  last_check: Date
}