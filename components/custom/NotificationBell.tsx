"use client"

import { useEffect, useMemo, useState } from 'react'
import { Bell } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'

type NotificationItem = {
  id: string
  user_id: string
  title: string
  message: string
  is_read: boolean
  created_at: string
}

function formatRelativeDate(dateIso: string) {
  const createdAt = new Date(dateIso).getTime()
  const now = Date.now()
  const diffMs = createdAt - now

  const minutes = Math.round(diffMs / (1000 * 60))
  if (Math.abs(minutes) < 60) {
    return new Intl.RelativeTimeFormat('fr', { numeric: 'auto' }).format(minutes, 'minute')
  }

  const hours = Math.round(diffMs / (1000 * 60 * 60))
  if (Math.abs(hours) < 24) {
    return new Intl.RelativeTimeFormat('fr', { numeric: 'auto' }).format(hours, 'hour')
  }

  const days = Math.round(diffMs / (1000 * 60 * 60 * 24))
  return new Intl.RelativeTimeFormat('fr', { numeric: 'auto' }).format(days, 'day')
}

export default function NotificationBell() {
  const [userId, setUserId] = useState<string | null>(null)
  const [notifications, setNotifications] = useState<NotificationItem[]>([])
  const [loading, setLoading] = useState(true)
  const [markingRead, setMarkingRead] = useState(false)

  useEffect(() => {
    const supabase = createClient()
    let isMounted = true

    async function loadInitial() {
      setLoading(true)
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user || !isMounted) {
        setUserId(null)
        setNotifications([])
        setLoading(false)
        return
      }

      setUserId(user.id)

      const { data } = await supabase
        .from('notifications')
        .select('id, user_id, title, message, is_read, created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

      if (isMounted) {
        setNotifications((data ?? []) as NotificationItem[])
        setLoading(false)
      }
    }

    loadInitial()

    return () => {
      isMounted = false
    }
  }, [])

  useEffect(() => {
    if (!userId) return

    const supabase = createClient()
    const channel = supabase
      .channel('notifs')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          const inserted = payload.new as NotificationItem
          setNotifications((prev) => {
            if (prev.some((item) => item.id === inserted.id)) return prev
            return [inserted, ...prev]
          })
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [userId])

  const unreadCount = notifications.filter((notification) => !notification.is_read).length
  const hasUnread = unreadCount > 0

  const notificationContent = useMemo(() => {
    if (loading) {
      return <p className="text-sm text-gray-500 font-body">Loading...</p>
    }

    if (notifications.length === 0) {
      return <p className="text-sm text-gray-500 font-body">Aucune notification</p>
    }

    return (
      <div className="space-y-3 max-h-80 overflow-auto pr-1">
        {notifications.map((notification) => (
          <div key={notification.id} className="rounded-lg border border-gray-200 p-3 bg-white">
            <p className="text-sm text-midnight font-heading">{notification.title}</p>
            <p className="text-sm text-gray-600 font-body mt-1">{notification.message}</p>
            <p className="text-xs text-gray-400 font-body mt-2">{formatRelativeDate(notification.created_at)}</p>
          </div>
        ))}
      </div>
    )
  }, [loading, notifications])

  async function markAllAsRead() {
    if (!userId || unreadCount === 0) return

    setMarkingRead(true)
    try {
      const supabase = createClient()
      await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('user_id', userId)
        .eq('is_read', false)

      setNotifications((prev) => prev.map((notification) => ({ ...notification, is_read: true })))
    } finally {
      setMarkingRead(false)
    }
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon-sm" className="relative">
          <Bell className="h-4 w-4 text-midnight" />
          {hasUnread && (
            <span className="absolute top-1 right-1 bg-red-500 rounded-full w-2 h-2" />
          )}
          <span className="sr-only">Notifications</span>
        </Button>
      </PopoverTrigger>

      <PopoverContent align="end" className="w-96">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-heading text-midnight">Notifications</h3>
          <Button
            size="sm"
            variant="ghost"
            onClick={markAllAsRead}
            disabled={markingRead || unreadCount === 0}
            className="text-xs text-teal hover:text-teal/90"
          >
            {markingRead ? 'Updating...' : 'Mark all as read'}
          </Button>
        </div>
        {notificationContent}
      </PopoverContent>
    </Popover>
  )
}
