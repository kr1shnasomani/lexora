import { useState } from 'react'
import Sidebar from '../../components/admin/Sidebar'
import TopHeader from '../../components/admin/TopHeader'
import { useFetch } from '../../hooks/useFetch'

/* ─── Level → style map ─────────────────────────────────────────── */
const LEVEL_STYLE = {
    Critical: { iconBg: 'bg-primary/20 text-primary', levelBg: 'bg-primary text-white', scoreColor: 'text-primary', barColor: 'bg-primary', borderGlow: 'border-primary shadow-[0_0_15px_-3px_rgba(232,48,73,0.35)]', borderBase: 'border-primary', featured: true },
    High: { iconBg: 'bg-orange-500/20 text-orange-500', levelBg: 'bg-orange-500/20 text-orange-500', scoreColor: 'text-orange-500', barColor: 'bg-orange-500', borderGlow: 'border-border-dark hover:border-slate-500', borderBase: 'border-border-dark', featured: false },
    Medium: { iconBg: 'bg-amber-500/20 text-amber-500', levelBg: 'bg-amber-500/20 text-amber-500', scoreColor: 'text-amber-500', barColor: 'bg-amber-500', borderGlow: 'border-border-dark hover:border-slate-500', borderBase: 'border-border-dark', featured: false },
    Low: { iconBg: 'bg-blue-500/20 text-blue-400', levelBg: 'bg-blue-500/20 text-blue-400', scoreColor: 'text-blue-400', barColor: 'bg-blue-500', borderGlow: 'border-border-dark hover:border-slate-500', borderBase: 'border-border-dark', featured: false },
}

function AlertCard({ alert }) {
    const style = LEVEL_STYLE[alert.level] || LEVEL_STYLE['Medium']
    const { featured, borderGlow, iconBg, levelBg, scoreColor, barColor } = style
    return (
        <div className={`bg-surface-dark rounded-xl overflow-hidden border flex flex-col transition-colors ${featured ? borderGlow : 'border-border-dark hover:border-slate-500'}`}>
            <div className="p-6 flex flex-col flex-1">
                <div className="flex justify-between items-start mb-4">
                    <div className="flex items-center gap-3">
                        <div className={`size-10 rounded-lg flex items-center justify-center ${iconBg}`}>
                            <span className="material-symbols-outlined text-[22px]">{alert.icon || 'warning'}</span>
                        </div>
                        <div>
                            <h3 className="font-bold text-base text-white leading-tight">{alert.title}</h3>
                            <p className="text-xs text-slate-500 mt-0.5">Detected: {alert.detected}</p>
                        </div>
                    </div>
                    <span className={`text-[10px] font-bold px-2 py-1 rounded uppercase tracking-wider ${levelBg}`}>{alert.level}</span>
                </div>

                <div className="mb-5 space-y-2">
                    <div className="flex justify-between items-center text-sm">
                        <span className="text-slate-400">Confidence Score</span>
                        <span className={`font-bold ${scoreColor}`}>{alert.score}%</span>
                    </div>
                    <div className="w-full bg-border-dark rounded-full h-1.5 overflow-hidden">
                        <div className={`h-1.5 rounded-full ${barColor}`} style={{ width: `${alert.score}%` }} />
                    </div>
                    <p className="text-sm text-slate-300 leading-relaxed pt-1">{alert.description}</p>
                </div>

                <div className="grid grid-cols-3 gap-2 mt-auto">
                    <button className="px-3 py-2 rounded-lg text-sm font-medium transition-all bg-primary text-white hover:bg-[#d02038] shadow-lg shadow-primary/20 flex items-center justify-center gap-1">
                        <span className="material-symbols-outlined text-[15px]">search_check</span>
                        Investigate
                    </button>
                    <button className="px-3 py-2 rounded-lg text-sm font-medium transition-all border border-border-dark text-white hover:bg-border-dark/50 flex items-center justify-center gap-1">
                        <span className="material-symbols-outlined text-[15px]">block</span>
                        Freeze
                    </button>
                    <button className="px-3 py-2 rounded-lg text-sm font-medium transition-all bg-[#38292b] border border-border-dark text-slate-400 hover:text-white hover:bg-border-dark/70 flex items-center justify-center gap-1">
                        <span className="material-symbols-outlined text-[15px]">close</span>
                        Dismiss
                    </button>
                </div>
            </div>
        </div>
    )
}

/* ─── Page ───────────────────────────────────────────────────────── */
export default function ThreatFeedPage() {
    const [search, setSearch] = useState('')

    // Re-use dashboard summary — contains threat_alerts
    const { data, loading, error } = useFetch('/api/dashboard/summary', 30_000)
    const alerts = data?.threat_alerts || []

    // Derive stat counts from live alerts
    const criticalCount = alerts.filter(a => a.level === 'Critical').length
    const highCount = alerts.filter(a => a.level === 'High').length
    const activeCount = alerts.length

    const STATS = [
        { label: 'Active Threats', value: String(activeCount), badge: `+${criticalCount} Critical`, badgeIcon: 'warning', badgeColor: 'text-primary bg-primary/10', borderColor: 'border-primary', icon: 'warning', iconBg: 'text-primary' },
        { label: 'Loss Avoidance', value: data?.analytics_kpis?.[0]?.value || '$—', badge: 'AI-derived', badgeIcon: 'auto_fix_high', badgeColor: 'text-emerald-500 bg-emerald-500/10', borderColor: 'border-emerald-500', icon: 'attach_money', iconBg: 'text-emerald-500' },
        { label: 'System Load', value: '42%', badge: 'Stable', badgeIcon: 'trending_flat', badgeColor: 'text-blue-400 bg-blue-500/10', borderColor: 'border-blue-500', icon: 'memory', iconBg: 'text-blue-500' },
    ]

    const filtered = search
        ? alerts.filter(a => a.title.toLowerCase().includes(search.toLowerCase()))
        : alerts

    return (
        <div className="flex h-screen bg-background-dark overflow-hidden">
            <Sidebar />
            <div className="flex flex-col flex-1 overflow-hidden">
                <TopHeader title="Threat Intelligence Feed" />

                <main className="flex-1 overflow-y-auto p-6 space-y-8">

                    {error && (
                        <div className="rounded-lg border border-primary/30 bg-primary/10 px-4 py-2 text-sm text-primary flex items-center gap-2">
                            <span className="material-symbols-outlined text-[18px]">wifi_off</span>
                            Backend unreachable: {error}
                        </div>
                    )}

                    {/* Stat Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                        {STATS.map(s => (
                            <div key={s.label} className={`bg-surface-dark rounded-xl p-6 border border-border-dark border-l-4 ${s.borderColor} relative overflow-hidden group`}>
                                <div className={`absolute right-3 top-3 opacity-10 group-hover:opacity-20 transition-opacity ${s.iconBg}`}>
                                    <span className="material-symbols-outlined text-6xl">{s.icon}</span>
                                </div>
                                <p className="text-slate-400 text-sm font-medium mb-1">{s.label}</p>
                                <div className="flex items-end gap-3">
                                    {loading && !data
                                        ? <div className="h-8 w-16 bg-white/10 rounded animate-pulse" />
                                        : <span className="text-4xl font-bold text-white tracking-tight">{s.value}</span>
                                    }
                                    <span className={`text-xs font-medium px-2 py-0.5 rounded flex items-center gap-0.5 mb-1 ${s.badgeColor}`}>
                                        <span className="material-symbols-outlined text-[14px]">{s.badgeIcon}</span>
                                        {s.badge}
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Critical Alerts Stream */}
                    <div>
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                            <h2 className="text-xl font-bold text-white flex items-center gap-2">
                                <span className="size-2 rounded-full bg-primary animate-pulse inline-block" />
                                Critical Alerts Stream
                            </h2>
                            <div className="flex items-center gap-3">
                                <div className="relative">
                                    <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-[18px]">search</span>
                                    <input
                                        type="text"
                                        value={search}
                                        onChange={e => setSearch(e.target.value)}
                                        placeholder="Search signals…"
                                        className="pl-9 pr-4 py-2 rounded-lg bg-[#38292b] border border-border-dark text-white text-sm placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary transition-all w-52"
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-5">
                            {loading && !data
                                ? [0, 1, 2].map(i => (
                                    <div key={i} className="bg-surface-dark rounded-xl border border-border-dark p-6 animate-pulse h-48" />
                                ))
                                : filtered.length === 0
                                    ? <p className="text-slate-500 col-span-3 py-8 text-center">
                                        {search ? 'No alerts match your search.' : 'No active threat alerts at this time.'}
                                    </p>
                                    : filtered.map(alert => (
                                        <AlertCard key={alert.id} alert={alert} />
                                    ))
                            }
                        </div>
                    </div>

                    {/* Global Threat Map (static visual) */}
                    <div className="rounded-xl overflow-hidden border border-border-dark relative h-56 bg-surface-dark">
                        <div className="absolute inset-0 bg-gradient-to-tr from-primary/10 to-transparent pointer-events-none" />
                        <div className="absolute inset-0 bg-gradient-to-t from-surface-dark via-surface-dark/40 to-transparent pointer-events-none" />
                        <div className="relative z-10 p-6 h-full flex flex-col justify-end">
                            <div className="flex items-center justify-between">
                                <div>
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className="relative flex h-2 w-2">
                                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
                                            <span className="relative inline-flex rounded-full h-2 w-2 bg-primary" />
                                        </span>
                                        <span className="text-xs text-primary font-medium uppercase tracking-widest">Live</span>
                                    </div>
                                    <h3 className="text-lg font-bold text-white">Global Threat Map</h3>
                                    <p className="text-sm text-slate-400">Live visualization of node activity</p>
                                </div>
                                <button className="px-4 py-2 rounded-lg bg-background-dark/70 backdrop-blur-md border border-border-dark text-sm font-medium text-white hover:bg-background-dark transition-colors flex items-center gap-2">
                                    <span className="material-symbols-outlined text-[18px]">fullscreen</span>
                                    Expand Map
                                </button>
                            </div>
                        </div>
                    </div>
                </main>
            </div>
        </div>
    )
}
