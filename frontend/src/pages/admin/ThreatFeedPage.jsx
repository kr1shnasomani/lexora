import Sidebar from '../../components/admin/Sidebar'
import TopHeader from '../../components/admin/TopHeader'

const threats = [
    { id: 'THR-441', severity: 'Critical', title: 'Organized Ring — Auto Staging', desc: 'Coordinated network of 7 policyholders submitting sequential rear-end collision claims across 3 states.', region: 'North-East US', confidence: 97, vectors: ['Velocity', 'Network Cluster', 'Location Overlap'] },
    { id: 'THR-440', severity: 'High', title: 'Identity Fabrication Pattern', desc: 'Medical provider NPI cross-check failure on 12 recent claims. Provider does not appear in CMS registry.', region: 'Florida', confidence: 87, vectors: ['Identity', 'Provider Fraud'] },
    { id: 'THR-439', severity: 'High', title: 'Inflated Repair Estimates', desc: 'Auto body shop consistently submitting estimates 340% above regional median for comparable damage.', region: 'California', confidence: 81, vectors: ['Amount Anomaly', 'Vendor Flag'] },
    { id: 'THR-438', severity: 'Medium', title: 'Duplicate Medical Billing', desc: 'Same procedure codes billed across two separate carriers on overlapping dates of service.', region: 'Midwest', confidence: 68, vectors: ['Duplicate', 'Billing Anomaly'] },
    { id: 'THR-437', severity: 'Low', title: 'Policy Anniversary Claim', desc: 'Claim submitted 3 days after annual policy renewal. Low-risk pattern, flagged for documentation.', region: 'Texas', confidence: 34, vectors: ['Timing'] },
]

const sevColor = (s) =>
    s === 'Critical' ? 'text-red-400 bg-red-400/10 border-red-400/30' :
        s === 'High' ? 'text-orange-400 bg-orange-400/10 border-orange-400/30' :
            s === 'Medium' ? 'text-yellow-400 bg-yellow-400/10 border-yellow-400/30' :
                'text-emerald-400 bg-emerald-400/10 border-emerald-400/30'

export default function ThreatFeedPage() {
    return (
        <div className="flex h-screen bg-background-dark overflow-hidden">
            <Sidebar />
            <div className="flex flex-col flex-1 overflow-hidden">
                <TopHeader title="Threat Feed" />
                <main className="flex-1 overflow-y-auto p-6 space-y-4">
                    <div className="flex items-center justify-between">
                        <p className="text-slate-400 text-sm">{threats.length} active threats — sorted by confidence</p>
                        <div className="flex items-center gap-2">
                            <span className="relative flex h-2.5 w-2.5">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500"></span>
                            </span>
                            <span className="text-xs text-red-400 font-medium">Live monitoring active</span>
                        </div>
                    </div>

                    {threats.map((t) => (
                        <div key={t.id} className="rounded-2xl border border-border-dark bg-surface-dark p-6 card-hover transition-all">
                            <div className="flex items-start justify-between gap-4 mb-4">
                                <div className="flex items-center gap-3">
                                    <span className={`text-xs font-bold px-3 py-1 rounded-full border ${sevColor(t.severity)}`}>{t.severity}</span>
                                    <span className="font-mono text-xs text-slate-500">{t.id}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="text-xs text-slate-500">Confidence</span>
                                    <span className={`text-sm font-bold ${t.confidence >= 80 ? 'text-red-400' : t.confidence >= 60 ? 'text-orange-400' : 'text-yellow-400'}`}>{t.confidence}%</span>
                                </div>
                            </div>
                            <h3 className="text-base font-semibold text-white mb-2">{t.title}</h3>
                            <p className="text-slate-400 text-sm mb-4 leading-relaxed">{t.desc}</p>
                            <div className="flex items-center justify-between">
                                <div className="flex gap-2 flex-wrap">
                                    {t.vectors.map((v) => (
                                        <span key={v} className="text-xs text-slate-400 bg-border-dark px-2 py-0.5 rounded-full">{v}</span>
                                    ))}
                                </div>
                                <div className="flex items-center gap-2 text-xs text-slate-500">
                                    <span className="material-symbols-outlined text-[16px]">location_on</span>
                                    {t.region}
                                </div>
                            </div>
                        </div>
                    ))}
                </main>
            </div>
        </div>
    )
}
