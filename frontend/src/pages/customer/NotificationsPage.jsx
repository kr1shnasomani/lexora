import { useState } from 'react'
import Header from '../../components/customer/Header'
import BottomNav from '../../components/customer/BottomNav'

const notifications = [
    { icon: 'check_circle', color: 'text-emerald-400', title: 'Claim CLM-9803 Approved', desc: '$1,240 reimbursement is being processed to your account.', time: '2 days ago', unread: false },
    { icon: 'upcoming', color: 'text-yellow-400', title: 'Renewal Reminder', desc: 'Your auto policy POL-2891 renews in 23 days.', time: '3 days ago', unread: true },
    { icon: 'description', color: 'text-blue-400', title: 'New Statement Ready', desc: 'Your February 2025 policy statement is available.', time: '1 week ago', unread: true },
    { icon: 'payment', color: 'text-slate-400', title: 'Payment Processed', desc: 'Monthly premium of $302 deducted from Visa ····4892.', time: '2 weeks ago', unread: false },
]

const prefs = [
    { label: 'Claim Updates', key: 'claims', on: true },
    { label: 'Payment Confirmations', key: 'payments', on: true },
    { label: 'Renewal Reminders', key: 'renewals', on: true },
    { label: 'Promotional Offers', key: 'promos', on: false },
]

export default function NotificationsPage() {
    const [flags, setFlags] = useState(prefs)
    const toggle = (key) => setFlags((prev) => prev.map((f) => f.key === key ? { ...f, on: !f.on } : f))

    return (
        <div className="min-h-screen bg-background-dark text-slate-100 flex flex-col pb-32">
            <Header />
            <main className="mx-auto w-full max-w-2xl px-4 pt-8 space-y-6">
                <h1 className="text-2xl font-bold text-white">Notifications</h1>

                {/* Feed */}
                <div className="space-y-2">
                    {notifications.map((n, i) => (
                        <div key={i} className={`flex items-start gap-4 p-4 rounded-2xl border transition-all ${n.unread ? 'border-primary/20 bg-primary/5' : 'border-surface-border bg-surface-dark-customer'}`}>
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
                    ))}
                </div>

                {/* Prefs */}
                <div className="rounded-2xl border border-surface-border bg-surface-dark-customer">
                    <div className="p-5 border-b border-surface-border">
                        <h2 className="text-sm font-semibold text-white">Notification Preferences</h2>
                    </div>
                    <div className="divide-y divide-surface-border">
                        {flags.map((f) => (
                            <div key={f.key} className="flex items-center justify-between px-5 py-4">
                                <span className="text-sm text-slate-300">{f.label}</span>
                                <button
                                    onClick={() => toggle(f.key)}
                                    className={`relative w-10 h-5 rounded-full transition-colors ${f.on ? 'bg-primary' : 'bg-border-dark'}`}
                                >
                                    <span className={`absolute top-0.5 left-0.5 size-4 bg-white rounded-full shadow transition-transform ${f.on ? 'translate-x-5' : 'translate-x-0'}`} />
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            </main>
            <BottomNav />
        </div>
    )
}
