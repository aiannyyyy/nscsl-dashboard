import React from 'react'
import type { CalendarEvent } from './EventBadge'
import { EventBadge } from './EventBadge'

interface CalendarGridProps {
  currentDate: Date
  events: CalendarEvent[]
  onDayClick: (date: Date) => void
  onEventClick: (event: CalendarEvent) => void
}

const DAY_HEADERS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

function getCalendarDays(date: Date): Date[] {
  const year = date.getFullYear()
  const month = date.getMonth()
  const firstDay = new Date(year, month, 1)
  const lastDay = new Date(year, month + 1, 0)
  const days: Date[] = []

  for (let i = 0; i < firstDay.getDay(); i++) {
    days.push(new Date(year, month, -firstDay.getDay() + i + 1))
  }
  for (let d = 1; d <= lastDay.getDate(); d++) {
    days.push(new Date(year, month, d))
  }
  const remaining = 7 - (days.length % 7)
  if (remaining < 7) {
    for (let i = 1; i <= remaining; i++) {
      days.push(new Date(year, month + 1, i))
    }
  }
  return days
}

function toDateOnly(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate())
}

function isSameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  )
}

// For each event, calculate which grid cell index it starts and ends on
interface PositionedEvent {
  event: CalendarEvent
  startIdx: number
  endIdx: number
  span: number
  row: number // vertical stacking row within a day
}

function layoutEvents(events: CalendarEvent[], days: Date[]): PositionedEvent[] {
  const positioned: PositionedEvent[] = []

  for (const event of events) {
    const start = toDateOnly(new Date(event.start_datetime))
    const end   = toDateOnly(new Date(event.end_datetime))

    const startIdx = days.findIndex((d) => isSameDay(d, start))
    const endIdx   = days.findIndex((d) => isSameDay(d, end))

    if (startIdx === -1) continue

    const clampedEnd = endIdx === -1 ? days.length - 1 : endIdx
    const span = clampedEnd - startIdx + 1

    positioned.push({ event, startIdx, endIdx: clampedEnd, span, row: 0 })
  }

  // Sort so multi-day events come first (they get lower row numbers)
  positioned.sort((a, b) => b.span - a.span || a.startIdx - b.startIdx)

  // Assign rows per starting cell to avoid overlap
  const rowTracker: Record<number, boolean[]> = {}
  for (const p of positioned) {
    // Find the first row not occupied by any overlapping event in this range
    let row = 0
    while (true) {
      let occupied = false
      for (let i = p.startIdx; i <= p.endIdx; i++) {
        if (rowTracker[i]?.[row]) { occupied = true; break }
      }
      if (!occupied) break
      row++
    }
    p.row = row
    for (let i = p.startIdx; i <= p.endIdx; i++) {
      if (!rowTracker[i]) rowTracker[i] = []
      rowTracker[i][row] = true
    }
  }

  return positioned
}

export const CalendarGrid: React.FC<CalendarGridProps> = ({
  currentDate,
  events,
  onDayClick,
  onEventClick,
}) => {
  const days = getCalendarDays(currentDate)
  const positioned = layoutEvents(events, days)
  const weeks: Date[][] = []
  for (let i = 0; i < days.length; i += 7) {
    weeks.push(days.slice(i, i + 7))
  }

  const today = new Date()

  return (
    <div className="flex flex-col flex-1">
      {/* Day Headers */}
      <div className="grid grid-cols-7 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
        {DAY_HEADERS.map((day) => (
          <div
            key={day}
            className="py-2 text-center text-[11px] font-semibold uppercase tracking-widest text-gray-500 dark:text-gray-400 border-r border-gray-200 dark:border-gray-700 last:border-r-0"
          >
            {day}
          </div>
        ))}
      </div>

      {/* Weeks */}
      {weeks.map((week, weekIdx) => {
        const weekStartIdx = weekIdx * 7
        const weekEndIdx   = weekStartIdx + 6

        // Events that are visible in this week
        const weekEvents = positioned.filter(
          (p) => p.startIdx <= weekEndIdx && p.endIdx >= weekStartIdx
        )

        // Max rows needed in this week
        const maxRow = weekEvents.reduce((m, p) => Math.max(m, p.row), -1)

        return (
          <div key={weekIdx} className="relative grid grid-cols-7 flex-1" style={{ minHeight: 140 + (maxRow + 1) * 22 }}>
            {/* Day cells (background + day number) */}
            {week.map((date, dayIdx) => {
              const isToday = isSameDay(date, today)
              const isCurrentMonth = date.getMonth() === currentDate.getMonth()
              return (
                <div
                  key={dayIdx}
                  onClick={() => onDayClick(date)}
                  className={`
                    border-b border-r border-gray-200 dark:border-gray-700 cursor-pointer
                    transition-colors duration-150 flex flex-col
                    ${isCurrentMonth
                      ? 'bg-white dark:bg-gray-900 hover:bg-gray-50 dark:hover:bg-gray-800/50'
                      : 'bg-gray-50 dark:bg-gray-800/30 hover:bg-gray-100 dark:hover:bg-gray-800/60'}
                  `}
                >
                  {/* Day number */}
                  <div className="flex items-center justify-end p-1.5">
                    <span
                      className={`
                        text-xs font-semibold w-6 h-6 flex items-center justify-center rounded-full
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
                </div>
              )
            })}

            {/* Event bars — absolutely positioned over the grid */}
            {weekEvents.map(({ event, startIdx, endIdx, span, row }) => {
              // Clamp to this week
              const clampedStart = Math.max(startIdx, weekStartIdx)
              const clampedEnd   = Math.min(endIdx, weekEndIdx)
              const colStart     = clampedStart - weekStartIdx // 0–6
              const colSpan      = clampedEnd - clampedStart + 1
              const startsHere   = startIdx >= weekStartIdx
              const endsHere     = endIdx <= weekEndIdx

              return (
                <button
                  key={`${event.event_id}-${weekIdx}`}
                  onClick={(e) => { e.stopPropagation(); onEventClick(event) }}
                  title={event.title}
                  className="absolute text-[11px] font-medium truncate z-10 transition-opacity hover:opacity-80"
                  style={{
                    top: 36 + row * 22,
                    left:   `calc(${(colStart / 7) * 100}% + 2px)`,
                    width:  `calc(${(colSpan  / 7) * 100}% - 4px)`,
                    height: 20,
                    backgroundColor: event.color + '33',
                    color: event.color,
                    borderLeft:   startsHere ? `2px solid ${event.color}` : 'none',
                    borderRight:  endsHere   ? undefined : 'none',
                    borderRadius: startsHere && endsHere ? 4 : startsHere ? '4px 0 0 4px' : endsHere ? '0 4px 4px 0' : 0,
                    paddingLeft:  startsHere ? 6 : 4,
                    paddingRight: 4,
                    display: 'flex',
                    alignItems: 'center',
                  }}
                >
                  {startsHere && (
                    <>
                      {!event.is_all_day && (
                        <span className="mr-1 opacity-75">
                          {new Date(event.start_datetime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      )}
                      {event.title}
                    </>
                  )}
                </button>
              )
            })}
          </div>
        )
      })}
    </div>
  )
}