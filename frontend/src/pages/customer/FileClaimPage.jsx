import { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import BottomNav from '../../components/customer/BottomNav'

/* ─── Static data ─────────────────────────────────────────────── */
const POLICIES = [
    { key: 'travel', icon: 'flight_takeoff', label: 'Travel Protect', id: 'POL-TRV-8821' },
    { key: 'auto', icon: 'directions_car', label: 'Auto Premium', id: 'POL-AUT-4490' },
    { key: 'health', icon: 'health_and_safety', label: 'Health Standard', id: 'POL-HLT-1029' },
]

const CLAIM_TYPES = [
    { key: 'delay', label: 'Trip Delay / Cancellation' },
    { key: 'medical', label: 'Medical Emergency Abroad' },
    { key: 'baggage', label: 'Lost / Damaged Baggage' },
    { key: 'other', label: 'Other' },
]

const EVIDENCE_ITEMS = {
    travel: [
        { key: 'invoice', icon: 'receipt_long', label: 'Original Invoice / Receipt', sub: 'Proof of payment for incurred expenses' },
        { key: 'boarding', icon: 'flight', label: 'Boarding Pass / E-Ticket', sub: 'Confirming travel dates and passenger details' },
        { key: 'incident', icon: 'description', label: 'Incident Report', sub: 'Official statement or police report (if applicable)' },
    ],
    auto: [
        { key: 'police', icon: 'local_police', label: 'Police Report', sub: 'Official accident or theft report' },
        { key: 'photos', icon: 'photo_camera', label: 'Damage Photos', sub: 'Photos of damage from multiple angles' },
        { key: 'repair', icon: 'build', label: 'Repair Estimate', sub: 'Workshop quote for repairs' },
    ],
    health: [
        { key: 'prescription', icon: 'medication', label: 'Prescription / Doctor Notes', sub: 'Signed medical documentation' },
        { key: 'bills', icon: 'receipt_long', label: 'Hospital / Clinic Bills', sub: 'Itemised receipts for treatment costs' },
        { key: 'id', icon: 'badge', label: 'Government ID', sub: 'Proof of identity matching the policy' },
    ],
}

/* ─── Step indicator ─────────────────────────────────────────── */
function StepIndicator({ step }) {
    const steps = ['Details', 'Documents', 'Review']
    return (
        <div className="flex items-center justify-between w-full max-w-2xl mx-auto px-4">
            {steps.map((label, i) => {
                const num = i + 1
                const done = step > num
                const active = step === num
                return (
                    <div key={label} className="flex flex-col items-center gap-2 relative z-10" style={{ flex: '0 0 auto' }}>
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-all
                            ${done ? 'bg-primary border-primary text-white'
                                : active ? 'bg-transparent border-primary text-primary'
                                    : 'bg-transparent border-[#27272a] text-slate-500'}`}>
                            {done
                                ? <span className="material-symbols-outlined text-sm">check</span>
                                : num}
                        </div>
                        <span className={`text-xs font-medium ${done || active ? 'text-primary' : 'text-slate-500'}`}>
                            {num}. {label}
                        </span>
                        {/* Connector line after each step except the last */}
                        {i < steps.length - 1 && (
                            <div className={`absolute top-4 left-8 right-[-100%] h-0.5 -z-10 transition-all ${step > num ? 'bg-primary' : '#27272a'}`}
                                style={{ width: 'calc(100% + 2rem)', left: '2rem', right: 'auto' }} />
                        )}
                    </div>
                )
            })}
        </div>
    )
}

/* ─── STEP 1: Details ─────────────────────────────────────────── */
function StepDetails({ selected, setSelected, claimType, setClaimType, description, setDescription, incidentDate, setIncidentDate }) {
    return (
        <div className="flex flex-col gap-8 max-w-3xl mx-auto">
            {/* Policy picker */}
            <div className="space-y-4">
                <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider">Select Policy</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {POLICIES.map(p => (
                        <button
                            key={p.key}
                            onClick={() => setSelected(p.key)}
                            className={`bg-[#111115] border-2 rounded-xl p-4 text-left cursor-pointer relative transition-all
                                ${selected === p.key ? 'border-primary' : 'border-[#27272a] opacity-60 hover:opacity-100'}`}
                        >
                            {selected === p.key && (
                                <span className="material-symbols-outlined text-xl text-primary absolute top-3 right-3">check_circle</span>
                            )}
                            <div className={`p-2 rounded-lg w-fit mb-3 ${selected === p.key ? 'bg-primary/10 text-primary' : 'bg-[#27272a]/50 text-slate-400'}`}>
                                <span className="material-symbols-outlined">{p.icon}</span>
                            </div>
                            <h4 className="text-white font-bold text-base mb-1">{p.label}</h4>
                            <p className="text-slate-500 text-xs font-mono">{p.id}</p>
                            <div className="mt-3 flex items-center gap-2 text-[10px] text-emerald-500 font-bold uppercase tracking-wide">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> Active
                            </div>
                        </button>
                    ))}
                </div>
            </div>

            <div className="w-full h-px bg-[#27272a]"></div>

            {/* Claim type */}
            <div className="space-y-3">
                <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider">Claim Type</h3>
                <div className="grid grid-cols-2 gap-3">
                    {CLAIM_TYPES.map(ct => (
                        <button
                            key={ct.key}
                            onClick={() => setClaimType(ct.key)}
                            className={`p-3 rounded-xl border text-left text-sm font-medium transition-all
                                ${claimType === ct.key
                                    ? 'border-primary bg-primary/10 text-white'
                                    : 'border-[#27272a] bg-[#111115] text-slate-400 hover:border-slate-500 hover:text-white'}`}
                        >
                            {ct.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Incident date */}
            <div className="space-y-3">
                <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider">Incident Date</h3>
                <input
                    type="date"
                    value={incidentDate}
                    onChange={e => setIncidentDate(e.target.value)}
                    className="w-full rounded-xl border border-[#27272a] bg-[#111115] px-4 py-3 text-white text-sm focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary transition-all [color-scheme:dark]"
                />
            </div>

            {/* Description */}
            <div className="space-y-3">
                <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider">Describe the Incident</h3>
                <textarea
                    rows={4}
                    value={description}
                    onChange={e => setDescription(e.target.value)}
                    placeholder="Provide a clear description of what happened, where, and any losses incurred..."
                    className="w-full rounded-xl border border-[#27272a] bg-[#111115] px-4 py-3 text-white text-sm placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary transition-all resize-none"
                />
            </div>
        </div>
    )
}

/* ─── STEP 2: Documents ───────────────────────────────────────── */
function StepDocuments({ policyKey, uploaded, setUploaded }) {
    const fileRef = useRef()
    const items = EVIDENCE_ITEMS[policyKey] || EVIDENCE_ITEMS.travel

    const toggle = (key) => setUploaded(prev =>
        prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]
    )

    return (
        <div className="flex flex-col gap-8 max-w-3xl mx-auto">
            {/* Drop zone */}
            <div className="space-y-4">
                <div className="flex items-center justify-between">
                    <h3 className="text-lg font-bold text-white">Required Evidence</h3>
                    <span className="text-xs text-primary bg-primary/10 px-2 py-1 rounded border border-primary/20">Action Required</span>
                </div>
                <div
                    className="border-2 border-dashed border-[#27272a] hover:border-primary/50 bg-[#111115] hover:bg-[#1d1d20] rounded-2xl p-8 flex flex-col items-center justify-center text-center transition-all cursor-pointer group"
                    onClick={() => fileRef.current.click()}
                >
                    <input ref={fileRef} type="file" multiple accept=".pdf,.jpg,.jpeg,.png" className="hidden" />
                    <div className="w-14 h-14 bg-[#27272a] rounded-full flex items-center justify-center text-slate-400 group-hover:text-primary group-hover:bg-primary/10 transition-colors mb-4">
                        <span className="material-symbols-outlined text-3xl">cloud_upload</span>
                    </div>
                    <h4 className="text-white font-medium text-lg mb-1">Drag and drop files here</h4>
                    <p className="text-slate-400 text-sm mb-6">Supported formats: PDF, JPG, PNG (Max 10MB)</p>
                    <span className="px-6 py-2.5 rounded-lg border border-[#27272a] bg-transparent text-slate-300 hover:text-white hover:border-slate-500 hover:bg-[#27272a] transition-all text-sm font-semibold">
                        Browse Files
                    </span>
                </div>
            </div>

            {/* Per-item list */}
            <div className="flex flex-col gap-3">
                <p className="text-sm text-slate-400 mb-1">Based on your claim type, please provide:</p>
                {items.map(item => {
                    const done = uploaded.includes(item.key)
                    return (
                        <div key={item.key} className="bg-[#111115] border border-[#27272a] rounded-xl p-4 flex items-center justify-between gap-4 hover:border-[#3f3f46] transition-colors">
                            <div className="flex items-center gap-4">
                                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary shrink-0">
                                    <span className="material-symbols-outlined">{item.icon}</span>
                                </div>
                                <div>
                                    <h5 className="text-slate-200 text-sm font-semibold">{item.label}</h5>
                                    <p className="text-slate-500 text-xs">{item.sub}</p>
                                </div>
                            </div>
                            {done ? (
                                <div className="flex items-center gap-2 shrink-0">
                                    <div className="flex items-center gap-1.5 px-2 py-1 rounded bg-emerald-500/10 border border-emerald-500/20">
                                        <span className="material-symbols-outlined text-emerald-500 text-sm">check</span>
                                        <span className="text-[10px] text-emerald-500 font-bold uppercase">Uploaded</span>
                                    </div>
                                    <button onClick={() => toggle(item.key)} className="text-slate-500 hover:text-white transition-colors">
                                        <span className="material-symbols-outlined text-sm">delete</span>
                                    </button>
                                </div>
                            ) : (
                                <button
                                    onClick={() => toggle(item.key)}
                                    className="text-xs text-slate-400 hover:text-primary flex items-center gap-1 shrink-0 transition-colors"
                                >
                                    <span className="material-symbols-outlined text-sm">add</span> Upload
                                </button>
                            )}
                        </div>
                    )
                })}
            </div>
        </div>
    )
}

/* ─── STEP 3: Review ─────────────────────────────────────────── */
function StepReview({ policyKey, claimType, description, incidentDate, uploaded }) {
    const policy = POLICIES.find(p => p.key === policyKey)
    const ct = CLAIM_TYPES.find(c => c.key === claimType)
    const items = EVIDENCE_ITEMS[policyKey] || EVIDENCE_ITEMS.travel

    return (
        <div className="flex flex-col gap-6 max-w-3xl mx-auto">
            <div className="bg-[#111115] border border-[#27272a] rounded-2xl p-6 space-y-5">
                <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider">Claim Summary</h3>

                {/* Policy */}
                <div className="flex items-center gap-4 pb-5 border-b border-[#27272a]">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary shrink-0">
                        <span className="material-symbols-outlined">{policy?.icon}</span>
                    </div>
                    <div>
                        <p className="text-white font-semibold">{policy?.label}</p>
                        <p className="text-slate-500 text-xs font-mono">{policy?.id}</p>
                    </div>
                </div>

                {/* Details grid */}
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Claim Type</p>
                        <p className="text-white text-sm font-medium">{ct?.label || '—'}</p>
                    </div>
                    <div>
                        <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Incident Date</p>
                        <p className="text-white text-sm font-medium">{incidentDate || '—'}</p>
                    </div>
                </div>

                {/* Description */}
                <div>
                    <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Description</p>
                    <p className="text-slate-300 text-sm leading-relaxed">{description || '—'}</p>
                </div>

                {/* Documents */}
                <div className="pt-4 border-t border-[#27272a]">
                    <p className="text-xs text-slate-500 uppercase tracking-wider mb-3">Documents</p>
                    <div className="flex flex-col gap-2">
                        {items.map(item => (
                            <div key={item.key} className="flex items-center justify-between text-sm">
                                <span className="text-slate-300">{item.label}</span>
                                {uploaded.includes(item.key)
                                    ? <span className="flex items-center gap-1 text-emerald-500 text-xs font-bold"><span className="material-symbols-outlined text-sm">check_circle</span>Uploaded</span>
                                    : <span className="flex items-center gap-1 text-slate-500 text-xs"><span className="material-symbols-outlined text-sm">radio_button_unchecked</span>Pending</span>
                                }
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* AI notice */}
            <div className="flex items-start gap-3 p-4 rounded-xl bg-primary/5 border border-primary/10">
                <span className="material-symbols-outlined text-primary mt-0.5">auto_awesome</span>
                <div>
                    <p className="text-sm font-semibold text-white">AI-Accelerated Processing</p>
                    <p className="text-xs text-slate-400 mt-0.5">Our Intelligence Core will analyse your claim automatically. Typical processing time is under 24 hours for complete submissions.</p>
                </div>
            </div>
        </div>
    )
}

/* ─── Main page ──────────────────────────────────────────────── */
export default function FileClaimPage() {
    const navigate = useNavigate()
    const [step, setStep] = useState(1)
    const [selectedPolicy, setSelectedPolicy] = useState('travel')
    const [claimType, setClaimType] = useState('')
    const [description, setDescription] = useState('')
    const [incidentDate, setIncidentDate] = useState('')
    const [uploaded, setUploaded] = useState(['incident']) // pre-checked one

    const STEP_LABELS = { 1: 'Details', 2: 'Documents', 3: 'Review' }

    const handleContinue = () => {
        if (step < 3) setStep(s => s + 1)
        else navigate('/customer/claim-result')
    }

    const handleBack = () => {
        if (step > 1) setStep(s => s - 1)
        else navigate('/customer/claims')
    }

    return (
        <div className="min-h-screen bg-[#0A0A0C] text-slate-100 font-display antialiased overflow-hidden selection:bg-primary selection:text-white flex flex-col">

            {/* Blurred background */}
            <div aria-hidden="true" className="flex-1 flex flex-col opacity-30 pointer-events-none filter blur-sm transition-all duration-300">
                <header className="flex items-center justify-between border-b border-[#27272a] bg-[#111115] px-6 py-4 sticky top-0 z-50">
                    <div className="flex items-center gap-3">
                        <div className="size-8 text-primary">
                            <svg className="w-full h-full" fill="none" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
                                <path d="M36.7273 44C33.9891 44 31.6043 39.8386 30.3636 33.69C29.123 39.8386 26.7382 44 24 44C21.2618 44 18.877 39.8386 17.6364 33.69C16.3957 39.8386 14.0109 44 11.2727 44C7.25611 44 4 35.0457 4 24C4 12.9543 7.25611 4 11.2727 4C14.0109 4 16.3957 8.16144 17.6364 14.31C18.877 8.16144 21.2618 4 24 4C26.7382 4 29.123 8.16144 30.3636 14.31C31.6043 8.16144 33.9891 4 36.7273 4C40.7439 4 44 12.9543 44 24C44 35.0457 40.7439 44 36.7273 44Z" fill="currentColor" />
                            </svg>
                        </div>
                        <h1 className="text-white text-xl font-bold tracking-tight">Intelligence Core</h1>
                    </div>
                    <div className="hidden md:flex items-center gap-2 px-3 py-1.5 bg-[#0A0A0C] rounded-full border border-[#27272a]">
                        <span className="relative flex h-2.5 w-2.5">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-primary"></span>
                        </span>
                        <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">System Operational</span>
                    </div>
                </header>
                <main className="flex-1 max-w-7xl mx-auto w-full p-4 md:p-8 pb-32">
                    <h2 className="text-4xl md:text-5xl font-bold text-white tracking-tight mb-2">Good morning, Kumud</h2>
                    <p className="text-slate-400 text-lg">Intelligence Core active. Your coverage is optimized.</p>
                </main>
            </div>

            {/* Overlay */}
            <div className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm pointer-events-none" />

            {/* Modal sheet */}
            <div className="fixed inset-x-0 bottom-0 z-50 flex flex-col items-center justify-end md:justify-center h-full pointer-events-none p-4">
                <div className="w-full max-w-4xl bg-[#111115] border border-[#27272a] shadow-2xl rounded-t-3xl md:rounded-2xl pointer-events-auto flex flex-col max-h-[90vh] md:max-h-[85vh] relative overflow-hidden">

                    {/* Mobile drag handle */}
                    <div className="w-full flex justify-center pt-3 pb-1 md:hidden bg-[#111115] sticky top-0 z-20">
                        <div className="w-12 h-1.5 bg-[#27272a] rounded-full"></div>
                    </div>

                    {/* Sheet header — step info */}
                    <div className="px-6 py-6 border-b border-[#27272a] bg-[#111115] sticky top-0 z-10 flex flex-col gap-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <h2 className="text-2xl md:text-3xl font-bold text-white tracking-tight">File a New Claim</h2>
                                <p className="text-slate-400 text-sm mt-1">Provide details and upload evidence for rapid processing.</p>
                            </div>
                            <button
                                onClick={() => navigate('/customer/claims')}
                                className="p-2 text-slate-400 hover:text-white hover:bg-[#27272a] rounded-full transition-colors md:absolute md:top-6 md:right-6"
                            >
                                <span className="material-symbols-outlined">close</span>
                            </button>
                        </div>

                        {/* Step bar */}
                        <div className="flex items-center justify-between w-full max-w-2xl mx-auto px-4">
                            {[1, 2, 3].map((num, i) => {
                                const labels = ['Details', 'Documents', 'Review']
                                const done = step > num
                                const active = step === num
                                return (
                                    <div key={num} className="flex flex-col items-center gap-2" style={{ flex: '0 0 auto' }}>
                                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-all
                                            ${done ? 'bg-primary border-primary text-white'
                                                : active ? 'bg-[#111115] border-primary text-primary'
                                                    : 'bg-[#111115] border-[#27272a] text-slate-500'}`}>
                                            {done
                                                ? <span className="material-symbols-outlined text-sm">check</span>
                                                : num}
                                        </div>
                                        <span className={`text-xs font-medium ${done || active ? (done ? 'text-white' : 'text-primary') : 'text-slate-500'}`}>
                                            {num}. {labels[i]}
                                        </span>
                                        {/* Inline connector between circles */}
                                        {i < 2 && (
                                            <div className="hidden" /> /* We'll use the row layout instead */
                                        )}
                                    </div>
                                )
                            })}

                            {/* Overlay connectors — render as absolute within a relative wrapper */}
                        </div>

                        {/* Prettier: re-render step bar properly */}
                        <div className="sr-only">{/* above is intentionally simplified; see below */}</div>
                    </div>

                    {/* Render the real stepper in header-extension */}
                    {/* We override above with this simpler absolutely-positioned version */}
                    <div className="hidden" id="stepper-override" />

                    {/* Scrollable body */}
                    <div className="flex-1 overflow-y-auto p-6 bg-[#0A0A0C]">
                        {step === 1 && (
                            <StepDetails
                                selected={selectedPolicy} setSelected={setSelectedPolicy}
                                claimType={claimType} setClaimType={setClaimType}
                                description={description} setDescription={setDescription}
                                incidentDate={incidentDate} setIncidentDate={setIncidentDate}
                            />
                        )}
                        {step === 2 && (
                            <StepDocuments
                                policyKey={selectedPolicy}
                                uploaded={uploaded} setUploaded={setUploaded}
                            />
                        )}
                        {step === 3 && (
                            <StepReview
                                policyKey={selectedPolicy}
                                claimType={claimType}
                                description={description}
                                incidentDate={incidentDate}
                                uploaded={uploaded}
                            />
                        )}
                    </div>

                    {/* Footer actions */}
                    <div className="border-t border-[#27272a] bg-[#111115] p-6 flex flex-col sm:flex-row gap-4 sticky bottom-0 z-10">
                        <button
                            onClick={handleBack}
                            className="flex-1 bg-transparent border border-[#27272a] hover:bg-[#27272a] text-slate-300 hover:text-white font-bold py-3 px-6 rounded-xl transition-all"
                        >
                            Back
                        </button>
                        <button
                            onClick={handleContinue}
                            className="flex-[2] bg-primary hover:bg-red-600 text-white font-bold py-3 px-6 rounded-xl transition-all shadow-lg shadow-primary/20 flex items-center justify-center gap-2"
                        >
                            {step < 3 ? (
                                <>Continue to {['Documents', 'Review', ''][step - 1]} <span className="material-symbols-outlined text-lg">arrow_forward</span></>
                            ) : (
                                <>Submit Claim <span className="material-symbols-outlined text-lg">send</span></>
                            )}
                        </button>
                    </div>
                </div>
            </div>

            <BottomNav />
        </div>
    )
}
