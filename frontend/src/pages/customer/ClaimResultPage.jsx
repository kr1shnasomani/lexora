import { useNavigate, useSearchParams } from 'react-router-dom'
import { useFetch } from '../../hooks/useFetch'
import { Skeleton } from '../../components/shared/Skeleton'
import Header from '../../components/customer/Header'

export default function ClaimResultPage() {
    const navigate = useNavigate()
    const [params] = useSearchParams()
    const claimId = params.get('id')

    const { data: claim, loading } = useFetch(claimId ? `/api/claims/${claimId}` : null)

    const fmtDate = (str) => {
        if (!str) return '—'
        try { return new Date(str).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) }
        catch { return str }
    }

    const statusColor = (s) => {
        if (!s) return 'text-yellow-400'
        if (s === 'approved') return 'text-emerald-400'
        if (s === 'denied') return 'text-primary'
        return 'text-yellow-400'
    }

    return (
        <div className="min-h-screen bg-background-dark flex flex-col items-center justify-center px-6 text-center">
            <Header />
            <div className="flex-1 flex flex-col items-center justify-center gap-6 max-w-sm mx-auto">
                {/* Success icon */}
                <div className="size-24 rounded-full bg-emerald-400/10 flex items-center justify-center">
                    <span className="material-symbols-outlined text-emerald-400 text-[56px]">check_circle</span>
                </div>

                <div>
                    <h1 className="text-2xl font-bold text-white">Claim Submitted</h1>
                    <p className="text-slate-400 mt-3 leading-relaxed">
                        Your claim has been received and is being processed by our AI adjudication engine.
                        Expect a decision within <strong className="text-white">24–48 hours</strong>.
                    </p>
                </div>

                {/* Claim detail card */}
                <div className="w-full rounded-2xl border border-surface-border bg-surface-dark-customer p-5 text-left space-y-3">
                    {loading ? (
                        <div className="space-y-3">
                            <Skeleton className="h-4 w-full" />
                            <Skeleton className="h-4 w-3/4" />
                            <Skeleton className="h-4 w-1/2" />
                        </div>
                    ) : (
                        <>
                            <div className="flex justify-between text-sm">
                                <span className="text-slate-500">Claim Reference</span>
                                <span className="text-white font-mono font-semibold">{claim?.claim_number || claimId || '—'}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span className="text-slate-500">Submitted</span>
                                <span className="text-white">{fmtDate(claim?.submitted_at)}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span className="text-slate-500">Type</span>
                                <span className="text-white capitalize">{claim?.claim_type || '—'}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span className="text-slate-500">Status</span>
                                <span className={`font-semibold capitalize ${statusColor(claim?.status)}`}>
                                    {claim?.status?.replace(/_/g, ' ') || 'Processing'}
                                </span>
                            </div>
                        </>
                    )}
                </div>

                <div className="flex gap-3 w-full">
                    <button onClick={() => navigate('/customer/claims')} className="flex-1 py-3 rounded-xl border border-surface-border text-slate-400 hover:text-white font-semibold text-sm transition-colors">
                        My Claims
                    </button>
                    <button onClick={() => navigate('/customer')} className="flex-1 py-3 rounded-xl bg-primary hover:bg-red-600 text-white font-semibold text-sm transition-colors">
                        Home
                    </button>
                </div>
            </div>
        </div>
    )
}
