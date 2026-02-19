import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Header from '../../components/customer/Header'
import BottomNav from '../../components/customer/BottomNav'

const tabs = ['Overview', 'Coverage', 'Documents', 'Claims']
const coverageItems = [
    { label: 'Bodily Injury', value: '$100,000 / $300,000', icon: 'person_alert' },
    { label: 'Property Damage', value: '$100,000', icon: 'cottage' },
    { label: 'Collision', value: '$250,000 ACV', icon: 'car_crash' },
    { label: 'Comprehensive', value: '$250,000 ACV', icon: 'shield' },
    { label: 'Uninsured Motorist', value: '$100,000', icon: 'no_accounts' },
    { label: 'Medical Payments', value: '$5,000', icon: 'medical_services' },
]

export default function PolicyDetailPage() {
    const [tab, setTab] = useState('Overview')
    const navigate = useNavigate()

    return (
        <div className="min-h-screen bg-background-dark text-slate-100 flex flex-col pb-32">
            <Header showBack />
            <main className="mx-auto w-full max-w-2xl px-4 pt-6 space-y-6">
                {/* Hero */}
                <div className="rounded-2xl border border-surface-border bg-gradient-to-br from-blue-900/30 to-surface-dark-customer p-6">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="size-12 rounded-xl bg-blue-400/10 flex items-center justify-center">
                            <span className="material-symbols-outlined text-blue-400 text-[26px]">directions_car</span>
                        </div>
                        <div>
                            <h1 className="text-lg font-bold text-white">Comprehensive Auto</h1>
                            <p className="text-xs text-slate-500 font-mono">POL-2891 · Active</p>
                        </div>
                    </div>
                    <div className="grid grid-cols-3 gap-3">
                        {[['Premium', '$142/mo'], ['Coverage', '$250K'], ['Deductible', '$500']].map(([l, v]) => (
                            <div key={l}>
                                <p className="text-[11px] text-slate-500">{l}</p>
                                <p className="text-base font-bold text-white">{v}</p>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Tabs */}
                <div className="flex gap-1 bg-surface-dark-customer rounded-xl p-1 border border-surface-border">
                    {tabs.map((t) => (
                        <button
                            key={t}
                            onClick={() => setTab(t)}
                            className={`flex-1 text-sm font-medium py-2 rounded-lg transition-all ${tab === t ? 'bg-primary text-white' : 'text-slate-400 hover:text-white'}`}
                        >
                            {t}
                        </button>
                    ))}
                </div>

                {/* Tab panels */}
                {tab === 'Overview' && (
                    <div className="space-y-3">
                        {[
                            { label: 'Policy Holder', value: 'Arjun Mehta' },
                            { label: 'Vehicle', value: '2022 Toyota Camry XSE' },
                            { label: 'VIN', value: '4T1B11HK5JU123456' },
                            { label: 'Effective Date', value: 'Mar 15, 2024' },
                            { label: 'Renewal Date', value: 'Mar 15, 2025' },
                            { label: 'Payment Method', value: 'Visa ····4892' },
                        ].map((f) => (
                            <div key={f.label} className="flex justify-between py-3 border-b border-surface-border">
                                <span className="text-sm text-slate-500">{f.label}</span>
                                <span className="text-sm font-medium text-white">{f.value}</span>
                            </div>
                        ))}
                    </div>
                )}

                {tab === 'Coverage' && (
                    <div className="space-y-3">
                        {coverageItems.map((item) => (
                            <div key={item.label} className="flex items-center justify-between p-4 rounded-xl border border-surface-border bg-surface-dark-customer">
                                <div className="flex items-center gap-3">
                                    <span className="material-symbols-outlined text-slate-400 text-[20px]">{item.icon}</span>
                                    <span className="text-sm text-white">{item.label}</span>
                                </div>
                                <span className="text-sm font-bold text-emerald-400">{item.value}</span>
                            </div>
                        ))}
                    </div>
                )}

                {tab === 'Documents' && (
                    <button onClick={() => navigate('/customer/docs')} className="w-full text-center py-8 text-primary hover:underline font-medium text-sm">
                        View all documents →
                    </button>
                )}

                {tab === 'Claims' && (
                    <button onClick={() => navigate('/customer/claims')} className="w-full text-center py-8 text-primary hover:underline font-medium text-sm">
                        View claim history →
                    </button>
                )}

                {/* Actions */}
                <div className="grid grid-cols-2 gap-3">
                    <button onClick={() => navigate('/customer/claims')} className="py-3 rounded-xl bg-primary hover:bg-primary-dark text-white font-semibold text-sm transition-colors">File a Claim</button>
                    <button onClick={() => navigate('/customer/renewal')} className="py-3 rounded-xl border border-surface-border text-slate-300 hover:text-white hover:border-primary/40 font-semibold text-sm transition-colors">Renew Policy</button>
                </div>
            </main>
            <BottomNav />
        </div>
    )
}
