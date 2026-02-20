import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import BottomNav from '../../components/customer/BottomNav'

const claims = [
    {
        id: 'CLM-2024-8892',
        title: 'Windshield Crack',
        policy: 'Auto Policy',
        status: 'Reviewing',
        statusColor: 'bg-amber-500/10 text-amber-500 border-amber-500/20',
        accentBorder: 'border-l-amber-500',
        date: 'Updated 2h ago',
        type: 'reviewing',
        progress: [
            { label: 'Filed', color: 'bg-primary', active: true },
            { label: 'Review', color: 'bg-amber-500 animate-pulse', active: true },
            { label: 'Approval', color: 'bg-surface-border', active: false },
            { label: 'Payout', color: 'bg-surface-border', active: false },
        ],
        adjuster: 'AD',
    },
    {
        id: 'CLM-2024-8841',
        title: 'Travel Delay - Tokyo',
        policy: 'Travel Policy',
        status: 'Action Required',
        statusColor: 'bg-primary/10 text-primary border-primary/20',
        accentBorder: 'border-l-primary',
        date: 'Yesterday',
        type: 'action',
        actionMsg: { title: 'Missing Documents', sub: 'Please upload your boarding pass and original itinerary.' },
    },
    {
        id: 'CLM-2023-1024',
        title: 'Routine Dental Checkup',
        policy: 'Health Policy',
        status: 'Settled',
        statusColor: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20',
        accentBorder: 'border-l-emerald-500',
        date: 'Oct 12, 2023',
        type: 'settled',
        payout: '$240.00',
    },
    {
        id: 'CLM-2023-0911',
        title: 'Minor Collision',
        policy: 'Auto Policy',
        status: 'Settled',
        statusColor: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20',
        accentBorder: 'border-l-emerald-500',
        date: 'Sep 05, 2023',
        type: 'settled',
        payout: '$1,250.00',
    },
]

const filters = ['All Claims', 'In Review', 'Action Required', 'Settled']

export default function ClaimsPage() {
    const navigate = useNavigate()
    const [activeFilter, setActiveFilter] = useState('All Claims')

    const filtered = claims.filter((c) => {
        if (activeFilter === 'All Claims') return true
        if (activeFilter === 'In Review') return c.type === 'reviewing'
        if (activeFilter === 'Action Required') return c.type === 'action'
        if (activeFilter === 'Settled') return c.type === 'settled'
        return true
    })

    return (
        <div className="min-h-screen bg-background-dark text-slate-100 font-display antialiased overflow-hidden selection:bg-primary selection:text-white flex flex-col">

            {/* Blurred background content */}
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
                    <h2 className="text-5xl font-bold text-white tracking-tight mb-2">Good morning, Kumud</h2>
                    <p className="text-slate-400 text-lg">Intelligence Core active. Your coverage is optimized.</p>
                </main>
            </div>

            {/* Dark overlay */}
            <div className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm pointer-events-none" />

            {/* Claims Sheet — always open as the page */}
            <div className="fixed inset-x-0 bottom-0 z-50 flex flex-col items-center justify-end md:justify-center h-full pointer-events-none p-4">
                <div className="w-full max-w-3xl bg-surface-dark-customer border border-surface-border shadow-2xl shadow-black rounded-t-3xl md:rounded-2xl pointer-events-auto flex flex-col max-h-[90vh] md:max-h-[85vh] relative overflow-hidden">

                    {/* Mobile drag handle */}
                    <div className="w-full flex justify-center pt-3 pb-1 md:hidden bg-surface-dark-customer sticky top-0 z-20">
                        <div className="w-12 h-1.5 bg-surface-border rounded-full"></div>
                    </div>

                    {/* Sheet header */}
                    <div className="px-6 py-6 border-b border-surface-border bg-surface-dark-customer sticky top-0 z-10 flex flex-col gap-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <h2 className="text-2xl md:text-3xl font-bold text-white tracking-tight">Claims</h2>
                                <p className="text-slate-400 text-sm mt-1">Manage and track your insurance claims</p>
                            </div>
                            <button
                                onClick={() => navigate(-1)}
                                className="p-2 text-slate-400 hover:text-white hover:bg-surface-border rounded-full transition-colors md:absolute md:top-6 md:right-6"
                            >
                                <span className="material-symbols-outlined">close</span>
                            </button>
                        </div>

                        {/* Action buttons */}
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
                            {filters.map((f) => (
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

                    {/* Scrollable claim list wrapper — gradient stays outside scroll */}
                    <div className="flex-1 relative overflow-hidden bg-[#121214]">
                        <div className="h-full overflow-y-auto p-6">
                            <div className="flex flex-col gap-4">
                                {filtered.map((claim) => (
                                    <div
                                        key={claim.id}
                                        className={`bg-surface-dark-customer border border-surface-border border-l-4 ${claim.accentBorder} rounded-xl p-5 transition-colors group cursor-pointer ${claim.type === 'settled'
                                            ? 'hover:border-emerald-500/40 opacity-75 hover:opacity-100'
                                            : 'hover:border-primary/40'
                                            }`}
                                    >

                                        {/* Claim header */}
                                        <div className="flex justify-between items-start mb-4">
                                            <div>
                                                <div className="flex items-center gap-3 mb-1">
                                                    <h3 className="text-white font-bold text-lg">{claim.title}</h3>
                                                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold border uppercase tracking-wide ${claim.statusColor}`}>
                                                        {claim.status}
                                                    </span>
                                                </div>
                                                <p className="text-slate-500 text-xs font-mono">ID: #{claim.id} • {claim.policy}</p>
                                            </div>
                                            <span className="text-slate-400 text-xs shrink-0 ml-4">{claim.date}</span>
                                        </div>

                                        {/* Progress bar (reviewing) */}
                                        {claim.type === 'reviewing' && (
                                            <div className="mb-4">
                                                <div className="flex justify-between text-[10px] uppercase font-bold text-slate-500 mb-2 tracking-wider">
                                                    {claim.progress.map((s) => (
                                                        <span key={s.label} className={s.active ? (s.label === 'Filed' ? 'text-primary' : 'text-amber-500') : ''}>{s.label}</span>
                                                    ))}
                                                </div>
                                                <div className="flex gap-1 h-1.5 w-full">
                                                    {claim.progress.map((s, i) => (
                                                        <div key={i} className={`flex-1 rounded-full ${s.color}`}></div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}

                                        {/* Action required banner */}
                                        {claim.type === 'action' && (
                                            <div className="bg-primary/5 border border-primary/10 rounded-lg p-3 mb-3 flex gap-3 items-start">
                                                <span className="material-symbols-outlined text-primary text-lg mt-0.5">upload_file</span>
                                                <div>
                                                    <p className="text-sm text-slate-200 font-medium">{claim.actionMsg.title}</p>
                                                    <p className="text-xs text-slate-400">{claim.actionMsg.sub}</p>
                                                </div>
                                            </div>
                                        )}

                                        {/* Footer row */}
                                        <div className="flex items-center justify-between mt-2">
                                            {/* Reviewing footer */}
                                            {claim.type === 'reviewing' && (
                                                <>
                                                    <div className="flex -space-x-2">
                                                        <div className="h-6 w-6 rounded-full border border-surface-dark-customer bg-surface-border flex items-center justify-center text-[10px] text-white">
                                                            {claim.adjuster}
                                                        </div>
                                                    </div>
                                                    <button className="text-xs font-medium text-slate-300 group-hover:text-primary flex items-center gap-1 transition-colors">
                                                        View Details <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
                                                    </button>
                                                </>
                                            )}

                                            {/* Action required footer */}
                                            {claim.type === 'action' && (
                                                <button className="px-3 py-1.5 rounded-lg bg-primary text-white text-xs font-bold hover:bg-red-600 transition-colors">
                                                    Upload Now
                                                </button>
                                            )}

                                            {/* Settled footer */}
                                            {claim.type === 'settled' && (
                                                <>
                                                    <div className="flex flex-col">
                                                        <span className="text-[10px] text-slate-500 uppercase tracking-wider">Payout Amount</span>
                                                        <span className="text-sm font-bold text-white">{claim.payout}</span>
                                                    </div>
                                                    <button className="text-xs font-medium text-slate-300 hover:text-white flex items-center gap-1 transition-colors">
                                                        <span className="material-symbols-outlined text-[14px]">download</span> Statement
                                                    </button>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                        {/* Bottom fade — fixed to wrapper bottom, never scrolls */}
                        <div className="absolute bottom-0 left-0 w-full h-10 bg-gradient-to-t from-[#121214] to-transparent pointer-events-none z-10"></div>
                    </div>

                    {/* Bottom spacer for nav */}
                    <div className="h-24 md:h-12 w-full shrink-0 bg-[#121214]"></div>
                </div>
            </div>

            <BottomNav />
        </div>
    )
}
