import { useNavigate } from 'react-router-dom'
import Header from '../../components/customer/Header'
import BottomNav from '../../components/customer/BottomNav'

const policies = [
    { id: 'POL-2891', type: 'Comprehensive Auto', premium: '$142/mo', status: 'Active', next: 'Mar 15, 2025', icon: 'directions_car', color: 'text-blue-400 bg-blue-400/10' },
    { id: 'POL-2760', type: 'Home & Property', premium: '$98/mo', status: 'Active', next: 'Jun 1, 2025', icon: 'home', color: 'text-emerald-400 bg-emerald-400/10' },
    { id: 'POL-2541', type: 'Term Life 20yr', premium: '$62/mo', status: 'Active', next: 'Jan 10, 2026', icon: 'favorite', color: 'text-purple-400 bg-purple-400/10' },
]

const activities = [
    { icon: 'check_circle', label: 'Claim CLM-9803 approved', sub: '$1,240 reimbursement processed', t: '2 days ago', color: 'text-emerald-400' },
    { icon: 'description', label: 'New statement available', sub: 'February 2025 Policy Statement', t: '1 week ago', color: 'text-blue-400' },
    { icon: 'warning', label: 'Payment processed', sub: 'Auto renewal premium deducted', t: '2 weeks ago', color: 'text-yellow-400' },
]

export default function HomePage() {
    const navigate = useNavigate()
    return (
        <div className="min-h-screen bg-background-dark text-slate-100 flex flex-col pb-32">
            <Header />
            <main className="mx-auto w-full max-w-2xl px-4 pt-8 space-y-8">
                {/* Welcome */}
                <div>
                    <p className="text-slate-400 text-sm">Good evening,</p>
                    <h1 className="text-3xl font-bold text-white">Arjun Mehta</h1>
                    <p className="text-slate-500 text-sm mt-1">3 active policies · All protected</p>
                </div>

                {/* Coverage summary */}
                <div className="grid grid-cols-3 gap-3">
                    {[
                        { label: 'Active Policies', value: '3', icon: 'shield', color: 'text-primary' },
                        { label: 'Total Coverage', value: '$1.2M', icon: 'security', color: 'text-emerald-400' },
                        { label: 'Open Claims', value: '1', icon: 'description', color: 'text-yellow-400' },
                    ].map((s) => (
                        <div key={s.label} className="rounded-2xl border border-surface-border bg-surface-dark-customer p-4 flex flex-col gap-2 text-center">
                            <span className={`material-symbols-outlined mx-auto text-[28px] ${s.color}`}>{s.icon}</span>
                            <p className="text-xl font-bold text-white">{s.value}</p>
                            <p className="text-[11px] text-slate-500">{s.label}</p>
                        </div>
                    ))}
                </div>

                {/* Policies */}
                <div>
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-base font-semibold text-white">My Policies</h2>
                        <button onClick={() => navigate('/customer/policies')} className="text-sm text-primary font-medium hover:underline">View all</button>
                    </div>
                    <div className="space-y-3">
                        {policies.map((p) => (
                            <div
                                key={p.id}
                                onClick={() => navigate('/customer/policy-detail')}
                                className="flex items-center justify-between p-4 rounded-2xl border border-surface-border bg-surface-dark-customer hover:border-primary/40 transition-all cursor-pointer group"
                            >
                                <div className="flex items-center gap-4">
                                    <div className={`size-11 rounded-xl flex items-center justify-center ${p.color}`}>
                                        <span className="material-symbols-outlined text-[22px]">{p.icon}</span>
                                    </div>
                                    <div>
                                        <p className="text-sm font-semibold text-white">{p.type}</p>
                                        <p className="text-xs text-slate-500">{p.id} · Renews {p.next}</p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className="text-sm font-bold text-white">{p.premium}</p>
                                    <span className="text-[11px] text-emerald-400 font-medium">{p.status}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Activity */}
                <div>
                    <h2 className="text-base font-semibold text-white mb-4">Recent Activity</h2>
                    <div className="space-y-3">
                        {activities.map((a, i) => (
                            <div key={i} className="flex items-start gap-3 p-4 rounded-2xl border border-surface-border bg-surface-dark-customer">
                                <span className={`material-symbols-outlined ${a.color} mt-0.5 text-[22px]`}>{a.icon}</span>
                                <div>
                                    <p className="text-sm font-medium text-white">{a.label}</p>
                                    <p className="text-xs text-slate-500">{a.sub}</p>
                                </div>
                                <span className="ml-auto text-xs text-slate-600 shrink-0">{a.t}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </main>
            <BottomNav />
        </div>
    )
}
