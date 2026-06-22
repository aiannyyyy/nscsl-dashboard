import api from './api'
import type { CalendarEvent } from '../pages/pdo/components/EventBadge'

export interface CreateEventPayload {
  title: string
  description?: string
  start_datetime: string
  end_datetime: string
  is_all_day: boolean
  color: string
  category?: string
  participant_ids?: number[]
  reminder_minutes?: number | ''
}

export interface UpdateEventPayload extends CreateEventPayload {
  event_id: number
}

export interface UserOption {
  user_id: number
  name: string
  dept: string
  position: string
}

export interface CheckRemindersResult {
  message: string
  reminders_checked: number
  notifications_sent: number
}

export interface PhHoliday {
  date: string        // "2026-01-01"
  localName: string   // "Bagong Taon"
  name: string        // "New Year's Day"
  types: string[]     // ["Public"]
}

export const fetchEvents = async (): Promise<CalendarEvent[]> => {
  const { data } = await api.get('/calendar')
  return data
}

export const fetchUsers = async (): Promise<UserOption[]> => {
  const { data } = await api.get('/calendar/users')
  return data
}

export const createEvent = async (payload: CreateEventPayload): Promise<CalendarEvent> => {
  const { data } = await api.post('/calendar', payload)
  return data
}

export const updateEvent = async (payload: UpdateEventPayload): Promise<CalendarEvent> => {
  const { data } = await api.put(`/calendar/${payload.event_id}`, payload)
  return data
}

export const deleteEvent = async (event_id: number): Promise<void> => {
  await api.delete(`/calendar/${event_id}`)
}

export const checkReminders = async (): Promise<CheckRemindersResult> => {
  const { data } = await api.get('/calendar/check-reminders')
  return data
}

export const fetchHolidays = async (year: number): Promise<PhHoliday[]> => {
  const { data } = await api.get(`/calendar/holidays?year=${year}`)
  return data
}