export type Role = 'user' | 'admin'

export interface Profile {
  id: string
  full_name: string | null
  email: string | null
  role: Role
  status: 'active' | 'suspended'
  currency: string
  warn_80: boolean
  warn_100: boolean
  email_alerts: boolean
  daily_reminder: boolean
   daily_reminder_time: string
  daily_reminder_timezone: string
  created_at: string
}

export interface Category {
  id: number
  slug: string
  name: string
  icon: string
  color: string
  bg: string
  is_active: boolean
  show_in_picker: boolean
  sort_order: number
}

export interface Expense {
  id: string
  user_id: string
  category_id: number
  amount: number
  spent_on: string
  payment_method: string
  note: string | null
  is_archived: boolean
}
export interface Budget {
  id: string
  user_id: string
  category_id: number
  month: number
  year: number
  amount: number
  is_archived: boolean
}
export interface ArchiveRow {
  id: string
  period: string
  total: number
  archived_at: string
}

export interface Lesson {
  id: number
  topic: string
  title: string
  body: string
  sort_order: number
}

export interface AuditRow {
  id: number
  actor_name: string | null
  action: string
  created_at: string
}
