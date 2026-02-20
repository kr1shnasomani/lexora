import { useState } from 'react'
import Sidebar from '../../components/admin/Sidebar'
import TopHeader from '../../components/admin/TopHeader'

/* ─── Data ─────────────────────────────────────────────────────────── */
const AUDIT_ROWS = [
    {
        id: '#CL-9933', ts: '10:42:18.005', decision: 'APPROVED',
        confidence: 97, risk: 'Low', time: '420ms',
        decisionColor: 'success', riskColor: 'success',
        execution: '420ms',
        layers: [
            { key: 'perception', icon: 'visibility', title: 'Perception Engine', sub: 'GPT-4o Vision', ms: '400ms', status: 'PASS', statusColor: 'success' },
            { key: 'policy', icon: 'gavel', title: 'Policy Governance', sub: 'Rule Engine v2.1', ms: '10ms', status: 'PASS', statusColor: 'success' },
            { key: 'fraud', icon: 'security', title: 'Fraud Intel', sub: 'Graph Neural Net', ms: '5ms', status: 'PASS', statusColor: 'success' },
            { key: 'decision', icon: 'psychology', title: 'Decision Engine', sub: 'Economic Opt.', ms: '3ms', status: 'PASS', statusColor: 'success', halted: false },
            { key: 'audit', icon: 'history_edu', title: 'Audit & Learning', sub: 'Immutable Log', ms: '2ms', status: 'LOGGED', statusColor: 'blue' },
        ],
    },
    {
        id: '#CL-9932', ts: '10:42:15.220', decision: 'APPROVED',
        confidence: 99, risk: 'Low', time: '410ms',
        decisionColor: 'success', riskColor: 'success',
        execution: '410ms',
        layers: [
            { key: 'perception', icon: 'visibility', title: 'Perception Engine', sub: 'GPT-4o Vision', ms: '390ms', status: 'PASS', statusColor: 'success' },
            { key: 'policy', icon: 'gavel', title: 'Policy Governance', sub: 'Rule Engine v2.1', ms: '8ms', status: 'PASS', statusColor: 'success' },
            { key: 'fraud', icon: 'security', title: 'Fraud Intel', sub: 'Graph Neural Net', ms: '7ms', status: 'PASS', statusColor: 'success' },
            { key: 'decision', icon: 'psychology', title: 'Decision Engine', sub: 'Economic Opt.', ms: '3ms', status: 'PASS', statusColor: 'success' },
            { key: 'audit', icon: 'history_edu', title: 'Audit & Learning', sub: 'Immutable Log', ms: '2ms', status: 'LOGGED', statusColor: 'blue' },
        ],
    },
    {
        id: '#CL-9931', ts: '10:42:12.100', decision: 'FLAGGED',
        confidence: 65, risk: 'Med', time: '890ms',
        decisionColor: 'warning', riskColor: 'warning',
        execution: '890ms',
        layers: [
            { key: 'perception', icon: 'visibility', title: 'Perception Engine', sub: 'GPT-4o Vision', ms: '350ms', status: 'PASS', statusColor: 'success', content: null },
            { key: 'policy', icon: 'gavel', title: 'Policy Governance', sub: 'Rule Engine v2.1', ms: '12ms', status: 'PASS', statusColor: 'success' },
            { key: 'fraud', icon: 'security', title: 'Fraud Intel', sub: 'Graph Neural Net', ms: '500ms', status: 'WARN', statusColor: 'warn' },
            { key: 'decision', icon: 'psychology', title: 'Decision Engine', sub: 'Economic Opt.', ms: '20ms', status: 'HALT', statusColor: 'muted', halted: true },
            { key: 'audit', icon: 'history_edu', title: 'Audit & Learning', sub: 'Immutable Log', ms: '8ms', status: 'LOGGED', statusColor: 'blue' },
        ],
    },
    {
        id: '#CL-9930', ts: '10:42:08.450', decision: 'APPROVED',
        confidence: 96, risk: 'Low', time: '380ms',
        decisionColor: 'success', riskColor: 'success',
        execution: '380ms',
        layers: [
            { key: 'perception', icon: 'visibility', title: 'Perception Engine', sub: 'GPT-4o Vision', ms: '360ms', status: 'PASS', statusColor: 'success' },
            { key: 'policy', icon: 'gavel', title: 'Policy Governance', sub: 'Rule Engine v2.1', ms: '9ms', status: 'PASS', statusColor: 'success' },
            { key: 'fraud', icon: 'security', title: 'Fraud Intel', sub: 'Graph Neural Net', ms: '6ms', status: 'PASS', statusColor: 'success' },
            { key: 'decision', icon: 'psychology', title: 'Decision Engine', sub: 'Economic Opt.', ms: '3ms', status: 'PASS', statusColor: 'success' },
            { key: 'audit', icon: 'history_edu', title: 'Audit & Learning', sub: 'Immutable Log', ms: '2ms', status: 'LOGGED', statusColor: 'blue' },
        ],
    },
    {
        id: '#CL-9929', ts: '10:42:05.120', decision: 'FLAGGED',
        confidence: 42, risk: 'High', time: '1.2s',
        decisionColor: 'primary', riskColor: 'primary',
        execution: '1.2s',
        layers: [
            {
                key: 'perception', icon: 'visibility', title: 'Perception Engine', sub: 'GPT-4o Vision', ms: '450ms', status: 'WARN', statusColor: 'warn',
                content: {
                    thumb: 'https://lh3.googleusercontent.com/aida-public/AB6AXuA_4tL7JUhJrs7TGY_mdl2aX4PklKMIMk0lJeCmtCv7j7G217yQRbMPiWOKoxvt5qdM5IW0Awv0KRv6z5eAAPgBKNJ4XXw-fifsJREEDLixLszIlNHUAPnHj1tEVlo78WioH8ydEQIgnABLf0MsYcftkVb7HC0qlF3XbFFE82fN77XMwGqssgGUwDOAkMY3Pk0YqG4RTni9lUW8PKiXRU-WJbw0vV_Qw84AP2qxb09g70s2GGFWCjzj4j61jUXmU-bvabhW3a-vRElT',
                    analysis: 'Image quality degraded. OCR confidence fell below threshold (42%). Detected potential alteration in date field.',
                    model: 'v4.0.1',
                    tokens: '482',
                },
            },
            { key: 'policy', icon: 'gavel', title: 'Policy Governance', sub: 'Rule Engine v2.1', ms: '12ms', status: 'PASS', statusColor: 'success' },
            { key: 'fraud', icon: 'security', title: 'Fraud Intel', sub: 'Graph Neural Net', ms: '200ms', status: 'WARN', statusColor: 'warn' },
            { key: 'decision', icon: 'psychology', title: 'Decision Engine', sub: 'Economic Opt.', ms: '5ms', status: 'HALT', statusColor: 'muted', halted: true },
            { key: 'audit', icon: 'history_edu', title: 'Audit & Learning', sub: 'Immutable Log', ms: '10ms', status: 'LOGGED', statusColor: 'blue' },
        ],
    },
    {
        id: '#CL-9928', ts: '10:42:03.005', decision: 'APPROVED',
        confidence: 98, risk: 'Low', time: '450ms',
        decisionColor: 'success', riskColor: 'success',
        execution: '450ms',
        layers: [
            { key: 'perception', icon: 'visibility', title: 'Perception Engine', sub: 'GPT-4o Vision', ms: '430ms', status: 'PASS', statusColor: 'success' },
            { key: 'policy', icon: 'gavel', title: 'Policy Governance', sub: 'Rule Engine v2.1', ms: '8ms', status: 'PASS', statusColor: 'success' },
            { key: 'fraud', icon: 'security', title: 'Fraud Intel', sub: 'Graph Neural Net', ms: '5ms', status: 'PASS', statusColor: 'success' },
            { key: 'decision', icon: 'psychology', title: 'Decision Engine', sub: 'Economic Opt.', ms: '5ms', status: 'PASS', statusColor: 'success' },
            { key: 'audit', icon: 'history_edu', title: 'Audit & Learning', sub: 'Immutable Log', ms: '2ms', status: 'LOGGED', statusColor: 'blue' },
        ],
    },
]

/* ─── Helpers ─────────────────────────────────────────────────────── */
const DECISION_STYLES = {
    success: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    warning: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    primary: 'bg-primary/10 text-primary border-primary/20',
}
const BAR_COLORS = {
    success: 'bg-emerald-500',
    warning: 'bg-amber-400',
    primary: 'bg-primary',
}
const DOT_COLORS = {
    success: 'bg-emerald-500',
    warning: 'bg-amber-400',
    primary: 'bg-primary',
    muted: 'bg-slate-500',
}
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

function AccordionLayer({ layer, defaultOpen }) {
    const [open, setOpen] = useState(defaultOpen ?? false)
    const isHalted = layer.halted

    return (
        <div className={`rounded-lg border overflow-hidden ${LAYER_CARD_STYLE[layer.statusColor]}`}>
            <button
                onClick={() => !isHalted && setOpen(o => !o)}
                className={`w-full flex items-center justify-between p-4 text-left transition-colors ${isHalted
                        ? 'cursor-not-allowed'
                        : layer.statusColor === 'warn'
                            ? 'hover:bg-primary/10'
                            : 'hover:bg-[#38292b]/50'
                    }`}
            >
                <div className="flex items-center gap-3">
                    <div className={`size-8 rounded flex items-center justify-center border ${LAYER_ICON_BG[layer.statusColor]}`}>
                        <span className="material-symbols-outlined text-[18px]">{layer.icon}</span>
                    </div>
                    <div>
                        <h4 className={`text-sm font-bold uppercase tracking-wide ${isHalted ? 'text-slate-500' : 'text-white'}`}>
                            {layer.title}
                        </h4>
                        <span className={`text-xs font-mono ${layer.statusColor === 'warn' ? 'text-primary' : 'text-slate-500'}`}>
                            {layer.sub}
                        </span>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <span className="text-xs font-mono text-slate-500">{layer.ms}</span>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${STATUS_PILL[layer.statusColor]}`}>
                        {layer.status}
                    </span>
                    {!isHalted && (
                        <span className="material-symbols-outlined text-slate-500 text-[18px]">
                            {open ? 'expand_less' : 'expand_more'}
                        </span>
                    )}
                    {isHalted && <span className="material-symbols-outlined text-slate-500 text-[18px]">expand_more</span>}
                </div>
            </button>

            {open && layer.content && (
                <div className="px-4 pb-4 pt-0 border-t border-primary/10">
                    <div className="mt-3 flex gap-4">
                        <div
                            className="w-24 h-24 rounded border border-border-dark bg-cover bg-center shrink-0 relative group cursor-zoom-in"
                            style={{ backgroundImage: `url('${layer.content.thumb}')` }}
                        >
                            <div className="absolute inset-0 bg-black/40 group-hover:bg-black/20 transition-all flex items-center justify-center">
                                <span className="material-symbols-outlined text-white opacity-0 group-hover:opacity-100 transition-opacity">zoom_in</span>
                            </div>
                        </div>
                        <div className="flex-1 space-y-2">
                            <div className="bg-[#38292b]/50 rounded p-2 border border-border-dark">
                                <p className="text-xs text-slate-500 font-mono mb-1">ANALYSIS_OUTPUT</p>
                                <p className="text-sm text-white leading-relaxed">{layer.content.analysis}</p>
                            </div>
                            <div className="flex gap-2 flex-wrap">
                                <span className="text-[10px] bg-[#38292b] border border-border-dark px-1.5 py-0.5 rounded text-slate-500">
                                    Model: {layer.content.model}
                                </span>
                                <span className="text-[10px] bg-[#38292b] border border-border-dark px-1.5 py-0.5 rounded text-slate-500">
                                    Tokens: {layer.content.tokens}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {open && !layer.content && (
                <div className="px-4 pb-4 pt-0 border-t border-border-dark/50">
                    <p className="text-xs text-slate-500 mt-3">No additional output for this layer.</p>
                </div>
            )}
        </div>
    )
}

/* ─── Page ────────────────────────────────────────────────────────── */
export default function AuditLogPage() {
    const [selected, setSelected] = useState(AUDIT_ROWS[4]) // default #CL-9929
    const [search, setSearch] = useState('#CL-99')
    const [drawerOpen, setDrawerOpen] = useState(true)

    const filtered = AUDIT_ROWS.filter(r =>
        r.id.toLowerCase().includes(search.toLowerCase()) ||
        r.decision.toLowerCase().includes(search.toLowerCase())
    )

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
                                        View detailed traces for high-risk flags.
                                    </p>
                                </div>
                                <div className="flex gap-3">
                                    <div className="bg-surface-dark border border-border-dark rounded-lg p-3 flex flex-col items-center min-w-[90px]">
                                        <span className="text-[10px] text-slate-500 uppercase tracking-wider">Avg Latency</span>
                                        <span className="text-xl font-mono font-bold text-white">412<span className="text-sm text-slate-500">ms</span></span>
                                    </div>
                                    <div className="bg-surface-dark border border-border-dark rounded-lg p-3 flex flex-col items-center min-w-[90px]">
                                        <span className="text-[10px] text-slate-500 uppercase tracking-wider">Flag Rate</span>
                                        <span className="text-xl font-mono font-bold text-primary">12.4<span className="text-sm text-slate-500">%</span></span>
                                    </div>
                                </div>
                            </div>

                            {/* Toolbar */}
                            <div className="flex flex-wrap gap-3 items-center">
                                <div className="relative flex-1 min-w-[200px] max-w-md group">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500 group-focus-within:text-white transition-colors">
                                        <span className="material-symbols-outlined text-[20px]">search</span>
                                    </div>
                                    <input
                                        type="text"
                                        value={search}
                                        onChange={e => setSearch(e.target.value)}
                                        placeholder="Search Claim ID, Decision..."
                                        className="block w-full pl-10 pr-3 py-2 border border-border-dark rounded-lg bg-[#38292b] text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary text-sm transition-all"
                                    />
                                </div>
                                <button className="flex items-center gap-2 px-3 py-2 bg-[#38292b] hover:bg-surface-dark border border-border-dark rounded-lg text-sm font-medium text-white transition-colors">
                                    <span className="material-symbols-outlined text-[18px]">calendar_today</span>
                                    <span>Last 24h</span>
                                </button>
                                <button className="flex items-center gap-2 px-3 py-2 bg-[#38292b] hover:bg-surface-dark border border-border-dark rounded-lg text-sm font-medium text-white transition-colors">
                                    <span className="material-symbols-outlined text-[18px]">filter_list</span>
                                    <span>Filters</span>
                                    <div className="bg-primary text-white text-[10px] font-bold px-1.5 rounded-full">2</div>
                                </button>
                                <div className="ml-auto flex items-center gap-1">
                                    <button className="p-2 text-slate-500 hover:text-white transition-colors rounded-lg hover:bg-white/5">
                                        <span className="material-symbols-outlined text-[20px]">refresh</span>
                                    </button>
                                    <button className="p-2 text-slate-500 hover:text-white transition-colors rounded-lg hover:bg-white/5">
                                        <span className="material-symbols-outlined text-[20px]">download</span>
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Table */}
                        <div className="flex-1 overflow-auto bg-surface-dark relative">
                            <table className="w-full text-left border-collapse">
                                <thead className="sticky top-0 bg-[#38292b] z-10">
                                    <tr>
                                        {['Claim ID', 'Timestamp', 'Decision', 'Confidence Score', 'Risk Level', 'Time'].map((h, i) => (
                                            <th key={h} className={`px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider border-b border-border-dark ${i === 5 ? 'text-right' : ''}`}>
                                                {h}
                                            </th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-border-dark">
                                    {filtered.map(row => {
                                        const isSelected = selected?.id === row.id
                                        const isPrimary = row.decisionColor === 'primary'
                                        return (
                                            <tr
                                                key={row.id}
                                                onClick={() => { setSelected(row); setDrawerOpen(true) }}
                                                className={`cursor-pointer transition-colors border-l-2 ${isSelected
                                                        ? 'bg-[#38292b]/30 border-l-primary'
                                                        : 'border-l-transparent hover:bg-[#38292b]/50 hover:border-l-primary/40'
                                                    }`}
                                            >
                                                <td className={`px-6 py-4 whitespace-nowrap text-sm font-mono ${isSelected ? 'text-white font-bold' : 'text-white'}`}>
                                                    {row.id}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-slate-500">{row.ts}</td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded text-xs font-medium border ${DECISION_STYLES[row.decisionColor]} ${isPrimary && isSelected ? 'animate-pulse' : ''}`}>
                                                        {row.decision}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <div className="flex items-center gap-3">
                                                        <div className="flex-1 h-1.5 bg-[#38292b] rounded-full overflow-hidden min-w-[80px]">
                                                            <div
                                                                className={`h-full rounded-full ${BAR_COLORS[row.decisionColor]}`}
                                                                style={{ width: `${row.confidence}%` }}
                                                            />
                                                        </div>
                                                        <span className={`text-sm font-mono w-9 ${isPrimary ? 'text-primary font-bold' : 'text-white'}`}>
                                                            {row.confidence}%
                                                        </span>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <span className={`text-sm flex items-center gap-1.5 ${isPrimary ? 'text-white font-medium' : 'text-slate-400'}`}>
                                                        <span className={`w-2 h-2 rounded-full ${DOT_COLORS[row.riskColor]}`}></span>
                                                        {row.risk}
                                                    </span>
                                                </td>
                                                <td className={`px-6 py-4 whitespace-nowrap text-sm font-mono text-right ${isPrimary && isSelected ? 'text-white font-medium' : 'text-slate-500'}`}>
                                                    {row.time}
                                                </td>
                                            </tr>
                                        )
                                    })}
                                </tbody>
                            </table>
                        </div>

                        {/* Pagination */}
                        <div className="p-4 border-t border-border-dark flex items-center justify-between bg-[#38292b]/30">
                            <span className="text-xs text-slate-500">Showing 1–{filtered.length} of 2,842 decisions</span>
                            <div className="flex gap-1">
                                <button className="px-2 py-1 rounded bg-[#38292b] hover:bg-surface-dark text-slate-500 hover:text-white border border-border-dark transition-colors">
                                    <span className="material-symbols-outlined text-[16px]">chevron_left</span>
                                </button>
                                <button className="px-2 py-1 rounded bg-[#38292b] hover:bg-surface-dark text-slate-500 hover:text-white border border-border-dark transition-colors">
                                    <span className="material-symbols-outlined text-[16px]">chevron_right</span>
                                </button>
                            </div>
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
                                    <div className="flex gap-1">
                                        <button className="text-slate-500 hover:text-white p-1.5 rounded hover:bg-white/10 transition-colors">
                                            <span className="material-symbols-outlined text-[20px]">open_in_new</span>
                                        </button>
                                        <button
                                            onClick={() => setDrawerOpen(false)}
                                            className="text-slate-500 hover:text-white p-1.5 rounded hover:bg-white/10 transition-colors"
                                        >
                                            <span className="material-symbols-outlined text-[20px]">close</span>
                                        </button>
                                    </div>
                                </div>
                                <div className="flex items-end justify-between">
                                    <div>
                                        <div className="text-[10px] text-slate-500 uppercase tracking-wider mb-1">Selected Claim</div>
                                        <div className="text-2xl text-white font-mono font-bold tracking-tight">{selected.id}</div>
                                    </div>
                                    <div className="text-right">
                                        <div className="text-[10px] text-slate-500 uppercase tracking-wider mb-1">Total Execution</div>
                                        <div className="text-xl text-white font-mono font-bold tracking-tight">{selected.execution}</div>
                                    </div>
                                </div>
                            </div>

                            {/* Accordion layers */}
                            <div className="flex-1 overflow-y-auto p-4 space-y-3">
                                {selected.layers.map((layer, i) => (
                                    <AccordionLayer
                                        key={layer.key}
                                        layer={layer}
                                        defaultOpen={layer.statusColor === 'warn' && i === 0}
                                    />
                                ))}
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
                                <p className="text-center text-[10px] text-slate-500 mt-3">Action logged by Audit-Bot-992</p>
                            </div>

                            {/* Diamond connector */}
                            <div className="absolute top-[370px] -left-[18px] hidden md:flex items-center justify-center pointer-events-none">
                                <div className="w-4 h-4 bg-primary rotate-45 border-2 border-surface-dark z-20"></div>
                                <div className="absolute left-2 w-4 h-px bg-primary z-10"></div>
                            </div>
                        </aside>
                    )}
                </div>
            </div>
        </div>
    )
}
