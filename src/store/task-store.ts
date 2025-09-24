import { create } from 'zustand'
import { devtools, persist } from 'zustand/middleware'
import { TaskAssignment, TaskStatus, UserSummary } from '@/types'
import { DEFAULT_TASKS, STORAGE_KEYS } from '@/config/constants'

interface TaskState {
  // Tasks
  today_tasks: TaskAssignment[]
  pending_tasks: TaskAssignment[]
  completed_tasks: TaskAssignment[]
  
  // User selection
  selected_user: UserSummary | null
  active_tab: 'kids' | 'adults'
  
  // Scores (kids only)
  scores: Record<string, number>
  
  // UI state
  is_loading: boolean
  warning_visible: boolean

  // Actions
  set_today_tasks: (tasks: TaskAssignment[]) => void
  complete_task: (task: TaskAssignment) => void
  uncomplete_task: (task: TaskAssignment) => void
  move_task: (task: TaskAssignment, target_status: TaskStatus) => void
  select_user: (user: UserSummary | null) => void
  switch_tab: (tab: 'kids' | 'adults') => void
  show_warning: () => void
  hide_warning: () => void
  reset_tasks: () => void
  initialize_default_tasks: () => void
}

const create_default_task = (
  base_task: { task_id: string; task_name: string; icon_value: string; points_value?: number }
): TaskAssignment => ({
  task_id: base_task.task_id,
  assignment_id: `${base_task.task_id}_${Date.now()}`,
  task_name: base_task.task_name,
  task_description: '',
  category: 'chores',
  icon_type: 'emoji' as const,
  icon_value: base_task.icon_value,
  points_value: base_task.points_value || 0,
  estimated_time_minutes: 15,
  difficulty_level: 'easy' as const,
  status: 'pending' as const,
  assigned_to_user_id: '',
  assigned_date: new Date().toISOString(),
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString()
})

export const useTaskStore = create<TaskState>()(
  devtools(
    persist(
      (set, get) => ({
        today_tasks: [],
        pending_tasks: [],
        completed_tasks: [],
        selected_user: null,
        active_tab: 'kids',
        scores: { louise: 0, benicio: 0 },
        is_loading: false,
        warning_visible: false,

        set_today_tasks: (tasks) => {
          const pending = tasks.filter(t => t.status === 'pending')
          const completed = tasks.filter(t => t.status === 'completed')
          
          set({
            today_tasks: tasks,
            pending_tasks: pending,
            completed_tasks: completed
          })
        },

        complete_task: (task) => {
          set((state) => {
            const new_task = { ...task, status: 'completed' as const, completed_at: new Date().toISOString() }
            
            // Add owner if user is selected
            if (state.selected_user) {
              new_task.owner = state.selected_user
              new_task.completed_by = state.selected_user
            }
            
            const new_pending = state.pending_tasks.filter(t => t.task_id !== task.task_id)
            const new_completed = [...state.completed_tasks, new_task]
            
            // Update scores for kids
            const new_scores = { ...state.scores }
            if (state.active_tab === 'kids' && new_task.owner && new_task.points_value > 0) {
              new_scores[new_task.owner.user_id] = (new_scores[new_task.owner.user_id] || 0) + new_task.points_value
            }
            
            return {
              pending_tasks: new_pending,
              completed_tasks: new_completed,
              scores: new_scores
            }
          })
        },

        uncomplete_task: (task) => {
          set((state) => {
            const new_task = { 
              ...task, 
              status: 'pending' as const, 
              completed_at: undefined,
              owner: undefined,
              completed_by: undefined
            }
            
            const new_completed = state.completed_tasks.filter(t => t.task_id !== task.task_id)
            const new_pending = [...state.pending_tasks, new_task]
            
            // Update scores for kids
            const new_scores = { ...state.scores }
            if (state.active_tab === 'kids' && task.owner && task.points_value > 0) {
              new_scores[task.owner.user_id] = Math.max(0, (new_scores[task.owner.user_id] || 0) - task.points_value)
            }
            
            return {
              pending_tasks: new_pending,
              completed_tasks: new_completed,
              scores: new_scores
            }
          })
        },

        move_task: (task, target_status) => {
          if (target_status === 'completed') {
            get().complete_task(task)
          } else {
            get().uncomplete_task(task)
          }
        },

        select_user: (user) => {
          set({ selected_user: user, warning_visible: false })
        },

        switch_tab: (tab) => {
          set({ 
            active_tab: tab, 
            selected_user: null,
            warning_visible: false 
          })
        },

        show_warning: () => {
          set({ warning_visible: true })
        },

        hide_warning: () => {
          set({ warning_visible: false })
        },

        reset_tasks: () => {
          set({
            pending_tasks: [],
            completed_tasks: [],
            scores: { louise: 0, benicio: 0 },
            selected_user: null,
            warning_visible: false
          })
          get().initialize_default_tasks()
        },

        initialize_default_tasks: () => {
          const kids_tasks = DEFAULT_TASKS.KIDS.map(task => 
            create_default_task(task)
          )
          const adults_tasks = DEFAULT_TASKS.ADULTS.map(task => 
            create_default_task(task)
          )
          
          set({
            pending_tasks: [...kids_tasks, ...adults_tasks],
            completed_tasks: []
          })
        }
      }),
      {
        name: STORAGE_KEYS.FAMILY_TASKS_STATE,
        partialize: (state) => ({
          pending_tasks: state.pending_tasks,
          completed_tasks: state.completed_tasks,
          scores: state.scores,
          selected_user: state.selected_user,
          active_tab: state.active_tab
        })
      }
    ),
    {
      name: 'task-store'
    }
  )
)