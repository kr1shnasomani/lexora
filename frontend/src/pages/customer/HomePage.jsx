import { useNavigate } from 'react-router-dom'
import Header from '../../components/customer/Header'
import BottomNav from '../../components/customer/BottomNav'
import { useFetch } from '../../hooks/useFetch'
import { SkeletonPolicyCard, Skeleton } from '../../components/shared/Skeleton'
import ErrorToast from '../../components/shared/ErrorToast'
import { useState } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import CustomerClaimsPanel from '../../components/customer/CustomerClaimsPanel'

const policyIcon = (type) => {
    const map = { health: 'cardiology', auto: 'directions_car', travel: 'flight', pet: 'pets', life: 'favorite' }
    return map[type] || 'policy'
}

const policyAccent = (type) => {
    const map = { health: 'text-primary border-primary/20 bg-primary/10', auto: 'text-blue-400 border-blue-500/20 bg-blue-500/10', travel: 'text-indigo-400 border-indigo-500/20 bg-indigo-500/10', pet: 'text-amber-400 border-amber-500/20 bg-amber-500/10' }
    return map[type] || 'text-slate-400 border-slate-500/20 bg-slate-500/10'
}

export default function HomePage() {
    const navigate = useNavigate()
    const { user } = useAuth()
    const [toastError, setToastError] = useState(null)
    const [isClaimsPanelOpen, setIsClaimsPanelOpen] = useState(false)

    // The backend uses ?email= for customer lookups natively
    const policiesUrl = user?.email ? `/api/customer/policies?email=${encodeURIComponent(user.email)}&status=active` : null
    const { data: policiesData, loading: policiesLoading, error: policiesError } = useFetch(policiesUrl)

    if (policiesError && !toastError) setToastError(policiesError)

    const policies = policiesData?.policies || []

    const greeting = () => {
        const h = new Date().getHours()
        if (h < 12) return 'Good morning'
        if (h < 18) return 'Good afternoon'
        return 'Good evening'
    }

    return (
        <div className="min-h-screen bg-background-dark text-slate-100 flex flex-col font-display antialiased overflow-x-hidden selection:bg-primary selection:text-white pb-32">
            <Header />
            <main className="flex-1 max-w-7xl mx-auto w-full p-4 md:p-8 pb-32">

                <section className="mb-10">
                    <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                        <div className="flex flex-col gap-2">
                            {!user
                                ? <><Skeleton className="h-10 w-80" /><Skeleton className="h-5 w-64 mt-2" /></>
                                : <>
                                    <h2 className="text-4xl md:text-5xl font-bold text-white tracking-tight">{greeting()}, {user?.name?.split(' ')[0] || 'there'}</h2>
                                    <p className="text-slate-400 text-lg">Intelligence Core active. Your coverage is optimized.</p>
                                </>
                            }
                        </div>
                        <button
                            onClick={() => setIsClaimsPanelOpen(true)}
                            className="bg-primary hover:bg-red-600 text-white font-bold py-3 px-6 rounded-xl transition-all flex items-center gap-2 shadow-lg shadow-primary/20 shrink-0"
                        >
                            <span className="material-symbols-outlined">receipt_long</span>
                            Quick Track Claims
                        </button>
                    </div>
                </section>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">

                    {/* Left: Active Policies */}
                    <div className="lg:col-span-7 flex flex-col gap-6">
                        <div className="flex items-center justify-between mb-2">
                            <h3 className="text-xl font-bold text-white">Your Active Protection</h3>
                            <button onClick={() => navigate('/customer/policies')} className="text-sm text-primary hover:text-red-400 font-medium flex items-center gap-1 group">
                                View All Policies
                                <span className="material-symbols-outlined text-[16px] group-hover:translate-x-1 transition-transform">arrow_forward</span>
                            </button>
                        </div>

                        {policiesLoading
                            ? [0, 1].map(i => <SkeletonPolicyCard key={i} />)
                            : policies.length === 0
                                ? <div className="rounded-2xl border border-border-dark bg-surface-dark p-8 text-center text-slate-500">No active policies found.</div>
                                : policies.map(p => (
                                    <div key={p.id} className="group relative overflow-hidden rounded-2xl bg-surface-dark-customer border border-surface-border p-6 transition-all hover:border-primary/50 shadow-lg shadow-black/20">
                                        <div className="absolute top-0 right-0 p-6 opacity-10 group-hover:opacity-20 transition-opacity">
                                            <span className="material-symbols-outlined text-[120px] text-white">{policyIcon(p.type)}</span>
                                        </div>
                                        <div className="flex flex-col h-full justify-between relative z-10">
                                            <div className="flex justify-between items-start mb-6">
                                                <div className="flex gap-4 items-center">
                                                    <div className={`h-12 w-12 rounded-xl flex items-center justify-center border ${policyAccent(p.type)}`}>
                                                        <span className="material-symbols-outlined text-[28px]">{policyIcon(p.type)}</span>
                                                    </div>
                                                    <div>
                                                        <h4 className="text-xl font-bold text-white">{p.name}</h4>
                                                        <p className="text-slate-400 text-sm font-mono">Policy #{p.policy_number}</p>
                                                    </div>
                                                </div>
                                                <span className="px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 text-xs font-bold border border-emerald-500/20 uppercase tracking-wide">Active</span>
                                            </div>
                                            <div className="grid grid-cols-2 gap-4 mb-8">
                                                {p.coverage_amount && <div><p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Coverage</p><p className="text-white font-medium">{p.coverage_amount}</p></div>}
                                                {p.renewal_date && <div><p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Renewal</p><p className="text-white font-medium">{p.renewal_date}</p></div>}
                                                {p.extra_stats && Object.entries(p.extra_stats).map(([k, v]) => (
                                                    <div key={k}><p className="text-xs text-slate-500 uppercase tracking-wider mb-1">{k}</p><p className="text-white font-medium">{v}</p></div>
                                                ))}
                                            </div>
                                            <div className="flex items-center gap-3">
                                                <button onClick={() => navigate('/customer/file-claim')} className="flex-1 bg-primary hover:bg-red-600 text-white font-bold py-3 px-4 rounded-lg transition-colors flex items-center justify-center gap-2">
                                                    <span className="material-symbols-outlined text-[20px]">description</span>File a Claim
                                                </button>
                                                <button onClick={() => navigate(`/customer/policy-detail?id=${p.id}`)} className="px-4 py-3 rounded-lg border border-surface-border text-slate-300 hover:text-white hover:bg-surface-border transition-colors font-medium">
                                                    Details
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                ))
                        }
                    </div>

                    {/* Right: Explore & Promos */}
                    <div className="lg:col-span-5 flex flex-col gap-8">
                        <div>
                            <h3 className="text-xl font-bold text-white mb-4">Explore Coverage</h3>
                            <div className="grid grid-cols-2 gap-3">
                                {[{ icon: 'home', label: 'Home' }, { icon: 'flight', label: 'Travel' }, { icon: 'pets', label: 'Pet' }, { icon: 'favorite', label: 'Life' }].map(({ icon, label }) => (
                                    <button key={label} onClick={() => navigate('/customer/explore')}
                                        className="flex flex-col items-center justify-center gap-2 p-4 rounded-xl bg-surface-dark-customer border border-surface-border hover:border-primary/50 hover:bg-surface-border transition-all group">
                                        <span className="material-symbols-outlined text-3xl text-slate-400 group-hover:text-primary transition-colors">{icon}</span>
                                        <span className="text-sm font-medium text-slate-300 group-hover:text-white">{label}</span>
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="flex flex-col gap-4">
                            <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-surface-dark-customer to-surface-border border border-surface-border p-5">
                                <div className="absolute right-0 top-0 h-full w-1/3 bg-gradient-to-l from-primary/10 to-transparent" />
                                <div className="relative z-10">
                                    <div className="flex items-center gap-2 mb-2 text-primary">
                                        <span className="material-symbols-outlined text-[20px]">savings</span>
                                        <span className="text-xs font-bold uppercase tracking-wider">Tax Season</span>
                                    </div>
                                    <h4 className="text-lg font-bold text-white mb-1">Maximize Your Deductions</h4>
                                    <p className="text-slate-400 text-sm mb-4">See how your current health premiums can save you money this year.</p>
                                    <button className="text-white text-sm font-bold hover:text-primary transition-colors flex items-center gap-1">
                                        Calculate Savings <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
                                    </button>
                                </div>
                            </div>

                            <div className="relative overflow-hidden rounded-xl bg-surface-dark-customer border border-surface-border">
                                <div className="relative h-32 w-full overflow-hidden">
                                    <img src="https://images.unsplash.com/photo-1436491865332-7a61a109cc05?w=600&auto=format&fit=crop&q=60" alt="Travel insurance" className="w-full h-full object-cover" />
                                    <div className="absolute inset-0 bg-gradient-to-t from-surface-dark-customer to-transparent" />
                                </div>
                                <div className="p-5 relative -mt-8">
                                    <span className="inline-block px-2 py-1 bg-blue-600 text-white text-[10px] font-bold uppercase tracking-wider rounded mb-2">New</span>
                                    <h4 className="text-lg font-bold text-white mb-1">Travel Insurance 2.0</h4>
                                    <p className="text-slate-400 text-sm mb-4">Instant coverage for flight delays and lost baggage. From ₹5/day.</p>
                                    <button onClick={() => navigate('/customer/explore')} className="w-full py-2 rounded-lg bg-surface-border text-white text-sm font-bold hover:bg-white hover:text-surface-dark-customer transition-colors">
                                        Get a Quote
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </main>
            <CustomerClaimsPanel isOpen={isClaimsPanelOpen} onClose={() => setIsClaimsPanelOpen(false)} />
            <BottomNav />
            <ErrorToast message={toastError} onClose={() => setToastError(null)} />
        </div>
    )
}
