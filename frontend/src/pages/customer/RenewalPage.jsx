import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Header from '../../components/customer/Header'
import BottomNav from '../../components/customer/BottomNav'
import { useFetch } from '../../hooks/useFetch'
import { Skeleton } from '../../components/shared/Skeleton'
import ErrorToast from '../../components/shared/ErrorToast'

const steps = ['Coverage Review', 'Adjustments', 'Payment', 'Confirm']

export default function RenewalPage() {
    const navigate = useNavigate()
    const [step, setStep] = useState(0)
    const [addons, setAddons] = useState({ roadside: false, rental: false, glass: false })
    const [toastError, setToastError] = useState(null)

    // Fetch all policies and show expired / expiring ones
    const { data, loading, error } = useFetch('/api/policies')
    if (error && !toastError) setToastError(error)

    const policies = data?.items || []
    // Prefer expiring/expired policies for the renewal flow; fallback to first active
    const policy = policies.find(p => p.status !== 'active') || policies[0]
    const base = policy?.premium ? parseInt(policy.premium.replace(/[^0-9]/g, ''), 10) : 142
    const extra = (addons.roadside ? 8 : 0) + (addons.rental ? 12 : 0) + (addons.glass ? 5 : 0)

    const next = () => step < steps.length - 1 ? setStep(step + 1) : navigate('/customer')

    return (
        <div className="min-h-screen bg-background-dark text-slate-100 flex flex-col pb-32">
            <Header showBack />
            <main className="mx-auto w-full max-w-2xl px-4 pt-8 pb-8 space-y-6">
                {loading
                    ? <><Skeleton className="h-7 w-40" /><Skeleton className="h-4 w-64 mt-1" /></>
                    : <>
                        <h1 className="text-2xl font-bold text-white">Renew Policy</h1>
                        {policy && <p className="text-slate-500 text-sm -mt-4">{policy.policy_number} — {policy.name} · Expires {policy.renewal_date || '—'}</p>}
                    </>
                }

                {/* Stepper */}
                <div className="flex items-center gap-2">
                    {steps.map((s, i) => (
                        <div key={s} className="flex items-center flex-1">
                            <div className={`size-8 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${i <= step ? 'bg-primary text-white' : 'bg-surface-dark-customer border border-surface-border text-slate-500'}`}>
                                {i < step ? <span className="material-symbols-outlined text-[18px]">check</span> : i + 1}
                            </div>
                            {i < steps.length - 1 && (
                                <div className={`flex-1 h-0.5 mx-2 rounded-full ${i < step ? 'bg-primary' : 'bg-surface-border'}`} />
                            )}
                        </div>
                    ))}
                </div>

                {/* Step 0: Coverage Review */}
                {step === 0 && (
                    <div className="space-y-3">
                        <div className="rounded-2xl border border-surface-border bg-surface-dark-customer p-6">
                            <h2 className="text-base font-semibold text-white mb-4">Current Coverage</h2>
                            {loading
                                ? <div className="space-y-2">{[0, 1, 2, 3].map(i => <div key={i} className="flex justify-between py-2"><Skeleton className="h-4 w-28" /><Skeleton className="h-4 w-20" /></div>)}</div>
                                : (policy?.extra_stats
                                    ? Object.entries(policy.extra_stats).map(([k, v]) => (
                                        <div key={k} className="flex justify-between py-2 border-b border-surface-border last:border-0 text-sm">
                                            <span className="text-slate-500 capitalize">{k.replace(/_/g, ' ')}</span>
                                            <span className="text-white font-medium">{v}</span>
                                        </div>
                                    ))
                                    : [['Coverage', policy?.coverage_amount || '—'], ['Premium', `${policy?.premium || '—'}${policy?.premium_suffix || ''}`], ['Renewal', policy?.renewal_date || '—']].map(([l, v]) => (
                                        <div key={l} className="flex justify-between py-2 border-b border-surface-border last:border-0 text-sm">
                                            <span className="text-slate-500">{l}</span>
                                            <span className="text-white font-medium">{v}</span>
                                        </div>
                                    ))
                                )
                            }
                        </div>
                        <div className="flex items-center gap-3 p-4 rounded-2xl bg-emerald-400/5 border border-emerald-400/20">
                            <span className="material-symbols-outlined text-emerald-400 text-[22px]">verified</span>
                            <p className="text-sm text-emerald-400">Your coverage is up to date. No changes required.</p>
                        </div>
                    </div>
                )}

                {/* Step 1: Add-ons */}
                {step === 1 && (
                    <div className="rounded-2xl border border-surface-border bg-surface-dark-customer p-6 space-y-4">
                        <h2 className="text-base font-semibold text-white mb-2">Optional Add-ons</h2>
                        {[
                            { key: 'roadside', label: 'Roadside Assistance', desc: '24/7 towing and breakdown support', price: '+₹8/mo' },
                            { key: 'rental', label: 'Rental Reimbursement', desc: 'Up to $50/day while car is in repair', price: '+₹12/mo' },
                            { key: 'glass', label: 'Glass Coverage', desc: 'Deductible-free windscreen replacement', price: '+₹5/mo' },
                        ].map(a => (
                            <div key={a.key} className="flex items-center justify-between py-3 border-b border-surface-border last:border-0">
                                <div>
                                    <p className="text-sm font-medium text-white">{a.label}</p>
                                    <p className="text-xs text-slate-500">{a.desc} · <span className="text-white">{a.price}</span></p>
                                </div>
                                <button onClick={() => setAddons({ ...addons, [a.key]: !addons[a.key] })}
                                    className={`relative w-10 h-5 rounded-full transition-colors ${addons[a.key] ? 'bg-primary' : 'bg-border-dark'}`}>
                                    <span className={`absolute top-0.5 left-0.5 size-4 bg-white rounded-full shadow transition-transform ${addons[a.key] ? 'translate-x-5' : 'translate-x-0'}`} />
                                </button>
                            </div>
                        ))}
                    </div>
                )}

                {/* Step 2: Payment */}
                {step === 2 && (
                    <div className="space-y-4">
                        <div className="rounded-2xl border border-surface-border bg-surface-dark-customer p-6">
                            <h2 className="text-base font-semibold text-white mb-4">Payment Summary</h2>
                            <div className="space-y-2">
                                <div className="flex justify-between text-sm"><span className="text-slate-500">Base Premium</span><span className="text-white">₹{base}/mo</span></div>
                                {extra > 0 && <div className="flex justify-between text-sm"><span className="text-slate-500">Add-ons</span><span className="text-white">+₹{extra}/mo</span></div>}
                                <div className="flex justify-between text-sm pt-2 border-t border-surface-border font-bold"><span className="text-white">Total</span><span className="text-primary text-lg">₹{base + extra}/mo</span></div>
                            </div>
                        </div>
                        <div className="flex items-center gap-4 p-4 rounded-2xl border border-surface-border bg-surface-dark-customer">
                            <span className="material-symbols-outlined text-slate-400">credit_card</span>
                            <div>
                                <p className="text-sm font-medium text-white">Visa ····4892</p>
                                <p className="text-xs text-slate-500">Auto-charged monthly</p>
                            </div>
                            <button className="ml-auto text-xs text-primary hover:underline">Change</button>
                        </div>
                    </div>
                )}

                {/* Step 3: Confirm */}
                {step === 3 && (
                    <div className="flex flex-col items-center text-center gap-6 py-8">
                        <div className="size-20 rounded-full bg-emerald-400/10 flex items-center justify-center">
                            <span className="material-symbols-outlined text-emerald-400 text-[52px]">check_circle</span>
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-white">All Set!</h2>
                            <p className="text-slate-400 text-sm mt-2 leading-relaxed">
                                Your {policy?.name || 'policy'} has been renewed successfully.
                                New premium: <strong className="text-white">₹{base + extra}/mo</strong>
                            </p>
                        </div>
                    </div>
                )}

                <button onClick={next} className="w-full py-3.5 rounded-xl bg-primary hover:bg-red-600 text-white font-semibold text-sm transition-colors">
                    {step === steps.length - 1 ? 'Back to Home' : step === steps.length - 2 ? 'Confirm & Renew' : 'Continue'}
                </button>
            </main>
            <BottomNav />
            <ErrorToast message={toastError} onClose={() => setToastError(null)} />
        </div>
    )
}
