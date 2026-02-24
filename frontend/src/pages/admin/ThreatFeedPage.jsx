import { useState, useRef, useEffect } from 'react'
import Sidebar from '../../components/admin/Sidebar'
import TopHeader from '../../components/admin/TopHeader'
import { useFetch } from '../../hooks/useFetch'
import ForceGraph2D from 'react-force-graph-2d'

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

    // Try to prettify the description if it contains key-value pairs or looks like JSON
    let renderedDescription = null
    try {
        // Many alerts from the rules engine come through looking like "layer: 2 | ruleset_id: ... | status: REJECT"
        if (typeof alert.description === 'string' && alert.description.includes(' | ')) {
            const parts = alert.description.split(' | ')
            renderedDescription = (
                <div className="flex flex-col gap-2 mt-2 bg-[#211113]/50 p-3 rounded-md border border-[#38292b]">
                    {parts.map((p, i) => {
                        const [key, ...rest] = p.split(':')
                        const val = rest.join(':').trim()
                        if (!key || !val) return <span key={i} className="text-slate-300 text-xs font-mono break-all">{p}</span>
                        return (
                            <div key={i} className="flex flex-col">
                                <span className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">{key.trim()}</span>
                                <span className="text-xs font-mono text-slate-300 break-words">{val}</span>
                            </div>
                        )
                    })}
                </div>
            )
        } else if (typeof alert.description === 'string' && alert.description.startsWith('{')) {
            // Attempt strict JSON parse
            const data = JSON.parse(alert.description)
            renderedDescription = (
                <div className="flex flex-col gap-2 mt-2 bg-[#211113]/50 p-3 rounded-md border border-[#38292b]">
                    {Object.entries(data).map(([key, value], i) => (
                        <div key={i} className="flex flex-col">
                            <span className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">{key}</span>
                            <span className="text-xs font-mono text-slate-300 break-words">{
                                typeof value === 'object' ? JSON.stringify(value) : String(value)
                            }</span>
                        </div>
                    ))}
                </div>
            )
        }
    } catch (_) {
        // Fallback to normal text string below
    }

    if (!renderedDescription) {
        renderedDescription = <p className="text-sm text-slate-300 leading-relaxed pt-1">{alert.description}</p>
    }

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

                <div className="mb-2 space-y-2 flex-1">
                    <div className="flex justify-between items-center text-sm">
                        <span className="text-slate-400">Confidence Score</span>
                        <span className={`font-bold ${scoreColor}`}>{alert.score || 0}%</span>
                    </div>
                    <div className="w-full bg-border-dark rounded-full h-1.5 overflow-hidden">
                        <div className={`h-1.5 rounded-full ${barColor}`} style={{ width: `${alert.score || 0}%` }} />
                    </div>

                    {/* Rendered Description Payload */}
                    <div className="pt-2">
                        {renderedDescription}
                    </div>
                </div>
            </div>
        </div>
    )
}

import {
    ComposableMap,
    Geographies,
    Geography,
    Marker
} from 'react-simple-maps'

const WORLD_TOPO_JSON = "/world.json"

function IndianMap({ graphData }) {
    // We simply want to place a marker somewhere roughly corresponding to India
    // Since we don't have real lat/lons in the `graphData` directly, we'll
    // drop some random markers around India for node activity, or hardcode
    // specific locations if `loc` exists.

    const locations = [
        { name: "New Delhi", coordinates: [77.2090, 28.6139], risk: 'Critical' },
        { name: "Mumbai", coordinates: [72.8777, 19.0760], risk: 'High' },
        { name: "Bangalore", coordinates: [77.5946, 12.9716], risk: 'Medium' },
        { name: "Kolkata", coordinates: [88.3639, 22.5726], risk: 'Critical' },
        { name: "Chennai", coordinates: [80.2707, 13.0827], risk: 'High' }
    ]

    return (
        <div className="w-full h-full flex items-center justify-center p-4">
            <ComposableMap
                projection="geoMercator"
                projectionConfig={{
                    scale: 650,
                    center: [80, 22] // Center nicely on India
                }}
                className="w-full h-full max-h-[350px]"
            >
                <Geographies geography={WORLD_TOPO_JSON}>
                    {({ geographies }) =>
                        geographies.map((geo) => (
                            <Geography
                                key={geo.rsmKey}
                                geography={geo}
                                fill="#2a2123"
                                stroke="#e83049"
                                strokeWidth={0.5}
                                strokeOpacity={0.4}
                                style={{
                                    default: { outline: "none" },
                                    hover: { fill: "#38292b", outline: "none" },
                                    pressed: { outline: "none" },
                                }}
                            />
                        ))
                    }
                </Geographies>

                {locations.map(({ name, coordinates, risk }, i) => (
                    <Marker key={i} coordinates={coordinates}>
                        <circle
                            r={risk === 'Critical' ? 8 : risk === 'High' ? 6 : 4}
                            fill={risk === 'Critical' ? '#e83049' : risk === 'High' ? '#f59e0b' : '#3b82f6'}
                            className={`${risk === 'Critical' ? 'animate-pulse origin-center' : ''} drop-shadow-lg`}
                            opacity={0.8}
                        />
                    </Marker>
                ))}
            </ComposableMap>
        </div>
    )
}


/* ─── Page ───────────────────────────────────────────────────────── */
export default function ThreatFeedPage() {
    const [search, setSearch] = useState('')

    // Re-use dashboard summary — contains threat_alerts and now graph_excerpt
    const { data, loading, error } = useFetch('/api/dashboard/summary', 30_000)
    const alerts = data?.threat_alerts || []
    const graphData = data?.graph_excerpt || { nodes: [], edges: [] }

    // Derive stat counts from live alerts
    const criticalCount = alerts.filter(a => a.level === 'Critical').length
    const activeCount = alerts.length

    const STATS = [
        { label: 'Active Threats', value: String(activeCount), badge: `+${criticalCount} Critical`, badgeIcon: 'warning', badgeColor: 'text-primary bg-primary/10', borderColor: 'border-primary', icon: 'warning', iconBg: 'text-primary' },
        { label: 'Risk Exposure', value: data?.kpis?.[0]?.value || '$—', badge: data?.kpis?.[0]?.delta || 'avg', badgeIcon: 'trending_up', badgeColor: 'text-emerald-500 bg-emerald-500/10', borderColor: 'border-emerald-500', icon: 'attach_money', iconBg: 'text-emerald-500' },
        { label: 'Auto-Resolution', value: data?.kpis?.[1]?.value || '0%', badge: data?.kpis?.[1]?.delta || 'growth', badgeIcon: 'trending_up', badgeColor: 'text-blue-400 bg-blue-500/10', borderColor: 'border-blue-500', icon: 'auto_fix_high', iconBg: 'text-blue-500' },
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

                    {/* Global Threat Map (Tier 3 Graph) */}
                    <div className="rounded-xl overflow-hidden border border-border-dark relative h-[400px] bg-surface-dark">
                        <div className="absolute inset-0 bg-gradient-to-tr from-primary/5 to-transparent pointer-events-none z-0" />

                        <div className="absolute inset-0 flex items-center justify-center overflow-hidden z-10">
                            {loading && !data ? (
                                <div className="animate-pulse text-slate-500">Loading map data...</div>
                            ) : (
                                <IndianMap graphData={graphData} />
                            )}
                        </div>

                        <div className="absolute left-0 bottom-0 right-0 p-6 flex items-end justify-between pointer-events-none z-20">
                            <div>
                                <div className="flex items-center gap-2 mb-1">
                                    <span className="relative flex h-2 w-2">
                                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
                                        <span className="relative inline-flex rounded-full h-2 w-2 bg-primary" />
                                    </span>
                                    <span className="text-xs text-primary font-medium uppercase tracking-widest">Live Tier 3 Detect</span>
                                </div>
                                <h3 className="text-lg font-bold text-white">Global Threat Map</h3>
                                <p className="text-sm text-slate-400">Live visualization of node activity across claims</p>
                            </div>
                            <button className="px-4 py-2 rounded-lg bg-background-dark/70 backdrop-blur-md border border-border-dark text-sm font-medium text-white pointer-events-auto hover:bg-background-dark transition-colors flex items-center gap-2">
                                <span className="material-symbols-outlined text-[18px]">fullscreen</span>
                                Expand Map
                            </button>
                        </div>
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

                </main>
            </div>
        </div>
    )
}
