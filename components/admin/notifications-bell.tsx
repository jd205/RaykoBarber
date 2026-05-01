'use client'

import { useEffect, useRef, useState } from 'react'
import { Bell, X } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { dictionaries } from '@/lib/i18n/dictionaries'
import { format } from 'date-fns'

type Notification = {
  id: string
  type: 'new_booking' | 'reschedule' | 'cancellation'
  message: string
  client_name: string | null
  created_at: string
  read: boolean
}

const TYPE_COLORS: Record<Notification['type'], string> = {
  new_booking: 'bg-yellow-500/20 text-yellow-400',
  reschedule: 'bg-blue-500/20 text-blue-400',
  cancellation: 'bg-red-500/20 text-red-400',
}

export function NotificationsBell({ dict }: { dict: typeof dictionaries.en }) {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const supabase = createClient()

  const fetchNotifications = async () => {
    const { data } = await supabase
      .from('notifications')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(20)
    if (data) setNotifications(data as Notification[])
  }

  useEffect(() => {
    fetchNotifications()
    const interval = setInterval(fetchNotifications, 30000)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const markRead = async (id: string) => {
    await supabase.from('notifications').update({ read: true }).eq('id', id)
    setNotifications(prev =>
      prev.map(n => n.id === id ? { ...n, read: true } : n)
    )
  }

  const unreadCount = notifications.filter(n => !n.read).length

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(o => !o)}
        className="relative p-2 hover:bg-white/10 rounded-full transition-colors"
        aria-label={dict.notifications}
      >
        <Bell className="w-5 h-5 text-white" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-yellow-500 text-black text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-80 bg-[#111] border border-white/10 rounded-2xl shadow-2xl z-50 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
            <h3 className="font-bold text-white text-sm">{dict.notifications}</h3>
            <button onClick={() => setOpen(false)} className="text-gray-400 hover:text-white">
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="max-h-80 overflow-y-auto">
            {notifications.length === 0 ? (
              <p className="text-gray-500 text-sm text-center py-8">{dict.noNotifications}</p>
            ) : (
              notifications.map(n => (
                <button
                  key={n.id}
                  onClick={() => markRead(n.id)}
                  className={`w-full text-left px-4 py-3 border-b border-white/5 hover:bg-white/5 transition-colors ${!n.read ? 'bg-white/[0.03]' : ''}`}
                >
                  <div className="flex items-start gap-3">
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full mt-0.5 shrink-0 ${TYPE_COLORS[n.type]}`}>
                      {n.type === 'new_booking' ? dict.newBooking : n.type === 'reschedule' ? dict.rescheduled : dict.cancelled}
                    </span>
                    {!n.read && <span className="w-2 h-2 bg-yellow-500 rounded-full mt-1 shrink-0" />}
                  </div>
                  <p className="text-white text-sm mt-1 leading-snug">{n.message}</p>
                  <p className="text-gray-500 text-xs mt-1">
                    {format(new Date(n.created_at), 'MMM d, h:mm a')}
                  </p>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}
