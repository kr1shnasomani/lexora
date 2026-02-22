import { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import BottomNav from '../../components/customer/BottomNav'
import { useFetch } from '../../hooks/useFetch'
import { SkeletonList } from '../../components/shared/Skeleton'
import ErrorToast from '../../components/shared/ErrorToast'

const N8N_WEBHOOK = '/n8n/webhook/claim-upload'

/* ─── Evidence items per policy type (static UI config) ───────────────── */
const EVIDENCE_ITEMS = {
    health: [
        { key: 'prescription', icon: 'medication', label: 'Prescription / Doctor Notes', sub: 'Signed medical documentation' },
        { key: 'bills', icon: 'receipt_long', label: 'Hospital / Clinic Bills', sub: 'Itemised receipts for treatment costs' },
        { key: 'id', icon: 'badge', label: 'Government ID', sub: 'Proof of identity matching the policy' },
    ],
    auto: [
        { key: 'police', icon: 'local_police', label: 'Police Report', sub: 'Official accident or theft report' },
        { key: 'photos', icon: 'photo_camera', label: 'Damage Photos', sub: 'Photos of damage from multiple angles' },
        { key: 'repair', icon: 'build', label: 'Repair Estimate', sub: 'Workshop quote for repairs' },
    ],
    travel: [
        { key: 'invoice', icon: 'receipt_long', label: 'Original Invoice / Receipt', sub: 'Proof of payment for incurred expenses' },
        { key: 'boarding', icon: 'flight', label: 'Boarding Pass / E-Ticket', sub: 'Confirming travel dates and details' },
        { key: 'incident', icon: 'description', label: 'Incident Report', sub: 'Official statement or police report (if applicable)' },
    ],
}

const CLAIM_TYPES = [
    { key: 'delay', label: 'Trip Delay / Cancellation' },
    { key: 'medical', label: 'Medical Emergency' },
    { key: 'baggage', label: 'Lost / Damaged Baggage' },
    { key: 'accident', label: 'Accident / Injury' },
    { key: 'other', label: 'Other' },
]

const policyIcon = (type) => {
    const map = { health: 'cardiology', auto: 'directions_car', travel: 'flight', pet: 'pets', life: 'favorite' }
    return map[type] || 'policy'
}

/* ─── Step Documents ─────────────────────────────────────────────────── */
function StepDocuments({ file, setFile }) {
    const fileRef = useRef(null)
    const handleDrop = (e) => {
        e.preventDefault()
        const dropped = e.dataTransfer.files[0]
        if (dropped) setFile(dropped)
    }
    return (
        <div className="flex flex-col gap-8 max-w-3xl mx-auto">
            <div className="space-y-4">
                <div className="flex items-center justify-between">
                    <h3 className="text-lg font-bold text-white">Upload Evidence Document</h3>
                    <span className="text-xs text-primary bg-primary/10 px-2 py-1 rounded border border-primary/20">Required</span>
                </div>
                <div
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={handleDrop}
                    onClick={() => fileRef.current?.click()}
                    className={`border-2 border-dashed rounded-2xl p-8 flex flex-col items-center justify-center text-center transition-all cursor-pointer group ${file ? 'border-primary/50 bg-primary/5' : 'border-[#27272a] hover:border-slate-500 bg-[#111115] hover:bg-[#1d1d20]'
                        }`}
                >
                    <input ref={fileRef} type="file" accept="image/*,.pdf,audio/*,video/*" className="hidden" onChange={(e) => setFile(e.target.files[0])} />
                    {file ? (
                        <div className="flex flex-col items-center">
                            <div className="w-14 h-14 bg-primary/20 text-primary rounded-full flex items-center justify-center mb-4">
                                <span className="material-symbols-outlined text-3xl">description</span>
                            </div>
                            <h4 className="text-white font-medium text-lg mb-1">{file.name}</h4>
                            <p className="text-slate-400 text-sm mb-4">{(file.size / 1024).toFixed(1)} KB &bull; {file.type || 'Document'}</p>
                            <button onClick={(e) => { e.stopPropagation(); setFile(null) }} className="text-sm text-red-400 hover:text-red-300 font-medium transition-colors">
                                Remove file
                            </button>
                        </div>
                    ) : (
                        <div className="flex flex-col items-center">
                            <div className="w-16 h-16 bg-[#27272a] text-slate-400 rounded-full flex items-center justify-center mb-4 group-hover:text-primary group-hover:bg-primary/10 transition-colors">
                                <span className="material-symbols-outlined text-3xl">cloud_upload</span>
                            </div>
                            <h4 className="text-white font-medium text-lg mb-1">Drag and drop or click to browse</h4>
                            <p className="text-slate-400 text-sm">Supported: PDF, JPG, PNG, Audio, Video (Max 8MB)</p>
                        </div>
                    )}
                </div>
                <p className="text-xs text-slate-500">Your document is sent to our AI extraction engine (Layer 1) which reads the details automatically — you don't need to fill in amounts or provider names manually.</p>
            </div>
        </div>
    )
}

/* ─── Step Review ─────────────────────────────────────────────────────── */
function StepReview({ policy, claimType, description, incidentDate, file }) {
    const ct = CLAIM_TYPES.find(c => c.key === claimType)
    return (
        <div className="flex flex-col gap-6 max-w-3xl mx-auto">
            <div className="bg-[#111115] border border-[#27272a] rounded-2xl p-6 space-y-5">
                <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider">Claim Summary</h3>
                <div className="flex items-center gap-4 pb-5 border-b border-[#27272a]">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary shrink-0">
                        <span className="material-symbols-outlined">{policy ? policyIcon(policy.type) : 'policy'}</span>
                    </div>
                    <div>
                        <p className="text-white font-semibold">{policy?.name || '—'}</p>
                        <p className="text-slate-500 text-xs font-mono">Policy #{policy?.policy_number || '—'}</p>
                    </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <div><p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Claim Type</p><p className="text-white text-sm font-medium">{ct?.label || '—'}</p></div>
                    <div><p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Incident Date</p><p className="text-white text-sm font-medium">{incidentDate || '—'}</p></div>
                </div>
                <div><p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Description</p><p className="text-slate-300 text-sm leading-relaxed">{description || '—'}</p></div>
                <div className="pt-4 border-t border-[#27272a]">
                    <p className="text-xs text-slate-500 uppercase tracking-wider mb-3">Attached Document</p>
                    {file ? (
                        <div className="flex items-center gap-3 p-3 rounded-xl bg-[#0A0A0C] border border-[#27272a]">
                            <span className="material-symbols-outlined text-primary">description</span>
                            <div>
                                <p className="text-white text-sm font-medium">{file.name}</p>
                                <p className="text-slate-500 text-xs">{(file.size / 1024).toFixed(1)} KB</p>
                            </div>
                            <span className="ml-auto flex items-center gap-1 text-emerald-500 text-xs font-bold">
                                <span className="material-symbols-outlined text-sm">check_circle</span>Ready
                            </span>
                        </div>
                    ) : (
                        <p className="text-slate-500 text-sm italic">No document attached — go back to upload one.</p>
                    )}
                </div>
            </div>
            <div className="flex items-start gap-3 p-4 rounded-xl bg-primary/5 border border-primary/10">
                <span className="material-symbols-outlined text-primary mt-0.5">auto_awesome</span>
                <div>
                    <p className="text-sm font-semibold text-white">AI-Accelerated Processing</p>
                    <p className="text-xs text-slate-400 mt-0.5">Your document will be sent to our AI extraction engine (Layer 1), which reads claim details automatically. Typical processing time is under 24 hours.</p>
                </div>
            </div>
        </div>
    )
}

/* ─── Main Page ──────────────────────────────────────────────────────── */
export default function FileClaimPage() {
    const navigate = useNavigate()
    const { data: policiesData, loading: policiesLoading } = useFetch('/api/policies?status=active')
    const policies = policiesData?.items || []

    const [step, setStep] = useState(1)
    const [selectedPolicyId, setSelectedPolicyId] = useState(null)
    const [claimType, setClaimType] = useState('')
    const [description, setDescription] = useState('')
    const [incidentDate, setIncidentDate] = useState('')
    const [file, setFile] = useState(null)
    const [submitting, setSubmitting] = useState(false)
    const [submitError, setSubmitError] = useState(null)
    const [submitted, setSubmitted] = useState(false)

    const selectedPolicy = policies.find(p => p.id === selectedPolicyId) || policies[0]

    const handleContinue = async () => {
        if (step < 3) { setStep(s => s + 1); return }
        // Step 3 → Submit via n8n webhook
        if (!file) {
            setSubmitError('Please upload at least one document on the previous step.')
            return
        }
        setSubmitting(true)
        setSubmitError(null)
        try {
            const formData = new FormData()
            formData.append('file', file)
            formData.append('policy_id', selectedPolicy?.id || '')
            formData.append('policy_number', selectedPolicy?.policy_number || '')
            formData.append('incident_date', incidentDate || '')
            formData.append('incident_type', claimType || 'other')
            formData.append('incident_description', description || '')

            const res = await fetch(N8N_WEBHOOK, { method: 'POST', body: formData })
            if (!res.ok) throw new Error(`n8n responded with ${res.status}: ${res.statusText}`)
            setSubmitted(true)
        } catch (err) {
            setSubmitError(err.message || 'Submission failed — please ensure n8n is running and try again.')
        } finally {
            setSubmitting(false)
        }
    }

    const handleBack = () => step > 1 ? setStep(s => s - 1) : navigate('/customer/claims')

    // Success state
    if (submitted) {
        return (
            <div className="min-h-screen bg-[#0A0A0C] text-slate-100 font-display antialiased flex items-center justify-center p-6">
                <div className="max-w-md w-full bg-[#111115] border border-[#27272a] rounded-3xl p-12 text-center">
                    <div className="w-24 h-24 bg-emerald-500/20 text-emerald-400 rounded-full flex items-center justify-center mx-auto mb-6">
                        <span className="material-symbols-outlined text-5xl">check_circle</span>
                    </div>
                    <h2 className="text-2xl font-bold text-white mb-3">Claim Submitted!</h2>
                    <p className="text-slate-400 text-sm mb-8">Your document has been sent to the AI extraction engine. Processing typically completes within a few minutes.</p>
                    <button onClick={() => navigate('/customer')} className="bg-primary hover:bg-red-600 text-white font-bold py-3 px-8 rounded-xl transition-all">
                        Return to Dashboard
                    </button>
                </div>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-[#0A0A0C] text-slate-100 font-display antialiased overflow-hidden selection:bg-primary selection:text-white flex flex-col">
            {/* Blurred background */}
            <div aria-hidden="true" className="flex-1 flex flex-col opacity-30 pointer-events-none filter blur-sm">
                <header className="flex items-center justify-between border-b border-[#27272a] bg-[#111115] px-6 py-4">
                    <div className="flex items-center gap-3">
                        <div className="size-8 text-primary">
                            <svg className="w-full h-full" fill="none" viewBox="0 0 48 48"><path d="M36.7273 44C33.9891 44 31.6043 39.8386 30.3636 33.69C29.123 39.8386 26.7382 44 24 44C21.2618 44 18.877 39.8386 17.6364 33.69C16.3957 39.8386 14.0109 44 11.2727 44C7.25611 44 4 35.0457 4 24C4 12.9543 7.25611 4 11.2727 4C14.0109 4 16.3957 8.16144 17.6364 14.31C18.877 8.16144 21.2618 4 24 4C26.7382 4 29.123 8.16144 30.3636 14.31C31.6043 8.16144 33.9891 4 36.7273 4C40.7439 4 44 12.9543 44 24C44 35.0457 40.7439 44 36.7273 44Z" fill="currentColor" /></svg>
                        </div>
                        <h1 className="text-white text-xl font-bold tracking-tight">Intelligence Core</h1>
                    </div>
                </header>
            </div>

            {/* Overlay */}
            <div className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm pointer-events-none" />

            {/* Modal sheet */}
            <div className="fixed inset-x-0 bottom-0 z-50 flex flex-col items-center justify-end md:justify-center h-full pointer-events-none p-4">
                <div className="w-full max-w-4xl bg-[#111115] border border-[#27272a] shadow-2xl rounded-t-3xl md:rounded-2xl pointer-events-auto flex flex-col max-h-[90vh] md:max-h-[85vh] overflow-hidden">

                    {/* Drag handle */}
                    <div className="w-full flex justify-center pt-3 pb-1 md:hidden bg-[#111115]">
                        <div className="w-12 h-1.5 bg-[#27272a] rounded-full" />
                    </div>

                    {/* Header */}
                    <div className="px-6 py-6 border-b border-[#27272a] bg-[#111115] sticky top-0 z-10 flex flex-col gap-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <h2 className="text-2xl md:text-3xl font-bold text-white tracking-tight">File a New Claim</h2>
                                <p className="text-slate-400 text-sm mt-1">Provide details and upload evidence for rapid processing.</p>
                            </div>
                            <button onClick={() => navigate('/customer/claims')} className="p-2 text-slate-400 hover:text-white hover:bg-[#27272a] rounded-full transition-colors">
                                <span className="material-symbols-outlined">close</span>
                            </button>
                        </div>
                        {/* Step bar */}
                        <div className="flex items-center gap-4 justify-center">
                            {['Details', 'Documents', 'Review'].map((label, i) => {
                                const num = i + 1
                                const done = step > num, active = step === num
                                return (
                                    <div key={label} className="flex items-center gap-2">
                                        <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-all ${done ? 'bg-primary border-primary text-white' : active ? 'bg-[#111115] border-primary text-primary' : 'bg-[#111115] border-[#27272a] text-slate-500'}`}>
                                            {done ? <span className="material-symbols-outlined text-sm">check</span> : num}
                                        </div>
                                        <span className={`text-xs font-medium ${done ? 'text-white' : active ? 'text-primary' : 'text-slate-500'}`}>{label}</span>
                                        {i < 2 && <div className="w-8 h-px bg-[#27272a]" />}
                                    </div>
                                )
                            })}
                        </div>
                    </div>

                    {/* Body */}
                    <div className="flex-1 overflow-y-auto p-6 bg-[#0A0A0C]">
                        {step === 1 && (
                            <div className="flex flex-col gap-8 max-w-3xl mx-auto">
                                {/* Policy picker */}
                                <div className="space-y-4">
                                    <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider">Select Policy</h3>
                                    {policiesLoading
                                        ? <div className="grid grid-cols-1 md:grid-cols-3 gap-4"><SkeletonList items={3} /></div>
                                        : (
                                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                                {policies.map(p => (
                                                    <button key={p.id} onClick={() => setSelectedPolicyId(p.id)}
                                                        className={`bg-[#111115] border-2 rounded-xl p-4 text-left cursor-pointer relative transition-all ${(selectedPolicyId || policies[0]?.id) === p.id ? 'border-primary' : 'border-[#27272a] opacity-60 hover:opacity-100'}`}>
                                                        {(selectedPolicyId || policies[0]?.id) === p.id && <span className="material-symbols-outlined text-xl text-primary absolute top-3 right-3">check_circle</span>}
                                                        <div className={`p-2 rounded-lg w-fit mb-3 ${(selectedPolicyId || policies[0]?.id) === p.id ? 'bg-primary/10 text-primary' : 'bg-[#27272a]/50 text-slate-400'}`}>
                                                            <span className="material-symbols-outlined">{policyIcon(p.type)}</span>
                                                        </div>
                                                        <h4 className="text-white font-bold text-base mb-1">{p.name}</h4>
                                                        <p className="text-slate-500 text-xs font-mono">{p.policy_number}</p>
                                                        <div className="mt-3 flex items-center gap-2 text-[10px] text-emerald-500 font-bold uppercase tracking-wide">
                                                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />Active
                                                        </div>
                                                    </button>
                                                ))}
                                            </div>
                                        )
                                    }
                                </div>
                                <div className="w-full h-px bg-[#27272a]" />
                                {/* Claim type */}
                                <div className="space-y-3">
                                    <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider">Claim Type</h3>
                                    <div className="grid grid-cols-2 gap-3">
                                        {CLAIM_TYPES.map(ct => (
                                            <button key={ct.key} onClick={() => setClaimType(ct.key)}
                                                className={`p-3 rounded-xl border text-left text-sm font-medium transition-all ${claimType === ct.key ? 'border-primary bg-primary/10 text-white' : 'border-[#27272a] bg-[#111115] text-slate-400 hover:border-slate-500 hover:text-white'}`}>
                                                {ct.label}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                                {/* Incident date */}
                                <div className="space-y-3">
                                    <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider">Incident Date</h3>
                                    <input type="date" value={incidentDate} onChange={e => setIncidentDate(e.target.value)}
                                        className="w-full rounded-xl border border-[#27272a] bg-[#111115] px-4 py-3 text-white text-sm focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary [color-scheme:dark]" />
                                </div>
                                {/* Description */}
                                <div className="space-y-3">
                                    <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider">Describe the Incident</h3>
                                    <textarea rows={4} value={description} onChange={e => setDescription(e.target.value)}
                                        placeholder="Provide a clear description of what happened, where, and any losses incurred..."
                                        className="w-full rounded-xl border border-[#27272a] bg-[#111115] px-4 py-3 text-white text-sm placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary resize-none" />
                                </div>
                            </div>
                        )}
                        {step === 2 && <StepDocuments file={file} setFile={setFile} />}
                        {step === 3 && <StepReview policy={selectedPolicy} claimType={claimType} description={description} incidentDate={incidentDate} file={file} />}
                    </div>

                    {/* Footer */}
                    <div className="border-t border-[#27272a] bg-[#111115] p-6 flex flex-col sm:flex-row gap-4 sticky bottom-0 z-10">
                        <button onClick={handleBack} className="flex-1 bg-transparent border border-[#27272a] hover:bg-[#27272a] text-slate-300 hover:text-white font-bold py-3 px-6 rounded-xl transition-all">Back</button>
                        <button onClick={handleContinue} disabled={submitting}
                            className="flex-[2] bg-primary hover:bg-red-600 disabled:opacity-60 text-white font-bold py-3 px-6 rounded-xl transition-all shadow-lg shadow-primary/20 flex items-center justify-center gap-2">
                            {submitting
                                ? <><span className="material-symbols-outlined text-lg animate-spin">progress_activity</span>Submitting...</>
                                : step < 3
                                    ? <>Continue to {['Documents', 'Review', ''][step - 1]} <span className="material-symbols-outlined text-lg">arrow_forward</span></>
                                    : <>Submit Claim <span className="material-symbols-outlined text-lg">send</span></>
                            }
                        </button>
                    </div>
                </div>
            </div>

            <BottomNav />
            <ErrorToast message={submitError} onClose={() => setSubmitError(null)} />
        </div>
    )
}
