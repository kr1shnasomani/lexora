import { useState } from 'react'
import Header from '../../components/customer/Header'
import BottomNav from '../../components/customer/BottomNav'
import { useFetch } from '../../hooks/useFetch'
import { Skeleton } from '../../components/shared/Skeleton'
import ErrorToast from '../../components/shared/ErrorToast'

const recentActivity = [
    { label: "Downloaded 'Health_Policy.pdf'", time: 'Yesterday, 4:15 PM', active: false },
    { label: "Shared 'Invoice_Jan24.pdf'", time: 'Jan 12, 09:30 AM', active: false },
]

function DocRow({ name, size, type, date, iconBg, icon }) {
    return (
        <div className="grid grid-cols-12 gap-4 px-6 py-4 items-center border-b border-surface-border last:border-0 hover:bg-white/5 transition-colors group">
            <div className="col-span-6 flex items-center gap-3">
                <div className={`h-10 w-10 rounded-lg flex items-center justify-center ${iconBg}`}>
                    <span className="material-symbols-outlined">{icon}</span>
                </div>
                <div>
                    <p className="text-white font-medium group-hover:text-primary transition-colors truncate max-w-[200px]">{name}</p>
                    <p className="text-slate-500 text-xs">{size} • {type}</p>
                </div>
            </div>
            <div className="col-span-3 text-slate-400 text-sm">{date}</div>
            <div className="col-span-3 flex justify-end">
                <button className="p-2 text-slate-400 hover:text-white hover:bg-surface-border rounded-full transition-colors">
                    <span className="material-symbols-outlined">download</span>
                </button>
            </div>
        </div>
    )
}

function DocTable({ rows, loading }) {
    return (
        <div className="bg-surface-dark-customer border border-surface-border rounded-2xl overflow-hidden">
            <div className="grid grid-cols-12 gap-4 px-6 py-3 border-b border-surface-border bg-black/20 text-xs font-medium text-slate-500 uppercase tracking-wider">
                <div className="col-span-6">Name</div>
                <div className="col-span-3">Date Added</div>
                <div className="col-span-3 text-right">Action</div>
            </div>
            {loading
                ? [0, 1].map(i => (
                    <div key={i} className="grid grid-cols-12 gap-4 px-6 py-4 items-center border-b border-surface-border last:border-0">
                        <div className="col-span-6 flex items-center gap-3"><Skeleton className="h-10 w-10 rounded-lg shrink-0" /><div className="space-y-1 flex-1"><Skeleton className="h-4 w-40" /><Skeleton className="h-3 w-28" /></div></div>
                        <div className="col-span-3"><Skeleton className="h-4 w-24" /></div>
                        <div className="col-span-3 flex justify-end"><Skeleton className="h-8 w-8 rounded-full" /></div>
                    </div>
                ))
                : rows.map((doc, i) => <DocRow key={i} {...doc} />)
            }
        </div>
    )
}

export default function DocsPage() {
    const [search, setSearch] = useState('')
    const [toastError, setToastError] = useState(null)
    const { data, loading, error } = useFetch('/api/policies')
    if (error && !toastError) setToastError(error)

    const policies = data?.items || []

    // Derive policy documents from live policy data
    const policyDocs = policies.map(p => ({
        name: `${p.name.replace(/ /g, '_')}_Certificate.pdf`,
        size: '2.1 MB',
        type: 'PDF',
        date: p.renewal_date || '—',
        iconBg: 'bg-blue-500/10 text-blue-400',
        icon: 'picture_as_pdf',
    }))

    const claimDocs = [
        { name: 'Accident_Scene_Photo_01.jpg', size: '4.2 MB', type: 'JPG', date: 'Dec 12, 2024', iconBg: 'bg-amber-500/10 text-amber-400', icon: 'image' },
        { name: 'Police_Report_#99283.docx', size: '145 KB', type: 'DOCX', date: 'Dec 14, 2024', iconBg: 'bg-blue-500/10 text-blue-400', icon: 'description' },
    ]

    const invoiceDocs = policies.map(p => ({
        name: `Premium_Invoice_${p.policy_number}.pdf`,
        size: '560 KB',
        type: 'PDF',
        date: p.renewal_date || '—',
        iconBg: 'bg-emerald-500/10 text-emerald-400',
        icon: 'receipt',
    }))

    const filterDocs = (docs) =>
        search ? docs.filter(d => d.name.toLowerCase().includes(search.toLowerCase())) : docs

    return (
        <div className="min-h-screen bg-background-dark text-slate-100 flex flex-col font-display antialiased overflow-x-hidden selection:bg-primary selection:text-white pb-32">
            <Header />
            <main className="flex-1 max-w-7xl mx-auto w-full p-4 md:p-8 pb-32">

                <section className="mb-8 flex flex-col md:flex-row md:items-end justify-between gap-4">
                    <div className="flex flex-col gap-2">
                        <h2 className="text-4xl font-bold text-white tracking-tight">My Documents</h2>
                        <p className="text-slate-400 text-lg">Secure vault for your policies, claims, and sensitive records.</p>
                    </div>
                    <div className="flex gap-3">
                        <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 material-symbols-outlined text-[20px]">search</span>
                            <input type="text" value={search} onChange={e => setSearch(e.target.value)}
                                className="bg-surface-dark-customer border border-surface-border text-slate-200 text-sm rounded-lg focus:ring-1 focus:ring-primary focus:border-primary block w-64 pl-10 p-2.5 placeholder-slate-600 outline-none"
                                placeholder="Search files..." />
                        </div>
                    </div>
                </section>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                    <div className="lg:col-span-8 flex flex-col gap-8">
                        <div>
                            <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-4 flex items-center gap-2">
                                <span className="material-symbols-outlined text-[18px]">verified_user</span>Policy Documents
                            </h3>
                            <DocTable rows={filterDocs(policyDocs)} loading={loading} />
                        </div>
                        <div>
                            <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-4 flex items-center gap-2">
                                <span className="material-symbols-outlined text-[18px]">folder_shared</span>Claim Documents
                            </h3>
                            <DocTable rows={filterDocs(claimDocs)} loading={false} />
                        </div>
                        <div>
                            <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-4 flex items-center gap-2">
                                <span className="material-symbols-outlined text-[18px]">receipt_long</span>Invoices
                            </h3>
                            <DocTable rows={filterDocs(invoiceDocs)} loading={loading} />
                        </div>
                    </div>

                    <div className="lg:col-span-4 flex flex-col gap-6">
                        <div className="bg-surface-dark-customer border border-surface-border rounded-2xl p-6">
                            <div className="flex items-center gap-4 mb-6">
                                <div className="h-14 w-14 rounded-2xl bg-primary/10 flex items-center justify-center text-primary border border-primary/20">
                                    <span className="material-symbols-outlined text-[32px]">cloud_sync</span>
                                </div>
                                <div>
                                    <h3 className="text-lg font-bold text-white">Vault Storage</h3>
                                    <p className="text-slate-400 text-xs">Encrypted &amp; Secure</p>
                                </div>
                            </div>
                            <div className="mb-2 flex justify-between text-sm font-medium">
                                <span className="text-slate-300">2.4 GB Used</span>
                                <span className="text-slate-500">10 GB Total</span>
                            </div>
                            <div className="w-full bg-surface-border rounded-full h-2.5 mb-6">
                                <div className="bg-primary h-2.5 rounded-full" style={{ width: '24%' }} />
                            </div>
                            {[['Policies', 'bg-blue-500', '1.2 GB'], ['Claims', 'bg-amber-500', '0.8 GB'], ['Invoices', 'bg-emerald-500', '0.4 GB']].map(([label, color, value]) => (
                                <div key={label} className="flex justify-between items-center p-3 rounded-lg bg-background-dark border border-surface-border mb-2 last:mb-0">
                                    <div className="flex items-center gap-2">
                                        <div className={`w-2 h-2 rounded-full ${color}`} />
                                        <span className="text-xs text-slate-300 uppercase tracking-wider">{label}</span>
                                    </div>
                                    <span className="text-sm text-white font-mono">{value}</span>
                                </div>
                            ))}
                        </div>

                        <div className="bg-surface-dark-customer border border-surface-border rounded-2xl p-6">
                            <h3 className="text-lg font-bold text-white mb-4">Recent Activity</h3>
                            <div className="space-y-4">
                                {recentActivity.map((item, i) => (
                                    <div key={i} className={`flex gap-3 items-start relative pl-4 ${i < recentActivity.length - 1 ? 'pb-4 border-l-2 border-surface-border' : ''}`}>
                                        <div className={`absolute -left-[9px] top-0 w-4 h-4 rounded-full bg-surface-dark-customer border-2 ${item.active ? 'border-primary' : 'border-slate-600'}`} />
                                        <div>
                                            <p className="text-sm text-white font-medium">{item.label}</p>
                                            <p className="text-xs text-slate-500 mt-1">{item.time}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </main>

            <button className="fixed bottom-32 right-8 md:right-12 z-40 bg-primary hover:bg-red-600 text-white rounded-2xl p-4 shadow-lg shadow-primary/30 transition-all hover:scale-105 group">
                <span className="material-symbols-outlined text-[32px] group-hover:rotate-90 transition-transform">add</span>
            </button>

            <BottomNav />
            <ErrorToast message={toastError} onClose={() => setToastError(null)} />
        </div>
    )
}
