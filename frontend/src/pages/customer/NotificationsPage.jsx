import { useNavigate } from 'react-router-dom'
import Header from '../../components/customer/Header'
import BottomNav from '../../components/customer/BottomNav'
import { useFetch } from '../../hooks/useFetch'
import { Skeleton } from '../../components/shared/Skeleton'
import ErrorToast from '../../components/shared/ErrorToast'
import { useState } from 'react'
import { api } from '../../lib/api'
import { useAuth } from '../../contexts/AuthContext'

export default function NotificationsPage() {
    const [toastError, setToastError] = useState(null)
    const { user } = useAuth()

    const emailParam = user?.email ? `?email=${encodeURIComponent(user.email)}` : ''

    const { data: notifications, loading: loadingNotifs, error: notifsError } = useFetch(user?.email ? `/api/notifications${emailParam}` : null, 60_000)
    const { data: prefs, loading: loadingPrefs, error: prefsError, refetch } = useFetch(user?.email ? `/api/notifications/prefs${emailParam}` : null)

    if (notifsError && !toastError) setToastError(notifsError)
    if (prefsError && !toastError) setToastError(prefsError)

    const toggle = async (key, currentState) => {
        try {
            await api.put(`/api/notifications/prefs${emailParam}`, { key, enabled: !currentState })
            // To provide a smooth visual, we skip refetch() since the mock backend is static
        } catch (err) {
            setToastError(err.message || 'Failed to update preference')
        }
    }

    return (
        <div className="min-h-screen bg-background-dark text-slate-100 flex flex-col pb-32">
            <Header />
            <main className="mx-auto w-full max-w-2xl px-4 pt-8 space-y-6">
                <h1 className="text-2xl font-bold text-white">Notifications</h1>

                {/* Feed */}
                <div className="space-y-2">
                    {loadingNotifs
                        ? [0, 1, 2, 3].map(i => (
                            <div key={i} className="flex items-start gap-4 p-4 rounded-2xl border border-surface-border bg-surface-dark-customer">
                                <Skeleton className="size-8 rounded-full shrink-0" />
                                <div className="space-y-2 flex-1">
                                    <Skeleton className="h-4 w-1/2" />
                                    <Skeleton className="h-3 w-3/4" />
                                    <Skeleton className="h-3 w-1/4" />
                                </div>
                            </div>
                        ))
                        : (notifications || []).map(n => (
                            <div key={n.id} className={`flex items-start gap-4 p-4 rounded-2xl border transition-all ${n.unread ? 'border-primary/20 bg-primary/5' : 'border-surface-border bg-surface-dark-customer'}`}>
                                <span className={`material-symbols-outlined ${n.color} mt-0.5 text-[22px] shrink-0`}>{n.icon}</span>
                                <div className="flex-1">
                                    <div className="flex items-start justify-between gap-2">
                                        <p className={`text-sm font-semibold ${n.unread ? 'text-white' : 'text-slate-300'}`}>{n.title}</p>
                                        {n.unread && <span className="size-2 rounded-full bg-primary shrink-0 mt-1.5" />}
                                    </div>
                                    <p className="text-xs text-slate-500 mt-1 leading-relaxed">{n.desc}</p>
                                    <p className="text-xs text-slate-600 mt-2">{n.time}</p>
                                </div>
                            </div>
                        ))
                    }
                </div>

                {/* Preferences */}
                <div className="rounded-2xl border border-surface-border bg-surface-dark-customer">
                    <div className="p-5 border-b border-surface-border">
                        <h2 className="text-sm font-semibold text-white">Notification Preferences</h2>
                    </div>
                    <div className="divide-y divide-surface-border">
                        {loadingPrefs
                            ? [0, 1, 2, 3].map(i => <div key={i} className="flex items-center justify-between px-5 py-4"><Skeleton className="h-4 w-40" /><Skeleton className="h-5 w-10 rounded-full" /></div>)
                            : (prefs || []).map(f => (
                                <div key={f.key} className="flex items-center justify-between px-5 py-4">
                                    <span className="text-sm text-slate-300">{f.label}</span>
                                    <button
                                        onClick={() => toggle(f.key, f.enabled)}
                                        className={`relative w-10 h-5 rounded-full transition-colors ${f.enabled ? 'bg-primary' : 'bg-border-dark'}`}>
                                        <span className={`absolute top-0.5 left-0.5 size-4 bg-white rounded-full shadow transition-transform ${f.enabled ? 'translate-x-5' : 'translate-x-0'}`} />
                                    </button>
                                </div>
                            ))
                        }
                    </div>
                </div>
            </main>
            <BottomNav />
            <ErrorToast message={toastError} onClose={() => setToastError(null)} />
        </div>
    )
}
