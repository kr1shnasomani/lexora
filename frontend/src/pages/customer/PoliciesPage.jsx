import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Header from '../../components/customer/Header'
import BottomNav from '../../components/customer/BottomNav'
import { useFetch } from '../../hooks/useFetch'
import { SkeletonPolicyCard } from '../../components/shared/Skeleton'
import ErrorToast from '../../components/shared/ErrorToast'
import { useAuth } from '../../contexts/AuthContext'

const FILTERS = ['All', 'Active', 'Expired', 'Health', 'Auto']

const policyIcon = (type) => ({ health: 'cardiology', auto: 'directions_car', travel: 'flight', pet: 'pets', life: 'favorite' }[type] || 'policy')
const policyWatermark = (type) => ({ health: 'shield_with_heart', auto: 'directions_car', travel: 'flight', pet: 'pets' }[type] || 'policy')
const policyAccentBg = (type) => ({ health: 'bg-primary/10 text-primary border-primary/20', auto: 'bg-blue-500/10 text-blue-400 border-blue-500/20', travel: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20', pet: 'bg-amber-500/10 text-amber-400 border-amber-500/20' }[type] || 'bg-slate-800 text-slate-400 border-slate-600')

export default function PoliciesPage() {
    const navigate = useNavigate()
    const { user } = useAuth()
    const [activeFilter, setActiveFilter] = useState('All')
    const [toastError, setToastError] = useState(null)

    const policiesUrl = user?.email ? `/api/customer/policies?email=${encodeURIComponent(user.email)}` : null
    const { data, loading, error } = useFetch(policiesUrl)

    if (error && !toastError) setToastError(error)

    const all = data?.policies || []
    const filtered = all.filter(p => {
        if (activeFilter === 'All') return true
        if (activeFilter === 'Active') return p.status === 'active'
        if (activeFilter === 'Expired') return p.status === 'expired'
        return p.type === activeFilter.toLowerCase()
    })
    const active = filtered.filter(p => p.status === 'active')
    const expired = filtered.filter(p => p.status === 'expired')

    return (
        <div className="min-h-screen bg-background-dark text-slate-100 flex flex-col font-display antialiased overflow-x-hidden selection:bg-primary selection:text-white pb-32">
            <Header />
            <main className="flex-1 max-w-7xl mx-auto w-full p-4 md:p-8 pb-32">

                <section className="mb-10">
                    <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                        <div className="flex flex-col gap-2">
                            <h2 className="text-4xl md:text-5xl font-bold text-white tracking-tight">Your Policies</h2>
                            <p className="text-slate-400 text-lg">Manage coverage details and policy documents.</p>
                        </div>
                        <div className="flex flex-wrap gap-2">
                            {FILTERS.map(f => (
                                <button key={f} onClick={() => setActiveFilter(f)}
                                    className={`px-4 py-2 rounded-full text-sm font-bold border transition-colors ${activeFilter === f ? 'bg-primary text-white border-primary' : 'bg-surface-dark-customer text-slate-400 hover:text-white hover:bg-surface-border border-surface-border'}`}>
                                    {f}
                                </button>
                            ))}
                        </div>
                    </div>
                </section>

                {/* Active */}
                {(loading || active.length > 0) && (
                    <section className="mb-12">
                        <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                            <span className="h-2 w-2 rounded-full bg-emerald-500" />Active Protection
                        </h3>
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            {loading
                                ? [0, 1].map(i => <SkeletonPolicyCard key={i} />)
                                : active.map(p => (
                                    <div key={p.id} className="group relative overflow-hidden rounded-2xl bg-surface-dark-customer border border-surface-border p-8 transition-all hover:border-primary/50 shadow-lg shadow-black/20">
                                        <div className="absolute -bottom-8 -right-8 p-6 opacity-[0.03] group-hover:opacity-[0.07] transition-opacity rotate-12 pointer-events-none">
                                            <span className="material-symbols-outlined text-[200px] text-white">{policyWatermark(p.type)}</span>
                                        </div>
                                        <div className="flex flex-col h-full justify-between relative z-10">
                                            <div className="flex justify-between items-start mb-8">
                                                <div className="flex gap-5 items-center">
                                                    <div className={`h-14 w-14 rounded-2xl flex items-center justify-center border shadow-inner ${policyAccentBg(p.type)}`}>
                                                        <span className="material-symbols-outlined text-[32px]">{policyIcon(p.type)}</span>
                                                    </div>
                                                    <div>
                                                        <h4 className="text-2xl font-bold text-white">{p.name}</h4>
                                                        <p className="text-slate-400 font-mono text-sm mt-1">Policy #{p.policy_number}</p>
                                                    </div>
                                                </div>
                                                <div className="flex flex-col items-end gap-2">
                                                    <span className="px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 text-xs font-bold border border-emerald-500/20 uppercase tracking-wide">Active</span>
                                                    {p.since && <span className="text-xs text-slate-500">Since {p.since}</span>}
                                                </div>
                                            </div>
                                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-6 mb-8 p-4 rounded-xl bg-background-dark/50 border border-surface-border/50">
                                                {p.coverage_amount && <div><p className="text-xs text-slate-500 uppercase tracking-wider mb-1.5 font-bold">Coverage</p><p className="text-white text-lg font-medium">{p.coverage_amount}</p></div>}
                                                {p.premium && <div><p className="text-xs text-slate-500 uppercase tracking-wider mb-1.5 font-bold">Premium</p><p className="text-white text-lg font-medium">{p.premium}<span className="text-xs text-slate-500">{p.premium_suffix}</span></p></div>}
                                                {p.renewal_date && <div className="hidden sm:block"><p className="text-xs text-slate-500 uppercase tracking-wider mb-1.5 font-bold">Renewal</p><p className="text-white text-lg font-medium">{p.renewal_date}</p></div>}
                                                {p.extra_stats && Object.entries(p.extra_stats).map(([k, v]) => (
                                                    <div key={k}><p className="text-xs text-slate-500 uppercase tracking-wider mb-1.5 font-bold">{k}</p><p className="text-white text-lg font-medium">{v}</p></div>
                                                ))}
                                            </div>
                                            <div className="flex flex-wrap gap-3 mt-auto">
                                                <button onClick={() => navigate(`/customer/policy-detail?id=${p.id}`)} className="flex-1 bg-white hover:bg-slate-200 text-surface-dark-customer font-bold py-3 px-6 rounded-lg transition-colors flex items-center justify-center gap-2">
                                                    <span className="material-symbols-outlined text-[20px]">visibility</span>View Details
                                                </button>
                                                <button onClick={() => navigate('/customer/file-claim')} className="flex-1 bg-surface-border/50 hover:bg-surface-border text-white font-bold py-3 px-6 rounded-lg border border-surface-border transition-colors flex items-center justify-center gap-2">
                                                    <span className="material-symbols-outlined text-[20px]">description</span>File Claim
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                ))
                            }
                        </div>
                    </section>
                )}

                {/* Expired */}
                {!loading && expired.length > 0 && (
                    <section>
                        <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                            <span className="h-2 w-2 rounded-full bg-amber-500" />Recently Expired
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            {expired.map(p => (
                                <div key={p.id} className="group relative overflow-hidden rounded-xl bg-surface-dark-customer border border-amber-900/40 p-6 transition-all hover:border-amber-600/60 shadow-lg shadow-black/20 opacity-80 hover:opacity-100">
                                    <div className="flex justify-between items-start mb-4">
                                        <div className="flex gap-3 items-center">
                                            <div className="h-10 w-10 rounded-lg bg-slate-800 flex items-center justify-center text-slate-400 border border-surface-border">
                                                <span className="material-symbols-outlined text-[20px]">{policyIcon(p.type)}</span>
                                            </div>
                                            <div>
                                                <h4 className="text-lg font-bold text-slate-200">{p.name}</h4>
                                                <p className="text-slate-500 font-mono text-xs">Policy #{p.policy_number}</p>
                                            </div>
                                        </div>
                                        <span className="px-2 py-1 rounded bg-amber-500/10 text-amber-500 text-[10px] font-bold border border-amber-500/20 uppercase">Expired</span>
                                    </div>
                                    <div className="flex justify-between items-end border-t border-surface-border pt-4 mt-2">
                                        <div>
                                            <p className="text-xs text-slate-500 mb-1">Ended On</p>
                                            <p className="text-slate-300 font-medium">{p.renewal_date || '—'}</p>
                                        </div>
                                        <button onClick={() => navigate('/customer/renewal')} className="text-amber-500 hover:text-amber-400 text-sm font-bold flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                                            Renew Now <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </section>
                )}
            </main>
            <BottomNav />
            <ErrorToast message={toastError} onClose={() => setToastError(null)} />
        </div>
    )
}
