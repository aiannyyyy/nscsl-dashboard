import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  fetchEvents,
  fetchUsers,
  fetchHolidays,
  createEvent,
  updateEvent,
  deleteEvent,
  checkReminders,
} from '../../services/PDOServices/calendarService'
import type { CreateEventPayload, UpdateEventPayload } from '../../services/PDOServices/calendarService'

const EVENTS_KEY = ['events']        as const
const USERS_KEY  = ['calendarUsers'] as const

export const useCalendar = (year: number) => {  // ← accepts year
  const queryClient = useQueryClient()

  // ─── GET all events ───────────────────────────────────────────
  const {
    data: events = [],
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: EVENTS_KEY,
    queryFn: fetchEvents,
  })

  // ─── GET all users (participant picker) ───────────────────────
  const { data: users = [] } = useQuery({
    queryKey: USERS_KEY,
    queryFn: fetchUsers,
  })

  // ─── GET PH public holidays for the current year ──────────────
  const { data: holidays = [] } = useQuery({
    queryKey: ['holidays', year],           // re-fetches when year changes
    queryFn: () => fetchHolidays(year),
    staleTime: 1000 * 60 * 60 * 24,        // cache 24h — holidays don't change daily
  })

  // ─── CHECK reminders every 60 seconds ─────────────────────────
  useQuery({
    queryKey: ['calendarReminders'],
    queryFn: checkReminders,
    refetchInterval: 60 * 1000,
    refetchIntervalInBackground: true,
    retry: false,
  })

  // ─── POST create event ────────────────────────────────────────
  const createMutation = useMutation({
    mutationFn: (payload: CreateEventPayload) => createEvent(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: EVENTS_KEY })
    },
  })

  // ─── PUT update event ─────────────────────────────────────────
  const updateMutation = useMutation({
    mutationFn: (payload: UpdateEventPayload) => updateEvent(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: EVENTS_KEY })
    },
  })

  // ─── DELETE event ─────────────────────────────────────────────
  const deleteMutation = useMutation({
    mutationFn: (event_id: number) => deleteEvent(event_id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: EVENTS_KEY })
    },
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