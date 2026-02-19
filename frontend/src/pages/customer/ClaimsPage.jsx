import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Header from '../../components/customer/Header'
import BottomNav from '../../components/customer/BottomNav'

const existingClaims = [
    { id: 'CLM-9803', type: 'Auto — Collision', amount: '$1,240', status: 'Approved', date: 'Feb 12', icon: 'directions_car' },
    { id: 'CLM-9721', type: 'Home — Water Damage', amount: '$3,800', status: 'Under Review', date: 'Jan 28', icon: 'home' },
    { id: 'CLM-9601', type: 'Medical — ER Visit', amount: '$620', status: 'Approved', date: 'Jan 5', icon: 'local_hospital' },
]

const statusColor = (s) =>
    s === 'Approved' ? 'text-emerald-400 bg-emerald-400/10' : s === 'Under Review' ? 'text-yellow-400 bg-yellow-400/10' : 'text-blue-400 bg-blue-400/10'

export default function ClaimsPage() {
    const navigate = useNavigate()
    const [sheetOpen, setSheetOpen] = useState(false)
    const [step, setStep] = useState(1)
    const [form, setForm] = useState({ type: '', desc: '', amount: '' })

    const submit = () => {
        setSheetOpen(false)
        setStep(1)
        navigate('/customer/claim-result')
    }

    return (
        <div className="min-h-screen bg-background-dark text-slate-100 flex flex-col pb-32">
            <Header />
            <main className="mx-auto w-full max-w-2xl px-4 pt-8 space-y-6">
                <div className="flex items-end justify-between">
                    <div>
                        <h1 className="text-2xl font-bold text-white">Claims</h1>
                        <p className="text-slate-500 text-sm mt-1">Track and file insurance claims</p>
                    </div>
                    <button
                        onClick={() => setSheetOpen(true)}
                        className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary hover:bg-primary-dark text-white font-semibold text-sm transition-colors"
                    >
                        <span className="material-symbols-outlined text-[18px]">add</span>
                        New Claim
                    </button>
                </div>

                <div className="space-y-3">
                    {existingClaims.map((c) => (
                        <div key={c.id} className="flex items-center justify-between p-4 rounded-2xl border border-surface-border bg-surface-dark-customer hover:border-primary/30 transition-all cursor-pointer">
                            <div className="flex items-center gap-4">
                                <div className="size-11 rounded-xl bg-surface-border flex items-center justify-center">
                                    <span className="material-symbols-outlined text-slate-400">{c.icon}</span>
                                </div>
                                <div>
                                    <p className="text-sm font-semibold text-white">{c.type}</p>
                                    <p className="text-xs text-slate-500 font-mono">{c.id} · {c.date}</p>
                                </div>
                            </div>
                            <div className="text-right">
                                <p className="text-sm font-bold text-white">{c.amount}</p>
                                <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${statusColor(c.status)}`}>{c.status}</span>
                            </div>
                        </div>
                    ))}
                </div>
            </main>

            {/* Bottom Sheet overlay */}
            {sheetOpen && (
                <div className="fixed inset-0 z-40" onClick={() => setSheetOpen(false)}>
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
                </div>
            )}

            {/* Bottom Sheet */}
            <div className={`fixed bottom-0 left-0 right-0 z-50 bg-surface-dark-customer border-t border-surface-border rounded-t-2xl transition-transform duration-300 ${sheetOpen ? 'translate-y-0' : 'translate-y-full'}`}>
                <div className="mx-auto w-10 h-1 bg-surface-border rounded-full mt-3 mb-6" />
                <div className="px-6 pb-10 max-w-2xl mx-auto">
                    {step === 1 && (
                        <>
                            <h2 className="text-lg font-bold text-white mb-6">File New Claim</h2>
                            <div className="space-y-4">
                                <div>
                                    <label className="text-sm text-slate-400 mb-2 block">Claim Type</label>
                                    <select
                                        className="w-full bg-background-dark border border-surface-border rounded-xl px-4 py-3 text-white text-sm"
                                        onChange={(e) => setForm({ ...form, type: e.target.value })}
                                    >
                                        <option value="">Select type...</option>
                                        <option>Auto — Collision</option>
                                        <option>Auto — Theft</option>
                                        <option>Home — Water Damage</option>
                                        <option>Medical — ER Visit</option>
                                        <option>Property — Fire</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="text-sm text-slate-400 mb-2 block">Estimated Amount ($)</label>
                                    <input
                                        type="number"
                                        className="w-full bg-background-dark border border-surface-border rounded-xl px-4 py-3 text-white text-sm"
                                        placeholder="0.00"
                                        onChange={(e) => setForm({ ...form, amount: e.target.value })}
                                    />
                                </div>
                                <button onClick={() => setStep(2)} className="w-full py-3.5 rounded-xl bg-primary hover:bg-primary-dark text-white font-semibold text-sm transition-colors">
                                    Continue
                                </button>
                            </div>
                        </>
                    )}
                    {step === 2 && (
                        <>
                            <h2 className="text-lg font-bold text-white mb-4">Additional Details</h2>
                            <p className="text-sm text-slate-500 mb-6">Claim type: <span className="text-white">{form.type}</span> · <span className="text-white">${form.amount}</span></p>
                            <div className="mb-4">
                                <label className="text-sm text-slate-400 mb-2 block">Description</label>
                                <textarea
                                    rows={4}
                                    className="w-full bg-background-dark border border-surface-border rounded-xl px-4 py-3 text-white text-sm resize-none"
                                    placeholder="Briefly describe what happened..."
                                    onChange={(e) => setForm({ ...form, desc: e.target.value })}
                                />
                            </div>
                            <div className="flex gap-3">
                                <button onClick={() => setStep(1)} className="flex-1 py-3.5 rounded-xl border border-surface-border text-slate-400 font-semibold text-sm hover:text-white transition-colors">Back</button>
                                <button onClick={submit} className="flex-1 py-3.5 rounded-xl bg-primary hover:bg-primary-dark text-white font-semibold text-sm transition-colors">Submit Claim</button>
                            </div>
                        </>
                    )}
                </div>
            </div>

            <BottomNav />
        </div>
    )
}
