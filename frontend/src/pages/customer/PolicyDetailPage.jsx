import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import Header from '../../components/customer/Header'
import BottomNav from '../../components/customer/BottomNav'
import { useFetch } from '../../hooks/useFetch'
import { Skeleton } from '../../components/shared/Skeleton'
import ErrorToast from '../../components/shared/ErrorToast'
import { useAuth } from '../../contexts/AuthContext'

const tabs = ['Overview', 'Coverage', 'Documents', 'Claims']

const policyIcon = (type) => ({ health: 'cardiology', auto: 'directions_car', travel: 'flight', pet: 'pets', life: 'favorite' }[type] || 'policy')
const policyAccentColor = (type) => ({ health: 'text-primary', auto: 'text-blue-400', travel: 'text-indigo-400', pet: 'text-amber-400' }[type] || 'text-slate-400')
const policyGradient = (type) => ({ health: 'from-red-900/30', auto: 'from-blue-900/30', travel: 'from-indigo-900/30', pet: 'from-amber-900/30' }[type] || 'from-slate-900/30')

export default function PolicyDetailPage() {
    const [tab, setTab] = useState('Overview')
    const navigate = useNavigate()
    const [params] = useSearchParams()
    const policyId = params.get('id')
    const [toastError, setToastError] = useState(null)

    // 1. Get Auth Context
    const { user } = useAuth()

    // 2. Fetch securely
    const apiUrl = user?.email && policyId ? `/api/customer/policies/${policyId}?email=${encodeURIComponent(user.email)}` : null
    const { data: policyResponse, loading, error } = useFetch(apiUrl)
    const policy = policyResponse || null

    if (error && !toastError) setToastError(error)

    return (
        <div className="min-h-screen bg-background-dark text-slate-100 flex flex-col pb-32">
            <Header showBack />
            <main className="mx-auto w-full max-w-2xl px-4 pt-6 space-y-6">

                {/* Hero card */}
                {loading
                    ? <div className="rounded-2xl border border-surface-border bg-surface-dark-customer p-6 space-y-4"><div className="flex gap-3 items-center"><Skeleton className="size-12 rounded-xl" /><div className="space-y-1 flex-1"><Skeleton className="h-5 w-48" /><Skeleton className="h-3 w-28" /></div></div><div className="grid grid-cols-3 gap-3">{[0, 1, 2].map(i => <div key={i} className="space-y-1"><Skeleton className="h-3 w-16" /><Skeleton className="h-5 w-20" /></div>)}</div></div>
                    : policy && (
                        <div className={`rounded-2xl border border-surface-border bg-gradient-to-br ${policyGradient(policy.type)} to-surface-dark-customer p-6`}>
                            <div className="flex items-center gap-3 mb-4">
                                <div className={`size-12 rounded-xl bg-opacity-10 flex items-center justify-center border border-surface-border`}>
                                    <span className={`material-symbols-outlined text-[26px] ${policyAccentColor(policy.type)}`}>{policyIcon(policy.type)}</span>
                                </div>
                                <div>
                                    <h1 className="text-lg font-bold text-white">{policy.name}</h1>
                                    <p className="text-xs text-slate-500 font-mono">{policy.policy_number} · <span className="capitalize">{policy.status}</span></p>
                                </div>
                            </div>
                            <div className="grid grid-cols-3 gap-3">
                                {policy.premium && <div><p className="text-[11px] text-slate-500">Premium</p><p className="text-base font-bold text-white">{policy.premium}<span className="text-slate-500 text-xs">{policy.premium_suffix}</span></p></div>}
                                {policy.coverage_amount && <div><p className="text-[11px] text-slate-500">Coverage</p><p className="text-base font-bold text-white">{policy.coverage_amount}</p></div>}
                                {policy.deductible && <div><p className="text-[11px] text-slate-500">Deductible</p><p className="text-base font-bold text-white">{policy.deductible}</p></div>}
                            </div>
                        </div>
                    )
                }

                {/* Tabs */}
                <div className="flex gap-1 bg-surface-dark-customer rounded-xl p-1 border border-surface-border">
                    {tabs.map(t => (
                        <button key={t} onClick={() => setTab(t)}
                            className={`flex-1 text-sm font-medium py-2 rounded-lg transition-all ${tab === t ? 'bg-primary text-white' : 'text-slate-400 hover:text-white'}`}>
                            {t}
                        </button>
                    ))}
                </div>

                {/* Tab panels */}
                {tab === 'Overview' && (
                    <div className="space-y-3">
                        {loading
                            ? [0, 1, 2, 3].map(i => <div key={i} className="flex justify-between py-3 border-b border-surface-border"><Skeleton className="h-4 w-28" /><Skeleton className="h-4 w-32" /></div>)
                            : [
                                { label: 'Policy Holder', value: user?.name || user?.email },
                                { label: 'Policy Type', value: policy?.type ? policy.type.toUpperCase() : 'N/A' },
                                { label: 'Renewal Date', value: policy?.renewal_date },
                                { label: 'Member Since', value: policy?.since },
                            ].filter(f => f.value).map(f => (
                                <div key={f.label} className="flex justify-between py-3 border-b border-surface-border last:border-0">
                                    <span className="text-sm text-slate-500">{f.label}</span>
                                    <span className="text-sm font-medium text-white text-right max-w-[60%]">{f.value}</span>
                                </div>
                            ))
                        }
                    </div>
                )}

                {tab === 'Coverage' && (
                    <div className="space-y-3">
                        {loading
                            ? [0, 1, 2].map(i => <div key={i} className="p-4 rounded-xl border border-surface-border bg-surface-dark-customer flex items-center justify-between"><Skeleton className="h-4 w-32" /><Skeleton className="h-4 w-24" /></div>)
                            : (policy?.extra_stats
                                ? Object.entries(policy.extra_stats).map(([k, v]) => (
                                    <div key={k} className="flex items-center justify-between p-4 rounded-xl border border-surface-border bg-surface-dark-customer">
                                        <span className="text-sm text-white capitalize">{k.replace(/_/g, ' ')}</span>
                                        <span className="text-sm font-bold text-emerald-400">{v}</span>
                                    </div>
                                ))
                                : <p className="text-slate-500 text-sm py-8 text-center">Coverage details will appear here once connected to Supabase.</p>
                            )
                        }
                    </div>
                )}

                {tab === 'Documents' && (
                    <div className="space-y-3">
                        {loading
                            ? [0, 1, 2].map(i => <Skeleton key={i} className="h-14 rounded-xl" />)
                            : (policy?.documents?.length > 0) ? (
                                policy.documents.map(doc => (
                                    <div key={doc.id} className="flex items-center justify-between p-4 rounded-xl border border-surface-border bg-surface-dark-customer hover:bg-surface-border/50 transition-colors cursor-pointer" onClick={() => window.open(doc.url, '_blank')}>
                                        <div className="flex items-center gap-4">
                                            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                                                <span className="material-symbols-outlined text-primary text-[20px]">description</span>
                                            </div>
                                            <div className="flex flex-col">
                                                <span className="text-sm font-medium text-white line-clamp-1">{doc.name}</span>
                                                <span className="text-xs text-slate-500">Related to: {doc.claim_number}</span>
                                            </div>
                                        </div>
                                        <span className="material-symbols-outlined text-slate-500 text-[20px] hover:text-white transition-colors">download</span>
                                    </div>
                                ))
                            ) : (
                                <div className="text-center py-10 bg-surface-dark-customer border border-surface-border rounded-xl">
                                    <span className="material-symbols-outlined text-4xl text-slate-600 mb-2">folder_open</span>
                                    <p className="text-slate-400 text-sm">No documents found for this policy.</p>
                                </div>
                            )
                        }
                    </div>
                )}

                {tab === 'Claims' && (
                    <div className="space-y-3">
                        {loading
                            ? [0, 1].map(i => <Skeleton key={i} className="h-20 rounded-xl" />)
                            : (policy?.claims?.length > 0) ? (
                                policy.claims.map(claim => (
                                    <div key={claim.id} onClick={() => navigate(`/customer/claim-status?id=${claim.id}`)} className="p-4 rounded-xl border border-surface-border bg-surface-dark-customer hover:border-slate-500 transition-colors cursor-pointer flex justify-between items-center group">
                                        <div className="flex items-center gap-4">
                                            <div className="w-10 h-10 rounded-full bg-surface-border flex items-center justify-center">
                                                <span className="material-symbols-outlined text-slate-300 text-[20px]">receipt_long</span>
                                            </div>
                                            <div>
                                                <h3 className="text-sm font-bold text-white group-hover:text-primary transition-colors">{claim.claim_number}</h3>
                                                <p className="text-xs text-slate-500 mt-0.5">{claim.date} • <span className={`capitalize font-medium ${claim.status === 'approved' ? 'text-emerald-400' : claim.status === 'rejected' ? 'text-red-400' : 'text-amber-400'}`}>{claim.status.replace('_', ' ')}</span></p>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-sm font-bold text-white mb-0.5">{claim.amount}</p>
                                            <span className="material-symbols-outlined text-slate-500 text-[18px] group-hover:text-white transition-colors">chevron_right</span>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className="text-center py-10 bg-surface-dark-customer border border-surface-border rounded-xl">
                                    <span className="material-symbols-outlined text-4xl text-slate-600 mb-2">assignment</span>
                                    <p className="text-slate-400 text-sm">No claims have been filed for this policy.</p>
                                </div>
                            )
                        }
                    </div>
                )}

                {/* Actions */}
                <div className="grid grid-cols-2 gap-3">
                    <button onClick={() => navigate('/customer/file-claim')} className="py-3 rounded-xl bg-primary hover:bg-red-600 text-white font-semibold text-sm transition-colors">File a Claim</button>
                    <button onClick={() => navigate('/customer/renewal')} className="py-3 rounded-xl border border-surface-border text-slate-300 hover:text-white hover:border-primary/40 font-semibold text-sm transition-colors">Renew Policy</button>
                </div>
            </main>
            <BottomNav />
            <ErrorToast message={toastError} onClose={() => setToastError(null)} />
        </div>
    )
}
