import Sidebar from '../../components/admin/Sidebar'
import TopHeader from '../../components/admin/TopHeader'

const logs = [
    { id: 'LOG-2091', claim: 'CLM-9821', action: 'Risk Escalation', agent: 'Sentinel AI', reason: 'Confidence score exceeded 90% fraud threshold. Manual review triggered.', time: '2m ago', level: 'critical' },
    { id: 'LOG-2090', claim: 'CLM-9820', action: 'Pattern Match', agent: 'Graph Engine', reason: 'Entity connected to 2 previously denied claims via shared address.', time: '9m ago', level: 'high' },
    { id: 'LOG-2089', claim: 'CLM-9819', action: 'Auto-Approved', agent: 'Auto-Adjudicator', reason: 'Claim met all low-risk criteria. Approved without human review.', time: '14m ago', level: 'ok' },
    { id: 'LOG-2088', claim: 'CLM-9817', action: 'Document Request', agent: 'Sentinel AI', reason: 'Missing police report. Claim paused pending submission.', time: '22m ago', level: 'warn' },
    { id: 'LOG-2087', claim: 'CLM-9816', action: 'NPI Verification', agent: 'Provider Check', reason: 'Provider NPI verified against CMS registry. No anomalies found.', time: '35m ago', level: 'ok' },
    { id: 'LOG-2086', claim: 'CLM-9815', action: 'Risk Escalation', agent: 'Sentinel AI', reason: 'Property claim amount 4.2x regional average. Sent to senior analyst.', time: '1h ago', level: 'critical' },
]

const levelColor = (l) =>
    l === 'critical' ? 'bg-red-500' : l === 'high' ? 'bg-orange-400' : l === 'warn' ? 'bg-yellow-400' : 'bg-emerald-400'
const levelBadge = (l) =>
    l === 'critical' ? 'text-red-400 bg-red-400/10' : l === 'high' ? 'text-orange-400 bg-orange-400/10' : l === 'warn' ? 'text-yellow-400 bg-yellow-400/10' : 'text-emerald-400 bg-emerald-400/10'

export default function AuditLogPage() {
    return (
        <div className="flex h-screen bg-background-dark overflow-hidden">
            <Sidebar />
            <div className="flex flex-col flex-1 overflow-hidden">
                <TopHeader title="AI Audit Log" />
                <main className="flex-1 overflow-y-auto p-6 space-y-3">
                    <p className="text-slate-500 text-sm mb-4">All AI-generated actions are logged and traceable for compliance.</p>
                    {logs.map((l) => (
                        <div key={l.id} className="flex gap-5 rounded-2xl border border-border-dark bg-surface-dark p-5 hover:bg-border-dark/20 transition-colors">
                            <div className="flex flex-col items-center pt-1">
                                <div className={`size-2.5 rounded-full ${levelColor(l.level)} mt-1`} />
                                <div className="w-px flex-1 bg-border-dark mt-2" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="flex items-start justify-between gap-2 mb-2">
                                    <div className="flex items-center gap-3 flex-wrap">
                                        <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${levelBadge(l.level)}`}>{l.action}</span>
                                        <span className="font-mono text-xs text-slate-500">{l.claim}</span>
                                        <span className="text-xs text-slate-600">via {l.agent}</span>
                                    </div>
                                    <span className="text-xs text-slate-600 shrink-0">{l.time}</span>
                                </div>
                                <p className="text-sm text-slate-400 leading-relaxed">{l.reason}</p>
                                <p className="text-xs text-slate-600 mt-2 font-mono">{l.id}</p>
                            </div>
                        </div>
                    ))}
                </main>
            </div>
        </div>
    )
}
