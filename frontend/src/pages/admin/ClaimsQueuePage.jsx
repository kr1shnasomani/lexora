import { useState } from 'react'
import Sidebar from '../../components/admin/Sidebar'
import TopHeader from '../../components/admin/TopHeader'

const claims = [
    { id: 'CLM-9821', holder: 'Sarah Mitchell', type: 'Auto — Collision', amount: '$48,200', risk: 94, date: 'Feb 19', status: 'Pending' },
    { id: 'CLM-9820', holder: 'James Park', type: 'Medical — Surgery', amount: '$12,500', risk: 72, date: 'Feb 19', status: 'Review' },
    { id: 'CLM-9819', holder: 'Olivia Chen', type: 'Property — Water', amount: '$6,800', risk: 41, date: 'Feb 18', status: 'Review' },
    { id: 'CLM-9818', holder: 'David Watson', type: 'Auto — Theft', amount: '$3,200', risk: 18, date: 'Feb 18', status: 'Approved' },
    { id: 'CLM-9817', holder: 'Emma Johnson', type: 'Life — Term', amount: '$200,000', risk: 88, date: 'Feb 17', status: 'Pending' },
    { id: 'CLM-9816', holder: 'Carlos Rivera', type: 'Medical — ER', amount: '$9,300', risk: 55, date: 'Feb 17', status: 'Review' },
    { id: 'CLM-9815', holder: 'Nina Patel', type: 'Property — Fire', amount: '$82,000', risk: 96, date: 'Feb 16', status: 'Pending' },
]

const riskColor = (r) =>
    r >= 80 ? 'text-red-400 bg-red-400/10' : r >= 60 ? 'text-orange-400 bg-orange-400/10' : r >= 40 ? 'text-yellow-400 bg-yellow-400/10' : 'text-emerald-400 bg-emerald-400/10'

const statusColor = (s) =>
    s === 'Approved' ? 'text-emerald-400 bg-emerald-400/10' : s === 'Pending' ? 'text-yellow-400 bg-yellow-400/10' : 'text-blue-400 bg-blue-400/10'

export default function ClaimsQueuePage() {
    const [selected, setSelected] = useState(null)
    const [drawerOpen, setDrawerOpen] = useState(false)
    const [filter, setFilter] = useState('All')

    const openDrawer = (claim) => { setSelected(claim); setDrawerOpen(true) }
    const closeDrawer = () => { setDrawerOpen(false); setTimeout(() => setSelected(null), 300) }

    const filtered = filter === 'All' ? claims : claims.filter((c) => c.status === filter)

    return (
        <div className="flex h-screen bg-background-dark overflow-hidden">
            <Sidebar />
            <div className="flex flex-col flex-1 overflow-hidden">
                <TopHeader title="Claims Queue" />
                <main className="flex-1 overflow-y-auto p-6">
                    <div className="flex items-center justify-between mb-6">
                        <div className="flex gap-2">
                            {['All', 'Pending', 'Review', 'Approved'].map((f) => (
                                <button
                                    key={f}
                                    onClick={() => setFilter(f)}
                                    className={`px-4 py-1.5 text-sm rounded-full font-medium transition-colors ${filter === f ? 'bg-primary text-white' : 'bg-border-dark text-slate-400 hover:text-white'}`}
                                >
                                    {f}
                                </button>
                            ))}
                        </div>
                        <span className="text-slate-500 text-sm">{filtered.length} claims</span>
                    </div>

                    <div className="rounded-2xl border border-border-dark bg-surface-dark overflow-hidden">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-border-dark text-slate-500 text-xs uppercase">
                                    <th className="px-5 py-3 text-left">Claim</th>
                                    <th className="px-5 py-3 text-left">Type</th>
                                    <th className="px-5 py-3 text-left">Amount</th>
                                    <th className="px-5 py-3 text-left">Risk</th>
                                    <th className="px-5 py-3 text-left">Date</th>
                                    <th className="px-5 py-3 text-left">Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filtered.map((c) => (
                                    <tr
                                        key={c.id}
                                        onClick={() => openDrawer(c)}
                                        className="border-b border-border-dark/50 hover:bg-border-dark/30 transition-colors cursor-pointer"
                                    >
                                        <td className="px-5 py-4">
                                            <span className="font-mono text-white">{c.id}</span>
                                            <span className="text-slate-500 text-xs block">{c.holder}</span>
                                        </td>
                                        <td className="px-5 py-4 text-slate-300">{c.type}</td>
                                        <td className="px-5 py-4 text-slate-300 font-medium">{c.amount}</td>
                                        <td className="px-5 py-4">
                                            <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${riskColor(c.risk)}`}>{c.risk}</span>
                                        </td>
                                        <td className="px-5 py-4 text-slate-500">{c.date}</td>
                                        <td className="px-5 py-4">
                                            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${statusColor(c.status)}`}>{c.status}</span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </main>
            </div>

            {/* Slide-in Drawer */}
            <div
                className={`fixed inset-0 z-40 transition-all duration-300 ${drawerOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
                onClick={closeDrawer}
            >
                <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
            </div>
            <aside
                className={`fixed right-0 top-0 h-full w-[480px] z-50 bg-surface-dark border-l border-border-dark flex flex-col transition-transform duration-300 ${drawerOpen ? 'translate-x-0' : 'translate-x-full'}`}
            >
                {selected && (
                    <>
                        <div className="flex items-center justify-between p-6 border-b border-border-dark">
                            <div>
                                <p className="font-mono text-white text-lg font-bold">{selected.id}</p>
                                <p className="text-slate-400 text-sm">{selected.holder}</p>
                            </div>
                            <button onClick={closeDrawer} className="p-2 hover:bg-border-dark rounded-xl text-slate-400 hover:text-white transition-colors">
                                <span className="material-symbols-outlined">close</span>
                            </button>
                        </div>
                        <div className="flex-1 overflow-y-auto p-6 space-y-6">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="rounded-xl bg-border-dark/40 p-4">
                                    <p className="text-xs text-slate-500 mb-1">Amount</p>
                                    <p className="text-xl font-bold text-white">{selected.amount}</p>
                                </div>
                                <div className="rounded-xl bg-border-dark/40 p-4">
                                    <p className="text-xs text-slate-500 mb-1">Risk Score</p>
                                    <p className={`text-xl font-bold ${riskColor(selected.risk).split(' ')[0]}`}>{selected.risk}/100</p>
                                </div>
                            </div>
                            <div className="rounded-xl bg-border-dark/40 p-5 space-y-3">
                                <p className="text-sm font-semibold text-white">AI Reasoning</p>
                                <p className="text-slate-400 text-sm leading-relaxed">
                                    Claim exhibits velocity patterns inconsistent with historical policyholder behaviour. Cross-referenced with 3 similar flagged submissions in the past 90 days. Recommend manual review before adjudication.
                                </p>
                            </div>
                            <div className="rounded-xl bg-border-dark/40 p-5">
                                <p className="text-sm font-semibold text-white mb-3">Evidence Checklist</p>
                                {['Police Report', 'Medical Records', 'Photos / Documentation', 'Witness Statement'].map((e, i) => (
                                    <div key={e} className="flex items-center gap-3 py-2 border-b border-border-dark/50 last:border-0">
                                        <span className={`material-symbols-outlined text-[18px] ${i < 2 ? 'text-emerald-400' : 'text-slate-600'}`}>{i < 2 ? 'check_circle' : 'radio_button_unchecked'}</span>
                                        <span className="text-sm text-slate-300">{e}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                        <div className="p-6 border-t border-border-dark flex gap-3">
                            <button className="flex-1 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-semibold text-sm transition-colors">Approve</button>
                            <button className="flex-1 py-3 rounded-xl bg-red-500/20 hover:bg-red-500/30 text-red-400 font-semibold text-sm transition-colors border border-red-500/30">Deny</button>
                            <button className="px-4 py-3 rounded-xl bg-border-dark hover:bg-border-dark/80 text-slate-400 font-semibold text-sm transition-colors">Escalate</button>
                        </div>
                    </>
                )}
            </aside>
        </div>
    )
}
