import Sidebar from '../../components/admin/Sidebar'
import TopHeader from '../../components/admin/TopHeader'

const kpis = [
    { label: 'Claims Processed', value: '2,847', delta: '+12.3%', icon: 'description', color: 'text-blue-400' },
    { label: 'AI Accuracy', value: '97.4%', delta: '+0.8%', icon: 'smart_toy', color: 'text-emerald-400' },
    { label: 'Fraud Detected', value: '143', delta: '+5.2%', icon: 'gpp_bad', color: 'text-primary' },
    { label: 'Avg. Resolution', value: '1.8h', delta: '-22m', icon: 'timer', color: 'text-purple-400' },
]

const heatmap = [
    { region: 'North America', risk: 72, count: 1204 },
    { region: 'Europe', risk: 45, count: 687 },
    { region: 'Asia Pacific', risk: 88, count: 534 },
    { region: 'Latin America', risk: 61, count: 312 },
    { region: 'Middle East', risk: 93, count: 110 },
]

const recent = [
    { id: 'CLM-9821', holder: 'Sarah Mitchell', amount: '$48,200', risk: 94, status: 'Critical' },
    { id: 'CLM-9820', holder: 'James Park', amount: '$12,500', risk: 72, status: 'High' },
    { id: 'CLM-9819', holder: 'Olivia Chen', amount: '$6,800', risk: 41, status: 'Medium' },
    { id: 'CLM-9818', holder: 'David Watson', amount: '$3,200', risk: 18, status: 'Low' },
]

const riskColor = (r) =>
    r >= 80 ? 'text-red-400 bg-red-400/10' : r >= 60 ? 'text-orange-400 bg-orange-400/10' : r >= 40 ? 'text-yellow-400 bg-yellow-400/10' : 'text-emerald-400 bg-emerald-400/10'

export default function DashboardPage() {
    return (
        <div className="flex h-screen bg-background-dark overflow-hidden">
            <Sidebar />
            <div className="flex flex-col flex-1 overflow-hidden">
                <TopHeader title="Sentinel Dashboard" />
                <main className="flex-1 overflow-y-auto p-6 space-y-6">

                    {/* KPI Cards */}
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                        {kpis.map((k) => (
                            <div key={k.label} className="rounded-2xl border border-border-dark bg-surface-dark p-5 flex flex-col gap-3 card-hover transition-all">
                                <div className="flex items-center justify-between">
                                    <span className="text-sm font-medium text-slate-400">{k.label}</span>
                                    <span className={`material-symbols-outlined text-[22px] ${k.color}`}>{k.icon}</span>
                                </div>
                                <div className="flex items-end justify-between">
                                    <span className="text-3xl font-bold text-white">{k.value}</span>
                                    <span className="text-xs font-medium text-emerald-400 bg-emerald-400/10 px-2 py-0.5 rounded-full">{k.delta}</span>
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        {/* Risk Heatmap */}
                        <div className="lg:col-span-2 rounded-2xl border border-border-dark bg-surface-dark p-6">
                            <div className="flex items-center justify-between mb-6">
                                <h2 className="text-base font-semibold text-white">Global Risk Heatmap</h2>
                                <span className="text-xs text-slate-400 bg-border-dark px-3 py-1 rounded-full">Live</span>
                            </div>
                            <div className="space-y-4">
                                {heatmap.map((h) => (
                                    <div key={h.region} className="flex items-center gap-4">
                                        <span className="text-sm text-slate-400 w-36 shrink-0">{h.region}</span>
                                        <div className="flex-1 h-2 bg-border-dark rounded-full overflow-hidden">
                                            <div
                                                className="h-full rounded-full transition-all"
                                                style={{
                                                    width: `${h.risk}%`,
                                                    background: h.risk >= 80 ? '#ef4444' : h.risk >= 60 ? '#f97316' : '#eab308',
                                                }}
                                            />
                                        </div>
                                        <span className="text-sm font-mono text-slate-300 w-8">{h.risk}</span>
                                        <span className="text-xs text-slate-500 w-12 text-right">{h.count.toLocaleString()}</span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Live Signals */}
                        <div className="rounded-2xl border border-border-dark bg-surface-dark p-6">
                            <h2 className="text-base font-semibold text-white mb-6">Live Signals</h2>
                            <div className="space-y-3">
                                {[
                                    { signal: 'Velocity anomaly detected', src: 'Claims Engine', t: '2m ago', type: 'warn' },
                                    { signal: 'Network cluster flagged', src: 'Graph AI', t: '7m ago', type: 'error' },
                                    { signal: 'Low-risk batch approved', src: 'Auto-Adjudicator', t: '11m ago', type: 'ok' },
                                    { signal: 'Config sync completed', src: 'System', t: '18m ago', type: 'ok' },
                                ].map((s, i) => (
                                    <div key={i} className="flex items-start gap-3 p-3 rounded-xl bg-border-dark/30">
                                        <span
                                            className={`mt-0.5 size-2 rounded-full shrink-0 ${s.type === 'error' ? 'bg-red-500' : s.type === 'warn' ? 'bg-yellow-400' : 'bg-emerald-400'}`}
                                        />
                                        <div className="flex-1 min-w-0">
                                            <p className="text-xs text-white font-medium">{s.signal}</p>
                                            <p className="text-xs text-slate-500">{s.src} · {s.t}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Priority Review */}
                    <div className="rounded-2xl border border-border-dark bg-surface-dark">
                        <div className="flex items-center justify-between p-6 border-b border-border-dark">
                            <h2 className="text-base font-semibold text-white">Priority Review Queue</h2>
                            <a href="/admin/claims" className="text-sm text-primary font-medium hover:underline">View all →</a>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b border-border-dark text-slate-500 text-xs uppercase">
                                        <th className="px-6 py-3 text-left">Claim ID</th>
                                        <th className="px-6 py-3 text-left">Holder</th>
                                        <th className="px-6 py-3 text-left">Amount</th>
                                        <th className="px-6 py-3 text-left">Risk Score</th>
                                        <th className="px-6 py-3 text-left">Status</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {recent.map((r) => (
                                        <tr key={r.id} className="border-b border-border-dark/50 hover:bg-border-dark/30 transition-colors">
                                            <td className="px-6 py-4 font-mono text-slate-300">{r.id}</td>
                                            <td className="px-6 py-4 text-white">{r.holder}</td>
                                            <td className="px-6 py-4 text-slate-300">{r.amount}</td>
                                            <td className="px-6 py-4">
                                                <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${riskColor(r.risk)}`}>{r.risk}</span>
                                            </td>
                                            <td className="px-6 py-4 text-slate-400">{r.status}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </main>
            </div>
        </div>
    )
}
