import { useState } from 'react'
import Sidebar from '../../components/admin/Sidebar'
import TopHeader from '../../components/admin/TopHeader'

const initialFlags = [
    { key: 'autoAdjudicate', label: 'Auto-Adjudication Engine', desc: 'Automatically approve claims scoring below risk threshold.', enabled: true },
    { key: 'graphEngine', label: 'Graph Intelligence Engine', desc: 'Enable network fraud detection across entity relationships.', enabled: true },
    { key: 'nlpExtraction', label: 'NLP Document Extraction', desc: 'Extract structured data from unstructured claim documents.', enabled: true },
    { key: 'velocityCheck', label: 'Velocity Check', desc: 'Flag policyholders with abnormal claim submission frequency.', enabled: false },
    { key: 'providerVerify', label: 'Provider NPI Verification', desc: 'Cross-check medical providers against CMS registry on claim receipt.', enabled: false },
]

export default function ConfigPage() {
    const [flags, setFlags] = useState(initialFlags)
    const [threshold, setThreshold] = useState(75)
    const [saved, setSaved] = useState(false)

    const toggle = (key) =>
        setFlags((prev) => prev.map((f) => f.key === key ? { ...f, enabled: !f.enabled } : f))

    const save = () => { setSaved(true); setTimeout(() => setSaved(false), 2000) }

    return (
        <div className="flex h-screen bg-background-dark overflow-hidden">
            <Sidebar />
            <div className="flex flex-col flex-1 overflow-hidden">
                <TopHeader title="System Config" showSearch={false} />
                <main className="flex-1 overflow-y-auto p-6 space-y-6 max-w-3xl">

                    {/* Risk Threshold */}
                    <div className="rounded-2xl border border-border-dark bg-surface-dark p-6">
                        <h2 className="text-base font-semibold text-white mb-1">Risk Score Threshold</h2>
                        <p className="text-slate-500 text-sm mb-6">Claims scoring above this value are escalated for manual review.</p>
                        <div className="flex items-center gap-6">
                            <input
                                type="range"
                                min={50}
                                max={99}
                                value={threshold}
                                onChange={(e) => setThreshold(Number(e.target.value))}
                                className="flex-1 accent-primary"
                            />
                            <div className="text-4xl font-bold text-white w-20 text-center">{threshold}</div>
                        </div>
                        <div className="flex justify-between text-xs text-slate-600 mt-2">
                            <span>50 — More reviews</span>
                            <span>99 — Fewer reviews</span>
                        </div>
                    </div>

                    {/* Feature Flags */}
                    <div className="rounded-2xl border border-border-dark bg-surface-dark p-6">
                        <h2 className="text-base font-semibold text-white mb-6">Feature Flags</h2>
                        <div className="space-y-4">
                            {flags.map((f) => (
                                <div key={f.key} className="flex items-center justify-between gap-4 py-3 border-b border-border-dark/50 last:border-0">
                                    <div>
                                        <p className="text-sm font-medium text-white">{f.label}</p>
                                        <p className="text-xs text-slate-500 mt-0.5">{f.desc}</p>
                                    </div>
                                    <button
                                        onClick={() => toggle(f.key)}
                                        className={`relative shrink-0 w-12 h-6 rounded-full transition-colors ${f.enabled ? 'bg-primary' : 'bg-border-dark'}`}
                                    >
                                        <span
                                            className={`absolute top-1 left-1 size-4 bg-white rounded-full shadow transition-transform ${f.enabled ? 'translate-x-6' : 'translate-x-0'}`}
                                        />
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>

                    <button
                        onClick={save}
                        className={`w-full py-3.5 rounded-xl font-semibold text-sm transition-all ${saved ? 'bg-emerald-500 text-white' : 'bg-primary hover:bg-primary-dark text-white'}`}
                    >
                        {saved ? '✓ Changes Saved' : 'Save Configuration'}
                    </button>
                </main>
            </div>
        </div>
    )
}
