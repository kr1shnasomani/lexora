import { useState, useCallback } from 'react'
import Sidebar from '../../components/admin/Sidebar'
import TopHeader from '../../components/admin/TopHeader'
import { useFetch } from '../../hooks/useFetch'
import { api } from '../../lib/api'
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
function eventToLayer(event) {
    const meta = event._meta || { key: event.stage, icon: 'circle', title: event.stage, sub: event.event_type }
    const isPending = event.event_type === 'pending'

    const durationStr = event.duration_ms ? `${event.duration_ms}ms` : '—'
    const failed = event.event_type === 'failed'
    const warned = event.event_type === 'warned'
    const logged = event.stage === 'audit'

    let statusColor = isPending ? 'muted' : failed ? 'primary' : warned ? 'warn' : logged ? 'blue' : 'success'
    let statusLabel = isPending ? 'PENDING' : failed ? 'FAIL' : warned ? 'WARN' : logged ? 'LOGGED' : 'PASS'

    return { ...meta, ms: durationStr, status: statusLabel, statusColor, halted: false, content: null }
}

/* ─── Expandable Raw Fields Component ────────────────────────────── */
function RawExtractionView({ extraction_raw, confidence }) {
    const [isExpanded, setIsExpanded] = useState(false);
    const keys = Object.keys(extraction_raw || {});
    if (keys.length === 0) return null;

    return (
        <div className="bg-[#1f1618] border border-white/5 rounded p-3 mt-2">
            <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="w-full flex items-center justify-between text-left group"
                aria-expanded={isExpanded}
            >
                <div>
                    <div className="text-[10px] text-slate-500 uppercase tracking-wider mb-1 group-hover:text-slate-400 transition-colors">Raw Extracted Fields</div>
                    {!isExpanded && (
                        <div className="text-xs text-slate-400 font-medium">View {keys.length} extracted fields...</div>
                    )}
                </div>
                <span className="material-symbols-outlined text-slate-500 group-hover:text-white transition-colors">
                    {isExpanded ? 'expand_less' : 'expand_more'}
                </span>
            </button>

            {isExpanded && (
                <div className="mt-3 pt-3 border-t border-white/5">
                    <div className="grid grid-cols-2 gap-x-4 gap-y-3">
                        {Object.entries(extraction_raw).map(([key, value]) => (
                            <div key={key} className="flex flex-col">
                                <span className="text-[10px] text-slate-400 font-mono capitalize">{key.replace(/_/g, ' ')}</span>
                                <span className="text-xs text-white font-medium truncate" title={String(value)}>{value ? String(value) : '—'}</span>
                            </div>
                        ))}
                    </div>
                    {confidence !== undefined && (
                        <div className="mt-4 pt-3 border-t border-white/5 flex justify-end">
                            <span className="text-[10px] font-mono text-slate-500 tracking-wider">
                                OVERALL CONFIDENCE: <strong className={confidence > 0.85 ? 'text-emerald-400' : 'text-amber-400'}>{(confidence * 100).toFixed(1)}%</strong>
                            </span>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

/* ─── Payload UI Renderers ───────────────────────────────────────── */
function renderPayload(payload) {
    if (!payload) return null;

    if (payload.fraud_score !== undefined) {
        // Fraud Engine output formatting
        return (
            <div className="grid grid-cols-2 gap-4 mt-2">
                <div className="bg-[#1f1618] border border-white/5 rounded p-3">
                    <div className="text-[10px] text-slate-500 uppercase tracking-wider mb-1">Risk Score</div>
                    <div className="text-xl font-mono text-primary font-bold">{(payload.fraud_score * 100).toFixed(1)}%</div>
                </div>
                <div className="bg-[#1f1618] border border-white/5 rounded p-3">
                    <div className="text-[10px] text-slate-500 uppercase tracking-wider mb-1">Risk Band</div>
                    <div className="text-lg font-mono text-white capitalize">{payload.risk_band || '—'}</div>
                </div>
                {payload.recommended_action && (
                    <div className="bg-[#1f1618] border border-white/5 rounded p-3 col-span-2">
                        <div className="text-[10px] text-slate-500 uppercase tracking-wider mb-1">Recommended Action</div>
                        <div className="text-sm font-bold text-amber-400 capitalize bg-amber-500/10 inline-block px-2.5 py-1 rounded border border-amber-500/20 shadow-inner">
                            {payload.recommended_action.replace(/_/g, ' ')}
                        </div>
                    </div>
                )}
            </div>
        )
    }

    if (payload.ruleset_id) {
        // Policy Engine output formatting
        const isApprove = payload.status === 'APPROVE'
        return (
            <div className="flex flex-col gap-3 mt-2">
                <div className="flex items-center gap-3">
                    <div className="bg-[#1f1618] border border-white/5 rounded p-3 flex-1">
                        <div className="text-[10px] text-slate-500 uppercase tracking-wider mb-1">Status</div>
                        <div className={`text-sm font-bold ${isApprove ? 'text-emerald-400' : 'text-primary'}`}>{payload.status}</div>
                    </div>
                    {payload.recommended_amount !== undefined && (
                        <div className="bg-[#1f1618] border border-white/5 rounded p-3 flex-1">
                            <div className="text-[10px] text-slate-500 uppercase tracking-wider mb-1">Approved Amount</div>
                            <div className="text-sm font-mono text-white">
                                {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(payload.recommended_amount)}
                            </div>
                        </div>
                    )}
                </div>
                {(payload.rules_failed?.length > 0 || payload.rules_flagged?.length > 0) && (
                    <div className="bg-[#1f1618] border border-white/5 rounded p-3">
                        <div className="text-[10px] text-slate-500 uppercase tracking-wider mb-2">Flags</div>
                        <ul className="text-xs list-disc list-inside space-y-1 ml-1">
                            {payload.rules_failed?.map((r, i) => <li key={`f-${i}`} className="text-primary">{r}</li>)}
                            {payload.rules_flagged?.map((r, i) => <li key={`w-${i}`} className="text-amber-400">{r}</li>)}
                        </ul>
                    </div>
                )}
            </div>
        )
    }

    // Perception Engine (layer1 / submission) output formatting
    if (payload.fields_extracted !== undefined || payload.claim_number !== undefined) {
        return (
            <div className="flex flex-col gap-3 mt-2">
                <div className="flex items-center gap-3">
                    {payload.fields_extracted !== undefined && (
                        <div className="bg-[#1f1618] border border-white/5 rounded p-3 flex-1">
                            <div className="text-[10px] text-slate-500 uppercase tracking-wider mb-1">Fields Extracted</div>
                            <div className="text-xl font-mono text-white font-bold">{payload.fields_extracted}</div>
                        </div>
                    )}
                    {payload.confidence !== undefined && (
                        <div className="bg-[#1f1618] border border-white/5 rounded p-3 flex-1">
                            <div className="text-[10px] text-slate-500 uppercase tracking-wider mb-1">OCR Confidence</div>
                            <div className={`text-xl font-mono font-bold ${payload.confidence > 0.85 ? 'text-emerald-400' : 'text-amber-400'}`}>
                                {(payload.confidence * 100).toFixed(1)}%
                            </div>
                        </div>
                    )}
                    {payload.claim_number !== undefined && !payload.fields_extracted && (
                        <div className="bg-[#1f1618] border border-white/5 rounded p-3 flex-1">
                            <div className="text-[10px] text-slate-500 uppercase tracking-wider mb-1">Submission Extracted</div>
                            <div className="text-sm font-mono text-white">{payload.claim_number}</div>
                        </div>
                    )}
                </div>
                {payload.extraction_raw && Object.keys(payload.extraction_raw).length > 0 && (
                    <RawExtractionView
                        extraction_raw={payload.extraction_raw}
                        confidence={payload.confidence}
                    />
                )}
                {payload.warnings?.length > 0 && (
                    <div className="bg-[#1f1618] border border-white/5 rounded p-3">
                        <div className="text-[10px] text-slate-500 uppercase tracking-wider mb-2">Extraction Warnings</div>
                        <ul className="text-xs list-disc list-inside space-y-1 ml-1 text-amber-400">
                            {payload.warnings.map((w, i) => <li key={`w-${i}`}>{w}</li>)}
                        </ul>
                    </div>
                )}
            </div>
        )
    }

    // Decision Engine output formatting
    if (payload.final_decision !== undefined) {
        const routeColor = ['auto_approve'].includes(payload.final_decision) ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20'
            : ['fraud_investigation', 'auto_reject'].includes(payload.final_decision) ? 'text-primary bg-primary/10 border-primary/20'
                : 'text-amber-400 bg-amber-500/10 border-amber-500/20';

        return (
            <div className="flex flex-col gap-3 mt-2">
                <div className="flex items-center gap-3">
                    <div className="bg-[#1f1618] border border-white/5 rounded p-3 flex-1">
                        <div className="text-[10px] text-slate-500 uppercase tracking-wider mb-1">Final Routing</div>
                        <div className={`text-sm font-bold uppercase inline-block px-2.5 py-1 rounded border shadow-inner ${routeColor}`}>
                            {payload.final_decision.replace(/_/g, ' ')}
                        </div>
                    </div>
                    {payload.approved_amount !== undefined && (
                        <div className="bg-[#1f1618] border border-white/5 rounded p-3 flex-1">
                            <div className="text-[10px] text-slate-500 uppercase tracking-wider mb-1">Settlement Amount</div>
                            <div className="text-xl font-mono text-white font-bold">
                                {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(payload.approved_amount)}
                            </div>
                        </div>
                    )}
                </div>
                {payload.decision_rationale && (
                    <div className="bg-[#1f1618] border border-white/5 rounded p-3">
                        <div className="text-[10px] text-slate-500 uppercase tracking-wider mb-2">Decision Rationale</div>
                        <p className="text-xs text-white leading-relaxed">{payload.decision_rationale}</p>
                    </div>
                )}
            </div>
        )
    }

    // Default JSON view for anything else, styling raw json text
    const cleanPayload = { ...payload };
    const noiseKeys = ['diagnostics', 'analytics_tags', 'raw_response', 'tiers_evaluated', 'layer'];
    noiseKeys.forEach(k => delete cleanPayload[k]);

    return (
        <pre className="text-[11px] text-slate-400 font-mono bg-[#1f1618] p-3 rounded border border-white/5 overflow-x-auto mt-2 whitespace-pre-wrap leading-relaxed">
            {JSON.stringify(cleanPayload, null, 2)}
        </pre>
    )
}

/* ─── Accordion layer component ──────────────────────────────────── */
function AccordionLayer({ layer, content, parsedPayload }) {
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
                                {parsedPayload ? (
                                    renderPayload(parsedPayload)
                                ) : (
                                    <p className="text-sm text-white font-medium leading-relaxed drop-shadow-md whitespace-pre-wrap">
                                        {content}
                                    </p>
                                )}
                                <div className="flex gap-2 mt-3">
                                    <span className="px-2 py-1 rounded text-[10px] font-mono border border-white/10 text-slate-400 bg-black/20">Model: v4.0.1</span>
                                    <span className="px-2 py-1 rounded text-[10px] font-mono border border-white/10 text-slate-400 bg-black/20">Tokens: {parsedPayload ? JSON.stringify(parsedPayload).length : 482}</span>
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
    const [showOverrideModal, setShowOverrideModal] = useState(false)
    const [overrideDecision, setOverrideDecision] = useState('')
    const [overrideRationale, setOverrideRationale] = useState('')
    const [overrideLoading, setOverrideLoading] = useState(false)
    const [overrideError, setOverrideError] = useState(null)

    // Download document utility
    const handleDownload = async (claimId, docId) => {
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
    };

    // Fetch recent claims to populate the left table
    const { data: claimsData, loading, error, refetch } = useFetch('/api/claims?page_size=50', 20_000)

    // Transform backend data to match UI shape
    const liveClaims = (claimsData?.items || []).map(c => ({
        ...c,
        id: c.id,
        claim_number: c.claim_number,
        holder_name: c.claimant_name || 'Unspecified',
        date: c.created_at ? new Intl.DateTimeFormat('en-US', { month: 'short', day: '2-digit', year: 'numeric' }).format(new Date(c.created_at)) : '—',
        risk_score: c.fraud_score != null ? c.fraud_score : 0,
        status: c.status,
        final_decision: c.final_decision
    }))

    // Use fallback when backend is unreachable and no live data
    const isFallback = !!error && liveClaims.length === 0
    const claims = isFallback ? FALLBACK_AUDIT : liveClaims

    // Fetch events for the selected claim
    const { data: rawEventsData, loading: eventsLoading } = useFetch(
        selected ? `/api/claims/${selected.id}/audit` : null
    )

    // Fetch deep claim details for document extraction
    const { data: claimDetailsData } = useFetch(
        selected ? `/api/claims/${selected.id}` : null
    )
    const claimDocuments = claimDetailsData?.documents || []

    const handleOverrideFinalize = async () => {
        if (!overrideDecision || !overrideRationale) return;
        setOverrideLoading(true);
        setOverrideError(null);
        try {
            await api.post(`/api/claims/${selected.id}/manual-review`, {
                decision: overrideDecision,
                rationale: overrideRationale,
                reviewer_id: "demo-user-001" // Handled dynamically in backend bypass
            });
            setShowOverrideModal(false);
            setOverrideDecision('');
            setOverrideRationale('');
            // Optimistically close inspector or await refetch
            setDrawerOpen(false);
            refetch();
        } catch (err) {
            console.error("Override failed:", err);
            setOverrideError("Failed to apply override. Check system logs.");
        } finally {
            setOverrideLoading(false);
        }
    };

    // Parse audit_trail events payload json
    let rawEvents = rawEventsData?.audit_trail || [];

    if (isFallback) {
        rawEvents = [
            { id: '1', stage: 'layer1', event_type: 'warned', duration_ms: 450, content: 'Image quality degraded. OCR confidence fell below threshold (42%). Detected potential alteration in date field.' },
            { id: '2', stage: 'policy_engine', event_type: 'passed', duration_ms: 12, payload: {} },
            { id: '3', stage: 'fraud_engine', event_type: 'warned', duration_ms: 200, payload: { fraud_score: 0.85, risk_band: 'high' } },
            { id: '4', stage: 'decision', event_type: 'failed', duration_ms: 5, payload: { final_decision: 'auto_reject' } },
            { id: '5', stage: 'audit', event_type: 'logged', duration_ms: 10, payload: {} }
        ];
    }

    const EXPECTED_STAGES = [
        { key: 'layer1', icon: 'visibility', title: 'Perception Engine', sub: 'GPT-4o Vision' },
        { key: 'policy_engine', icon: 'gavel', title: 'Policy Governance', sub: 'Rule Engine v2.1' },
        { key: 'fraud_engine', icon: 'security', title: 'Fraud Intel', sub: 'Graph Neural Net' },
        { key: 'decision', icon: 'psychology', title: 'Decision Engine', sub: 'Economic Opt.' },
        { key: 'audit', icon: 'history_edu', title: 'Audit & Learning', sub: 'Immutable Log' }
    ];

    const events = EXPECTED_STAGES.map((expected, idx) => {
        const stageEvents = rawEvents.filter(e => {
            if (e.event_type === 'started') return false;
            // Perception Engine can be logged as 'layer1' or 'submission'
            if (expected.key === 'layer1' && (e.stage === 'layer1' || e.stage === 'submission')) return true;
            return e.stage === expected.key;
        });

        let hasExtraction = false;
        let rawjson = null;
        if (expected.key === 'layer1' && selected && selected.extraction_raw) {
            try {
                rawjson = typeof selected.extraction_raw === 'string'
                    ? JSON.parse(selected.extraction_raw)
                    : selected.extraction_raw;
                if (rawjson && Object.keys(rawjson).length > 0) hasExtraction = true;
            } catch (e) { }
        }

        if (stageEvents.length === 0 && !hasExtraction) {
            return {
                id: `pending-${expected.key}-${idx}`,
                stage: expected.key,
                _meta: expected,
                event_type: 'pending',
                duration_ms: null,
                content: "Awaiting execution. This analysis layer has not yet been processed for the current claim.",
                parsedPayload: null
            };
        }

        const latestEvent = stageEvents.length > 0
            ? stageEvents[stageEvents.length - 1]
            : { event_type: 'completed', duration_ms: 1250, payload: {} }; // Mock event if only extraction_raw

        let content = null;
        let parsedPayload = null;
        try {
            const parsed = typeof latestEvent.payload === 'string' ? JSON.parse(latestEvent.payload || '{}') : (latestEvent.payload || {});

            if ((parsed && Object.keys(parsed).length > 0) || hasExtraction) {
                parsedPayload = parsed || {};

                // Splice extraction_raw directly into Perception payload
                if (hasExtraction) {
                    parsedPayload.extraction_raw = rawjson;
                    if (parsedPayload.fields_extracted === undefined) {
                        parsedPayload.fields_extracted = Object.keys(rawjson).length;
                    }
                }
                content = JSON.stringify(parsedPayload, null, 2);
            } else if (!parsed && latestEvent.content) {
                content = latestEvent.content;
            }
        } catch (err) {
            content = latestEvent.content || null;
        }

        return { ...latestEvent, _meta: expected, content, parsedPayload };
    });

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

                            {/* Documents Map */}
                            {claimDocuments.length > 0 && (
                                <div className="px-5 py-3 border-b border-border-dark bg-[#38292b]/10 flex flex-col gap-2">
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className="material-symbols-outlined text-primary text-[16px]">folder_open</span>
                                        <h4 className="text-white text-xs font-bold uppercase tracking-wider">Attached Evidence</h4>
                                    </div>
                                    <div className="flex flex-col gap-2">
                                        {claimDocuments.map(doc => (
                                            <div key={doc.id} className="flex items-center justify-between p-2.5 rounded bg-background-dark border border-border-dark group">
                                                <div className="flex items-center gap-3">
                                                    <span className="material-symbols-outlined text-slate-500 group-hover:text-primary transition-colors text-[20px]">description</span>
                                                    <div className="flex flex-col">
                                                        <span className="text-xs text-white font-medium font-mono truncate max-w-[200px]" title={doc.file_name}>{doc.file_name}</span>
                                                        <span className="text-[10px] text-slate-500">{new Date(doc.uploaded_at).toLocaleString()}</span>
                                                    </div>
                                                </div>
                                                <button
                                                    onClick={() => handleDownload(selected.id, doc.id)}
                                                    className="p-1.5 rounded text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
                                                    title="View Document"
                                                >
                                                    <span className="material-symbols-outlined text-[18px]">visibility</span>
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Accordion layers */}
                            <div className="flex-1 overflow-y-auto p-4 space-y-3">
                                {eventsLoading
                                    ? [0, 1, 2].map(i => (
                                        <div key={i} className="rounded-lg border border-border-dark bg-surface-dark p-4 animate-pulse h-16" />
                                    ))
                                    : events.map((event, i) => (
                                        <AccordionLayer key={event.id || i} layer={eventToLayer(event)} content={event.content || null} parsedPayload={event.parsedPayload} />
                                    ))
                                }
                            </div>

                            {/* Footer */}
                            <div className="p-5 border-t border-border-dark bg-[#38292b]/10">
                                <div className="flex gap-3">
                                    <button
                                        onClick={() => setShowOverrideModal(true)}
                                        className="flex-1 bg-primary hover:bg-[#d02038] text-white py-2.5 px-4 rounded-lg font-bold text-sm shadow-lg shadow-primary/20 transition-all flex items-center justify-center gap-2"
                                    >
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

            {/* Override Confirmation Modal */}
            {showOverrideModal && selected && (
                <div className="absolute inset-0 z-[100] bg-background-dark/80 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-surface-dark border border-primary/20 p-6 rounded-xl shadow-2xl w-full max-w-sm animate-in fade-in zoom-in-95 duration-200">
                        <div className="flex items-center gap-2 text-primary mb-2">
                            <span className="material-symbols-outlined shrink-0 text-[24px]">gavel</span>
                            <h3 className="font-bold text-lg">Explicit Override</h3>
                        </div>
                        <p className="text-sm text-slate-300 mb-5 leading-relaxed">
                            You are forcibly overriding the current active decision route for claim <strong className="text-white font-mono">{selected.claim_number}</strong>. This bypass will be irreversibly injected into the core LLM retraining logs.
                        </p>

                        <div className="space-y-4 mb-6">
                            <div className="flex flex-col gap-1.5">
                                <label className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">New Decision Output</label>
                                <select
                                    value={overrideDecision}
                                    onChange={(e) => setOverrideDecision(e.target.value)}
                                    className="w-full bg-background-dark border border-border-dark text-white text-sm rounded-lg p-3 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all appearance-none"
                                >
                                    <option value="" disabled>Select route formulation...</option>
                                    {['auto_approve', 'auto_reject', 'manual_review', 'fraud_investigation']
                                        .filter(d => d !== selected.final_decision && d !== selected.status)
                                        .map(d => (
                                            <option key={d} value={d}>{d.toUpperCase().replace(/_/g, ' ')}</option>
                                        ))
                                    }
                                </select>
                            </div>

                            <div className="flex flex-col gap-1.5">
                                <label className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">Underwriting Rationale</label>
                                <textarea
                                    className="w-full bg-background-dark border border-border-dark text-white text-sm rounded-lg p-3 min-h-[100px] focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all resize-none placeholder:text-slate-600"
                                    placeholder="Explain the technical logic for this manual intervention..."
                                    value={overrideRationale}
                                    onChange={(e) => setOverrideRationale(e.target.value)}
                                    disabled={overrideLoading}
                                />
                            </div>
                            {overrideError && (
                                <div className="text-xs text-primary font-medium bg-primary/10 p-2 rounded border border-primary/20">
                                    {overrideError}
                                </div>
                            )}
                        </div>

                        <div className="flex justify-end gap-3 pt-4 border-t border-white/5">
                            <button
                                onClick={() => { setShowOverrideModal(false); setOverrideDecision(''); setOverrideRationale(''); }}
                                className="px-4 py-2 text-sm text-slate-400 hover:text-white transition-colors disabled:opacity-50"
                                disabled={overrideLoading}
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleOverrideFinalize}
                                disabled={!overrideDecision || !overrideRationale || overrideLoading}
                                className="bg-primary hover:bg-[#d02038] text-white px-5 py-2 rounded-lg font-bold text-sm shadow-lg shadow-primary/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center min-w-[120px]"
                            >
                                {overrideLoading ? (
                                    <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                                ) : 'Execute Override'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
