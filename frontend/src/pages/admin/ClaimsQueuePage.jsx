import { useState, useCallback } from 'react'
import Sidebar from '../../components/admin/Sidebar'
import TopHeader from '../../components/admin/TopHeader'
import { useFetch } from '../../hooks/useFetch'
import { api } from '../../lib/api'
import { useAuth } from '../../contexts/AuthContext'

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
    if (['fraud_investigation', 'under_review', 'manual_review'].includes(combined))
        return { statusClass: 'bg-amber-500/10 text-amber-500 border-amber-500/20', dotClass: 'bg-amber-500', label: 'Action Required' }
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

const FILTER_TABS = ['All Active', 'High Risk', 'Medium Risk', 'Low Risk']
const FILTER_ICONS = ['view_list', 'warning', 'error', 'check_circle']
const FILTER_BANDS = [null, 'High', 'Medium', 'Low']

/* ─── Fetch & Download Helpers ───────────────────────────── */
async function downloadDocument(claimId, docId) {
    try {
        const res = await api.get(`/api/claims/${claimId}/documents/${docId}/download`);
        if (res.url) {
            window.open(res.url, '_blank');
        } else {
            throw new Error("No URL returned from backend");
        }
    } catch (err) {
        console.error("Download failed:", err);
        alert('Failed to access document: ' + err.message);
    }
}

/* ─── Detail Modal Component ─────────────────────────────── */
function ClaimDetailModal({ claimId, onClose, onRefresh }) {
    const { user } = useAuth()
    const { data: detailData, loading: detailLoading, error: detailError } = useFetch(`/api/claims/${claimId}`)

    const [confirmAction, setConfirmAction] = useState(null) // 'approve' | 'reject' | null
    const [actionLoading, setActionLoading] = useState(false)
    const [rationale, setRationale] = useState('')
    const [actionError, setActionError] = useState(null)

    const handleFinalize = async () => {
        if (!confirmAction) return;
        setActionLoading(true);
        setActionError(null);
        try {
            await api.post(`/api/claims/${claimId}/manual-review`, {
                reviewer_id: user?.id || 'system',
                decision: confirmAction === 'approve' ? 'auto_approve' : 'auto_reject',
                rationale: rationale || `Manually ${confirmAction === 'approve' ? 'approved' : 'rejected'} via UI`,
                feedback_category: 'manual_override',
                feedback_notes: rationale,
            })
            onRefresh()
        } catch (err) {
            setActionError(err.message)
            setActionLoading(false)
        }
    }

    if (detailLoading && !detailData) return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-primary"></div>
        </div>
    )

    if (detailError) return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-6">
            <div className="bg-surface-dark border border-border-dark p-6 rounded-xl text-center max-w-lg">
                <span className="material-symbols-outlined text-4xl text-primary mb-4">error</span>
                <h2 className="text-xl text-white font-bold mb-2">Error Loading Details</h2>
                <p className="text-slate-400 text-sm mb-6">{detailError}</p>
                <button onClick={onClose} className="px-4 py-2 bg-white/10 text-white rounded-lg hover:bg-white/20">Close</button>
            </div>
        </div>
    )

    const claim = detailData?.claim || {}
    const auditTrail = detailData?.audit_trail || []
    const documents = detailData?.documents || []

    const score = claim.fraud_score ?? 0
    const ring = getRingColor(score)
    const s = getStatusStyle(claim.status, claim.final_decision)
    const confidence = Math.round(score * 100) / 10

    // Extract flags
    const flags = []
    let rawFraud = null
    try { rawFraud = typeof claim.fraud_analysis === 'string' ? JSON.parse(claim.fraud_analysis) : claim.fraud_analysis } catch (e) { }

    if (rawFraud?.reasons && Array.isArray(rawFraud.reasons)) {
        rawFraud.reasons.forEach(r => flags.push({ icon: 'warning', color: 'text-primary', title: 'AI Flag', text: r, critical: true }))
    }

    let rawWarn = null
    try { rawWarn = typeof claim.extraction_warnings === 'string' ? JSON.parse(claim.extraction_warnings) : claim.extraction_warnings } catch (e) { }

    if (rawWarn && Array.isArray(rawWarn)) {
        rawWarn.forEach(w => flags.push({ icon: 'data_object', color: 'text-amber-400', title: 'Data Warning', text: w, critical: false }))
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background-dark/90 backdrop-blur-md p-4 md:p-8 animate-in fade-in duration-200">
            <div className="bg-surface-dark border border-border-dark shadow-[0_20px_60px_rgba(0,0,0,0.8)] rounded-2xl w-full max-w-6xl max-h-full flex flex-col overflow-hidden relative">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-border-dark bg-black/20 shrink-0">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center text-primary border border-primary/30 shadow-[0_0_15px_rgba(232,48,73,0.2)]">
                            <span className="material-symbols-outlined text-[24px]">assignment_ind</span>
                        </div>
                        <div>
                            <div className="flex items-center gap-3">
                                <h2 className="text-2xl font-bold text-white font-mono tracking-tight">#{claim.claim_number || claimId.substring(0, 8)}</h2>
                                <span className={`px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest rounded border ${s.statusClass}`}>
                                    {s.label}
                                </span>
                            </div>
                            <p className="text-slate-400 text-sm mt-0.5">Comprehensive Claim Context</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors p-2 rounded-lg hover:bg-white/10 shrink-0 border border-transparent hover:border-white/10">
                        <span className="material-symbols-outlined">close</span>
                    </button>
                </div>

                {/* Body (Scrollable Split) */}
                <div className="flex-1 overflow-y-auto min-h-0 bg-background-dark/50">
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 p-6">

                        {/* LEFT COL: Core Details */}
                        <div className="lg:col-span-2 space-y-6">

                            {/* Profile / High Level */}
                            <div className="bg-surface-dark border border-border-dark rounded-xl p-5 shadow-lg">
                                <h3 className="text-white font-bold border-b border-border-dark pb-3 mb-4 flex items-center gap-2">
                                    <span className="material-symbols-outlined text-primary text-[18px]">person</span>
                                    Claimant Profile
                                </h3>
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                                    <div>
                                        <p className="text-slate-500 text-[10px] uppercase font-bold tracking-wider mb-1">Full Name</p>
                                        <p className="text-white font-medium">{claim.claimant_name || 'N/A'}</p>
                                    </div>
                                    <div>
                                        <p className="text-slate-500 text-[10px] uppercase font-bold tracking-wider mb-1">Phone</p>
                                        <p className="text-slate-300 font-mono text-sm">{claim.claimant_phone || 'N/A'}</p>
                                    </div>
                                    <div>
                                        <p className="text-slate-500 text-[10px] uppercase font-bold tracking-wider mb-1">Incident Date</p>
                                        <p className="text-white font-medium">{claim.incident_date || 'N/A'}</p>
                                    </div>
                                    <div>
                                        <p className="text-slate-500 text-[10px] uppercase font-bold tracking-wider mb-1">Claimed Amount</p>
                                        <p className="text-emerald-400 font-mono font-bold text-lg leading-none">
                                            {claim.claimed_amount ? new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(claim.claimed_amount) : '₹0.00'}
                                        </p>
                                    </div>
                                </div>
                                <div className="mt-5 pt-5 border-t border-border-dark">
                                    <p className="text-slate-500 text-[10px] uppercase font-bold tracking-wider mb-2">Incident Description</p>
                                    <p className="text-slate-300 text-sm leading-relaxed bg-black/20 p-4 rounded-lg border border-white/5 shadow-inner">
                                        {claim.incident_description || 'No description provided.'}
                                    </p>
                                </div>
                            </div>

                            {/* Documents Attached */}
                            <div className="bg-surface-dark border border-border-dark rounded-xl p-5 shadow-lg">
                                <h3 className="text-white font-bold border-b border-border-dark pb-3 mb-4 flex items-center gap-2">
                                    <span className="material-symbols-outlined text-primary text-[18px]">folder_open</span>
                                    Attached Evidence ({documents.length})
                                </h3>
                                {documents.length === 0 ? (
                                    <p className="text-slate-500 text-sm italic">No documents attached to this claim.</p>
                                ) : (
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        {documents.map((doc) => (
                                            <div key={doc.id} className="flex items-center gap-3 p-3 rounded-xl border border-white/5 bg-black/20 hover:bg-white/5 hover:border-white/10 transition-all group shadow-sm">
                                                <div className="w-12 h-12 rounded-lg bg-slate-800 flex items-center justify-center shrink-0 border border-white/5">
                                                    <span className="material-symbols-outlined text-slate-400">description</span>
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-white text-sm font-medium truncate">{doc.file_name}</p>
                                                    <p className="text-slate-500 text-xs mt-0.5 font-mono">{(doc.file_size / 1024).toFixed(1)} KB • {doc.content_type?.split('/')[1] || 'File'}</p>
                                                </div>
                                                <button
                                                    onClick={() => downloadDocument(claim.id, doc.id)}
                                                    className="p-2.5 rounded-lg bg-primary/10 text-primary hover:bg-primary hover:text-white transition-colors shrink-0 shadow-sm"
                                                    title="Download/View"
                                                >
                                                    <span className="material-symbols-outlined text-[18px]">download</span>
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                        </div>

                        {/* RIGHT COL: Analysis & Audit */}
                        <div className="space-y-6">

                            {/* AI Risk Analysis */}
                            <div className="bg-gradient-to-br from-primary/5 to-surface-dark border border-primary/30 rounded-xl p-5 relative overflow-hidden shadow-[0_0_30px_rgba(232,48,73,0.05)]">
                                <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 blur-[40px] rounded-full pointer-events-none" />

                                <h3 className="text-white font-bold border-b border-primary/20 pb-3 mb-4 flex items-center justify-between relative z-10">
                                    <span className="flex items-center gap-2">
                                        <span className="material-symbols-outlined text-primary text-[18px]">smart_toy</span>
                                        AI Risk Analysis
                                    </span>
                                    <span className="text-sm font-mono text-primary font-bold">{confidence.toFixed(1)}%</span>
                                </h3>

                                <div className="flex justify-center my-8 relative z-10">
                                    <div className="scale-150 transform origin-center drop-shadow-xl">
                                        <RingScore score={Math.round(score * 100)} color={ring} />
                                    </div>
                                </div>

                                <div className="space-y-3 relative z-10 max-h-48 overflow-y-auto pr-2 custom-scrollbar">
                                    {flags.length === 0 ? (
                                        <p className="text-slate-400 text-sm text-center">No anomalies detected natively.</p>
                                    ) : (
                                        flags.map((f, i) => (
                                            <div key={i} className={`flex items-start gap-3 text-sm p-3 rounded-lg border shadow-inner ${f.critical ? 'bg-primary/10 border-primary/30 text-primary-light' : 'bg-amber-500/10 border-amber-500/30 text-amber-200'}`}>
                                                <span className="material-symbols-outlined text-[18px] shrink-0 mt-0.5">{f.icon}</span>
                                                <span className="leading-relaxed font-medium">{f.text}</span>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>

                            {/* Audit Trail Timeline */}
                            <div className="bg-surface-dark border border-border-dark rounded-xl p-5 shadow-lg">
                                <h3 className="text-white font-bold border-b border-border-dark pb-3 mb-5 flex items-center gap-2">
                                    <span className="material-symbols-outlined text-primary text-[18px]">history</span>
                                    System Audit Trail
                                </h3>
                                <div className="space-y-0 relative before:absolute before:inset-0 before:ml-2.5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-border-dark before:to-transparent">
                                    {auditTrail.map((log, i) => (
                                        <div key={log.id || i} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active mb-4 last:mb-0">
                                            {/* Icon */}
                                            <div className="flex items-center justify-center w-6 h-6 rounded-full border-2 border-background-dark bg-primary text-slate-500 shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 z-10" />
                                            {/* Card */}
                                            <div className="w-[calc(100%-2.5rem)] md:w-[calc(50%-1.5rem)] bg-black/30 p-3 rounded border border-white/5 shadow-sm">
                                                <div className="flex items-center justify-between space-x-2 mb-1">
                                                    <div className="font-bold text-white text-xs capitalize">{log.action?.replace('_', ' ')}</div>
                                                    <div className="font-mono text-slate-500 text-[9px]">{new Date(log.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                                                </div>
                                                <div className="text-slate-400 text-[10px] uppercase font-bold tracking-widest">{log.status}</div>
                                            </div>
                                        </div>
                                    ))}
                                    {auditTrail.length === 0 && (
                                        <p className="text-slate-500 text-sm italic text-center py-4">No audit events recorded.</p>
                                    )}
                                </div>
                            </div>

                        </div>
                    </div>
                </div>

                {/* Footer Actions */}
                <div className="p-5 border-t border-border-dark bg-surface-dark flex justify-end gap-3 shrink-0 shadow-[0_-10px_30px_rgba(0,0,0,0.5)] z-20">
                    <button onClick={onClose} className="px-6 py-2.5 rounded-lg text-slate-300 font-medium hover:bg-white/5 transition-colors border border-transparent hover:border-white/10">
                        Cancel Review
                    </button>
                    <button
                        onClick={() => setConfirmAction('reject')}
                        className="px-8 py-2.5 rounded-lg bg-primary text-white font-bold hover:bg-primary-dark transition-colors shadow-[0_0_15px_rgba(232,48,73,0.3)] flex items-center gap-2"
                    >
                        <span className="material-symbols-outlined text-[18px]">close</span>
                        Reject Claim
                    </button>
                    <button
                        onClick={() => setConfirmAction('approve')}
                        className="px-8 py-2.5 rounded-lg bg-emerald-600 text-white font-bold hover:bg-emerald-700 transition-colors shadow-[0_0_15px_rgba(5,150,105,0.3)] flex items-center gap-2"
                    >
                        <span className="material-symbols-outlined text-[18px]">check</span>
                        Approve Claim
                    </button>
                </div>

                {/* Confirm Overlay Modal */}
                {confirmAction && (
                    <div className="absolute inset-0 z-50 bg-background-dark/80 backdrop-blur-sm flex items-center justify-center p-4">
                        <div className="bg-surface-dark border border-border-dark shadow-2xl rounded-2xl w-full max-w-lg p-8 animate-in zoom-in-95 duration-200">
                            <h3 className={`text-2xl font-bold mb-3 flex items-center gap-2 ${confirmAction === 'approve' ? 'text-emerald-400' : 'text-primary'}`}>
                                <span className="material-symbols-outlined text-[28px]">
                                    {confirmAction === 'approve' ? 'verified_user' : 'gavel'}
                                </span>
                                Confirm {confirmAction === 'approve' ? 'Approval' : 'Rejection'}
                            </h3>
                            <p className="text-slate-400 text-sm mb-6 leading-relaxed">
                                You are artificially bypassing the AI layer to <strong className="text-white">{confirmAction}</strong> claim <span className="font-mono text-white">#{claim.claim_number}</span>. Please provide an internal rationale for this override, which will be injected into our model retraining feedback loops.
                            </p>

                            <div className="mb-6 relative">
                                <label className="block text-slate-500 text-xs font-bold uppercase tracking-widest mb-2">Internal Rationale</label>
                                <textarea
                                    value={rationale}
                                    onChange={e => setRationale(e.target.value)}
                                    placeholder="E.g., Investigated documents manually, found valid receipts matching policy limits despite AI warnings..."
                                    className="w-full bg-black/40 border border-border-dark rounded-xl p-4 text-white text-sm focus:outline-none focus:border-primary transition-colors resize-none h-32 shadow-inner"
                                />
                            </div>

                            {actionError && (
                                <div className="mb-6 p-4 bg-primary/10 border border-primary/30 rounded-xl text-primary text-sm flex items-center gap-2">
                                    <span className="material-symbols-outlined shrink-0 text-[18px]">error</span>
                                    {actionError}
                                </div>
                            )}

                            <div className="flex justify-end gap-3 pt-4 border-t border-border-dark">
                                <button
                                    disabled={actionLoading}
                                    onClick={() => setConfirmAction(null)}
                                    className="px-6 py-2.5 rounded-lg text-slate-300 font-medium hover:bg-white/5 transition-colors disabled:opacity-50"
                                >
                                    Cancel
                                </button>
                                <button
                                    disabled={actionLoading || !rationale.trim()}
                                    onClick={handleFinalize}
                                    className={`px-8 py-2.5 rounded-lg text-white font-bold transition-all shadow-lg flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed ${confirmAction === 'approve' ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-500/20' : 'bg-primary hover:bg-primary-dark shadow-primary/20'}`}
                                >
                                    {actionLoading ? (
                                        <>
                                            <span className="animate-spin w-4 h-4 border-2 border-white/20 border-t-white rounded-full" />
                                            Saving...
                                        </>
                                    ) : `Finalize ${confirmAction}`}
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}

/* ─── Page ───────────────────────────────────────────────── */
export default function ClaimsQueuePage() {
    const [selectedId, setSelectedId] = useState(null)
    const [activeTab, setActiveTab] = useState(0)

    // Live fetch — refresh every 15s
    const { data, loading, error, refetch } = useFetch('/api/claims?page_size=100', 15_000)

    // Transform backend data to match the UI shape
    const liveClaims = (data?.items || [])
        // IMPORTANT: Filter natively isolated to ONLY show claims requiring manual oversight
        .filter(c => ['under_review', 'manual_review', 'fraud_investigation'].includes(c.status))
        .map(c => {
            return {
                ...c,
                id: c.id,
                claim_number: c.claim_number,
                holder_name: c.claimant_name || 'Unspecified',
                type: c.incident_type || 'Unknown',
                amount: c.claimed_amount ? new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(c.claimed_amount) : '₹0.00',
                risk_score: c.fraud_score != null ? c.fraud_score : 0,
                status: c.status,
                final_decision: c.final_decision,
                date: c.created_at ? new Intl.DateTimeFormat('en-US', { month: 'short', day: '2-digit', year: 'numeric' }).format(new Date(c.created_at)) : '—',
            }
        })

    const claims = liveClaims

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

    return (
        <div className="flex h-screen bg-background-dark overflow-hidden">
            <Sidebar />
            <div className="flex flex-col flex-1 overflow-hidden relative">
                <TopHeader title="Manual Review" />

                <div className="flex flex-1 overflow-hidden relative">
                    <div className="flex-1 flex flex-col overflow-hidden">
                        <div className="p-6 pb-3 space-y-4">
                            {/* Header */}
                            <div className="flex flex-wrap justify-between items-end gap-4">
                                <div>
                                    <h1 className="text-white text-2xl font-bold tracking-tight">Manual Review Queue</h1>
                                    <p className="text-slate-400 text-sm mt-0.5">
                                        Claims awaiting human underwriter adjudication due to AI escalation.{' '}
                                        {tabCounts['High Risk'] > 0 && (
                                            <span className="text-primary font-medium">{tabCounts['High Risk']} High Risk</span>
                                        )}
                                        {tabCounts['High Risk'] > 0 && ' items pending.'}
                                    </p>
                                </div>
                                <div className="flex gap-2">
                                    <button className="flex items-center gap-2 px-3 py-2 bg-surface-dark border border-border-dark rounded-lg text-white hover:bg-border-dark transition-colors text-sm shadow-sm">
                                        <span className="material-symbols-outlined text-[18px]">filter_list</span>
                                        Filters
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
                                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm whitespace-nowrap transition-colors border shadow-sm ${activeTab === i
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
                            <div className="mx-6 mb-2 rounded-lg border border-primary/30 bg-primary/10 px-4 py-2 text-sm text-primary flex items-center gap-3 shadow-inner">
                                <span className="material-symbols-outlined text-[20px]">error</span>
                                Backend unreachable: {error}
                            </div>
                        )}

                        {/* Table */}
                        <div className="flex-1 overflow-y-auto px-6 pb-6">
                            <div className="rounded-xl border border-border-dark bg-surface-dark overflow-hidden shadow-xl">
                                <table className="w-full text-left border-collapse">
                                    <thead>
                                        <tr className="bg-border-dark/40 border-b border-border-dark text-slate-400 text-xs uppercase tracking-wider">
                                            <th className="p-4 font-bold w-20">Risk</th>
                                            <th className="p-4 font-bold">Claim ID</th>
                                            <th className="p-4 font-bold">Claimant</th>
                                            <th className="p-4 font-bold">Type</th>
                                            <th className="p-4 font-bold text-right">Amount</th>
                                            <th className="p-4 font-bold">AI Status</th>
                                            <th className="p-4 font-bold text-right">Date Escaped</th>
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
                                                        <td colSpan={7} className="p-12 text-center text-slate-500 text-sm">
                                                            <div className="flex flex-col items-center justify-center gap-2">
                                                                <span className="material-symbols-outlined text-4xl text-slate-600">check_circle</span>
                                                                No claims found for this filter.
                                                            </div>
                                                        </td>
                                                    </tr>
                                                )
                                                : filtered.map((c) => {
                                                    const score = c.risk_score ?? 0
                                                    const ring = getRingColor(score)
                                                    const s = getStatusStyle(c.status, c.final_decision)
                                                    return (
                                                        <tr
                                                            key={c.id}
                                                            onClick={() => setSelectedId(c.id)}
                                                            className="group transition-colors cursor-pointer border-l-4 border-l-transparent hover:bg-white/5 hover:border-l-primary"
                                                        >
                                                            <td className="p-4">
                                                                <RingScore score={Math.round(score * 100)} color={ring} />
                                                            </td>
                                                            <td className="p-4 font-mono text-white font-medium">#{c.claim_number}</td>
                                                            <td className="p-4">
                                                                <div className="flex items-center gap-3">
                                                                    <div className="w-8 h-8 rounded-lg bg-surface-dark border border-border-dark flex items-center justify-center text-xs text-slate-300 font-bold">
                                                                        {(c.holder_name || 'U').charAt(0)}
                                                                    </div>
                                                                    <span className="font-medium text-slate-300 group-hover:text-white transition-colors">
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
                </div>

                {/* Overlaid Detail Modal */}
                {selectedId && (
                    <ClaimDetailModal
                        claimId={selectedId}
                        onClose={() => setSelectedId(null)}
                        onRefresh={() => { setSelectedId(null); refetch(); }}
                    />
                )}
            </div>
        </div>
    )
}
