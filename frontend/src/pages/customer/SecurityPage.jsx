import { useState } from 'react'
import Header from '../../components/customer/Header'
import BottomNav from '../../components/customer/BottomNav'

export default function SecurityPage() {
    const [twoFAEnabled, setTwoFAEnabled] = useState(true)

    const sessions = [
        { device: 'Chrome on Windows', location: 'Mumbai, IN', time: 'Active now', current: true },
        { device: 'Safari on iPhone 15', location: 'Pune, IN', time: '2 hours ago', current: false },
        { device: 'Firefox on MacBook', location: 'Bangalore, IN', time: '3 days ago', current: false },
    ]

    return (
        <div className="min-h-screen bg-background-dark text-slate-100 flex flex-col pb-32">
            <Header showBack />
            <main className="mx-auto w-full max-w-2xl px-4 pt-8 space-y-6">
                <h1 className="text-2xl font-bold text-white">Security & Privacy</h1>

                {/* 2FA Toggle */}
                <div className="rounded-2xl border border-surface-border bg-surface-dark-customer p-6">
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                            <div className="size-10 rounded-xl bg-blue-400/10 flex items-center justify-center">
                                <span className="material-symbols-outlined text-blue-400">phonelink_lock</span>
                            </div>
                            <div>
                                <p className="text-sm font-semibold text-white">Two-Factor Authentication</p>
                                <p className="text-xs text-slate-500">Authenticator app</p>
                            </div>
                        </div>
                        <button
                            onClick={() => setTwoFAEnabled(!twoFAEnabled)}
                            className={`relative w-12 h-6 rounded-full transition-colors ${twoFAEnabled ? 'bg-primary' : 'bg-border-dark'}`}
                        >
                            <span className={`absolute top-1 left-1 size-4 bg-white rounded-full shadow transition-transform ${twoFAEnabled ? 'translate-x-6' : 'translate-x-0'}`} />
                        </button>
                    </div>
                    <p className="text-xs text-slate-500 leading-relaxed">
                        2FA adds an extra layer of security by requiring a verification code in addition to your password.
                    </p>
                </div>

                {/* Password */}
                <div className="rounded-2xl border border-surface-border bg-surface-dark-customer p-6">
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                            <div className="size-10 rounded-xl bg-purple-400/10 flex items-center justify-center">
                                <span className="material-symbols-outlined text-purple-400">lock</span>
                            </div>
                            <div>
                                <p className="text-sm font-semibold text-white">Password</p>
                                <p className="text-xs text-slate-500">Last changed 3 months ago</p>
                            </div>
                        </div>
                        <button className="text-sm text-primary font-medium hover:underline">Change</button>
                    </div>
                    <div className="flex gap-1">
                        {[...Array(8)].map((_, i) => (
                            <div key={i} className={`h-1.5 flex-1 rounded-full ${i < 7 ? 'bg-emerald-500' : 'bg-border-dark'}`} />
                        ))}
                    </div>
                    <p className="text-xs text-emerald-400 mt-2">Strong password</p>
                </div>

                {/* Active sessions */}
                <div className="rounded-2xl border border-surface-border bg-surface-dark-customer">
                    <div className="flex items-center justify-between p-5 border-b border-surface-border">
                        <h2 className="text-sm font-semibold text-white">Active Sessions</h2>
                        <button className="text-xs text-red-400 hover:underline font-medium">Revoke All Others</button>
                    </div>
                    <div className="divide-y divide-surface-border">
                        {sessions.map((s, i) => (
                            <div key={i} className="flex items-center gap-4 px-5 py-4">
                                <span className="material-symbols-outlined text-slate-400">devices</span>
                                <div className="flex-1">
                                    <div className="flex items-center gap-2">
                                        <p className="text-sm font-medium text-white">{s.device}</p>
                                        {s.current && <span className="text-[10px] text-emerald-400 bg-emerald-400/10 px-1.5 py-0.5 rounded-full">Current</span>}
                                    </div>
                                    <p className="text-xs text-slate-500">{s.location} · {s.time}</p>
                                </div>
                                {!s.current && <button className="text-xs text-red-400 hover:underline">Revoke</button>}
                            </div>
                        ))}
                    </div>
                </div>
            </main>
            <BottomNav />
        </div>
    )
}
