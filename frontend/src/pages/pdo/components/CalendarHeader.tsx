import React from 'react'
import { ChevronLeft, ChevronRight, CalendarDays, Plus } from 'lucide-react'

interface CalendarHeaderProps {
  currentDate: Date
  onPrev: () => void
  onNext: () => void
  onToday: () => void
  onAddEvent: () => void
}

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

export const CalendarHeader: React.FC<CalendarHeaderProps> = ({
  currentDate,
  onPrev,
  onNext,
  onToday,
  onAddEvent,
}) => {
  return (
    <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 dark:border-gray-700">
      {/* Left — Icon + Title */}
      <div className="flex items-center gap-3">
        <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400">
          <CalendarDays size={18} />
        </div>
        <div>
          <h1 className="text-base font-semibold text-gray-900 dark:text-gray-100 leading-tight">
            {MONTHS[currentDate.getMonth()]} {currentDate.getFullYear()}
          </h1>
          <p className="text-[11px] text-gray-500 dark:text-gray-400">Shared Calendar</p>
        </div>
      </div>

      {/* Right — Controls */}
      <div className="flex items-center gap-2">
        {/* Today Button */}
        <button
          onClick={onToday}
          className="px-3 py-1.5 text-xs font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg transition-colors"
        >
          Today
        </button>

        {/* Prev / Next */}
        <div className="flex items-center border border-gray-300 dark:border-gray-600 rounded-lg overflow-hidden">
          <button
            onClick={onPrev}
            className="px-2 py-1.5 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          >
            <ChevronLeft size={16} />
          </button>
          <div className="w-px h-5 bg-gray-300 dark:bg-gray-600" />
          <button
            onClick={onNext}
            className="px-2 py-1.5 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          >
            <ChevronRight size={16} />
          </button>
        </div>

        {/* Add Event */}
        <button
          onClick={onAddEvent}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-blue-500 hover:bg-blue-600 rounded-lg transition-colors"
        >
          <Plus size={14} />
          Add Event
        </button>
      </div>
    </div>
  )
}