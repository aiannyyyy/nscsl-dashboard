import React, { useState } from 'react'
import { CalendarHeader } from './components/CalendarHeader'
import { CalendarGrid } from './components/CalendarGrid'
import { EventModal } from './components/EventModal'
import type { CalendarEvent } from './components/EventBadge'
import { useCalendar } from '../../hooks/PDOHooks/useCalendar'
import { useAuth } from '../../context/AuthContext'
import type { CreateEventPayload } from '../../services/PDOServices/calendarService'

export const Calendar = () => {
  const { user } = useAuth()
  const [currentDate, setCurrentDate] = useState(new Date())
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [editEvent, setEditEvent] = useState<CalendarEvent | null>(null)

  const { events, users, isLoading, isError, isSaving, isDeleting, handleSave, handleDelete } = useCalendar()

  const handlePrev  = () => setCurrentDate((d) => new Date(d.getFullYear(), d.getMonth() - 1, 1))
  const handleNext  = () => setCurrentDate((d) => new Date(d.getFullYear(), d.getMonth() + 1, 1))
  const handleToday = () => setCurrentDate(new Date())

  const handleDayClick = (date: Date) => {
    setSelectedDate(date)
    setEditEvent(null)
    setIsModalOpen(true)
  }

  const handleEventClick = (event: CalendarEvent) => {
    setEditEvent(event)
    setSelectedDate(null)
    setIsModalOpen(true)
  }

  const handleAddEvent = () => {
    setSelectedDate(new Date())
    setEditEvent(null)
    setIsModalOpen(true)
  }

  const onSave = (payload: CreateEventPayload) => {
    handleSave(
      { ...payload, created_by: Number(user?.id) },
      editEvent?.event_id
    )
    setIsModalOpen(false)
  }

  const onDelete = (event_id: number) => {
    handleDelete(event_id)
    setIsModalOpen(false)
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full min-h-screen bg-white dark:bg-slate-950">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-sky-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-sm text-slate-500 dark:text-slate-400">Loading calendar...</span>
        </div>
      </div>
    )
  }

  if (isError) {
    return (
      <div className="flex items-center justify-center h-full min-h-screen bg-white dark:bg-slate-950">
        <div className="text-center">
          <p className="text-sm text-red-500 dark:text-red-400 font-medium">Failed to load events</p>
          <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">Please check your connection and try again</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full min-h-screen bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100">
      <CalendarHeader
        currentDate={currentDate}
        onPrev={handlePrev}
        onNext={handleNext}
        onToday={handleToday}
        onAddEvent={handleAddEvent}
      />

      <CalendarGrid
        currentDate={currentDate}
        events={events}
        onDayClick={handleDayClick}
        onEventClick={handleEventClick}
      />

      <EventModal
        isOpen={isModalOpen}
        selectedDate={selectedDate}
        editEvent={editEvent}
        isSaving={isSaving}
        isDeleting={isDeleting}
        users={users}
        onClose={() => setIsModalOpen(false)}
        onSave={onSave}
        onDelete={onDelete}
      />
    </div>
  )
}