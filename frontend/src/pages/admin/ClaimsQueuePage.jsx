import { useState, useCallback } from 'react'
import Sidebar from '../../components/admin/Sidebar'
import TopHeader from '../../components/admin/TopHeader'
import { useFetch } from '../../hooks/useFetch'
import { api } from '../../lib/api'

/* ─── Helpers ───────────────────────────────────────────── */
function getRiskBand(score) {
    if (score >= 70) return 'High'
    if (score >= 40) return 'Medium'
    return 'Low'
}

function getRingColor(score) {
    if (score >= 80) return '#e83049'
    if (score >= 60) return '#f97316'
    if (score >= 40) return '#f59e0b'
    return '#22c55e'
}

function getStatusStyle(status, finalDecision) {
    const combined = finalDecision || status
    if (['approved', 'auto_approve'].includes(combined))
        return { statusClass: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20', dotClass: 'bg-emerald-500', label: 'Approved' }
    if (['denied', 'auto_reject'].includes(combined))
        return { statusClass: 'bg-primary/10 text-primary border-primary/20', dotClass: 'bg-primary', label: 'Rejected' }
    if (['fraud_investigation', 'under_review'].includes(combined))
        return { statusClass: 'bg-purple-500/10 text-purple-500 border-purple-500/20', dotClass: 'bg-purple-500', label: 'Escalated' }
    if (['manual_review'].includes(combined))
        return { statusClass: 'bg-amber-500/10 text-amber-500 border-amber-500/20', dotClass: 'bg-amber-500', label: 'Review' }
    return { statusClass: 'bg-slate-500/10 text-slate-400 border-slate-500/20', dotClass: 'bg-slate-400', label: status }
}

/* ─── Ring Score Component ───────────────────────────────── */
function RingScore({ score, color }) {
    const dash = (score / 100) * 100
    return (
        <div className="relative w-10 h-10 flex items-center justify-center">
            <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
                <path fill="none" stroke="#2a2d35" strokeWidth="3"
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                <path fill="none" stroke={color} strokeWidth="3"
                    strokeDasharray={`${dash}, 100`}
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                    className={score >= 80 ? 'drop-shadow-[0_0_2px_rgba(232,48,73,0.8)]' : ''} />
            </svg>
            <span className="absolute text-[10px] font-bold text-white">
                {String(Math.round(score)).padStart(2, '0')}
            </span>
        </div>
    )
}

const FILTER_TABS = ['All Claims', 'High Risk', 'Medium Risk', 'Low Risk']
const FILTER_ICONS = ['view_list', 'warning', 'error', 'check_circle']
const FILTER_BANDS = [null, 'High', 'Medium', 'Low']

/* ─── Fallback data shown when backend is unreachable ─────────────── */
const FALLBACK_CLAIMS = [
    {
        id: 'fb-1', claim_number: 'CLM-9803', holder_name: 'Sarah Jenkins', type: 'Auto (Collision)',
        amount: '$12,450.00', risk_score: 0.92, status: 'under_review', final_decision: null,
        date: 'Feb 20, 2025', policy_number: '#9921-A-Secure', member_since: 'Aug 2019',
        previous_claims: '2 (Low Value)', assigned_to: 'Senior Adjudicator',
        flags: [
            { icon: 'location_off', color: 'text-primary', title: 'Location Anomaly', critical: true, desc: 'Claim incident reported in Chicago, IL but metadata from uploaded images contains GPS coordinates from Miami, FL (1,300 miles discrepancy).' },
            { icon: 'data_object', color: 'text-amber-400', title: 'Mismatched Metadata', critical: true, desc: 'EXIF data creation date predates the policy active period by 4 days.' },
            { icon: 'trending_up', color: 'text-primary', title: 'Frequency Spike', critical: false, desc: 'Unusual claim submission velocity within family plan group.' },
        ],
    },
    {
        id: 'fb-2', claim_number: 'CLM-9741', holder_name: 'Marcus Thompson', type: 'Medical',
        amount: '$450.00', risk_score: 0.14, status: 'approved', final_decision: 'auto_approve',
        date: 'Feb 18, 2025', policy_number: '#5532-M-Prime', member_since: 'Mar 2022',
        previous_claims: '0', assigned_to: null, flags: [],
    },
    {
        id: 'fb-3', claim_number: 'CLM-9688', holder_name: 'David Chen', type: 'Property',
        amount: '$8,200.00', risk_score: 0.78, status: 'fraud_investigation', final_decision: 'fraud_investigation',
        date: 'Feb 17, 2025', policy_number: '#7743-P-Gold', member_since: 'Jan 2020',
        previous_claims: '3 (Mixed)', assigned_to: 'Fraud Investigation Unit',
        flags: [
            { icon: 'receipt_long', color: 'text-amber-400', title: 'Duplicate Receipts', critical: true, desc: 'Two submitted receipts share identical serial numbers from different vendors.' },
        ],
    },
    {
        id: 'fb-4', claim_number: 'CLM-9612', holder_name: 'Emily Ross', type: 'Property',
        amount: '$15,000.00', risk_score: 0.88, status: 'fraud_investigation', final_decision: 'fraud_investigation',
        date: 'Feb 15, 2025', policy_number: '#3301-P-Elite', member_since: 'Jun 2018',
        previous_claims: '5 (High Value)', assigned_to: 'Senior Adjudicator',
        flags: [
            { icon: 'person_alert', color: 'text-primary', title: 'Identity Mismatch', critical: true, desc: 'Claimant name does not match policy holder record in linked government database.' },
            { icon: 'network_node', color: 'text-amber-400', title: 'Network Cluster', critical: true, desc: 'Claimant shares address history with 3 other flagged claimants from CLM-9431.' },
        ],
    },
    {
        id: 'fb-5', claim_number: 'CLM-9598', holder_name: 'Marcus Johnson', type: 'Auto',
        amount: '$2,100.00', risk_score: 0.05, status: 'approved', final_decision: 'approved',
        date: 'Feb 14, 2025', policy_number: '#8821-A-Basic', member_since: 'Nov 2021',
        previous_claims: '1 (Low Value)', assigned_to: null, flags: [],
    },
    {
        id: 'fb-6', claim_number: 'CLM-9541', holder_name: 'Anita Patel', type: 'Medical',
        amount: '$780.00', risk_score: 0.88, status: 'denied', final_decision: 'auto_reject',
        date: 'Feb 12, 2025', policy_number: '#2290-M-Silver', member_since: 'Feb 2020',
        previous_claims: '4 (Denied ×2)', assigned_to: 'Auto-Rejection Engine',
        flags: [
            { icon: 'calendar_month', color: 'text-primary', title: 'Expired Coverage', critical: true, desc: 'Treatment date falls 12 days outside active coverage period. Policy lapsed on Jan 31, 2025.' },
        ],
    },
    {
        id: 'fb-7', claim_number: 'CLM-9490', holder_name: 'James Horowitz', type: 'Property',
        amount: '$14,800.00', risk_score: 0.95, status: 'fraud_investigation', final_decision: 'fraud_investigation',
        date: 'Feb 09, 2025', policy_number: '#1177-P-Supreme', member_since: 'Apr 2017',
        previous_claims: '6 (Escalated ×3)', assigned_to: 'Senior Adjudicator',
        flags: [
            { icon: 'groups', color: 'text-primary', title: 'Syndicate Pattern', critical: true, desc: 'Claim matches known organized fraud ring pattern #992. Linked to 4 other open investigations.' },
            { icon: 'location_off', color: 'text-amber-400', title: 'Location Anomaly', critical: true, desc: 'Reported incident location has no matching emergency services record.' },
        ],
    },
]



/* ─── Page ───────────────────────────────────────────────── */
export default function ClaimsQueuePage() {
    const [selected, setSelected] = useState(null)
    const [activeTab, setActiveTab] = useState(0)
    const [actionLoading, setActionLoading] = useState(false)
    const [actionError, setActionError] = useState(null)

    // Live fetch — refresh every 15s
    const { data, loading, error, refetch } = useFetch('/api/claims?page_size=50', 15_000)
    const liveClaims = data?.items || []
    // Use fallback data when backend is unreachable and we have no live data
    const isFallback = !!error && liveClaims.length === 0
    const claims = isFallback ? FALLBACK_CLAIMS : liveClaims

    // Filter by risk band
    const riskBand = FILTER_BANDS[activeTab]
    const filtered = riskBand
        ? claims.filter(c => getRiskBand(c.risk_score ?? 0) === riskBand)
        : claims

    // Tab counts from live data
    const tabCounts = {
        'High Risk': claims.filter(c => getRiskBand(c.risk_score ?? 0) === 'High').length,
        'Medium Risk': claims.filter(c => getRiskBand(c.risk_score ?? 0) === 'Medium').length,
        'Low Risk': claims.filter(c => getRiskBand(c.risk_score ?? 0) === 'Low').length,
    }

    const handleAction = useCallback(async (claimId, action) => {
        setActionLoading(true)
        setActionError(null)
        try {
            await api.post(`/api/claims/${claimId}/actions`, { action })
            await refetch()
            setSelected(null)
        } catch (err) {
            setActionError(err.message)
        } finally {
            setActionLoading(false)
        }
    }, [refetch])

    // Shape the selected claim into drawer-friendly format
    const drawerClaim = selected ? (() => {
        const s = getStatusStyle(selected.status, selected.final_decision)
        const score = selected.risk_score ?? 0
        return {
            ...selected,
            riskNum: Math.round(score * 100) / 100,
            ringColor: getRingColor(score),
            statusLabel: s.label,
            statusClass: s.statusClass,
            dotClass: s.dotClass,
            confidence: Math.round(score * 100) / 10,
        }
    })() : null

    return (
        <div className="flex h-screen bg-background-dark overflow-hidden">
            <Sidebar />
            <div className="flex flex-col flex-1 overflow-hidden">
                <TopHeader title="Claims Queue" />

                <div className="flex flex-1 overflow-hidden relative">

                    {/* ── LEFT: Table panel ─────────────────────── */}
                    <div className="flex-1 flex flex-col overflow-hidden">
                        <div className="p-6 pb-3 space-y-4">
                            {/* Header */}
                            <div className="flex flex-wrap justify-between items-end gap-4">
                                <div>
                                    <h1 className="text-white text-2xl font-bold tracking-tight">Claims Process Queue</h1>
                                    <p className="text-slate-400 text-sm mt-0.5">
                                        Real-time adjudication and fraud detection stream.{' '}
                                        {tabCounts['High Risk'] > 0 && (
                                            <span className="text-primary font-medium">{tabCounts['High Risk']} High Risk</span>
                                        )}
                                        {tabCounts['High Risk'] > 0 && ' items pending.'}
                                    </p>
                                </div>
                                <div className="flex gap-2">
                                    <button className="flex items-center gap-2 px-3 py-2 bg-surface-dark border border-border-dark rounded-lg text-white hover:bg-border-dark transition-colors text-sm">
                                        <span className="material-symbols-outlined text-[18px]">filter_list</span>
                                        Filters
                                    </button>
                                    <button className="flex items-center gap-2 px-3 py-2 bg-primary hover:bg-primary-dark text-white rounded-lg transition-colors text-sm font-medium shadow-[0_0_15px_rgba(232,48,73,0.3)]">
                                        <span className="material-symbols-outlined text-[18px]">download</span>
                                        Export Data
                                    </button>
                                </div>
                            </div>

                            {/* Filter pills */}
                            <div className="flex items-center gap-2 overflow-x-auto pb-1">
                                {FILTER_TABS.map((tab, i) => {
                                    const count = i === 0 ? claims.length : tabCounts[tab]
                                    return (
                                        <button
                                            key={tab}
                                            onClick={() => setActiveTab(i)}
                                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm whitespace-nowrap transition-colors border ${activeTab === i
                                                ? 'bg-primary/20 border-primary/50 text-primary font-medium'
                                                : 'bg-surface-dark border-border-dark text-slate-300 hover:bg-border-dark'
                                                }`}
                                        >
                                            <span className="material-symbols-outlined text-[16px]">{FILTER_ICONS[i]}</span>
                                            {tab}{count !== undefined && count > 0 ? ` (${count})` : ''}
                                        </button>
                                    )
                                })}
                            </div>
                        </div>

                        {/* Error banner */}
                        {error && (
                            <div className="mx-6 mb-2 rounded-lg border border-primary/30 bg-primary/10 px-4 py-2 text-sm text-primary flex items-center gap-2">
                                <span className="material-symbols-outlined text-[18px]">wifi_off</span>
                                Backend unreachable: {error}
                                {isFallback && <span className="ml-auto text-primary/70 text-xs">Showing cached reference data</span>}
                            </div>
                        )}

                        {/* Table */}
                        <div className="flex-1 overflow-y-auto px-6 pb-6">
                            <div className="rounded-xl border border-border-dark bg-surface-dark overflow-hidden shadow-2xl shadow-black/50">
                                <table className="w-full text-left border-collapse">
                                    <thead>
                                        <tr className="bg-border-dark/40 border-b border-border-dark text-slate-400 text-xs uppercase tracking-wider">
                                            <th className="p-4 font-medium w-20">Risk</th>
                                            <th className="p-4 font-medium">Claim ID</th>
                                            <th className="p-4 font-medium">Claimant</th>
                                            <th className="p-4 font-medium">Type</th>
                                            <th className="p-4 font-medium text-right">Amount</th>
                                            <th className="p-4 font-medium">Status</th>
                                            <th className="p-4 font-medium text-right">Date</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-border-dark text-sm">
                                        {loading && claims.length === 0
                                            ? [0, 1, 2, 3, 4].map(i => (
                                                <tr key={i} className="animate-pulse border-b border-border-dark">
                                                    {[0, 1, 2, 3, 4, 5, 6].map(j => (
                                                        <td key={j} className="p-4">
                                                            <div className="h-3 bg-white/10 rounded w-16" />
                                                        </td>
                                                    ))}
                                                </tr>
                                            ))
                                            : filtered.length === 0
                                                ? (
                                                    <tr>
                                                        <td colSpan={7} className="p-8 text-center text-slate-500 text-sm">
                                                            No claims found for this filter.
                                                        </td>
                                                    </tr>
                                                )
                                                : filtered.map((c) => {
                                                    const score = c.risk_score ?? 0
                                                    const ring = getRingColor(score)
                                                    const s = getStatusStyle(c.status, c.final_decision)
                                                    const isSelected = selected?.id === c.id
                                                    return (
                                                        <tr
                                                            key={c.id}
                                                            onClick={() => setSelected(c)}
                                                            className={`group transition-colors cursor-pointer border-l-4 ${isSelected
                                                                ? 'bg-primary/10 border-l-primary hover:bg-primary/15'
                                                                : 'border-l-transparent hover:bg-border-dark/30'
                                                                }`}
                                                        >
                                                            <td className="p-4">
                                                                <RingScore score={Math.round(score * 100)} color={ring} />
                                                            </td>
                                                            <td className="p-4 font-mono text-white font-medium">
                                                                #{c.claim_number}
                                                            </td>
                                                            <td className="p-4">
                                                                <div className="flex items-center gap-3">
                                                                    <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center text-xs text-white font-bold">
                                                                        {(c.holder_name || 'U').charAt(0)}
                                                                    </div>
                                                                    <span className={`font-medium ${isSelected ? 'text-white' : 'text-slate-300'}`}>
                                                                        {c.holder_name}
                                                                    </span>
                                                                </div>
                                                            </td>
                                                            <td className="p-4 text-slate-400 capitalize">{c.type}</td>
                                                            <td className="p-4 text-right font-mono text-slate-200">{c.amount}</td>
                                                            <td className="p-4">
                                                                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium border ${s.statusClass}`}>
                                                                    <span className={`w-1.5 h-1.5 rounded-full ${s.dotClass}`} />
                                                                    {s.label}
                                                                </span>
                                                            </td>
                                                            <td className="p-4 text-right text-slate-500">{c.date}</td>
                                                        </tr>
                                                    )
                                                })
                                        }
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>

                    {/* ── RIGHT: Detail Drawer ───────────────────── */}
                    {selected && drawerClaim && (
                        <aside className="w-[400px] xl:w-[440px] shrink-0 border-l border-border-dark bg-surface-dark flex flex-col overflow-hidden relative shadow-[-10px_0_30px_rgba(0,0,0,0.4)]">
                            {/* Drawer header */}
                            <div className="flex items-center justify-between p-5 border-b border-border-dark bg-border-dark/20">
                                <div>
                                    <div className="flex items-center gap-3 mb-1">
                                        <h2 className="text-xl font-bold text-white font-mono">#{selected.claim_number}</h2>
                                        <span className={`px-2 py-0.5 text-xs font-medium rounded border ${drawerClaim.statusClass}`}>
                                            {drawerClaim.statusLabel}
                                        </span>
                                    </div>
                                    <p className="text-slate-400 text-sm mt-1">
                                        Assigned to <span className="text-white font-medium">{selected.assigned_to || 'Unassigned'}</span>
                                    </p>
                                </div>
                                <button
                                    onClick={() => setSelected(null)}
                                    className="text-slate-400 hover:text-white transition-colors p-2 rounded-lg hover:bg-white/5"
                                >
                                    <span className="material-symbols-outlined">close</span>
                                </button>
                            </div>

                            {/* Scrollable content */}
                            <div className="flex-1 overflow-y-auto p-5 space-y-6 pb-36">

                                {/* Fraud score hero */}
                                <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-primary/10 to-background-dark border border-primary/20 p-5">
                                    <div className="absolute -top-8 -right-8 w-32 h-32 bg-primary/20 blur-[50px] rounded-full pointer-events-none" />
                                    <div className="flex items-start justify-between relative z-10">
                                        <div>
                                            <h3 className="text-primary font-bold text-base flex items-center gap-2">
                                                <span className="material-symbols-outlined text-[20px]">warning</span>
                                                {drawerClaim.confidence > 50 ? 'High Risk Detected' : 'Risk Analysis'}
                                            </h3>
                                            <p className="text-slate-400 text-xs mt-1 max-w-[200px] leading-relaxed">
                                                AI fraud confidence score based on multi-layer analysis.
                                            </p>
                                        </div>
                                        <div className="text-right">
                                            <div className="text-3xl font-bold text-white tracking-tighter drop-shadow-[0_0_10px_rgba(232,48,73,0.5)]">
                                                {drawerClaim.confidence.toFixed(1)}%
                                            </div>
                                            <div className="text-primary text-[10px] font-medium uppercase tracking-widest mt-0.5">
                                                Confidence Score
                                            </div>
                                        </div>
                                    </div>
                                    <div className="mt-4 h-2 w-full bg-black/40 rounded-full overflow-hidden flex">
                                        <div className="h-full bg-emerald-500 opacity-30" style={{ width: '10%' }} />
                                        <div className="h-full bg-amber-500 opacity-30" style={{ width: '20%' }} />
                                        <div className="h-full bg-primary shadow-[0_0_8px_currentColor]" style={{ width: `${Math.min(drawerClaim.confidence, 70)}%` }} />
                                    </div>
                                    <div className="flex justify-between mt-1.5 text-[10px] text-slate-500 font-mono">
                                        <span>Low Risk</span>
                                        <span>High Probability</span>
                                    </div>
                                </div>

                                {/* Claimant & Policy */}
                                <div>
                                    <h4 className="text-slate-400 text-xs font-bold uppercase tracking-widest border-b border-border-dark pb-2 mb-4">
                                        Claimant & Policy
                                    </h4>
                                    <div className="flex items-center gap-4 mb-5">
                                        <div className="w-12 h-12 rounded-lg bg-slate-700 overflow-hidden shrink-0 border border-border-dark flex items-center justify-center text-xl text-white font-bold font-mono">
                                            {(selected.holder_name || 'U').charAt(0)}
                                        </div>
                                        <div>
                                            <div className="text-slate-500 text-[10px] uppercase tracking-wide">Full Name</div>
                                            <div className="text-white text-base font-bold">{selected.holder_name || '—'}</div>
                                        </div>
                                        <div className="ml-auto text-right">
                                            <div className="text-slate-500 text-[10px] uppercase tracking-wide">Policy Number</div>
                                            <div className="text-white text-sm font-mono">{selected.policy_number || '—'}</div>
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-x-6 gap-y-4">
                                        {[
                                            { label: 'Member Since', value: selected.member_since || '—' },
                                            { label: 'Previous Claims', value: selected.previous_claims || '—' },
                                        ].map(({ label, value }) => (
                                            <div key={label}>
                                                <div className="text-slate-500 text-[10px] uppercase tracking-wide">{label}</div>
                                                <div className="text-white text-sm font-medium mt-0.5">{value}</div>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* AI Flags */}
                                <div>
                                    <h4 className="text-slate-400 text-xs font-bold uppercase tracking-widest border-b border-border-dark pb-2 mb-3">
                                        AI Flag Analysis
                                    </h4>
                                    {(!selected.flags || selected.flags.length === 0) ? (
                                        <p className="text-slate-500 text-sm py-2">No anomalies detected for this claim.</p>
                                    ) : (
                                        <div className="space-y-2">
                                            {selected.flags.map((f, i) => (
                                                <div
                                                    key={i}
                                                    className={`flex gap-3 p-3 rounded-lg border ${f.critical
                                                        ? 'bg-background-dark border-primary/20'
                                                        : 'bg-background-dark border-white/10 opacity-70'
                                                        }`}
                                                >
                                                    <span className={`material-symbols-outlined text-[20px] mt-0.5 shrink-0 ${f.color || 'text-primary'}`}>
                                                        {f.icon || 'warning'}
                                                    </span>
                                                    <div>
                                                        <p className="text-white text-sm font-medium">{f.title}</p>
                                                        <p className="text-slate-400 text-xs mt-1 leading-relaxed">{f.description || f.desc}</p>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                {/* Claim Details */}
                                <div>
                                    <h4 className="text-slate-400 text-xs font-bold uppercase tracking-widest border-b border-border-dark pb-2 mb-3">
                                        Claim Details
                                    </h4>
                                    <div className="bg-background-dark rounded-lg p-4 border border-border-dark">
                                        <div className="flex justify-between items-center">
                                            <span className="text-white text-sm font-medium">Total Claimed</span>
                                            <span className="text-xl text-white font-bold font-mono">{selected.amount}</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Action error */}
                                {actionError && (
                                    <div className="rounded-lg border border-primary/30 bg-primary/10 px-3 py-2 text-xs text-primary">
                                        Action failed: {actionError}
                                    </div>
                                )}
                            </div>

                            {/* Sticky action footer */}
                            <div className="absolute bottom-0 left-0 w-full bg-surface-dark border-t border-border-dark p-4 z-20 shadow-[0_-5px_20px_rgba(0,0,0,0.4)]">
                                <div className="grid grid-cols-2 gap-3">
                                    <button
                                        disabled={actionLoading}
                                        onClick={() => handleAction(selected.id, 'escalate')}
                                        className="col-span-1 py-2.5 px-4 rounded-lg border border-white/20 text-white font-medium hover:bg-white/5 transition-colors flex items-center justify-center gap-2 text-sm disabled:opacity-50"
                                    >
                                        Escalate
                                        <span className="material-symbols-outlined text-[18px]">arrow_upward</span>
                                    </button>
                                    <div className="col-span-1 flex gap-2">
                                        <button
                                            disabled={actionLoading}
                                            onClick={() => handleAction(selected.id, 'approve')}
                                            className="flex-1 py-2.5 px-3 rounded-lg bg-emerald-500/10 border border-emerald-500/50 text-emerald-500 font-medium hover:bg-emerald-500/20 transition-colors flex items-center justify-center gap-1 text-sm disabled:opacity-50"
                                        >
                                            Approve
                                            <span className="material-symbols-outlined text-[16px]">check</span>
                                        </button>
                                        <button
                                            disabled={actionLoading}
                                            onClick={() => handleAction(selected.id, 'reject')}
                                            className="flex-1 py-2.5 px-3 rounded-lg bg-primary text-white font-bold hover:bg-primary-dark transition-colors shadow-lg shadow-primary/25 flex items-center justify-center gap-1 text-sm disabled:opacity-50"
                                        >
                                            Reject
                                            <span className="material-symbols-outlined text-[16px]">close</span>
                                        </button>
                                    </div>
                                </div>
                                {actionLoading && (
                                    <p className="text-center text-xs text-slate-500 mt-2">Processing action…</p>
                                )}
                            </div>
                        </aside>
                    )}
                </div>
            </div>
        </div>
    )
}
