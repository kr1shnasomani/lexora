import Sidebar from '../../components/admin/Sidebar'
import TopHeader from '../../components/admin/TopHeader'

const bars = [82, 68, 91, 74, 88, 95, 97, 93, 89, 96, 94, 97]
const months = ['Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec', 'Jan', 'Feb']

const categoryData = [
    { label: 'Auto Collision', fraud: 34, legit: 182, accuracy: 98 },
    { label: 'Medical', fraud: 58, legit: 312, accuracy: 96 },
    { label: 'Property', fraud: 21, legit: 94, accuracy: 94 },
    { label: 'Life', fraud: 11, legit: 67, accuracy: 99 },
    { label: 'Liability', fraud: 19, legit: 108, accuracy: 95 },
]

export default function AnalyticsPage() {
    return (
        <div className="flex h-screen bg-background-dark overflow-hidden">
            <Sidebar />
            <div className="flex flex-col flex-1 overflow-hidden">
                <TopHeader title="Analytics" />
                <main className="flex-1 overflow-y-auto p-6 space-y-6">

                    {/* KPI row */}
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                        {[
                            { label: 'Total Claims YTD', value: '9,204' },
                            { label: 'Fraud Detected', value: '143' },
                            { label: 'True Positive Rate', value: '97.4%' },
                            { label: 'False Positive Rate', value: '0.6%' },
                        ].map((k) => (
                            <div key={k.label} className="rounded-2xl border border-border-dark bg-surface-dark p-5">
                                <p className="text-sm text-slate-500 mb-2">{k.label}</p>
                                <p className="text-3xl font-bold text-white">{k.value}</p>
                            </div>
                        ))}
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* AI Accuracy Trend */}
                        <div className="rounded-2xl border border-border-dark bg-surface-dark p-6">
                            <h2 className="text-base font-semibold text-white mb-6">AI Accuracy Trend (12 Months)</h2>
                            <div className="flex items-end gap-2 h-44">
                                {bars.map((b, i) => (
                                    <div key={i} className="flex-1 flex flex-col items-center gap-2">
                                        <div
                                            className="w-full rounded-t-sm transition-all"
                                            style={{ height: `${(b / 100) * 160}px`, background: b >= 90 ? '#10b981' : b >= 80 ? '#eab308' : '#ef4444' }}
                                        />
                                        <span className="text-[10px] text-slate-500">{months[i]}</span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Category Breakdown */}
                        <div className="rounded-2xl border border-border-dark bg-surface-dark p-6">
                            <h2 className="text-base font-semibold text-white mb-6">Accuracy by Category</h2>
                            <div className="space-y-4">
                                {categoryData.map((c) => (
                                    <div key={c.label}>
                                        <div className="flex items-center justify-between mb-1.5">
                                            <span className="text-sm text-slate-300">{c.label}</span>
                                            <span className="text-sm font-bold text-emerald-400">{c.accuracy}%</span>
                                        </div>
                                        <div className="h-2 bg-border-dark rounded-full overflow-hidden">
                                            <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${c.accuracy}%` }} />
                                        </div>
                                        <div className="flex justify-between text-xs text-slate-600 mt-1">
                                            <span>{c.fraud} fraud</span>
                                            <span>{c.legit} legitimate</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </main>
            </div>
        </div>
    )
}
