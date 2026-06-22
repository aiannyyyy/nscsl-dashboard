import React from 'react'
import type { CalendarEvent } from './EventBadge'
import { EventBadge } from './EventBadge'

interface CalendarDayCellProps {
  date: Date
  currentMonth: number
  events: CalendarEvent[]
  onDayClick: (date: Date) => void
  onEventClick: (event: CalendarEvent) => void
}

export const CalendarDayCell: React.FC<CalendarDayCellProps> = ({
  date,
  currentMonth,
  events,
  onDayClick,
  onEventClick,
}) => {
  const today = new Date()
  const isToday =
    date.getDate() === today.getDate() &&
    date.getMonth() === today.getMonth() &&
    date.getFullYear() === today.getFullYear()

  const isCurrentMonth = date.getMonth() === currentMonth
  const maxVisible = 3
  const visibleEvents = events.slice(0, maxVisible)
  const hiddenCount = events.length - maxVisible

  return (
    <div
      onClick={() => onDayClick(date)}
      className={`
        min-h-[110px] p-1.5 border-b border-r border-gray-200 dark:border-gray-700
        cursor-pointer flex flex-col gap-1 transition-colors duration-150
        ${isCurrentMonth
          ? 'bg-white dark:bg-gray-900 hover:bg-gray-50 dark:hover:bg-gray-800/50'
          : 'bg-gray-50 dark:bg-gray-800/30 hover:bg-gray-100 dark:hover:bg-gray-800/60'}
      `}
    >
      {/* Day Number */}
      <div className="flex items-center justify-end">
        <span
          className={`
            text-xs font-semibold w-6 h-6 flex items-center justify-center rounded-full transition-colors
            ${isToday
              ? 'bg-blue-500 text-white'
              : isCurrentMonth
              ? 'text-gray-900 dark:text-gray-100'
              : 'text-gray-400 dark:text-gray-600'}
          `}
        >
          {date.getDate()}
        </span>
      </div>

      {/* Events */}
      <div className="flex flex-col gap-0.5">
        {visibleEvents.map((event) => (
          <EventBadge key={event.event_id} event={event} onClick={onEventClick} />
        ))}
        {hiddenCount > 0 && (
          <span className="text-[10px] text-gray-500 dark:text-gray-400 px-1.5 font-medium">
            +{hiddenCount} more
          </span>
        )}
      </div>
    </div>
  )
}