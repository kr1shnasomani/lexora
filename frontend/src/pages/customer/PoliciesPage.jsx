import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Header from '../../components/customer/Header'
import BottomNav from '../../components/customer/BottomNav'

const policies = [
    { id: 'POL-2891', type: 'Comprehensive Auto', premium: '$142/mo', coverage: '$250,000', status: 'Active', next: 'Mar 15, 2025', icon: 'directions_car', color: 'text-blue-400 bg-blue-400/10' },
    { id: 'POL-2760', type: 'Home & Property', premium: '$98/mo', coverage: '$850,000', status: 'Active', next: 'Jun 1, 2025', icon: 'home', color: 'text-emerald-400 bg-emerald-400/10' },
    { id: 'POL-2541', type: 'Term Life 20yr', premium: '$62/mo', coverage: '$500,000', status: 'Active', next: 'Jan 10, 2026', icon: 'favorite', color: 'text-purple-400 bg-purple-400/10' },
    { id: 'POL-2134', type: 'Personal Liability', premium: '$28/mo', coverage: '$100,000', status: 'Pending Renewal', next: 'Feb 28, 2025', icon: 'shield_person', color: 'text-yellow-400 bg-yellow-400/10' },
]

export default function PoliciesPage() {
    const navigate = useNavigate()
    const [filter, setFilter] = useState('All')
    const displayed = filter === 'All' ? policies : policies.filter((p) => p.status === filter)

    return (
        <div className="min-h-screen bg-background-dark text-slate-100 flex flex-col pb-32">
            <Header />
            <main className="mx-auto w-full max-w-2xl px-4 pt-8 space-y-6">
                <div>
                    <h1 className="text-2xl font-bold text-white">My Policies</h1>
                    <p className="text-slate-500 text-sm mt-1">Manage and review all your coverage plans</p>
                </div>

                <div className="flex gap-2">
                    {['All', 'Active', 'Pending Renewal'].map((f) => (
                        <button
                            key={f}
                            onClick={() => setFilter(f)}
                            className={`px-4 py-1.5 text-sm rounded-full font-medium transition-colors ${filter === f ? 'bg-primary text-white' : 'bg-surface-dark-customer border border-surface-border text-slate-400 hover:text-white'}`}
                        >
                            {f}
                        </button>
                    ))}
                </div>

                <div className="space-y-4">
                    {displayed.map((p) => (
                        <div
                            key={p.id}
                            onClick={() => navigate('/customer/policy-detail')}
                            className="rounded-2xl border border-surface-border bg-surface-dark-customer p-6 cursor-pointer hover:border-primary/40 transition-all group"
                        >
                            <div className="flex items-start justify-between mb-4">
                                <div className="flex items-center gap-3">
                                    <div className={`size-11 rounded-xl flex items-center justify-center ${p.color}`}>
                                        <span className="material-symbols-outlined text-[22px]">{p.icon}</span>
                                    </div>
                                    <div>
                                        <p className="font-semibold text-white">{p.type}</p>
                                        <p className="text-xs text-slate-500 font-mono">{p.id}</p>
                                    </div>
                                </div>
                                <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${p.status === 'Active' ? 'text-emerald-400 bg-emerald-400/10' : 'text-yellow-400 bg-yellow-400/10'}`}>{p.status}</span>
                            </div>
                            <div className="grid grid-cols-3 gap-3">
                                <div>
                                    <p className="text-[11px] text-slate-500">Premium</p>
                                    <p className="text-sm font-bold text-white">{p.premium}</p>
                                </div>
                                <div>
                                    <p className="text-[11px] text-slate-500">Coverage</p>
                                    <p className="text-sm font-bold text-white">{p.coverage}</p>
                                </div>
                                <div>
                                    <p className="text-[11px] text-slate-500">Renews</p>
                                    <p className="text-sm font-bold text-white">{p.next}</p>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                <button
                    onClick={() => navigate('/customer/explore')}
                    className="w-full py-3.5 rounded-2xl border-2 border-dashed border-surface-border text-slate-500 hover:border-primary hover:text-primary transition-colors font-medium text-sm flex items-center justify-center gap-2"
                >
                    <span className="material-symbols-outlined text-[20px]">add_circle</span>
                    Add New Coverage
                </button>
            </main>
            <BottomNav />
        </div>
    )
}
