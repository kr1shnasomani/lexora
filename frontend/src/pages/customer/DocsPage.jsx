import Header from '../../components/customer/Header'
import BottomNav from '../../components/customer/BottomNav'

const docs = [
    { name: 'Policy Schedule — Auto POL-2891', type: 'PDF', size: '412 KB', date: 'Feb 15, 2025', icon: 'description' },
    { name: 'Claims Summary — CLM-9803', type: 'PDF', size: '189 KB', date: 'Feb 12, 2025', icon: 'receipt_long' },
    { name: 'Home Policy Document — POL-2760', type: 'PDF', size: '638 KB', date: 'Jan 22, 2025', icon: 'description' },
    { name: 'Annual Statement 2024', type: 'PDF', size: '220 KB', date: 'Jan 1, 2025', icon: 'summarize' },
    { name: 'Life Policy Certificate — POL-2541', type: 'PDF', size: '504 KB', date: 'Dec 10, 2024', icon: 'workspace_premium' },
    { name: 'Terms & Conditions v3.2', type: 'PDF', size: '78 KB', date: 'Nov 5, 2024', icon: 'gavel' },
]

export default function DocsPage() {
    return (
        <div className="min-h-screen bg-background-dark text-slate-100 flex flex-col pb-32">
            <Header />
            <main className="mx-auto w-full max-w-2xl px-4 pt-8 space-y-6">
                <div>
                    <h1 className="text-2xl font-bold text-white">Document Vault</h1>
                    <p className="text-slate-500 text-sm mt-1">All your policy documents in one place</p>
                </div>

                {/* Search */}
                <div className="relative">
                    <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 text-[20px]">search</span>
                    <input
                        className="w-full bg-surface-dark-customer border border-surface-border rounded-xl pl-11 pr-4 py-3 text-sm text-white placeholder-slate-500 focus:ring-2 focus:ring-primary outline-none"
                        placeholder="Search documents..."
                    />
                </div>

                <div className="space-y-2">
                    {docs.map((d) => (
                        <div key={d.name} className="flex items-center gap-4 p-4 rounded-2xl border border-surface-border bg-surface-dark-customer hover:border-primary/30 transition-all cursor-pointer group">
                            <div className="size-11 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                                <span className="material-symbols-outlined text-primary text-[22px]">{d.icon}</span>
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-white truncate">{d.name}</p>
                                <p className="text-xs text-slate-500">{d.type} · {d.size} · {d.date}</p>
                            </div>
                            <span className="material-symbols-outlined text-slate-600 group-hover:text-primary transition-colors text-[20px]">download</span>
                        </div>
                    ))}
                </div>
            </main>
            <BottomNav />
        </div>
    )
}
