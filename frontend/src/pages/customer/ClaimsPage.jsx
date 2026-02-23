import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Header from '../../components/customer/Header'
import BottomNav from '../../components/customer/BottomNav'
import { useFetch } from '../../hooks/useFetch'
import { useAuth } from '../../contexts/AuthContext'

/* ─── Helpers ─────────────────────────────────────────────────────── */
function getClaimType(claim) {
    const s = (claim.final_decision || claim.status || '').toLowerCase()
    if (['approved', 'auto_approve', 'finalized'].some(k => s.includes(k))) return 'settled'
    if (['manual_review', 'under_review', 'fraud', 'deciding', 'checking'].some(k => s.includes(k))) return 'reviewing'
    if (['error'].includes(s)) return 'action'
    return 'reviewing'
}

function getStatusStyle(claim) {
    const t = getClaimType(claim)
    if (t === 'settled') return { color: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20', border: 'border-l-emerald-500', label: 'Settled' }
    if (t === 'action') return { color: 'bg-primary/10 text-primary border-primary/20', border: 'border-l-primary', label: 'Action Required' }
    return { color: 'bg-amber-500/10 text-amber-500 border-amber-500/20', border: 'border-l-amber-500', label: 'Reviewing' }
}

function getPayout(claim) {
    const amt = claim.amount || claim.claimed_amount
    if (amt) return `₹${Number(amt).toLocaleString()}`
    return '—'
}

const PROGRESS_STEPS = ['Filed', 'Review', 'Approval', 'Payout']

function progressIndex(status) {
    const map = { submitted: 0, extracting: 0, extracted: 1, policy_evaluating: 1, fraud_checking: 2, deciding: 2, finalized: 3, under_review: 2, fraud_investigation: 2, error: 1 }
    return map[status] ?? 0
}

const filters = ['All Claims', 'In Review', 'Action Required', 'Settled']

/* ─── Page ─────────────────────────────────────────────────────────── */
export default function ClaimsPage() {
    const navigate = useNavigate()
    const [activeFilter, setActiveFilter] = useState('All Claims')
    const [searchQuery, setSearchQuery] = useState('')
    const [isSearching, setIsSearching] = useState(false)

    const { user } = useAuth()
    const { data, loading, error } = useFetch(user?.email ? `/api/customer/claims?email=${encodeURIComponent(user.email)}` : null)
    const claims = data?.claims || []

    const filtered = claims.filter(c => {
        const t = getClaimType(c)
        let passFilter = true
        if (activeFilter === 'In Review') passFilter = t === 'reviewing'
        else if (activeFilter === 'Action Required') passFilter = t === 'action'
        else if (activeFilter === 'Settled') passFilter = t === 'settled'

        if (!passFilter) return false

        if (searchQuery) {
            const q = searchQuery.toLowerCase()
            return (
                c.claim_number?.toLowerCase().includes(q) ||
                (c.title || '').toLowerCase().includes(q) ||
                (c.policy?.policy_type || '').toLowerCase().includes(q) ||
                (c.provider_name || '').toLowerCase().includes(q)
            )
        }
        return true
    })

    return (
        <div className="min-h-screen bg-background-dark text-slate-100 font-display antialiased selection:bg-primary selection:text-white flex flex-col pb-32">
            <Header />
            <main className="mx-auto w-full max-w-4xl px-4 pt-6 space-y-6">

                {/* Header section */}
                <div className="bg-surface-dark-customer border border-surface-border rounded-2xl p-6 relative overflow-hidden flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="relative z-10 flex-1">
                        <h1 className="text-3xl font-bold text-white tracking-tight">Claims</h1>
                        <p className="text-slate-400 text-sm mt-1">Manage and track your insurance claims</p>
                    </div>
                    <button
                        onClick={() => navigate('/customer/file-claim')}
                        className="relative z-10 bg-primary hover:bg-red-600 text-white font-bold py-2.5 px-5 rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-primary/20 shrink-0"
                    >
                        <span className="material-symbols-outlined text-[20px]">add_circle</span>
                        File a New Claim
                    </button>
                    {/* Background decoration */}
                    <span className="material-symbols-outlined absolute -right-4 -bottom-4 text-9xl text-surface-border opacity-50 z-0 pointer-events-none">receipt_long</span>
                </div>

                {/* Filter pills & Search */}
                <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
                    {!isSearching ? (
                        <button
                            onClick={() => setIsSearching(true)}
                            className="shrink-0 bg-surface-dark-customer border border-surface-border hover:bg-surface-border text-slate-300 hover:text-white font-medium py-1.5 px-4 rounded-full transition-colors flex items-center justify-center gap-1 text-xs"
                        >
                            <span className="material-symbols-outlined text-[14px]">search</span>
                            Track Existing
                        </button>
                    ) : (
                        <div className="relative shrink-0 flex items-center">
                            <span className="material-symbols-outlined absolute left-3 text-[14px] text-slate-400 pointer-events-none">search</span>
                            <input
                                autoFocus
                                type="text"
                                placeholder="Enter claim ID..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                onBlur={() => { if (!searchQuery) setIsSearching(false) }}
                                onKeyDown={(e) => {
                                    if (e.key === 'Escape') {
                                        setSearchQuery('')
                                        setIsSearching(false)
                                    }
                                }}
                                className="bg-surface-dark-customer border border-primary/50 text-white text-xs rounded-full py-1.5 pl-8 pr-8 w-40 sm:w-48 focus:outline-none focus:border-primary placeholder:text-slate-500 transition-all font-sans"
                            />
                            {searchQuery && (
                                <button
                                    onClick={() => {
                                        setSearchQuery('')
                                        setIsSearching(false)
                                    }}
                                    className="absolute right-2 text-slate-400 hover:text-white flex items-center justify-center p-1"
                                >
                                    <span className="material-symbols-outlined text-[14px]">close</span>
                                </button>
                            )}
                        </div>
                    )}
                    <div className="w-px h-4 bg-surface-border mx-1 shrink-0" />
                    {filters.map(f => (
                        <button
                            key={f}
                            onClick={() => setActiveFilter(f)}
                            className={`px-4 py-1.5 rounded-full text-xs font-medium border whitespace-nowrap transition-colors shrink-0 ${activeFilter === f
                                ? 'bg-primary text-white border-primary'
                                : 'bg-surface-dark-customer border-surface-border text-slate-400 hover:text-white hover:border-slate-500'
                                }`}
                        >
                            {f}
                        </button>
                    ))}
                </div>

                {/* Claim list */}
                <div className="flex flex-col gap-4">
                    {error && (
                        <div className="mb-4 rounded-lg border border-primary/30 bg-primary/10 px-4 py-2 text-sm text-primary">
                            Could not load claims: {error}
                        </div>
                    )}
                    {loading && claims.length === 0
                        ? [0, 1, 2].map(i => (
                            <div key={i} className="bg-surface-dark-customer border border-surface-border rounded-xl p-5 animate-pulse h-36" />
                        ))
                        : filtered.length === 0
                            ? <div className="text-center py-12 bg-surface-dark-customer border border-surface-border rounded-xl">
                                <span className="material-symbols-outlined text-4xl text-slate-600 mb-2">assignment</span>
                                <p className="text-slate-400 text-sm">No claims found.</p>
                            </div>
                            : filtered.map(claim => {
                                const s = getStatusStyle(claim)
                                const type = getClaimType(claim)
                                const pStep = progressIndex(claim.status)
                                return (
                                    <div
                                        key={claim.id}
                                        onClick={() => navigate(`/customer/claim-status?id=${claim.id}`)}
                                        className={`bg-surface-dark-customer border border-surface-border border-l-4 ${s.border} rounded-xl p-5 transition-colors group cursor-pointer ${type === 'settled' ? 'hover:border-emerald-500/40 opacity-75 hover:opacity-100' : 'hover:border-primary/40'}`}
                                    >
                                        {/* Claim header */}
                                        <div className="flex justify-between items-start mb-4">
                                            <div>
                                                <div className="flex items-center gap-3 mb-1">
                                                    <h3 className="text-white font-bold text-lg capitalize">{claim.title || claim.policy?.policy_type || 'Insurance'} Claim</h3>
                                                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold border uppercase tracking-wide ${s.color}`}>
                                                        {s.label}
                                                    </span>
                                                </div>
                                                <p className="text-slate-500 text-xs font-mono">ID: #{claim.claim_number} {claim.policy?.policy_number ? `• Policy: ${claim.policy.policy_number}` : ''}</p>
                                            </div>
                                            <span className="text-slate-400 text-xs shrink-0 ml-4">{claim.created_at ? claim.created_at.split('T')[0] : '—'}</span>
                                        </div>

                                        {/* Progress bar */}
                                        {type === 'reviewing' && (
                                            <div className="mb-4">
                                                <div className="flex justify-between text-[10px] uppercase font-bold text-slate-500 mb-2 tracking-wider">
                                                    {PROGRESS_STEPS.map((step, i) => (
                                                        <span key={step} className={i <= pStep ? (i === 0 ? 'text-primary' : 'text-amber-500') : ''}>{step}</span>
                                                    ))}
                                                </div>
                                                <div className="flex gap-1 h-1.5 w-full">
                                                    {PROGRESS_STEPS.map((step, i) => (
                                                        <div
                                                            key={step}
                                                            className={`flex-1 rounded-full ${i < pStep ? 'bg-primary' : i === pStep ? 'bg-amber-500 animate-pulse' : 'bg-surface-border'}`}
                                                        />
                                                    ))}
                                                </div>
                                            </div>
                                        )}

                                        {/* Footer */}
                                        <div className="flex items-center justify-between mt-2">
                                            {type === 'settled' && (
                                                <>
                                                    <div className="flex flex-col">
                                                        <span className="text-[10px] text-slate-500 uppercase tracking-wider">Payout Amount</span>
                                                        <span className="text-sm font-bold text-white">{getPayout(claim)}</span>
                                                    </div>
                                                    <button className="text-xs font-medium text-slate-300 hover:text-white flex items-center gap-1 transition-colors">
                                                        <span className="material-symbols-outlined text-[14px]">download</span> Statement
                                                    </button>
                                                </>
                                            )}
                                            {type === 'reviewing' && (
                                                <button className="text-xs font-medium text-slate-300 group-hover:text-primary flex items-center gap-1 transition-colors ml-auto border border-surface-border px-3 py-1.5 rounded-lg">
                                                    View Details <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
                                                </button>
                                            )}
                                            {type === 'action' && (
                                                <button className="px-3 py-1.5 rounded-lg bg-primary text-white text-xs font-bold hover:bg-red-600 transition-colors">
                                                    Upload Now
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                )
                            })
                    }
                </div>
            </main>
            <BottomNav />
        </div>
    )
}
