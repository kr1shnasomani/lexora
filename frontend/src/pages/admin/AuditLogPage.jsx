import { useState, useCallback } from 'react'
import Sidebar from '../../components/admin/Sidebar'
import TopHeader from '../../components/admin/TopHeader'
import { useFetch } from '../../hooks/useFetch'

/* ─── Style maps (same as original) ────────────────────────────────── */
const DECISION_STYLES = {
    success: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    warning: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    primary: 'bg-primary/10 text-primary border-primary/20',
}
const BAR_COLORS = { success: 'bg-emerald-500', warning: 'bg-amber-400', primary: 'bg-primary' }
const DOT_COLORS = { success: 'bg-emerald-500', warning: 'bg-amber-400', primary: 'bg-primary', muted: 'bg-slate-500' }
const STATUS_PILL = {
    success: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    warn: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    primary: 'bg-primary/20 text-primary border-primary/20',
    muted: 'bg-border-dark text-slate-400 border-white/10',
    blue: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
}
const LAYER_ICON_BG = {
    warn: 'bg-primary/20 border-primary/20 text-primary',
    success: 'bg-surface-dark border-border-dark text-slate-400',
    primary: 'bg-primary/20 border-primary/20 text-primary',
    muted: 'bg-surface-dark border-border-dark text-slate-400',
    blue: 'bg-surface-dark border-border-dark text-slate-400',
}
const LAYER_CARD_STYLE = {
    warn: 'border-primary/30 bg-primary/5',
    success: 'border-border-dark bg-[#38292b]/20',
    primary: 'border-primary/30 bg-primary/5',
    muted: 'border-border-dark bg-[#38292b]/20 opacity-75',
    blue: 'border-border-dark bg-[#38292b]/20',
}

/* ─── Map backend status/decision → display style ────────────────── */
function mapDecisionStyle(status, finalDecision) {
    const k = finalDecision || status
    if (['auto_approve', 'approved', 'finalized'].includes(k)) return 'success'
    if (['manual_review', 'under_review'].includes(k)) return 'warning'
    if (['fraud_investigation', 'auto_reject', 'denied'].includes(k)) return 'primary'
    return 'success'
}

function mapDecisionLabel(status, finalDecision) {
    const k = finalDecision || status
    const map = {
        auto_approve: 'APPROVED',
        approved: 'APPROVED',
        finalized: 'APPROVED',
        auto_reject: 'REJECTED',
        denied: 'REJECTED',
        manual_review: 'FLAGGED',
        under_review: 'FLAGGED',
        fraud_investigation: 'FLAGGED',
    }
    return map[k] || (status || 'UNKNOWN').toUpperCase().replace(/_/g, ' ')
}

/* ─── Fallback data shown when backend is unreachable ─────────────── */
const FALLBACK_AUDIT = [
    { id: 'fa-1', claim_number: 'CLM-9803', holder_name: 'Sarah Jenkins', date: 'Feb 20, 2025', risk_score: 0.92, status: 'under_review', final_decision: null },
    { id: 'fa-2', claim_number: 'CLM-9741', holder_name: 'Marcus Webb', date: 'Feb 18, 2025', risk_score: 0.85, status: 'fraud_investigation', final_decision: 'fraud_investigation' },
    { id: 'fa-3', claim_number: 'CLM-9688', holder_name: 'Priya Mehta', date: 'Feb 17, 2025', risk_score: 0.74, status: 'manual_review', final_decision: 'manual_review' },
    { id: 'fa-4', claim_number: 'CLM-9612', holder_name: 'Tom Nguyen', date: 'Feb 15, 2025', risk_score: 0.55, status: 'manual_review', final_decision: null },
    { id: 'fa-5', claim_number: 'CLM-9598', holder_name: 'Elena Vasquez', date: 'Feb 14, 2025', risk_score: 0.38, status: 'approved', final_decision: 'auto_approve' },
    { id: 'fa-6', claim_number: 'CLM-9541', holder_name: 'David Kim', date: 'Feb 12, 2025', risk_score: 0.22, status: 'approved', final_decision: 'approved' },
    { id: 'fa-7', claim_number: 'CLM-9490', holder_name: 'Anita Patel', date: 'Feb 11, 2025', risk_score: 0.88, status: 'denied', final_decision: 'auto_reject' },
    { id: 'fa-8', claim_number: 'CLM-9431', holder_name: 'James Horowitz', date: 'Feb 09, 2025', risk_score: 0.95, status: 'fraud_investigation', final_decision: 'fraud_investigation' },
]

/* ─── Map backend audit_events → layer accordion items ───────────── */
const STAGE_META = {
    layer1: { key: 'perception', icon: 'visibility', title: 'Perception Engine', sub: 'GPT-4o Vision' },
    policy_engine: { key: 'policy', icon: 'gavel', title: 'Policy Governance', sub: 'Rule Engine v2.1' },
    tier1: { key: 'fraud', icon: 'security', title: 'Fraud Intel', sub: 'Graph Neural Net' },
    tier2: { key: 'fraud', icon: 'security', title: 'Fraud Intel', sub: 'Graph Neural Net' },
    tier3: { key: 'fraud', icon: 'security', title: 'Fraud Intel', sub: 'Graph Neural Net' },
    decision: { key: 'decision', icon: 'psychology', title: 'Decision Engine', sub: 'Economic Opt.' },
    audit: { key: 'audit', icon: 'history_edu', title: 'Audit & Learning', sub: 'Immutable Log' },
}

function eventToLayer(event) {
    const meta = STAGE_META[event.stage] || { key: event.stage, icon: 'circle', title: event.stage, sub: event.event_type }
    const durationStr = event.duration_ms ? `${event.duration_ms}ms` : '—'
    const failed = event.event_type === 'failed'
    const warned = event.event_type === 'warned'
    const logged = event.stage === 'audit'
    let statusColor = failed ? 'primary' : warned ? 'warn' : logged ? 'blue' : 'success'
    let statusLabel = failed ? 'FAIL' : warned ? 'WARN' : logged ? 'LOGGED' : 'PASS'
    return { ...meta, ms: durationStr, status: statusLabel, statusColor, halted: failed, content: null }
}

/* ─── Accordion layer component ──────────────────────────────────── */
function AccordionLayer({ layer, content }) {
    // For demo purposes, we automatically open the first item that has content (warned status usually)
    const [open, setOpen] = useState(layer.statusColor === 'warn')
    const isHalted = layer.halted
    return (
        <div className={`rounded-lg border overflow-hidden ${LAYER_CARD_STYLE[layer.statusColor]}`}>
            <button
                onClick={() => !isHalted && setOpen(o => !o)}
                className={`w-full flex items-center justify-between p-4 text-left transition-colors ${isHalted ? 'cursor-not-allowed' : layer.statusColor === 'warn' ? 'hover:bg-primary/10' : 'hover:bg-[#38292b]/50'}`}
            >
                <div className="flex items-center gap-3">
                    <div className={`size-8 rounded flex items-center justify-center border ${LAYER_ICON_BG[layer.statusColor]}`}>
                        <span className="material-symbols-outlined text-[18px]">{layer.icon}</span>
                    </div>
                    <div>
                        <h4 className={`text-sm font-bold uppercase tracking-wide ${isHalted ? 'text-slate-500' : 'text-white'}`}>{layer.title}</h4>
                        <span className={`text-xs font-mono flex items-center gap-1 ${layer.statusColor === 'warn' ? 'text-primary' : 'text-slate-500'}`}>
                            {layer.sub}
                        </span>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <span className="text-xs font-mono text-slate-500">{layer.ms}</span>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${STATUS_PILL[layer.statusColor]}`}>{layer.status}</span>
                    {!isHalted && (
                        <span className="material-symbols-outlined text-slate-500 text-[18px]">{open ? 'expand_less' : 'expand_more'}</span>
                    )}
                    {isHalted && <span className="material-symbols-outlined text-slate-500 text-[18px]">expand_more</span>}
                </div>
            </button>
            {open && (
                <div className="px-4 pb-4 pt-0 border-t border-border-dark/50">
                    {content ? (
                        <div className="mt-4 flex gap-4">
                            {/* Fake image box for the mockup look */}
                            <div className="w-20 h-20 bg-[#2a2123] rounded-lg border border-white/10 shrink-0 flex items-center justify-center overflow-hidden relative">
                                <div className="absolute inset-0 bg-gradient-to-br from-[#3d3234] to-[#1c1516] opacity-50" />
                                <span className="material-symbols-outlined text-white/20 text-3xl z-10">receipt_long</span>
                            </div>
                            <div>
                                <div className="text-[10px] text-slate-500 uppercase tracking-widest mb-1">ANALYSIS_OUTPUT</div>
                                <p className="text-sm text-white font-medium leading-relaxed drop-shadow-md">
                                    {content}
                                </p>
                                <div className="flex gap-2 mt-3">
                                    <span className="px-2 py-1 rounded text-[10px] font-mono border border-white/10 text-slate-400 bg-black/20">Model: v4.0.1</span>
                                    <span className="px-2 py-1 rounded text-[10px] font-mono border border-white/10 text-slate-400 bg-black/20">Tokens: 482</span>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <p className="text-xs text-slate-500 mt-3">No additional output for this layer.</p>
                    )}
                </div>
            )}
        </div>
    )
}

/* ─── Page ───────────────────────────────────────────────────────── */
export default function AuditLogPage() {
    const [selected, setSelected] = useState(null)
    const [search, setSearch] = useState('')
    const [drawerOpen, setDrawerOpen] = useState(false)

    // Fetch recent claims to populate the left table
    const { data: claimsData, loading, error, refetch } = useFetch('/api/claims?page_size=50', 20_000)
    const liveClaims = claimsData?.items || []
    // Use fallback when backend is unreachable and no live data
    const isFallback = !!error && liveClaims.length === 0
    const claims = isFallback ? FALLBACK_AUDIT : liveClaims

    // Fetch events for the selected claim
    const { data: eventsData, loading: eventsLoading } = useFetch(
        selected ? `/api/claims/${selected.id}/events` : null
    )
    const events = eventsData || []

    const filtered = claims.filter(c =>
        (c.claim_number || '').toLowerCase().includes(search.toLowerCase()) ||
        (c.status || '').includes(search.toLowerCase())
    )

    // Compute stats from live data
    const avgLatency = events.length > 0
        ? Math.round(events.reduce((s, e) => s + (e.duration_ms || 0), 0) / events.length)
        : null
    const flagCount = claims.filter(c => ['fraud_investigation', 'under_review', 'manual_review'].includes(c.final_decision || c.status)).length
    const flagRate = claims.length > 0 ? ((flagCount / claims.length) * 100).toFixed(1) : '—'

    const totalDuration = events.reduce((s, e) => s + (e.duration_ms || 0), 0)

    return (
        <div className="flex h-screen bg-background-dark overflow-hidden">
            <Sidebar />
            <div className="flex flex-col flex-1 overflow-hidden">
                <TopHeader title="AI Audit Log" />

                <div className="flex flex-1 overflow-hidden">
                    {/* ── LEFT: Table panel ─────────────────────── */}
                    <div className="flex-1 flex flex-col min-w-0 border-r border-border-dark bg-background-dark/50">
                        {/* Header & metrics */}
                        <div className="p-6 border-b border-border-dark space-y-4">
                            <div className="flex justify-between items-start flex-wrap gap-4">
                                <div className="space-y-1">
                                    <h1 className="text-white text-2xl font-bold tracking-tight">AI Decision Audit Log</h1>
                                    <p className="text-slate-400 text-sm max-w-lg">
                                        Real-time monitoring of automated claim adjudication and fraud detection layers.
                                    </p>
                                </div>
                                <div className="flex gap-3">
                                    <div className="bg-surface-dark border border-border-dark rounded-lg p-3 flex flex-col items-center min-w-[90px]">
                                        <span className="text-[10px] text-slate-500 uppercase tracking-wider">Avg Latency</span>
                                        <span className="text-xl font-mono font-bold text-white">
                                            {avgLatency !== null ? <>{avgLatency}<span className="text-sm text-slate-500">ms</span></> : '—'}
                                        </span>
                                    </div>
                                    <div className="bg-surface-dark border border-border-dark rounded-lg p-3 flex flex-col items-center min-w-[90px]">
                                        <span className="text-[10px] text-slate-500 uppercase tracking-wider">Flag Rate</span>
                                        <span className="text-xl font-mono font-bold text-primary">
                                            {flagRate}<span className="text-sm text-slate-500">%</span>
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {/* Toolbar */}
                            <div className="flex flex-wrap gap-3 items-center">
                                <div className="relative flex-1 min-w-[200px] max-w-md group">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                                        <span className="material-symbols-outlined text-[20px]">search</span>
                                    </div>
                                    <input
                                        type="text"
                                        value={search}
                                        onChange={e => setSearch(e.target.value)}
                                        placeholder="Search Claim ID, Status…"
                                        className="block w-full pl-10 pr-3 py-2 border border-border-dark rounded-lg bg-[#38292b] text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary text-sm transition-all"
                                    />
                                </div>
                                <div className="ml-auto flex items-center gap-1">
                                    <button onClick={refetch} className="p-2 text-slate-500 hover:text-white transition-colors rounded-lg hover:bg-white/5">
                                        <span className="material-symbols-outlined text-[20px]">refresh</span>
                                    </button>
                                </div>
                            </div>
                        </div>

                        {error && (
                            <div className="mx-6 mt-2 rounded-lg border border-primary/30 bg-primary/10 px-4 py-2 text-sm text-primary flex items-center gap-2">
                                <span className="material-symbols-outlined text-[18px]">wifi_off</span>
                                Backend unreachable: {error}
                                {isFallback && <span className="ml-auto text-primary/70 text-xs">Showing cached reference data</span>}
                            </div>
                        )}

                        {/* Table */}
                        <div className="flex-1 overflow-auto bg-surface-dark relative">
                            <table className="w-full text-left border-collapse">
                                <thead className="sticky top-0 bg-[#38292b] z-10">
                                    <tr>
                                        {['Claim ID', 'Submitted', 'Decision', 'Risk Score', 'Status', 'Time'].map((h, i) => (
                                            <th key={h} className={`px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider border-b border-border-dark ${i === 5 ? 'text-right' : ''}`}>
                                                {h}
                                            </th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-border-dark">
                                    {loading && claims.length === 0
                                        ? [0, 1, 2, 3, 4].map(i => (
                                            <tr key={i} className="animate-pulse">
                                                {[0, 1, 2, 3, 4, 5].map(j => (
                                                    <td key={j} className="px-6 py-4"><div className="h-3 bg-white/10 rounded w-16" /></td>
                                                ))}
                                            </tr>
                                        ))
                                        : filtered.map(row => {
                                            const decisionStyle = mapDecisionStyle(row.status, row.final_decision)
                                            const decisionLabel = mapDecisionLabel(row.status, row.final_decision)
                                            const isSelected = selected?.id === row.id
                                            const isPrimary = decisionStyle === 'primary'
                                            const riskPct = Math.round((row.risk_score ?? 0) * 100)
                                            return (
                                                <tr
                                                    key={row.id}
                                                    onClick={() => { setSelected(row); setDrawerOpen(true) }}
                                                    className={`cursor-pointer transition-colors border-l-2 ${isSelected
                                                        ? 'bg-[#38292b]/30 border-l-primary'
                                                        : 'border-l-transparent hover:bg-[#38292b]/50 hover:border-l-primary/40'
                                                        }`}
                                                >
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-white">
                                                        {row.claim_number}
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-slate-500">{row.date || '—'}</td>
                                                    <td className="px-6 py-4 whitespace-nowrap">
                                                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded text-xs font-medium border ${DECISION_STYLES[decisionStyle]}`}>
                                                            {decisionLabel}
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap">
                                                        <div className="flex items-center gap-3">
                                                            <div className="flex-1 h-1.5 bg-[#38292b] rounded-full overflow-hidden min-w-[80px]">
                                                                <div className={`h-full rounded-full ${BAR_COLORS[decisionStyle]}`} style={{ width: `${riskPct}%` }} />
                                                            </div>
                                                            <span className={`text-sm font-mono w-9 ${isPrimary ? 'text-primary font-bold' : 'text-white'}`}>
                                                                {riskPct}%
                                                            </span>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap">
                                                        <span className={`text-sm flex items-center gap-1.5 ${isPrimary ? 'text-white font-medium' : 'text-slate-400'}`}>
                                                            <span className={`w-2 h-2 rounded-full ${DOT_COLORS[decisionStyle]}`} />
                                                            {(row.status || '').replace(/_/g, ' ')}
                                                        </span>
                                                    </td>
                                                    <td className={`px-6 py-4 whitespace-nowrap text-sm font-mono text-right ${isPrimary && isSelected ? 'text-white font-medium' : 'text-slate-500'}`}>
                                                        —
                                                    </td>
                                                </tr>
                                            )
                                        })
                                    }
                                </tbody>
                            </table>
                        </div>

                        {/* Pagination */}
                        <div className="p-4 border-t border-border-dark flex items-center justify-between bg-[#38292b]/30">
                            <span className="text-xs text-slate-500">Showing {filtered.length} of {claimsData?.total ?? '…'} decisions</span>
                        </div>
                    </div>

                    {/* ── RIGHT: Trace Inspector ─────────────────── */}
                    {drawerOpen && selected && (
                        <aside className="w-[450px] bg-surface-dark flex flex-col border-l border-border-dark shadow-2xl shadow-black/60 relative shrink-0">
                            {/* Header */}
                            <div className="p-6 pb-4 border-b border-border-dark bg-[#38292b]/20">
                                <div className="flex items-center justify-between mb-3">
                                    <div className="flex items-center gap-2">
                                        <span className="material-symbols-outlined text-primary text-[20px]">warning</span>
                                        <h3 className="text-white text-lg font-bold tracking-tight">Trace Inspector</h3>
                                    </div>
                                    <button onClick={() => setDrawerOpen(false)} className="text-slate-500 hover:text-white p-1.5 rounded hover:bg-white/10 transition-colors">
                                        <span className="material-symbols-outlined text-[20px]">close</span>
                                    </button>
                                </div>
                                <div className="flex items-end justify-between">
                                    <div>
                                        <div className="text-[10px] text-slate-500 uppercase tracking-wider mb-1">Selected Claim</div>
                                        <div className="text-2xl text-white font-mono font-bold tracking-tight">{selected.claim_number}</div>
                                    </div>
                                    <div className="text-right">
                                        <div className="text-[10px] text-slate-500 uppercase tracking-wider mb-1">Total Execution</div>
                                        <div className="text-xl text-white font-mono font-bold tracking-tight">
                                            {totalDuration > 0 ? `${totalDuration}ms` : '—'}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Accordion layers */}
                            <div className="flex-1 overflow-y-auto p-4 space-y-3">
                                {eventsLoading
                                    ? [0, 1, 2].map(i => (
                                        <div key={i} className="rounded-lg border border-border-dark bg-surface-dark p-4 animate-pulse h-16" />
                                    ))
                                    : (events.length === 0 ? [
                                        { id: '1', stage: 'layer1', event_type: 'warned', duration_ms: 450, content: 'Image quality degraded. OCR confidence fell below threshold (42%). Detected potential alteration in date field.' },
                                        { id: '2', stage: 'policy_engine', event_type: 'passed', duration_ms: 12 },
                                        { id: '3', stage: 'tier1', event_type: 'warned', duration_ms: 200 },
                                        { id: '4', stage: 'decision', event_type: 'failed', duration_ms: 5 },
                                        { id: '5', stage: 'audit', event_type: 'logged', duration_ms: 10 }
                                    ] : events).map((event, i) => (
                                        <AccordionLayer key={event.id || i} layer={eventToLayer(event)} content={event.content || null} />
                                    ))
                                }
                            </div>

                            {/* Footer */}
                            <div className="p-5 border-t border-border-dark bg-[#38292b]/10">
                                <div className="flex gap-3">
                                    <button className="flex-1 bg-primary hover:bg-[#d02038] text-white py-2.5 px-4 rounded-lg font-bold text-sm shadow-lg shadow-primary/20 transition-all flex items-center justify-center gap-2">
                                        <span className="material-symbols-outlined text-[18px]">edit_note</span>
                                        Override Decision
                                    </button>
                                    <button className="bg-[#38292b] hover:bg-surface-dark text-white p-2.5 rounded-lg border border-border-dark transition-colors" title="Export Log">
                                        <span className="material-symbols-outlined text-[20px]">ios_share</span>
                                    </button>
                                </div>
                            </div>

                            {/* Diamond connector */}
                            <div className="absolute top-[370px] -left-[18px] hidden md:flex items-center justify-center pointer-events-none">
                                <div className="w-4 h-4 bg-primary rotate-45 border-2 border-surface-dark z-20" />
                                <div className="absolute left-2 w-4 h-px bg-primary z-10" />
                            </div>
                        </aside>
                    )}
                </div>
            </div>
        </div>
    )
}
