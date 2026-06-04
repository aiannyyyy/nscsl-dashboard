import React, { useState } from 'react'
import { CalendarHeader } from './components/CalendarHeader'
import { CalendarGrid } from './components/CalendarGrid'
import { EventModal } from './components/EventModal'
import { EventDetailModal } from './components/EventDetailModal'
import type { CalendarEvent } from './components/EventBadge'
import { useCalendar } from '../../hooks/PDOHooks/useCalendar'
import { useAuth } from '../../context/AuthContext'
import type { CreateEventPayload } from '../../services/PDOServices/calendarService'

export const Calendar = () => {
  const { user } = useAuth()

  const [currentDate,     setCurrentDate]     = useState(new Date())

  // Detail modal (read-only)
  const [detailEvent,     setDetailEvent]     = useState<CalendarEvent | null>(null)
  const [isDetailOpen,    setIsDetailOpen]    = useState(false)

  // Edit/Add modal (form)
  const [isModalOpen,     setIsModalOpen]     = useState(false)
  const [selectedDate,    setSelectedDate]    = useState<Date | null>(null)
  const [editEvent,       setEditEvent]       = useState<CalendarEvent | null>(null)

  const { events, users, isLoading, isError, isSaving, isDeleting, handleSave, handleDelete } = useCalendar()

  // ─── Navigation ───────────────────────────────────────────────
  const handlePrev  = () => setCurrentDate((d) => new Date(d.getFullYear(), d.getMonth() - 1, 1))
  const handleNext  = () => setCurrentDate((d) => new Date(d.getFullYear(), d.getMonth() + 1, 1))
  const handleToday = () => setCurrentDate(new Date())

  // ─── Click on a day cell → open Add modal ─────────────────────
  const handleDayClick = (date: Date) => {
    setSelectedDate(date)
    setEditEvent(null)
    setIsModalOpen(true)
  }

  // ─── Click on an event badge → open Detail modal ──────────────
  const handleEventClick = (event: CalendarEvent) => {
    setDetailEvent(event)
    setIsDetailOpen(true)
  }

  // ─── From Detail modal → open Edit modal ──────────────────────
  const handleEditFromDetail = (event: CalendarEvent) => {
    setEditEvent(event)
    setSelectedDate(null)
    setIsDetailOpen(false)
    setIsModalOpen(true)
  }

  // ─── Add Event button in header ───────────────────────────────
  const handleAddEvent = () => {
    setSelectedDate(new Date())
    setEditEvent(null)
    setIsModalOpen(true)
  }

  // ─── Save ─────────────────────────────────────────────────────
  const onSave = (payload: CreateEventPayload) => {
    handleSave(
      { ...payload, created_by: Number(user?.id) },
      editEvent?.event_id
    )
    setIsModalOpen(false)
    setEditEvent(null)
  }

  // ─── Delete ───────────────────────────────────────────────────
  const onDelete = (event_id: number) => {
    handleDelete(event_id)
    setIsDetailOpen(false)
    setDetailEvent(null)
  }

  // ─── Loading / Error ──────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full min-h-screen bg-white dark:bg-gray-900">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-sm text-gray-500 dark:text-gray-400">Loading calendar...</span>
        </div>
      </div>
    )
  }

  if (isError) {
    return (
      <div className="flex items-center justify-center h-full min-h-screen bg-white dark:bg-gray-900">
        <div className="text-center">
          <p className="text-sm text-red-500 font-medium">Failed to load events</p>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Please check your connection and try again</p>
        </div>
      </div>
    )
  }

  return (
    <div className="rounded-2xl bg-white dark:bg-gray-900 shadow-lg overflow-hidden flex flex-col h-[calc(100vh-80px)]">
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

      {/* Read-only detail modal */}
      <EventDetailModal
        isOpen={isDetailOpen}
        event={detailEvent}
        users={users}
        isDeleting={isDeleting}
        onClose={() => { setIsDetailOpen(false); setDetailEvent(null) }}
        onEdit={handleEditFromDetail}
        onDelete={onDelete}
      />

      {/* Add / Edit form modal */}
      <EventModal
        isOpen={isModalOpen}
        selectedDate={selectedDate}
        editEvent={editEvent}
        isSaving={isSaving}
        isDeleting={isDeleting}
        users={users}
        onClose={() => { setIsModalOpen(false); setEditEvent(null) }}
        onSave={onSave}
        onDelete={onDelete}
      />
    </div>
  )
}