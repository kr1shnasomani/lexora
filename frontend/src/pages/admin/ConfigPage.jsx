import { useState } from 'react'
import Sidebar from '../../components/admin/Sidebar'
import TopHeader from '../../components/admin/TopHeader'

/* ─── Data ──────────────────────────────────────────────────────── */
const INITIAL_THRESHOLDS = [
    { key: 'fraud.high_threshold', value: '0.85', desc: 'Critical limit for immediate rejection', modified: '2 mins ago', version: 'v2.1', highlight: true },
    { key: 'fraud.auto_reject_score', value: '0.92', desc: 'Score triggering auto-reject workflow', modified: '14 hrs ago', version: 'v2.0' },
    { key: 'claims.review_queue_limit', value: '50', desc: 'Max items in manual review', modified: '2 days ago', version: 'v1.9' },
    { key: 'sanctions.fuzzy_match_tolerance', value: '2', desc: 'Levenshtein distance limit', modified: '1 week ago', version: 'v1.8' },
]

const INITIAL_FLAGS = [
    { key: 'graph', label: 'Tier 3 Graph Analysis', desc: 'Enables deep-link relationship mapping for complex claims.', badge: null, badgeIcon: 'bolt', badgeColor: 'text-amber-400', enabled: true },
    { key: 'auto', label: 'Auto-Approval Engine', desc: 'Automatically adjudicates claims below $500 with score < 0.1.', badge: null, badgeIcon: 'info', badgeColor: 'text-slate-400', enabled: false },
    { key: 'sanctions', label: 'Real-time Sanctions', desc: 'Checks payee against OFAC lists synchronously.', badge: null, badgeIcon: null, badgeColor: '', enabled: true },
    { key: 'legacy', label: 'Legacy API V1', desc: 'Support for older client integrations.', badge: 'DEPRECATED', badgeIcon: null, badgeColor: '', enabled: false },
]

const AUDIT_LOGS = [
    { icon: 'warning', iconColor: 'text-primary', command: 'UPDATE fraud.high_threshold -> 0.85', sub: 'User: admin_jdoe • 192.168.1.45', time: '09:42 AM' },
    { icon: 'check_circle', iconColor: 'text-emerald-500', command: 'SYNC Feature Flags', sub: 'System Automatic Sync', time: '08:00 AM' },
]

/* ─── Toggle Switch ─────────────────────────────────────────────── */
function Toggle({ enabled, onToggle }) {
    return (
        <button
            onClick={onToggle}
            className={`relative shrink-0 w-11 h-6 rounded-full transition-colors duration-200 ${enabled ? 'bg-primary' : 'bg-border-dark'}`}
            role="switch"
            aria-checked={enabled}
        >
            <span className={`absolute top-0.5 left-0.5 size-5 bg-white rounded-full shadow transition-transform duration-200 ${enabled ? 'translate-x-5' : 'translate-x-0'}`} />
        </button>
    )
}

/* ─── Page ───────────────────────────────────────────────────────── */
export default function ConfigPage() {
    const [thresholds, setThresholds] = useState(INITIAL_THRESHOLDS)
    const [flags, setFlags] = useState(INITIAL_FLAGS)
    const [search, setSearch] = useState('')
    const [saved, setSaved] = useState(false)

    const handleToggle = (key) =>
        setFlags(prev => prev.map(f => f.key === key ? { ...f, enabled: !f.enabled } : f))

    const handleValueChange = (key, val) =>
        setThresholds(prev => prev.map(t => t.key === key ? { ...t, value: val } : t))

    const handleSave = () => { setSaved(true); setTimeout(() => setSaved(false), 2500) }

    const filtered = thresholds.filter(t =>
        t.key.toLowerCase().includes(search.toLowerCase())
    )

    return (
        <div className="flex h-screen bg-background-dark overflow-hidden">
            <Sidebar />
            <div className="flex flex-col flex-1 overflow-hidden">
                <TopHeader title="System Config" showSearch={false} />

                <main className="flex-1 overflow-y-auto">
                    {/* ── Sub-header ───────────────────────────── */}
                    <div className="border-b border-border-dark bg-background-dark/80 backdrop-blur-md px-6 py-5">
                        {/* Breadcrumb */}
                        <nav className="flex items-center gap-1.5 text-xs text-slate-500 mb-3">
                            <span className="hover:text-primary cursor-pointer transition-colors">Home</span>
                            <span className="material-symbols-outlined text-[14px]">chevron_right</span>
                            <span className="hover:text-primary cursor-pointer transition-colors">Admin</span>
                            <span className="material-symbols-outlined text-[14px]">chevron_right</span>
                            <span className="text-white">System Config</span>
                            <span className="material-symbols-outlined text-[14px]">chevron_right</span>
                            <span className="font-mono opacity-60">Screen A7</span>
                        </nav>
                        <div className="flex items-center justify-between gap-4 flex-wrap">
                            <div>
                                <h1 className="text-2xl font-bold text-white tracking-tight">System Configuration</h1>
                                <p className="text-sm text-slate-400 mt-0.5">Manage fraud thresholds and global feature flags.</p>
                            </div>
                            <div className="flex items-center gap-3">
                                <button className="flex items-center gap-2 px-4 py-2 rounded-lg border border-border-dark text-sm font-medium text-slate-400 hover:bg-surface-dark hover:text-white transition-colors">
                                    <span className="material-symbols-outlined text-[18px]">history</span>
                                    Revert Defaults
                                </button>
                                <button
                                    onClick={handleSave}
                                    className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold text-white shadow-lg transition-all ${saved ? 'bg-emerald-500 shadow-emerald-500/20' : 'bg-primary hover:bg-[#d02038] shadow-primary/20'}`}
                                >
                                    <span className="material-symbols-outlined text-[18px]">{saved ? 'check' : 'save'}</span>
                                    {saved ? 'Saved!' : 'Save Changes'}
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* ── Two-col grid ─────────────────────────── */}
                    <div className="p-6">
                        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 max-w-7xl mx-auto">

                            {/* LEFT: 8 cols ──────────────────────── */}
                            <div className="lg:col-span-8 flex flex-col gap-6">

                                {/* Fraud Thresholds Table */}
                                <div className="rounded-xl border border-border-dark bg-surface-dark p-6">
                                    <div className="mb-5 flex items-center justify-between gap-4 flex-wrap">
                                        <h2 className="flex items-center gap-2 text-lg font-bold text-white">
                                            <span className="material-symbols-outlined text-primary">tune</span>
                                            Fraud Thresholds
                                        </h2>
                                        <div className="relative w-60">
                                            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[18px] text-slate-400">search</span>
                                            <input
                                                type="text"
                                                value={search}
                                                onChange={e => setSearch(e.target.value)}
                                                placeholder="Search config keys..."
                                                className="w-full pl-9 pr-4 py-2 rounded-lg bg-background-dark border border-border-dark text-white text-sm placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary transition-all"
                                            />
                                        </div>
                                    </div>

                                    <div className="overflow-hidden rounded-lg border border-border-dark">
                                        <table className="w-full text-left text-sm">
                                            <thead className="bg-background-dark text-slate-500">
                                                <tr>
                                                    <th className="px-4 py-3 font-medium">Config Key</th>
                                                    <th className="px-4 py-3 font-medium">Value</th>
                                                    <th className="px-4 py-3 font-medium text-right">Modified</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-border-dark">
                                                {filtered.map(t => (
                                                    <tr key={t.key} className="group hover:bg-[#38292b]/40 transition-colors">
                                                        <td className="px-4 py-4">
                                                            <div className="flex flex-col gap-0.5">
                                                                <span className={`font-mono text-sm ${t.highlight ? 'text-primary' : 'text-slate-300'}`}>{t.key}</span>
                                                                <span className="text-xs text-slate-500">{t.desc}</span>
                                                            </div>
                                                        </td>
                                                        <td className="px-4 py-4">
                                                            <div className="flex items-center gap-2">
                                                                <input
                                                                    type="text"
                                                                    value={t.value}
                                                                    onChange={e => handleValueChange(t.key, e.target.value)}
                                                                    className="w-24 rounded border border-border-dark bg-background-dark px-2 py-1 text-right font-mono text-sm text-white focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none transition-all"
                                                                />
                                                                <span className="material-symbols-outlined text-[17px] text-slate-500 opacity-0 group-hover:opacity-100 hover:text-primary cursor-pointer transition-all">edit</span>
                                                            </div>
                                                        </td>
                                                        <td className="px-4 py-4 text-right">
                                                            <div className="flex flex-col items-end gap-1">
                                                                <span className="text-xs text-white">{t.modified}</span>
                                                                <span className="rounded bg-border-dark px-1.5 py-0.5 text-[10px] font-medium text-slate-400">{t.version}</span>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                ))}
                                                {filtered.length === 0 && (
                                                    <tr>
                                                        <td colSpan={3} className="px-4 py-6 text-center text-sm text-slate-500">No keys match "{search}"</td>
                                                    </tr>
                                                )}
                                            </tbody>
                                        </table>
                                    </div>

                                    <div className="mt-4 flex items-center justify-between text-xs text-slate-500">
                                        <span>Showing {filtered.length} of 28 keys</span>
                                        <div className="flex gap-2">
                                            <button className="px-3 py-1 rounded bg-background-dark border border-border-dark hover:bg-border-dark transition-colors">Previous</button>
                                            <button className="px-3 py-1 rounded bg-background-dark border border-border-dark hover:bg-border-dark transition-colors">Next</button>
                                        </div>
                                    </div>
                                </div>

                                {/* Recent Audit Logs */}
                                <div className="rounded-xl border border-border-dark bg-surface-dark p-6">
                                    <div className="mb-4 flex items-center justify-between">
                                        <h2 className="flex items-center gap-2 text-lg font-bold text-white">
                                            <span className="material-symbols-outlined text-slate-400">terminal</span>
                                            Recent Audit Logs
                                        </h2>
                                        <button className="text-xs font-medium text-primary hover:underline">View All Logs</button>
                                    </div>
                                    <div className="flex flex-col gap-2">
                                        {AUDIT_LOGS.map((log, i) => (
                                            <div key={i} className="flex items-start gap-3 rounded-lg bg-background-dark p-3 text-sm">
                                                <span className={`material-symbols-outlined mt-0.5 text-[18px] ${log.iconColor}`}>{log.icon}</span>
                                                <div className="flex flex-col flex-1 min-w-0">
                                                    <span className="font-mono text-white">{log.command}</span>
                                                    <span className="text-xs text-slate-500 mt-0.5">{log.sub}</span>
                                                </div>
                                                <span className="text-xs text-slate-500 shrink-0">{log.time}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            {/* RIGHT: 4 cols ─────────────────────── */}
                            <div className="lg:col-span-4 flex flex-col gap-6">

                                {/* Feature Flags */}
                                <div className="rounded-xl border border-border-dark bg-surface-dark p-6">
                                    <div className="mb-5 flex items-center gap-2">
                                        <h2 className="text-lg font-bold text-white">Feature Flags</h2>
                                        <span className="rounded-full bg-primary/20 px-2 py-0.5 text-[10px] font-bold text-primary">LIVE</span>
                                    </div>
                                    <div className="flex flex-col gap-5">
                                        {flags.map((f, i) => (
                                            <div key={f.key} className={`flex items-start justify-between gap-4 ${i < flags.length - 1 ? 'border-b border-border-dark pb-5' : ''}`}>
                                                <div className="flex flex-col gap-1 flex-1 min-w-0">
                                                    <div className="flex items-center gap-2 flex-wrap">
                                                        <span className="text-sm font-semibold text-white">{f.label}</span>
                                                        {f.badgeIcon && (
                                                            <span className={`material-symbols-outlined text-[15px] ${f.badgeColor}`}>{f.badgeIcon}</span>
                                                        )}
                                                        {f.badge && (
                                                            <span className="rounded bg-amber-500/20 px-1.5 py-0.5 text-[10px] font-bold text-amber-400">
                                                                {f.badge}
                                                            </span>
                                                        )}
                                                    </div>
                                                    <p className="text-xs text-slate-400 leading-relaxed">{f.desc}</p>
                                                </div>
                                                <Toggle enabled={f.enabled} onToggle={() => handleToggle(f.key)} />
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* System Health */}
                                <div className="rounded-xl border border-border-dark p-6 text-white"
                                    style={{ background: 'linear-gradient(135deg, #211113 0%, #181112 100%)' }}>
                                    <div className="mb-5 flex items-center justify-between">
                                        <h3 className="font-bold text-white">System Health</h3>
                                        <div className="flex items-center gap-2">
                                            <span className="relative flex h-2.5 w-2.5">
                                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-500 opacity-75"></span>
                                                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500 shadow-[0_0_10px_rgba(34,197,94,0.6)]"></span>
                                            </span>
                                            <span className="text-xs text-emerald-400">Operational</span>
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-5">
                                        {[
                                            { label: 'Latency', value: '24ms', color: '' },
                                            { label: 'Error Rate', value: '0.01%', color: 'text-emerald-400' },
                                            { label: 'Uptime', value: '99.99%', color: '' },
                                            { label: 'Active Nodes', value: '12/12', color: '' },
                                        ].map(item => (
                                            <div key={item.label} className="flex flex-col gap-1">
                                                <span className="text-xs text-slate-400">{item.label}</span>
                                                <span className={`font-mono text-xl font-medium ${item.color || 'text-white'}`}>{item.value}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>

                        </div>
                    </div>
                </main>
            </div>
        </div>
    )
}
