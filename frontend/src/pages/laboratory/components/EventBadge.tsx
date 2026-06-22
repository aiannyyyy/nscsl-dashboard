import React from 'react'

export interface CalendarEvent {
  event_id: number
  created_by: number
  title: string
  description?: string
  start_datetime: string
  end_datetime: string
  is_all_day: boolean
  color: string
  category?: string
  participant_ids?: number[]
}

interface EventBadgeProps {
  event: CalendarEvent
  onClick: (event: CalendarEvent) => void
}

export const EventBadge: React.FC<EventBadgeProps> = ({ event, onClick }) => {
  return (
    <button
      onClick={(e) => {
        e.stopPropagation()
        onClick(event)
      }}
      className="w-full text-left truncate text-[11px] font-medium px-1.5 py-0.5 rounded cursor-pointer transition-opacity hover:opacity-80"
      style={{
        backgroundColor: event.color + '33',
        color: event.color,
        borderLeft: `2px solid ${event.color}`,
      }}
      title={event.title}
    >
      {event.is_all_day
        ? ''
        : new Date(event.start_datetime).toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit',
          }) + ' '}
      {event.title}
    </button>
  )
}