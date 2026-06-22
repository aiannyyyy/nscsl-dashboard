import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  fetchEvents,
  fetchUsers,
  fetchHolidays,
  createEvent,
  updateEvent,
  deleteEvent,
  checkReminders,
} from '../services/calendarService'
import type { CreateEventPayload, UpdateEventPayload } from '../services/calendarService'
import { useAuth } from '../context/AuthContext' // ✅ adjust path if needed

const HOLIDAYS_KEY  = ['calendarHolidays'] as const
const REMINDERS_KEY = ['calendarReminders'] as const

export const useCalendar = (year: number) => {
  const queryClient = useQueryClient()
  const { user } = useAuth()
  const dept = user?.department ?? 'unknown'

  // ✅ scoped per department — no cross-user cache bleed
  const EVENTS_KEY = ['calendarEvents', dept] as const
  const USERS_KEY  = ['calendarUsers',  dept] as const

  // ─── GET all events ───────────────────────────────────────────
  const {
    data: events = [],
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: EVENTS_KEY,
    queryFn: fetchEvents,
    enabled: !!user, // ✅ don't fetch until user is known
  })

  // ─── GET all users (participant picker) ───────────────────────
  const { data: users = [] } = useQuery({
    queryKey: USERS_KEY,
    queryFn: fetchUsers,
    enabled: !!user,
  })

  // ─── GET PH public holidays for the current year ──────────────
  const { data: holidays = [] } = useQuery({
    queryKey: [...HOLIDAYS_KEY, year],
    queryFn: () => fetchHolidays(year),
    staleTime: 1000 * 60 * 60 * 24,
  })

  // ─── CHECK reminders every 60 seconds ─────────────────────────
  useQuery({
    queryKey: REMINDERS_KEY,
    queryFn: checkReminders,
    refetchInterval: 60 * 1000,
    refetchIntervalInBackground: true,
    retry: false,
    enabled: !!user,
  })

  // ─── POST create event ────────────────────────────────────────
  const createMutation = useMutation({
    mutationFn: (payload: CreateEventPayload) => createEvent(payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: EVENTS_KEY }),
  })

  // ─── PUT update event ─────────────────────────────────────────
  const updateMutation = useMutation({
    mutationFn: (payload: UpdateEventPayload) => updateEvent(payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: EVENTS_KEY }),
  })

  // ─── DELETE event ─────────────────────────────────────────────
  const deleteMutation = useMutation({
    mutationFn: (event_id: number) => deleteEvent(event_id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: EVENTS_KEY }),
  })

  // ─── Handlers ─────────────────────────────────────────────────
  const handleSave = (payload: CreateEventPayload, editEventId?: number) => {
    if (editEventId) {
      updateMutation.mutate({ ...payload, event_id: editEventId })
    } else {
      createMutation.mutate(payload)
    }
  }

  const handleDelete = (event_id: number) => {
    deleteMutation.mutate(event_id)
  }

  return {
    events,
    users,
    holidays,
    isLoading,
    isError,
    error,
    isSaving:   createMutation.isPending || updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
    handleSave,
    handleDelete,
  }
}