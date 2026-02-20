import { useState } from 'react'
import Header from '../../components/customer/Header'
import BottomNav from '../../components/customer/BottomNav'

const policyDocs = [
    { name: 'Health_Shield_Premier_2024.pdf', size: '2.4 MB', type: 'PDF', date: 'Oct 24, 2023', iconBg: 'bg-blue-500/10 text-blue-400', icon: 'picture_as_pdf' },
    { name: 'Auto_Drive_Secure_Terms.pdf', size: '1.8 MB', type: 'PDF', date: 'Nov 01, 2023', iconBg: 'bg-blue-500/10 text-blue-400', icon: 'picture_as_pdf' },
]

const claimDocs = [
    { name: 'Accident_Scene_Photo_01.jpg', size: '4.2 MB', type: 'JPG', date: 'Dec 12, 2023', iconBg: 'bg-amber-500/10 text-amber-400', icon: 'image' },
    { name: 'Police_Report_#99283.docx', size: '145 KB', type: 'DOCX', date: 'Dec 14, 2023', iconBg: 'bg-blue-500/10 text-blue-400', icon: 'description' },
]

const invoiceDocs = [
    { name: 'Premium_Invoice_Jan24.pdf', size: '560 KB', type: 'PDF', date: 'Jan 01, 2024', iconBg: 'bg-emerald-500/10 text-emerald-400', icon: 'receipt' },
]

const recentActivity = [
    { label: "Uploaded 'Accident_Scene.jpg'", time: 'Today, 10:42 AM', active: true },
    { label: "Downloaded 'Health_Policy.pdf'", time: 'Yesterday, 4:15 PM', active: false },
    { label: "Shared 'Invoice_Jan24.pdf'", time: 'Jan 12, 09:30 AM', active: false },
]

function DocTable({ rows }) {
    return (
        <div className="bg-surface-dark-customer border border-surface-border rounded-2xl overflow-hidden">
            <div className="grid grid-cols-12 gap-4 px-6 py-3 border-b border-surface-border bg-black/20 text-xs font-medium text-slate-500 uppercase tracking-wider">
                <div className="col-span-6">Name</div>
                <div className="col-span-3">Date Added</div>
                <div className="col-span-3 text-right">Action</div>
            </div>
            {rows.map((doc, i) => (
                <div
                    key={i}
                    className="grid grid-cols-12 gap-4 px-6 py-4 items-center border-b border-surface-border last:border-0 hover:bg-white/5 transition-colors group"
                >
                    <div className="col-span-6 flex items-center gap-3">
                        <div className={`h-10 w-10 rounded-lg flex items-center justify-center ${doc.iconBg}`}>
                            <span className="material-symbols-outlined">{doc.icon}</span>
                        </div>
                        <div>
                            <p className="text-white font-medium group-hover:text-primary transition-colors">{doc.name}</p>
                            <p className="text-slate-500 text-xs">{doc.size} • {doc.type}</p>
                        </div>
                    </div>
                    <div className="col-span-3 text-slate-400 text-sm">{doc.date}</div>
                    <div className="col-span-3 flex justify-end">
                        <button className="p-2 text-slate-400 hover:text-white hover:bg-surface-border rounded-full transition-colors">
                            <span className="material-symbols-outlined">download</span>
                        </button>
                    </div>
                </div>
            ))}
        </div>
    )
}

export default function DocsPage() {
    const [search, setSearch] = useState('')

    return (
        <div className="min-h-screen bg-background-dark text-slate-100 flex flex-col font-display antialiased overflow-x-hidden selection:bg-primary selection:text-white pb-32">
            <Header />

            <main className="flex-1 max-w-7xl mx-auto w-full p-4 md:p-8 pb-32">

                {/* Page Header */}
                <section className="mb-8 flex flex-col md:flex-row md:items-end justify-between gap-4">
                    <div className="flex flex-col gap-2">
                        <h2 className="text-4xl font-bold text-white tracking-tight">My Documents</h2>
                        <p className="text-slate-400 text-lg">Secure vault for your policies, claims, and sensitive records.</p>
                    </div>
                    <div className="flex gap-3">
                        <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 material-symbols-outlined text-[20px]">search</span>
                            <input
                                type="text"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                className="bg-surface-dark-customer border border-surface-border text-slate-200 text-sm rounded-lg focus:ring-1 focus:ring-primary focus:border-primary block w-64 pl-10 p-2.5 placeholder-slate-600 outline-none"
                                placeholder="Search files..."
                            />
                        </div>
                        <button className="px-4 py-2 bg-surface-dark-customer border border-surface-border rounded-lg text-slate-300 hover:text-white hover:border-primary/50 transition-colors flex items-center gap-2">
                            <span className="material-symbols-outlined text-[20px]">filter_list</span>
                            Filter
                        </button>
                    </div>
                </section>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">

                    {/* Left: Document sections */}
                    <div className="lg:col-span-8 flex flex-col gap-8">

                        {/* Policy Documents */}
                        <div>
                            <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-4 flex items-center gap-2">
                                <span className="material-symbols-outlined text-[18px]">verified_user</span>
                                Policy Documents
                            </h3>
                            <DocTable rows={policyDocs} />
                        </div>

                        {/* Claim Documents */}
                        <div>
                            <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-4 flex items-center gap-2">
                                <span className="material-symbols-outlined text-[18px]">folder_shared</span>
                                Claim Documents
                            </h3>
                            <DocTable rows={claimDocs} />
                        </div>

                        {/* Invoices */}
                        <div>
                            <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-4 flex items-center gap-2">
                                <span className="material-symbols-outlined text-[18px]">receipt_long</span>
                                Invoices
                            </h3>
                            <DocTable rows={invoiceDocs} />
                        </div>
                    </div>

                    {/* Right: Sidebar */}
                    <div className="lg:col-span-4 flex flex-col gap-6">

                        {/* Vault Storage Card */}
                        <div className="bg-surface-dark-customer border border-surface-border rounded-2xl p-6 shadow-xl shadow-black/20">
                            <div className="flex items-center gap-4 mb-6">
                                <div className="h-14 w-14 rounded-2xl bg-primary/10 flex items-center justify-center text-primary border border-primary/20">
                                    <span className="material-symbols-outlined text-[32px]">cloud_sync</span>
                                </div>
                                <div>
                                    <h3 className="text-lg font-bold text-white">Vault Storage</h3>
                                    <p className="text-slate-400 text-xs">Encrypted &amp; Secure</p>
                                </div>
                            </div>

                            {/* Usage bar */}
                            <div className="mb-2 flex justify-between text-sm font-medium">
                                <span className="text-slate-300">2.4 GB Used</span>
                                <span className="text-slate-500">10 GB Total</span>
                            </div>
                            <div className="w-full bg-surface-border rounded-full h-2.5 mb-6">
                                <div className="bg-primary h-2.5 rounded-full" style={{ width: '24%' }}></div>
                            </div>

                            {/* Category breakdown */}
                            <div className="space-y-3">
                                {[
                                    { label: 'Policies', color: 'bg-blue-500', value: '1.2 GB' },
                                    { label: 'Claims', color: 'bg-amber-500', value: '0.8 GB' },
                                    { label: 'Invoices', color: 'bg-emerald-500', value: '0.4 GB' },
                                ].map((item) => (
                                    <div key={item.label} className="flex justify-between items-center p-3 rounded-lg bg-background-dark border border-surface-border">
                                        <div className="flex items-center gap-2">
                                            <div className={`w-2 h-2 rounded-full ${item.color}`}></div>
                                            <span className="text-xs text-slate-300 uppercase tracking-wider">{item.label}</span>
                                        </div>
                                        <span className="text-sm text-white font-mono">{item.value}</span>
                                    </div>
                                ))}
                            </div>

                            <button className="w-full mt-6 py-3 rounded-lg bg-surface-border text-slate-300 hover:text-white hover:bg-white/10 transition-colors text-sm font-bold flex items-center justify-center gap-2">
                                <span className="material-symbols-outlined text-[18px]">settings</span>
                                Storage Settings
                            </button>
                        </div>

                        {/* Recent Activity */}
                        <div className="bg-surface-dark-customer border border-surface-border rounded-2xl p-6">
                            <h3 className="text-lg font-bold text-white mb-4">Recent Activity</h3>
                            <div className="space-y-4">
                                {recentActivity.map((item, i) => (
                                    <div
                                        key={i}
                                        className={`flex gap-3 items-start relative pl-4 ${i < recentActivity.length - 1 ? 'pb-4 border-l-2 border-surface-border' : ''}`}
                                    >
                                        <div className={`absolute -left-[9px] top-0 w-4 h-4 rounded-full bg-surface-dark-customer border-2 ${item.active ? 'border-primary' : 'border-slate-600'}`}></div>
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

            {/* Floating Upload FAB */}
            <button className="fixed bottom-32 right-8 md:right-12 z-40 bg-primary hover:bg-primary-dark text-white rounded-2xl p-4 shadow-lg shadow-primary/30 transition-all hover:scale-105 group">
                <span className="material-symbols-outlined text-[32px] group-hover:rotate-90 transition-transform">add</span>
                <span className="sr-only">Upload Document</span>
            </button>

            <BottomNav />
        </div>
    )
}
