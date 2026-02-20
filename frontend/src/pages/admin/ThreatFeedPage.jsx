import { useState } from 'react'
import Sidebar from '../../components/admin/Sidebar'
import TopHeader from '../../components/admin/TopHeader'

/* ─── Data ──────────────────────────────────────────────────────── */
const STATS = [
    {
        label: 'Active Threats',
        value: '142',
        badge: '+12%',
        badgeIcon: 'trending_up',
        badgeColor: 'text-primary bg-primary/10',
        borderColor: 'border-primary',
        iconBg: 'text-primary',
        icon: 'warning',
    },
    {
        label: 'Loss Avoidance',
        value: '$4.2M',
        badge: '+5%',
        badgeIcon: 'trending_up',
        badgeColor: 'text-emerald-500 bg-emerald-500/10',
        borderColor: 'border-emerald-500',
        iconBg: 'text-emerald-500',
        icon: 'attach_money',
    },
    {
        label: 'System Load',
        value: '42%',
        badge: 'Stable',
        badgeIcon: 'trending_flat',
        badgeColor: 'text-blue-400 bg-blue-500/10',
        borderColor: 'border-blue-500',
        iconBg: 'text-blue-500',
        icon: 'memory',
    },
]

const ALERTS = [
    {
        id: 'syndicate',
        icon: 'skull',
        iconBg: 'bg-primary/20 text-primary',
        title: 'Syndicate Cluster #992',
        detected: '2m ago',
        level: 'Critical',
        levelBg: 'bg-primary text-white',
        scoreColor: 'text-primary',
        barColor: 'bg-primary',
        score: 98,
        desc: 'High-velocity claim pattern detected matching known organized fraud signature. 12 linked entities across 3 regions.',
        featured: true,
        borderGlow: 'border-primary shadow-[0_0_15px_-3px_rgba(232,48,73,0.35)]',
    },
    {
        id: 'identity',
        icon: 'identity_platform',
        iconBg: 'bg-orange-500/20 text-orange-500',
        title: 'Identity Mismatch',
        detected: '15m ago',
        level: 'High',
        levelBg: 'bg-orange-500/20 text-orange-500',
        scoreColor: 'text-orange-500',
        barColor: 'bg-orange-500',
        score: 84,
        desc: 'SSN provided for Claim #48291 appears on dark web breach list. Multiple address variations.',
    },
    {
        id: 'displacement',
        icon: 'payments',
        iconBg: 'bg-orange-500/20 text-orange-500',
        title: 'Rapid Displacement',
        detected: '42m ago',
        level: 'High',
        levelBg: 'bg-orange-500/20 text-orange-500',
        scoreColor: 'text-orange-500',
        barColor: 'bg-orange-500',
        score: 76,
        desc: 'Unusual frequency of payouts to new vendor account within 24 hours of creation.',
    },
    {
        id: 'network',
        icon: 'hub',
        iconBg: 'bg-amber-500/20 text-amber-500',
        title: 'Network Anomaly',
        detected: '1h ago',
        level: 'Medium',
        levelBg: 'bg-amber-500/20 text-amber-500',
        scoreColor: 'text-amber-500',
        barColor: 'bg-amber-500',
        score: 62,
        desc: 'Provider 882 connected to 4 distinct claimants sharing same IP address cluster.',
    },
    {
        id: 'billing',
        icon: 'medical_services',
        iconBg: 'bg-amber-500/20 text-amber-500',
        title: 'Billing Inflated',
        detected: '2h ago',
        level: 'Medium',
        levelBg: 'bg-amber-500/20 text-amber-500',
        scoreColor: 'text-amber-500',
        barColor: 'bg-amber-500',
        score: 58,
        desc: 'Dr. Stevens submitted 15 codes for single visit. Outlier compared to regional average.',
    },
    {
        id: 'device',
        icon: 'device_unknown',
        iconBg: 'bg-blue-500/20 text-blue-400',
        title: 'New Device',
        detected: '3h ago',
        level: 'Low',
        levelBg: 'bg-blue-500/20 text-blue-400',
        scoreColor: 'text-blue-400',
        barColor: 'bg-blue-500',
        score: 35,
        desc: 'Login detected from unverified device in new region (Slovakia).',
    },
]

/* ─── Sub-components ─────────────────────────────────────────────── */
function StatCard({ label, value, badge, badgeIcon, badgeColor, borderColor, iconBg, icon }) {
    return (
        <div className={`bg-surface-dark rounded-xl p-6 border border-border-dark border-l-4 ${borderColor} relative overflow-hidden group`}>
            {/* Ghost icon */}
            <div className={`absolute right-3 top-3 opacity-10 group-hover:opacity-20 transition-opacity ${iconBg}`}>
                <span className="material-symbols-outlined text-6xl">{icon}</span>
            </div>
            <p className="text-slate-400 text-sm font-medium mb-1">{label}</p>
            <div className="flex items-end gap-3">
                <span className="text-4xl font-bold text-white tracking-tight">{value}</span>
                <span className={`text-xs font-medium px-2 py-0.5 rounded flex items-center gap-0.5 mb-1 ${badgeColor}`}>
                    <span className="material-symbols-outlined text-[14px]">{badgeIcon}</span>
                    {badge}
                </span>
            </div>
        </div>
    )
}

function AlertCard({ alert }) {
    const { featured, borderGlow, iconBg, icon, title, detected, level, levelBg, scoreColor, barColor, score, desc } = alert
    return (
        <div className={`bg-surface-dark rounded-xl overflow-hidden border flex flex-col transition-colors ${featured
            ? borderGlow
            : 'border-border-dark hover:border-slate-500'
            }`}>
            <div className="p-6 flex flex-col flex-1">
                {/* Card header */}
                <div className="flex justify-between items-start mb-4">
                    <div className="flex items-center gap-3">
                        <div className={`size-10 rounded-lg flex items-center justify-center ${iconBg}`}>
                            <span className="material-symbols-outlined text-[22px]">{icon}</span>
                        </div>
                        <div>
                            <h3 className="font-bold text-base text-white leading-tight">{title}</h3>
                            <p className="text-xs text-slate-500 mt-0.5">Detected: {detected}</p>
                        </div>
                    </div>
                    <span className={`text-[10px] font-bold px-2 py-1 rounded uppercase tracking-wider ${levelBg}`}>
                        {level}
                    </span>
                </div>

                {/* Score */}
                <div className="mb-5 space-y-2">
                    <div className="flex justify-between items-center text-sm">
                        <span className="text-slate-400">Confidence Score</span>
                        <span className={`font-bold ${scoreColor}`}>{score}%</span>
                    </div>
                    <div className="w-full bg-border-dark rounded-full h-1.5 overflow-hidden">
                        <div className={`h-1.5 rounded-full ${barColor}`} style={{ width: `${score}%` }} />
                    </div>
                    <p className="text-sm text-slate-300 leading-relaxed pt-1">{desc}</p>
                </div>

                {/* Actions */}
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

    const filtered = search
        ? ALERTS.filter(a => a.title.toLowerCase().includes(search.toLowerCase()))
        : ALERTS

    return (
        <div className="flex h-screen bg-background-dark overflow-hidden">
            <Sidebar />
            <div className="flex flex-col flex-1 overflow-hidden">
                <TopHeader title="Threat Intelligence Feed" />

                <main className="flex-1 overflow-y-auto p-6 space-y-8">
                    {/* ── Stat Cards ─────────────────────────── */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                        {STATS.map(s => <StatCard key={s.label} {...s} />)}
                    </div>

                    {/* ── Critical Alerts Stream ─────────────── */}
                    <div>
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                            <h2 className="text-xl font-bold text-white flex items-center gap-2">
                                <span className="size-2 rounded-full bg-primary animate-pulse inline-block"></span>
                                Critical Alerts Stream
                            </h2>
                            <div className="flex items-center gap-3">
                                {/* Inline search */}
                                <div className="relative">
                                    <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-[18px]">search</span>
                                    <input
                                        type="text"
                                        value={search}
                                        onChange={e => setSearch(e.target.value)}
                                        placeholder="Search signals..."
                                        className="pl-9 pr-4 py-2 rounded-lg bg-[#38292b] border border-border-dark text-white text-sm placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary transition-all w-52"
                                    />
                                </div>
                                <button className="flex items-center gap-2 px-3 py-2 rounded-lg bg-surface-dark border border-border-dark text-sm font-medium text-white hover:border-primary/50 transition-colors">
                                    <span className="material-symbols-outlined text-[18px]">filter_list</span>
                                    Filter
                                </button>
                                <button className="flex items-center gap-2 px-3 py-2 rounded-lg bg-surface-dark border border-border-dark text-sm font-medium text-white hover:border-primary/50 transition-colors">
                                    <span className="material-symbols-outlined text-[18px]">sort</span>
                                    Sort by Confidence
                                </button>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-5">
                            {filtered.map(alert => (
                                <AlertCard key={alert.id} alert={alert} />
                            ))}
                            {filtered.length === 0 && (
                                <p className="text-slate-500 col-span-3 py-8 text-center">No alerts match your search.</p>
                            )}
                        </div>
                    </div>

                    {/* ── Global Threat Map ──────────────────── */}
                    <div className="rounded-xl overflow-hidden border border-border-dark relative h-56 bg-surface-dark">
                        {/* Background image */}
                        <div
                            className="absolute inset-0 bg-cover bg-center opacity-20"
                            style={{ backgroundImage: `url('https://lh3.googleusercontent.com/aida-public/AB6AXuAnILEsOqbnF1ZYggcCcwSVqOdkFQoaWhfHn4Exq9n8QtW8UNqeV6QIyCBuonPqOo4xjFd3p9PEJlUPDi3aZKsDVamJi9gxHzPOyIYmDMqF0SuC7JmHyP28Fj1XIRmz43YzHWjqeaDT3zOu_xwueCOGEMS4_ZoYvygbhCrH2rzuQSFKcqnVdpT8nadVv-Kq9f5lheMQHpF8ffZhTjMuS_RzTNl78uxE4M09yDRV1aR3cK0k2ySPWzTJ3gBIU1AHvMmKWSD62sdRXCca')` }}
                        />
                        {/* Red tint overlay */}
                        <div className="absolute inset-0 bg-gradient-to-tr from-primary/10 to-transparent pointer-events-none" />
                        {/* Bottom gradient */}
                        <div className="absolute inset-0 bg-gradient-to-t from-surface-dark via-surface-dark/40 to-transparent pointer-events-none" />
                        {/* Content */}
                        <div className="relative z-10 p-6 h-full flex flex-col justify-end">
                            <div className="flex items-center justify-between">
                                <div>
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className="relative flex h-2 w-2">
                                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                                            <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
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
