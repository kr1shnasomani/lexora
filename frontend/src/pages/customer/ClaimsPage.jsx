import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import BottomNav from '../../components/customer/BottomNav'
import { useFetch } from '../../hooks/useFetch'

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
    if (claim.amount) return claim.amount
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

    const { data, loading, error } = useFetch('/api/claims?page_size=20', 30_000)
    const claims = data?.items || []

    const filtered = claims.filter(c => {
        const t = getClaimType(c)
        if (activeFilter === 'All Claims') return true
        if (activeFilter === 'In Review') return t === 'reviewing'
        if (activeFilter === 'Action Required') return t === 'action'
        if (activeFilter === 'Settled') return t === 'settled'
        return true
    })

    return (
        <div className="min-h-screen bg-background-dark text-slate-100 font-display antialiased overflow-hidden selection:bg-primary selection:text-white flex flex-col">

            {/* Blurred background */}
            <div aria-hidden="true" className="flex-1 flex flex-col opacity-30 pointer-events-none filter blur-sm">
                <header className="flex items-center justify-between border-b border-surface-border bg-surface-dark-customer px-6 py-4">
                    <div className="flex items-center gap-3">
                        <div className="size-8 text-primary">
                            <svg className="w-full h-full" fill="none" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
                                <path d="M36.7273 44C33.9891 44 31.6043 39.8386 30.3636 33.69C29.123 39.8386 26.7382 44 24 44C21.2618 44 18.877 39.8386 17.6364 33.69C16.3957 39.8386 14.0109 44 11.2727 44C7.25611 44 4 35.0457 4 24C4 12.9543 7.25611 4 11.2727 4C14.0109 4 16.3957 8.16144 17.6364 14.31C18.877 8.16144 21.2618 4 24 4C26.7382 4 29.123 8.16144 30.3636 14.31C31.6043 8.16144 33.9891 4 36.7273 4C40.7439 4 44 12.9543 44 24C44 35.0457 40.7439 44 36.7273 44Z" fill="currentColor" />
                            </svg>
                        </div>
                        <h1 className="text-white text-xl font-bold tracking-tight">Intelligence Core</h1>
                    </div>
                </header>
                <main className="flex-1 max-w-7xl mx-auto w-full p-8">
                    <h2 className="text-5xl font-bold text-white tracking-tight mb-2">Good morning</h2>
                    <p className="text-slate-400 text-lg">Intelligence Core active. Your coverage is optimized.</p>
                </main>
            </div>

            {/* Dark overlay */}
            <div className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm pointer-events-none" />

            {/* Claims Sheet */}
            <div className="fixed inset-x-0 bottom-0 z-50 flex flex-col items-center justify-end md:justify-center h-full pointer-events-none p-4">
                <div className="w-full max-w-3xl bg-surface-dark-customer border border-surface-border shadow-2xl shadow-black rounded-t-3xl md:rounded-2xl pointer-events-auto flex flex-col max-h-[90vh] md:max-h-[85vh] relative overflow-hidden">

                    {/* Drag handle */}
                    <div className="w-full flex justify-center pt-3 pb-1 md:hidden bg-surface-dark-customer sticky top-0 z-20">
                        <div className="w-12 h-1.5 bg-surface-border rounded-full" />
                    </div>

                    {/* Sheet header */}
                    <div className="px-6 py-6 border-b border-surface-border bg-surface-dark-customer sticky top-0 z-10 flex flex-col gap-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <h2 className="text-2xl md:text-3xl font-bold text-white tracking-tight">Claims</h2>
                                <p className="text-slate-400 text-sm mt-1">Manage and track your insurance claims</p>
                            </div>
                            <button onClick={() => navigate(-1)} className="p-2 text-slate-400 hover:text-white hover:bg-surface-border rounded-full transition-colors">
                                <span className="material-symbols-outlined">close</span>
                            </button>
                        </div>

                        <div className="flex flex-col sm:flex-row gap-4">
                            <button
                                onClick={() => navigate('/customer/file-claim')}
                                className="flex-1 bg-primary hover:bg-red-600 text-white font-bold py-3 px-6 rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-primary/20"
                            >
                                <span className="material-symbols-outlined">add_circle</span>
                                File a New Claim
                            </button>
                            <button className="flex-1 bg-transparent border border-surface-border hover:bg-surface-border text-slate-300 hover:text-white font-bold py-3 px-6 rounded-xl transition-all flex items-center justify-center gap-2">
                                <span className="material-symbols-outlined">search</span>
                                Track Existing
                            </button>
                        </div>

                        {/* Filter pills */}
                        <div className="flex items-center gap-2 overflow-x-auto pb-1">
                            {filters.map(f => (
                                <button
                                    key={f}
                                    onClick={() => setActiveFilter(f)}
                                    className={`px-4 py-1.5 rounded-full text-xs font-medium border whitespace-nowrap transition-colors ${activeFilter === f
                                        ? 'bg-primary text-white border-primary'
                                        : 'bg-surface-dark-customer border-surface-border text-slate-400 hover:text-white hover:border-slate-500'
                                        }`}
                                >
                                    {f}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Claim list */}
                    <div className="flex-1 relative overflow-hidden bg-[#121214]">
                        <div className="h-full overflow-y-auto p-6">
                            {error && (
                                <div className="mb-4 rounded-lg border border-primary/30 bg-primary/10 px-4 py-2 text-sm text-primary">
                                    Could not load claims: {error}
                                </div>
                            )}
                            <div className="flex flex-col gap-4">
                                {loading && claims.length === 0
                                    ? [0, 1, 2].map(i => (
                                        <div key={i} className="bg-surface-dark-customer border border-surface-border rounded-xl p-5 animate-pulse h-28" />
                                    ))
                                    : filtered.length === 0
                                        ? <p className="text-slate-500 text-sm text-center py-8">No claims found.</p>
                                        : filtered.map(claim => {
                                            const s = getStatusStyle(claim)
                                            const type = getClaimType(claim)
                                            const pStep = progressIndex(claim.status)
                                            return (
                                                <div
                                                    key={claim.id}
                                                    className={`bg-surface-dark-customer border border-surface-border border-l-4 ${s.border} rounded-xl p-5 transition-colors group cursor-pointer ${type === 'settled' ? 'hover:border-emerald-500/40 opacity-75 hover:opacity-100' : 'hover:border-primary/40'}`}
                                                >
                                                    {/* Claim header */}
                                                    <div className="flex justify-between items-start mb-4">
                                                        <div>
                                                            <div className="flex items-center gap-3 mb-1">
                                                                <h3 className="text-white font-bold text-lg capitalize">{claim.type || 'Insurance Claim'}</h3>
                                                                <span className={`px-2 py-0.5 rounded text-[10px] font-bold border uppercase tracking-wide ${s.color}`}>
                                                                    {s.label}
                                                                </span>
                                                            </div>
                                                            <p className="text-slate-500 text-xs font-mono">ID: #{claim.claim_number}</p>
                                                        </div>
                                                        <span className="text-slate-400 text-xs shrink-0 ml-4">{claim.date || '—'}</span>
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
                                                            <button className="text-xs font-medium text-slate-300 group-hover:text-primary flex items-center gap-1 transition-colors ml-auto">
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
                        </div>
                        <div className="absolute bottom-0 left-0 w-full h-10 bg-gradient-to-t from-[#121214] to-transparent pointer-events-none z-10" />
                    </div>

                    <div className="h-24 md:h-12 w-full shrink-0 bg-[#121214]" />
                </div>
            </div>

            <BottomNav />
        </div>
    )
}
