import Sidebar from '../../components/admin/Sidebar'
import TopHeader from '../../components/admin/TopHeader'

/* ─── Data ──────────────────────────────────────────────────────── */
const KPI_CARDS = [
    {
        label: 'Total Prevented Loss',
        value: '$12.4M',
        change: '+12%',
        changeIcon: 'trending_up',
        changeColor: 'text-emerald-500',
        sub: 'Vs. $11.1M expected',
        icon: 'monetization_on',
    },
    {
        label: 'Current Accuracy Model',
        value: '94.2%',
        change: '+0.8%',
        changeIcon: 'arrow_upward',
        changeColor: 'text-emerald-500',
        sub: 'Top percentile performance',
        icon: 'model_training',
    },
    {
        label: 'Active Fraud Alerts',
        value: '23',
        change: '-5%',
        changeIcon: 'arrow_downward',
        changeColor: 'text-emerald-500',
        sub: 'Requires immediate review',
        icon: 'notification_important',
    },
]

const DRIFT_METRICS = [
    { label: 'Input Drift (PSI)', value: '0.04', color: 'text-emerald-500', barColor: 'bg-emerald-500', barWidth: '15%', sub: 'Distribution remains stable within expected bounds.' },
    { label: 'Concept Drift (KL)', value: '0.12', color: 'text-amber-500', barColor: 'bg-amber-500', barWidth: '45%', sub: 'Minor shifts detected in Property claims data.' },
    { label: 'Output Stability', value: '0.21', color: 'text-primary', barColor: 'bg-primary', barWidth: '75%', sub: 'Warning: Casualty model predictions deviating.', warn: true },
]

// Heatmap: rows × cols
const HEATMAP_ROWS = [
    {
        archetype: 'Medical',
        cells: [
            { value: '98%', style: 'bg-slate-800 text-slate-400' },
            { value: '96%', style: 'bg-slate-800 text-slate-400' },
            { value: '82%', style: 'bg-[#5e222b] text-white font-bold', tooltip: 'Review discrepancy' },
            { value: '91%', style: 'bg-slate-700 text-slate-300' },
            { value: '99%', style: 'bg-slate-800 text-slate-400' },
        ],
    },
    {
        archetype: 'Property',
        cells: [
            { value: '97%', style: 'bg-slate-800 text-slate-400' },
            { value: '74%', style: 'bg-[#a62b3d] text-white font-bold' },
            { value: '52%', style: 'bg-[#e83049] text-white font-black ring-2 ring-primary/50', tooltip: 'Critical Drift' },
            { value: '78%', style: 'bg-[#852a36] text-white font-bold' },
            { value: '88%', style: 'bg-slate-700 text-slate-300' },
        ],
    },
    {
        archetype: 'Casualty',
        cells: [
            { value: '95%', style: 'bg-slate-800 text-slate-400' },
            { value: '94%', style: 'bg-slate-800 text-slate-400' },
            { value: '89%', style: 'bg-slate-700 text-slate-300' },
            { value: '81%', style: 'bg-[#5e222b] text-white font-bold' },
            { value: '68%', style: 'bg-[#a62b3d] text-white font-bold' },
        ],
    },
]

/* ─── Page ───────────────────────────────────────────────────────── */
export default function AnalyticsPage() {
    return (
        <div className="flex h-screen bg-background-dark overflow-hidden">
            <Sidebar />
            <div className="flex flex-col flex-1 overflow-hidden">
                {/* Custom header */}
                <header className="flex-none flex items-center justify-between px-6 h-16 border-b border-border-dark bg-surface-dark/60 backdrop-blur-sm">
                    <div className="flex items-center gap-3">
                        <h2 className="text-lg font-bold text-white tracking-tight">Intelligence Performance Analytics</h2>
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-primary/10 text-primary border border-primary/20">LIVE</span>
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="flex items-center gap-2 bg-background-dark rounded-lg px-3 py-1.5 border border-border-dark">
                            <span className="material-symbols-outlined text-slate-400 text-[18px]">calendar_today</span>
                            <span className="text-sm text-slate-300 font-medium">Last 30 Days</span>
                            <span className="material-symbols-outlined text-slate-400 text-[18px]">arrow_drop_down</span>
                        </div>
                        <button className="bg-primary hover:bg-[#d02038] text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors shadow-lg shadow-primary/20 flex items-center gap-2">
                            <span className="material-symbols-outlined text-[18px]">download</span>
                            Export Report
                        </button>
                    </div>
                </header>

                <main className="flex-1 overflow-y-auto p-6 space-y-6">

                    {/* ── KPI Cards ─────────────────────────────── */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                        {KPI_CARDS.map(card => (
                            <div key={card.label} className="bg-surface-dark p-6 rounded-xl border border-border-dark relative overflow-hidden group hover:border-primary/40 transition-colors">
                                {/* Ghost icon */}
                                <div className="absolute right-0 top-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity text-primary">
                                    <span className="material-symbols-outlined text-6xl">{card.icon}</span>
                                </div>
                                <p className="text-slate-400 text-xs font-medium uppercase tracking-wider">{card.label}</p>
                                <div className="flex items-baseline gap-2 mt-2">
                                    <h3 className="text-3xl font-bold text-white">{card.value}</h3>
                                    <span className={`text-sm font-bold flex items-center ${card.changeColor}`}>
                                        <span className="material-symbols-outlined text-[14px]">{card.changeIcon}</span>
                                        {card.change}
                                    </span>
                                </div>
                                <p className="text-slate-500 text-xs mt-1">{card.sub}</p>
                            </div>
                        ))}
                    </div>

                    {/* ── Chart + Model Drift ────────────────────── */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

                        {/* Line Chart */}
                        <div className="lg:col-span-2 bg-surface-dark p-6 rounded-xl border border-border-dark flex flex-col">
                            <div className="flex justify-between items-start mb-5 flex-wrap gap-3">
                                <div>
                                    <h3 className="text-lg font-bold text-white">Loss Prevention Trajectory</h3>
                                    <p className="text-slate-400 text-sm">Expected vs. Prevented Loss (Millions)</p>
                                </div>
                                <div className="flex items-center gap-4">
                                    <div className="flex items-center gap-2">
                                        <span className="h-3 w-3 rounded-full bg-slate-600"></span>
                                        <span className="text-xs text-slate-400">Expected</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className="h-3 w-3 rounded-full bg-primary"></span>
                                        <span className="text-xs text-slate-400">Prevented</span>
                                    </div>
                                </div>
                            </div>

                            {/* SVG Chart */}
                            <div className="flex-1 flex flex-col min-h-[200px]">
                                <svg className="flex-1 w-full" viewBox="0 0 800 300" preserveAspectRatio="none">
                                    <defs>
                                        <linearGradient id="gradientRed" x1="0" x2="0" y1="0" y2="1">
                                            <stop offset="0%" stopColor="#e83049" stopOpacity="0.35" />
                                            <stop offset="100%" stopColor="#e83049" stopOpacity="0" />
                                        </linearGradient>
                                    </defs>
                                    {/* Grid lines */}
                                    {[250, 175, 100, 25].map(y => (
                                        <line key={y} x1="0" x2="800" y1={y} y2={y} stroke="#333" strokeWidth="1" strokeDasharray="4" opacity="0.25" />
                                    ))}
                                    {/* Expected dashed */}
                                    <path d="M0,200 Q200,180 400,150 T800,100" fill="none" stroke="#64748b" strokeWidth="3" strokeDasharray="8 4" opacity="0.55" />
                                    {/* Prevented fill */}
                                    <path d="M0,220 Q200,190 400,100 T800,50 V300 H0 Z" fill="url(#gradientRed)" />
                                    <path d="M0,220 Q200,190 400,100 T800,50" fill="none" stroke="#e83049" strokeWidth="4" />
                                    {/* Data points */}
                                    <circle cx="400" cy="100" r="6" fill="#211113" stroke="#e83049" strokeWidth="3" />
                                    <circle cx="800" cy="50" r="6" fill="#211113" stroke="#e83049" strokeWidth="3" />
                                </svg>
                                <div className="flex justify-between text-xs text-slate-500 mt-3 px-1 font-mono">
                                    {['Week 1', 'Week 2', 'Week 3', 'Week 4'].map(w => <span key={w}>{w}</span>)}
                                </div>
                            </div>
                        </div>

                        {/* Model Drift */}
                        <div className="lg:col-span-1 bg-surface-dark p-6 rounded-xl border border-border-dark flex flex-col">
                            <div className="mb-5 flex items-center justify-between">
                                <h3 className="text-lg font-bold text-white">Model Drift</h3>
                                <button className="text-xs text-primary hover:bg-primary hover:text-white px-2 py-1 rounded transition-colors">Details</button>
                            </div>
                            <div className="flex flex-col gap-7 flex-1">
                                {DRIFT_METRICS.map(m => (
                                    <div key={m.label} className="flex flex-col gap-2">
                                        <div className="flex justify-between items-end">
                                            <span className="text-sm text-slate-400 font-medium">{m.label}</span>
                                            <span className={`font-mono font-bold text-lg ${m.color}`}>{m.value}</span>
                                        </div>
                                        <div className="w-full h-2 bg-border-dark rounded-full overflow-hidden">
                                            <div className={`h-full rounded-full ${m.barColor}`} style={{ width: m.barWidth }} />
                                        </div>
                                        <p className={`text-xs ${m.warn ? 'text-primary/80' : 'text-slate-500'}`}>{m.sub}</p>
                                    </div>
                                ))}
                            </div>
                            {/* Retraining alert */}
                            <div className="mt-6 pt-5 border-t border-border-dark">
                                <div className="flex items-center gap-3 p-3 bg-primary/10 rounded-lg border border-primary/20">
                                    <span className="material-symbols-outlined text-primary text-[20px]">warning</span>
                                    <div>
                                        <p className="text-xs font-bold text-primary uppercase tracking-wide">Retraining Advised</p>
                                        <p className="text-[10px] text-slate-400 mt-0.5">Casualty v4.1 showing signs of degradation.</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* ── Decision Accuracy Heatmap ──────────────── */}
                    <div className="bg-surface-dark p-6 rounded-xl border border-border-dark">
                        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-5 gap-4">
                            <div>
                                <h3 className="text-lg font-bold text-white">Decision Accuracy Heatmap</h3>
                                <p className="text-slate-400 text-sm">Human vs. AI Alignment across Archetypes (Darker = Higher Risk/Misalignment)</p>
                            </div>
                            {/* Legend */}
                            <div className="flex items-center gap-2 shrink-0">
                                <span className="text-xs text-slate-500">High Match</span>
                                <div className="flex h-3 w-24 rounded overflow-hidden">
                                    <div className="flex-1 bg-slate-800"></div>
                                    <div className="flex-1 bg-slate-700"></div>
                                    <div className="flex-1 bg-[#852a36]"></div>
                                    <div className="flex-1 bg-[#b52d40]"></div>
                                    <div className="flex-1 bg-[#e83049]"></div>
                                </div>
                                <span className="text-xs text-slate-500">Low Match / Risk</span>
                            </div>
                        </div>

                        <div className="overflow-x-auto">
                            <div className="min-w-[580px]">
                                {/* Column headers */}
                                <div className="grid grid-cols-6 gap-1 mb-2">
                                    <div className="text-xs font-bold text-slate-400 uppercase tracking-wider pl-2">Archetype</div>
                                    {['Stage 1: Intake', 'Stage 2: Validation', 'Stage 3: Review', 'Stage 4: Approval', 'Stage 5: Payment'].map(s => (
                                        <div key={s} className="text-center text-xs font-mono text-slate-500">{s}</div>
                                    ))}
                                </div>

                                {/* Rows */}
                                <div className="flex flex-col gap-1">
                                    {HEATMAP_ROWS.map(row => (
                                        <div key={row.archetype} className="grid grid-cols-6 gap-1">
                                            <div className="flex items-center pl-2">
                                                <span className="text-sm font-medium text-slate-300">{row.archetype}</span>
                                            </div>
                                            {row.cells.map((cell, ci) => (
                                                <div
                                                    key={ci}
                                                    className={`h-12 rounded flex items-center justify-center text-xs font-mono relative group/cell transition-transform hover:scale-105 cursor-pointer ${cell.style}`}
                                                >
                                                    {cell.value}
                                                    {cell.tooltip && (
                                                        <span className="absolute -top-8 left-1/2 -translate-x-1/2 bg-black text-white text-[10px] px-2 py-1 rounded opacity-0 group-hover/cell:opacity-100 pointer-events-none whitespace-nowrap z-10 transition-opacity">
                                                            {cell.tooltip}
                                                        </span>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>

                </main>
            </div>
        </div>
    )
}
