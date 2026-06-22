export interface CalendarEvent {
  event_id: number
  created_by: number
  created_by_name: string
  created_by_dept: string
  department: string
  title: string
  description?: string
  start_datetime: string
  end_datetime: string
  is_all_day: boolean
  color: string
  category?: string
  created_at: string
  updated_at?: string
  participant_ids: number[]
  participants: { user_id: number; name: string; dept: string }[]
}