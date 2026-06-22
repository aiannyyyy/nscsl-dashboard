import React from 'react'
import { X, Clock, AlignLeft, Tag, Users, Calendar, Edit, Trash2 } from 'lucide-react'
import type { CalendarEvent } from './EventBadge'
import type { UserOption } from './EventModal'

interface EventDetailModalProps {
  isOpen: boolean
  event: CalendarEvent | null
  users?: UserOption[]
  isDeleting?: boolean
  onClose: () => void
  onEdit: (event: CalendarEvent) => void
  onDelete: (event_id: number) => void
}

function formatDateTime(dateStr: string, isAllDay: boolean): string {
  const date = new Date(dateStr)
  if (isAllDay) {
    return date.toLocaleDateString('en-US', {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
    })
  }
  return date.toLocaleDateString('en-US', {
    weekday: 'short', year: 'numeric', month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

function formatDateRange(event: CalendarEvent): string {
  const start = new Date(event.start_datetime)
  const end   = new Date(event.end_datetime)

  if (event.is_all_day) {
    if (start.toDateString() === end.toDateString()) {
      return start.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
    }
    return `${start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – ${end.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`
  }

  const sameDay = start.toDateString() === end.toDateString()
  if (sameDay) {
    return `${start.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })} · ${start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} – ${end.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
  }

  return `${formatDateTime(event.start_datetime, false)} – ${formatDateTime(event.end_datetime, false)}`
}

export const EventDetailModal: React.FC<EventDetailModalProps> = ({
  isOpen,
  event,
  users = [],
  isDeleting = false,
  onClose,
  onEdit,
  onDelete,
}) => {
  if (!isOpen || !event) return null

  const participants = users.filter((u) => event.participant_ids?.includes(u.user_id))

  const COLORS = [
    '#3b82f6', '#10b981', '#ef4444',
    '#f97316', '#8b5cf6', '#ec4899', '#eab308',
  ]

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/50" />

      <div
        className="relative w-full max-w-md bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl shadow-xl flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Colored top bar */}
        <div className="h-1.5 w-full" style={{ backgroundColor: event.color }} />

        {/* Header */}
        <div className="flex items-start justify-between px-5 pt-4 pb-3 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-start gap-3 flex-1 min-w-0">
            <div
              className="w-3 h-3 rounded-full flex-shrink-0 mt-1"
              style={{ backgroundColor: event.color }}
            />
            <div className="flex-1 min-w-0">
              <h2 className="text-base font-semibold text-gray-900 dark:text-white leading-tight">
                {event.title}
              </h2>
              {event.category && (
                <span
                  className="inline-block mt-1 text-[10px] font-medium px-2 py-0.5 rounded-full"
                  style={{ backgroundColor: event.color + '22', color: event.color }}
                >
                  {event.category}
                </span>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 p-1 rounded transition-colors flex-shrink-0 ml-2"
          >
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div className="flex flex-col gap-4 px-5 py-4 overflow-y-auto max-h-[60vh]">

          {/* Date & Time */}
          <div className="flex items-start gap-3">
            <div className="w-7 h-7 rounded-lg bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center flex-shrink-0">
              <Clock size={14} className="text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <p className="text-xs font-medium text-gray-900 dark:text-gray-100">
                {formatDateRange(event)}
              </p>
              {Boolean(event.is_all_day) && (
                <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5">All day</p>
                )}
            </div>
          </div>

          {/* Description */}
          {event.description && (
            <div className="flex items-start gap-3">
              <div className="w-7 h-7 rounded-lg bg-gray-100 dark:bg-gray-800 flex items-center justify-center flex-shrink-0">
                <AlignLeft size={14} className="text-gray-500 dark:text-gray-400" />
              </div>
              <p className="text-xs text-gray-700 dark:text-gray-300 leading-relaxed pt-1 whitespace-pre-wrap">
                {event.description}
              </p>
            </div>
          )}

          {/* Participants */}
          {participants.length > 0 && (
            <div className="flex items-start gap-3">
              <div className="w-7 h-7 rounded-lg bg-gray-100 dark:bg-gray-800 flex items-center justify-center flex-shrink-0">
                <Users size={14} className="text-gray-500 dark:text-gray-400" />
              </div>
              <div className="flex-1">
                <p className="text-[10px] text-gray-500 dark:text-gray-400 mb-2 uppercase tracking-wider font-medium">
                  {participants.length} Participant{participants.length > 1 ? 's' : ''}
                </p>
                <div className="flex flex-col gap-1.5">
                  {participants.map((u) => (
                    <div key={u.user_id} className="flex items-center gap-2">
                      <div
                        className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold text-white flex-shrink-0"
                        style={{ backgroundColor: COLORS[u.user_id % COLORS.length] }}
                      >
                        {u.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="text-xs font-medium text-gray-900 dark:text-gray-100">{u.name}</p>
                        <p className="text-[10px] text-gray-500 dark:text-gray-400">{u.dept}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Category */}
          {event.category && (
            <div className="flex items-center gap-3">
              <div className="w-7 h-7 rounded-lg bg-gray-100 dark:bg-gray-800 flex items-center justify-center flex-shrink-0">
                <Tag size={14} className="text-gray-500 dark:text-gray-400" />
              </div>
              <p className="text-xs text-gray-700 dark:text-gray-300">{event.category}</p>
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-5 py-3 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
          {/* Delete */}
          <button
            onClick={() => { onDelete(event.event_id); onClose() }}
            disabled={isDeleting}
            className="flex items-center gap-1.5 text-xs text-red-500 hover:text-red-600 dark:text-red-400 dark:hover:text-red-300 transition-colors disabled:opacity-50"
          >
            <Trash2 size={13} />
            {isDeleting ? 'Deleting...' : 'Delete'}
          </button>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-3 py-1.5 text-xs font-medium text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-colors"
            >
              Close
            </button>
            <button
              onClick={() => { onClose(); onEdit(event) }}
              className="flex items-center gap-1.5 px-4 py-1.5 text-xs font-semibold text-white bg-blue-500 hover:bg-blue-600 rounded-lg transition-colors"
            >
              <Edit size={13} />
              Edit
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}