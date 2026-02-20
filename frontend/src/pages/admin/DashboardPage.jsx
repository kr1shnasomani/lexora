import { useState } from 'react'
import { Link } from 'react-router-dom'
import Sidebar from '../../components/admin/Sidebar'
import TopHeader from '../../components/admin/TopHeader'

const kpis = [
    {
        label: 'Risk Exposure',
        value: '$14.2M',
        delta: '+2.4%',
        deltaColor: 'text-primary',
        icon: 'currency_exchange',
        bar: { width: '65%', color: 'bg-primary' },
    },
    {
        label: 'Auto-Resolution',
        value: '92.8%',
        delta: '+0.3%',
        deltaColor: 'text-emerald-400',
        icon: 'auto_fix_high',
        bar: { width: '92%', color: 'bg-emerald-500' },
    },
    {
        label: 'Fraud Flags',
        value: '34',
        delta: '+12%',
        deltaColor: 'text-primary',
        icon: 'flag',
        subtext: 'Requires immediate review',
        alert: true,
    },
    {
        label: 'Active Anomalies',
        value: '7',
        delta: '-2',
        deltaColor: 'text-emerald-400',
        icon: 'radar',
        subtext: 'System monitoring active',
    },
]

// 8 rows × 10 cols of heatmap cells: [isPrimary, opacity]
// Rows are R8 (top) down to R1 (bottom)
const heatmapRows = [
    // R8
    [[false, 20], [false, 30], [true, 40], [true, 20], [false, 20], [false, 10], [true, 60], [true, 80], [true, 40], [false, 20]],
    // R7
    [[false, 10], [true, 30], [true, 50], [true, 90], [true, 60], [false, 30], [false, 20], [true, 40], [false, 10], [false, 10]],
    // R6
    [[false, 20], [false, 20], [false, 10], [true, 20], [true, 40], [true, 70], [true, 50], [false, 30], [false, 10], [false, 10]],
    // R5
    [[true, 60], [true, 80], [true, 100], [true, 50], [false, 20], [false, 10], [false, 10], [true, 30], [true, 20], [false, 10]],
    // R4
    [[false, 20], [true, 30], [true, 20], [false, 10], [false, 10], [true, 40], [true, 90], [true, 60], [false, 20], [false, 10]],
    // R3
    [[false, 10], [false, 10], [false, 20], [true, 30], [true, 50], [false, 20], [false, 10], [false, 10], [true, 20], [false, 10]],
    // R2
    [[true, 40], [true, 30], [false, 20], [false, 10], [false, 10], [true, 20], [true, 30], [true, 50], [true, 70], [true, 20]],
    // R1
    [[false, 10], [false, 10], [false, 20], [false, 10], [false, 10], [false, 10], [false, 20], [true, 30], [true, 40], [true, 20]],
]

const liveSignals = [
    {
        type: 'Critical',
        badgeClass: 'bg-primary/20 text-primary',
        borderClass: 'border-l-primary',
        time: '10:42:15',
        title: 'Multiple claims from IP block 192.168.x.x',
        desc: 'Detected velocity spike exceeding threshold by 400% in region US-East-1.',
    },
    {
        type: 'Warning',
        badgeClass: 'bg-amber-500/20 text-amber-500',
        borderClass: 'border-l-amber-500',
        time: '10:40:02',
        title: 'Velocity spike in Region US-East',
        desc: "Unusual claim volume detected for category 'Medical Equipment'.",
    },
    {
        type: 'System',
        badgeClass: 'bg-indigo-500/20 text-indigo-400',
        borderClass: 'border-l-indigo-500',
        time: '10:35:55',
        title: 'Model calibration completed',
        desc: 'Fraud detection model v4.2.1 deployed successfully.',
    },
    {
        type: 'Warning',
        badgeClass: 'bg-amber-500/20 text-amber-500',
        borderClass: 'border-l-amber-500',
        time: '10:28:10',
        title: 'Duplicate identity fragments',
        desc: 'Partial match found across 12 active applications.',
    },
    {
        type: 'System',
        badgeClass: 'bg-indigo-500/20 text-indigo-400',
        borderClass: 'border-l-indigo-500',
        time: '10:15:00',
        title: 'Database Sync',
        desc: 'Routine synchronization with external agency bureaus.',
        dim: true,
    },
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
    const [cursor, setCursor] = useState({ x: -1000, y: -1000 })

    const handleMouseMove = (e) => {
        const rect = e.currentTarget.getBoundingClientRect()
        setCursor({ x: e.clientX - rect.left, y: e.clientY - rect.top })
    }

    return (
        <div className="flex h-screen bg-background-dark overflow-hidden">
            <Sidebar />
            <div className="flex flex-col flex-1 overflow-hidden">
                <TopHeader title="Intelligence Core" />
                <main
                    className="flex-1 overflow-y-auto p-6 space-y-6 relative"
                    onMouseMove={handleMouseMove}
                >
                    {/* Cursor glow */}
                    <div
                        className="pointer-events-none fixed inset-0 z-0 transition-opacity duration-300"
                        style={{
                            background: `radial-gradient(700px circle at ${cursor.x}px ${cursor.y}px, rgba(232,48,73,0.07), transparent 70%)`,
                        }}
                    />

                    {/* Dashboard sub-header */}
                    <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                        <div>
                            <div className="flex items-center gap-2 mb-1">
                                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-primary/10 text-primary border border-primary/20">
                                    LIVE MONITORING
                                </span>
                                <span className="text-xs text-slate-500">Last updated: Just now</span>
                            </div>
                            <h2 className="text-2xl font-bold text-white tracking-tight">Intelligence Core</h2>
                        </div>
                        <div className="flex gap-2">
                            <button className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-slate-300 bg-surface-dark border border-border-dark rounded-lg hover:bg-white/5 transition-colors">
                                <span className="material-symbols-outlined text-[18px]">tune</span>
                                Filters
                            </button>
                            <button className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-white bg-primary rounded-lg hover:bg-primary-dark transition-colors shadow-sm shadow-primary/20">
                                <span className="material-symbols-outlined text-[18px]">add_alert</span>
                                New Rule
                            </button>
                        </div>
                    </div>

                    {/* KPI Cards */}
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                        {kpis.map((k) => (
                            <div
                                key={k.label}
                                className={`group rounded-xl border bg-surface-dark p-5 shadow-sm relative overflow-hidden transition-colors ${k.alert ? 'border-primary/30 shadow-primary/5' : 'border-border-dark'
                                    }`}
                            >
                                <div className="absolute top-0 right-0 p-4 opacity-50 group-hover:opacity-100 transition-opacity">
                                    <span className={`material-symbols-outlined ${k.alert ? 'text-primary/40 animate-pulse' : 'text-slate-600'}`}>
                                        {k.icon}
                                    </span>
                                </div>
                                <p className="text-sm font-medium text-slate-400">{k.label}</p>
                                <div className="mt-2 flex items-baseline gap-2">
                                    <h3 className="text-2xl font-bold text-white">{k.value}</h3>
                                    <span className={`inline-flex items-baseline text-xs font-semibold ${k.deltaColor}`}>
                                        <span className="material-symbols-outlined text-[14px] align-middle mr-0.5">
                                            {k.delta.startsWith('-') ? 'trending_down' : 'trending_up'}
                                        </span>
                                        {k.delta.replace(/^[+-]/, '')}
                                    </span>
                                </div>
                                {k.bar ? (
                                    <div className="mt-4 w-full bg-white/5 rounded-full h-1.5 overflow-hidden">
                                        <div className={`${k.bar.color} h-1.5 rounded-full`} style={{ width: k.bar.width }}></div>
                                    </div>
                                ) : (
                                    <p className={`mt-4 text-xs ${k.alert ? 'text-slate-500' : 'text-orange-400 flex items-center gap-1'}`}>
                                        {!k.alert && <span className="w-1.5 h-1.5 rounded-full bg-orange-400 inline-block"></span>}
                                        {k.subtext}
                                    </p>
                                )}
                            </div>
                        ))}
                    </div>

                    {/* Heatmap + Live Signals */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6" style={{ height: 'auto', minHeight: '400px' }}>

                        {/* Claims Velocity Heatmap */}
                        <div className="lg:col-span-2 rounded-xl border border-border-dark bg-surface-dark p-6 flex flex-col">
                            <div className="flex items-center justify-between mb-5">
                                <div>
                                    <h3 className="text-base font-semibold text-white">Claims Velocity Heatmap</h3>
                                    <p className="text-xs text-slate-500">Regional claim density over last 24h</p>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="text-xs text-slate-500 font-medium">Low</span>
                                    <div className="w-20 h-2 rounded bg-gradient-to-r from-slate-800 to-primary"></div>
                                    <span className="text-xs text-slate-500 font-medium">High</span>
                                </div>
                            </div>

                            {/* Grid */}
                            <div className="flex-1 relative min-h-[300px]">
                                {/* Y-axis labels */}
                                <div className="absolute left-0 top-0 bottom-6 w-7 flex flex-col justify-between text-[10px] text-slate-500 py-1 font-mono">
                                    {['R8', 'R7', 'R6', 'R5', 'R4', 'R3', 'R2', 'R1'].map(r => (
                                        <span key={r}>{r}</span>
                                    ))}
                                </div>
                                {/* X-axis labels */}
                                <div className="absolute left-7 right-0 bottom-0 h-6 flex justify-between text-[10px] text-slate-500 px-1 font-mono">
                                    {['T-0', 'T-1', 'T-2', 'T-3', 'T-4', 'T-5', 'T-6', 'T-7', 'T-8', 'T-9'].map(t => (
                                        <span key={t}>{t}</span>
                                    ))}
                                </div>
                                {/* Cell grid */}
                                <div className="absolute left-7 right-0 top-0 bottom-6 grid grid-cols-10 grid-rows-8 gap-1 p-1 bg-black/20 rounded border border-white/5">
                                    {heatmapRows.map((row, ri) =>
                                        row.map(([isPrimary, opacity], ci) => (
                                            <div
                                                key={`${ri}-${ci}`}
                                                className={`rounded-sm hover:opacity-100 hover:scale-110 transition-all cursor-crosshair ${isPrimary ? 'bg-primary' : 'bg-slate-800'} ${opacity === 100 ? 'shadow-[0_0_20px_rgba(232,48,73,0.8)] border border-white/20' : ''}`}
                                                style={{ opacity: opacity / 100 }}
                                            />
                                        ))
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Live Signals */}
                        <div className="rounded-xl border border-border-dark bg-surface-dark flex flex-col overflow-hidden">
                            <div className="p-5 border-b border-white/5 flex items-center justify-between">
                                <h3 className="text-base font-semibold text-white flex items-center gap-2">
                                    <span className="relative flex h-3 w-3">
                                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                                        <span className="relative inline-flex rounded-full h-3 w-3 bg-primary"></span>
                                    </span>
                                    Live Signals
                                </h3>
                                <button className="text-xs font-medium text-primary hover:text-primary-light transition-colors">View Log</button>
                            </div>
                            <div className="flex-1 overflow-y-auto divide-y divide-white/5">
                                {liveSignals.map((s, i) => (
                                    <div
                                        key={i}
                                        className={`p-4 hover:bg-white/5 transition-colors cursor-pointer border-l-4 ${s.borderClass} ${s.dim ? 'opacity-60' : ''}`}
                                    >
                                        <div className="flex items-start justify-between mb-1">
                                            <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${s.badgeClass}`}>
                                                {s.type}
                                            </span>
                                            <span className="text-[10px] text-slate-400 font-mono">{s.time}</span>
                                        </div>
                                        <p className="text-sm font-medium text-slate-200 mb-1">{s.title}</p>
                                        <p className="text-xs text-slate-500 truncate">{s.desc}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Priority Review Queue */}
                    <div className="rounded-xl border border-border-dark bg-surface-dark">
                        <div className="flex items-center justify-between p-6 border-b border-border-dark">
                            <h2 className="text-base font-semibold text-white">Priority Review Queue</h2>
                            <Link to="/admin/claims" className="text-sm text-primary font-medium hover:underline">View all →</Link>
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
