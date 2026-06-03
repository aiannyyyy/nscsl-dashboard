import React, { useEffect, useState } from 'react'
import { X, Clock, AlignLeft, Tag, Bell, Calendar, Trash2, Users } from 'lucide-react'
import type { CalendarEvent } from './EventBadge'

const CATEGORIES = ['Meeting', 'Holiday', 'Deadline', 'Training', 'Other']
const COLORS = [
  '#3b82f6',
  '#10b981',
  '#ef4444',
  '#f97316',
  '#8b5cf6',
  '#ec4899',
  '#eab308',
]
const REMINDER_OPTIONS = [
  { label: '5 minutes before',  value: 5    },
  { label: '15 minutes before', value: 15   },
  { label: '30 minutes before', value: 30   },
  { label: '1 hour before',     value: 60   },
  { label: '1 day before',      value: 1440 },
]

export interface UserOption {
  user_id: number
  name: string
  dept: string
}

interface EventModalProps {
  isOpen: boolean
  selectedDate?: Date | null
  editEvent?: CalendarEvent | null
  isSaving?: boolean
  isDeleting?: boolean
  users?: UserOption[]
  onClose: () => void
  onSave: (event: Omit<CalendarEvent, 'event_id' | 'created_by'> & { participant_ids: number[] }) => void
  onDelete?: (event_id: number) => void
}

function toDateTimeLocal(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}

export const EventModal: React.FC<EventModalProps> = ({
  isOpen,
  selectedDate,
  editEvent,
  isSaving = false,
  isDeleting = false,
  users = [],
  onClose,
  onSave,
  onDelete,
}) => {
  const defaultStart = selectedDate ? toDateTimeLocal(selectedDate) : toDateTimeLocal(new Date())
  const defaultEnd   = selectedDate
    ? toDateTimeLocal(new Date(selectedDate.getTime() + 60 * 60 * 1000))
    : toDateTimeLocal(new Date(Date.now() + 60 * 60 * 1000))

  const [title,         setTitle]         = useState('')
  const [description,   setDescription]   = useState('')
  const [startDatetime, setStartDatetime] = useState(defaultStart)
  const [endDatetime,   setEndDatetime]   = useState(defaultEnd)
  const [isAllDay,      setIsAllDay]      = useState(false)
  const [color,         setColor]         = useState(COLORS[0])
  const [category,      setCategory]      = useState('')
  const [reminder,      setReminder]      = useState<number | ''>('')
  const [participants,  setParticipants]  = useState<number[]>([])
  const [userSearch,    setUserSearch]    = useState('')

  useEffect(() => {
    if (editEvent) {
      setTitle(editEvent.title)
      setDescription(editEvent.description || '')
      setStartDatetime(editEvent.start_datetime.slice(0, 16))
      setEndDatetime(editEvent.end_datetime.slice(0, 16))
      setIsAllDay(editEvent.is_all_day)
      setColor(editEvent.color)
      setCategory(editEvent.category || '')
      setParticipants(editEvent.participant_ids || [])
    } else {
      setTitle('')
      setDescription('')
      setStartDatetime(selectedDate ? toDateTimeLocal(selectedDate) : defaultStart)
      setEndDatetime(
        selectedDate
          ? toDateTimeLocal(new Date(selectedDate.getTime() + 60 * 60 * 1000))
          : defaultEnd
      )
      setIsAllDay(false)
      setColor(COLORS[0])
      setCategory('')
      setReminder('')
      setParticipants([])
    }
    setUserSearch('')
  }, [editEvent, selectedDate, isOpen])

  if (!isOpen) return null

  const toggleParticipant = (user_id: number) => {
    setParticipants((prev) =>
      prev.includes(user_id) ? prev.filter((id) => id !== user_id) : [...prev, user_id]
    )
  }

  const filteredUsers = users.filter((u) =>
    u.name.toLowerCase().includes(userSearch.toLowerCase()) ||
    u.dept.toLowerCase().includes(userSearch.toLowerCase())
  )

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (!title.trim()) return
    onSave({
      title:           title.trim(),
      description:     description.trim(),
      start_datetime:  startDatetime,
      end_datetime:    endDatetime,
      is_all_day:      isAllDay,
      color,
      category:        category || undefined,
      participant_ids: participants,
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/50" />

      <div
        className="relative w-full max-w-md bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl shadow-xl flex flex-col overflow-hidden max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
            <h2 className="text-sm font-semibold text-gray-900 dark:text-white">
              {editEvent ? 'Edit Event' : 'New Event'}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 p-1 rounded transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Form */}
        <form id="event-form" onSubmit={handleSubmit} className="flex flex-col gap-4 px-5 py-4 overflow-y-auto">

          {/* Title */}
          <input
            type="text"
            placeholder="Event title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            className="w-full bg-transparent text-gray-900 dark:text-gray-100 text-base font-semibold placeholder-gray-400 dark:placeholder-gray-500 outline-none border-b border-gray-200 dark:border-gray-700 pb-2 focus:border-blue-500 transition-colors"
          />

          {/* All Day Toggle */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400">
              <Calendar size={14} />
              <span className="text-xs">All day</span>
            </div>
            <button
              type="button"
              onClick={() => setIsAllDay(!isAllDay)}
              className={`w-9 h-5 rounded-full transition-colors relative ${isAllDay ? 'bg-blue-500' : 'bg-gray-300 dark:bg-gray-600'}`}
            >
              <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${isAllDay ? 'translate-x-4' : 'translate-x-0.5'}`} />
            </button>
          </div>

          {/* Date / Time */}
          {!isAllDay && (
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400 mb-1">
                <Clock size={14} />
                <span className="text-xs">Date & Time</span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] text-gray-500 dark:text-gray-400 uppercase tracking-wider">Start</label>
                  <input
                    type="datetime-local"
                    value={startDatetime}
                    onChange={(e) => setStartDatetime(e.target.value)}
                    className="bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg px-2 py-1.5 text-xs text-gray-700 dark:text-gray-300 outline-none focus:border-blue-500 transition-colors"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] text-gray-500 dark:text-gray-400 uppercase tracking-wider">End</label>
                  <input
                    type="datetime-local"
                    value={endDatetime}
                    onChange={(e) => setEndDatetime(e.target.value)}
                    className="bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg px-2 py-1.5 text-xs text-gray-700 dark:text-gray-300 outline-none focus:border-blue-500 transition-colors"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Description */}
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400">
              <AlignLeft size={14} />
              <span className="text-xs">Description</span>
            </div>
            <textarea
              placeholder="Add description..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              className="bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-xs text-gray-700 dark:text-gray-300 placeholder-gray-400 dark:placeholder-gray-500 outline-none focus:border-blue-500 transition-colors resize-none"
            />
          </div>

          {/* Participants */}
          {users.length > 0 && (
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400">
                <Users size={14} />
                <span className="text-xs">Participants</span>
                {participants.length > 0 && (
                  <span className="ml-auto text-[10px] bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 px-1.5 py-0.5 rounded-full font-medium">
                    {participants.length} selected
                  </span>
                )}
              </div>

              <input
                type="text"
                placeholder="Search users..."
                value={userSearch}
                onChange={(e) => setUserSearch(e.target.value)}
                className="bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-1.5 text-xs text-gray-700 dark:text-gray-300 placeholder-gray-400 dark:placeholder-gray-500 outline-none focus:border-blue-500 transition-colors"
              />

              <div className="max-h-32 overflow-y-auto flex flex-col gap-1 border border-gray-200 dark:border-gray-700 rounded-lg p-1">
                {filteredUsers.length === 0 ? (
                  <p className="text-xs text-gray-400 dark:text-gray-500 text-center py-2">No users found</p>
                ) : (
                  filteredUsers.map((u) => (
                    <button
                      key={u.user_id}
                      type="button"
                      onClick={() => toggleParticipant(u.user_id)}
                      className={`flex items-center gap-2 px-2 py-1.5 rounded-lg text-left transition-colors ${
                        participants.includes(u.user_id)
                          ? 'bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-700'
                          : 'hover:bg-gray-50 dark:hover:bg-gray-800'
                      }`}
                    >
                      <div
                        className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold text-white flex-shrink-0"
                        style={{ backgroundColor: COLORS[u.user_id % COLORS.length] }}
                      >
                        {u.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-gray-900 dark:text-gray-100 truncate">{u.name}</p>
                        <p className="text-[10px] text-gray-500 dark:text-gray-400 truncate">{u.dept}</p>
                      </div>
                      {participants.includes(u.user_id) && (
                        <div className="w-4 h-4 rounded-full bg-blue-500 flex items-center justify-center flex-shrink-0">
                          <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                          </svg>
                        </div>
                      )}
                    </button>
                  ))
                )}
              </div>
            </div>
          )}

          {/* Category */}
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400">
              <Tag size={14} />
              <span className="text-xs">Category</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {CATEGORIES.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setCategory(cat === category ? '' : cat)}
                  className={`px-2.5 py-1 text-[11px] font-medium rounded-full border transition-colors ${
                    category === cat
                      ? 'bg-blue-50 dark:bg-blue-900/30 border-blue-300 dark:border-blue-700 text-blue-700 dark:text-blue-300'
                      : 'bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:border-gray-400 dark:hover:border-gray-500'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Color */}
          <div className="flex items-center gap-3">
            <span className="text-xs text-gray-500 dark:text-gray-400">Color</span>
            <div className="flex gap-1.5">
              {COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  className="w-5 h-5 rounded-full transition-transform hover:scale-110"
                  style={{
                    backgroundColor: c,
                    outline: color === c ? `2px solid ${c}` : 'none',
                    outlineOffset: '2px',
                  }}
                />
              ))}
            </div>
          </div>

          {/* Reminder */}
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400">
              <Bell size={14} />
              <span className="text-xs">Reminder</span>
            </div>
            <select
              value={reminder}
              onChange={(e) => setReminder(e.target.value === '' ? '' : Number(e.target.value))}
              className="bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-1.5 text-xs text-gray-700 dark:text-gray-300 outline-none focus:border-blue-500 transition-colors"
            >
              <option value="">No reminder</option>
              {REMINDER_OPTIONS.map((r) => (
                <option key={r.value} value={r.value}>{r.label}</option>
              ))}
            </select>
          </div>
        </form>

        {/* Footer */}
        <div className="flex items-center justify-between px-5 py-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
          {editEvent && onDelete ? (
            <button
              type="button"
              onClick={() => { onDelete(editEvent.event_id); onClose() }}
              disabled={isDeleting}
              className="flex items-center gap-1.5 text-xs text-red-500 hover:text-red-600 dark:text-red-400 dark:hover:text-red-300 transition-colors disabled:opacity-50"
            >
              <Trash2 size={13} />
              {isDeleting ? 'Deleting...' : 'Delete'}
            </button>
          ) : (
            <div />
          )}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 text-xs font-medium text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              form="event-form"
              disabled={isSaving}
              className="px-4 py-1.5 text-xs font-semibold text-white bg-blue-500 hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors"
            >
              {isSaving ? 'Saving...' : editEvent ? 'Save Changes' : 'Create Event'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}