import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Header from '../../components/customer/Header'
import BottomNav from '../../components/customer/BottomNav'

const activePolicies = [
    {
        id: 'H-992-883',
        name: 'Health Shield Premier',
        icon: 'cardiology',
        iconBg: 'bg-primary/10 text-primary border-primary/20 shadow-primary/5',
        watermark: 'shield_with_heart',
        since: '2021',
        stats: [
            { label: 'Total Coverage', value: '$500,000' },
            { label: 'Premium', value: '$420', suffix: '/mo' },
            { label: 'Renewal Date', value: 'Oct 24, 2024' },
        ],
        primaryAction: { label: 'View Details', icon: 'visibility' },
        secondaryAction: { label: 'File Claim', icon: 'description' },
        secondaryRoute: '/customer/claims',
    },
    {
        id: 'A-110-442',
        name: 'Auto Drive Secure',
        icon: 'directions_car',
        iconBg: 'bg-blue-500/10 text-blue-400 border-blue-500/20 shadow-blue-500/5',
        watermark: 'directions_car',
        since: '2023',
        stats: [
            { label: 'Vehicle', value: 'Tesla Model 3' },
            { label: 'Deductible', value: '$500' },
            { label: 'Next Payment', value: 'Nov 01, 2024' },
        ],
        primaryAction: { label: 'View Details', icon: 'visibility' },
        secondaryAction: { label: 'ID Card', icon: 'id_card' },
        secondaryRoute: '/customer/docs',
    },
]

const expiredPolicies = [
    { id: 'T-332-901', name: 'Global Travel Plus', icon: 'flight', endedOn: 'Sep 15, 2024' },
    { id: 'P-441-229', name: 'Pet Wellness Basic', icon: 'pets', endedOn: 'Aug 01, 2024' },
]

const filters = ['All', 'Active', 'Expired', 'Health', 'Auto']

export default function PoliciesPage() {
    const navigate = useNavigate()
    const [activeFilter, setActiveFilter] = useState('All')

    return (
        <div className="min-h-screen bg-background-dark text-slate-100 flex flex-col font-display antialiased overflow-x-hidden selection:bg-primary selection:text-white pb-32">
            <Header />

            <main className="flex-1 max-w-7xl mx-auto w-full p-4 md:p-8 pb-32">

                {/* Page Header */}
                <section className="mb-10">
                    <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                        <div className="flex flex-col gap-2">
                            <h2 className="text-4xl md:text-5xl font-bold text-white tracking-tight">Your Policies</h2>
                            <p className="text-slate-400 text-lg">Manage coverage details and policy documents.</p>
                        </div>
                        {/* Filter Pills */}
                        <div className="flex flex-wrap gap-2">
                            {filters.map((f) => (
                                <button
                                    key={f}
                                    onClick={() => setActiveFilter(f)}
                                    className={`px-4 py-2 rounded-full text-sm font-bold border transition-colors ${activeFilter === f
                                            ? 'bg-primary text-white border-primary'
                                            : 'bg-surface-dark-customer text-slate-400 hover:text-white hover:bg-surface-border border-surface-border'
                                        }`}
                                >
                                    {f}
                                </button>
                            ))}
                        </div>
                    </div>
                </section>

                {/* Active Protection */}
                <section className="mb-12">
                    <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                        <span className="h-2 w-2 rounded-full bg-emerald-500"></span>
                        Active Protection
                    </h3>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {activePolicies.map((p) => (
                            <div
                                key={p.id}
                                className="group relative overflow-hidden rounded-2xl bg-surface-dark-customer border border-surface-border p-8 transition-all hover:border-primary/50 shadow-lg shadow-black/20"
                            >
                                {/* Ghost watermark icon */}
                                <div className="absolute -bottom-8 -right-8 p-6 opacity-[0.03] group-hover:opacity-[0.07] transition-opacity pointer-events-none rotate-12">
                                    <span className="material-symbols-outlined text-[200px] text-white">{p.watermark}</span>
                                </div>

                                <div className="flex flex-col h-full justify-between relative z-10">
                                    {/* Header row */}
                                    <div className="flex justify-between items-start mb-8">
                                        <div className="flex gap-5 items-center">
                                            <div className={`h-14 w-14 rounded-2xl flex items-center justify-center border shadow-inner ${p.iconBg}`}>
                                                <span className="material-symbols-outlined text-[32px]">{p.icon}</span>
                                            </div>
                                            <div>
                                                <h4 className="text-2xl font-bold text-white">{p.name}</h4>
                                                <p className="text-slate-400 font-mono text-sm mt-1">Policy #{p.id}</p>
                                            </div>
                                        </div>
                                        <div className="flex flex-col items-end gap-2">
                                            <span className="px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 text-xs font-bold border border-emerald-500/20 uppercase tracking-wide">Active</span>
                                            <span className="text-xs text-slate-500">Since {p.since}</span>
                                        </div>
                                    </div>

                                    {/* Stats grid */}
                                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-6 mb-8 p-4 rounded-xl bg-background-dark/50 border border-surface-border/50">
                                        {p.stats.map((s, i) => (
                                            <div key={i} className={i === 2 ? 'hidden sm:block' : ''}>
                                                <p className="text-xs text-slate-500 uppercase tracking-wider mb-1.5 font-bold">{s.label}</p>
                                                <p className="text-white text-lg font-medium">
                                                    {s.value}
                                                    {s.suffix && <span className="text-xs text-slate-500 font-normal">{s.suffix}</span>}
                                                </p>
                                            </div>
                                        ))}
                                    </div>

                                    {/* Actions */}
                                    <div className="flex flex-wrap gap-3 mt-auto">
                                        <button
                                            onClick={() => navigate('/customer/policy-detail')}
                                            className="flex-1 bg-white hover:bg-slate-200 text-surface-dark-customer font-bold py-3 px-6 rounded-lg transition-colors flex items-center justify-center gap-2"
                                        >
                                            <span className="material-symbols-outlined text-[20px]">{p.primaryAction.icon}</span>
                                            {p.primaryAction.label}
                                        </button>
                                        <button
                                            onClick={() => navigate(p.secondaryRoute)}
                                            className="flex-1 bg-surface-border/50 hover:bg-surface-border text-white font-bold py-3 px-6 rounded-lg border border-surface-border transition-colors flex items-center justify-center gap-2"
                                        >
                                            <span className="material-symbols-outlined text-[20px]">{p.secondaryAction.icon}</span>
                                            {p.secondaryAction.label}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </section>

                {/* Recently Expired */}
                <section>
                    <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                        <span className="h-2 w-2 rounded-full bg-amber-500"></span>
                        Recently Expired
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {expiredPolicies.map((p) => (
                            <div
                                key={p.id}
                                className="group relative overflow-hidden rounded-xl bg-surface-dark-customer border border-amber-900/40 p-6 transition-all hover:border-amber-600/60 shadow-lg shadow-black/20 opacity-80 hover:opacity-100"
                            >
                                <div className="flex justify-between items-start mb-4">
                                    <div className="flex gap-3 items-center">
                                        <div className="h-10 w-10 rounded-lg bg-slate-800 flex items-center justify-center text-slate-400 border border-surface-border">
                                            <span className="material-symbols-outlined text-[20px]">{p.icon}</span>
                                        </div>
                                        <div>
                                            <h4 className="text-lg font-bold text-slate-200">{p.name}</h4>
                                            <p className="text-slate-500 font-mono text-xs">Policy #{p.id}</p>
                                        </div>
                                    </div>
                                    <span className="px-2 py-1 rounded bg-amber-500/10 text-amber-500 text-[10px] font-bold border border-amber-500/20 uppercase tracking-wide">Expired</span>
                                </div>
                                <div className="flex justify-between items-end border-t border-surface-border pt-4 mt-2">
                                    <div>
                                        <p className="text-xs text-slate-500 mb-1">Ended On</p>
                                        <p className="text-slate-300 font-medium">{p.endedOn}</p>
                                    </div>
                                    <button
                                        onClick={() => navigate('/customer/renewal')}
                                        className="text-amber-500 hover:text-amber-400 text-sm font-bold flex items-center gap-1 group-hover:translate-x-1 transition-transform"
                                    >
                                        Renew Now
                                        <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </section>

            </main>

            <BottomNav />
        </div>
    )
}
