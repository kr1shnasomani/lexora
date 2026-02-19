import { useNavigate } from 'react-router-dom'
import Header from '../../components/customer/Header'

export default function ClaimResultPage() {
    const navigate = useNavigate()
    return (
        <div className="min-h-screen bg-background-dark flex flex-col items-center justify-center px-6 text-center">
            <Header />
            <div className="flex-1 flex flex-col items-center justify-center gap-6 max-w-sm mx-auto">
                <div className="size-24 rounded-full bg-emerald-400/10 flex items-center justify-center">
                    <span className="material-symbols-outlined text-emerald-400 text-[56px]">check_circle</span>
                </div>
                <div>
                    <h1 className="text-2xl font-bold text-white">Claim Submitted</h1>
                    <p className="text-slate-400 mt-3 leading-relaxed">
                        Your claim has been received and will be reviewed by our AI adjudication engine. You'll receive a decision within <strong className="text-white">24–48 hours</strong>.
                    </p>
                </div>
                <div className="w-full rounded-2xl border border-surface-border bg-surface-dark-customer p-5 text-left space-y-3">
                    <div className="flex justify-between text-sm">
                        <span className="text-slate-500">Claim Reference</span>
                        <span className="text-white font-mono font-semibold">CLM-9822</span>
                    </div>
                    <div className="flex justify-between text-sm">
                        <span className="text-slate-500">Submitted</span>
                        <span className="text-white">Feb 20, 2025</span>
                    </div>
                    <div className="flex justify-between text-sm">
                        <span className="text-slate-500">Status</span>
                        <span className="text-yellow-400 font-semibold">Under Review</span>
                    </div>
                </div>
                <div className="flex gap-3 w-full">
                    <button onClick={() => navigate('/customer/claims')} className="flex-1 py-3 rounded-xl border border-surface-border text-slate-400 hover:text-white font-semibold text-sm transition-colors">My Claims</button>
                    <button onClick={() => navigate('/customer')} className="flex-1 py-3 rounded-xl bg-primary hover:bg-primary-dark text-white font-semibold text-sm transition-colors">Home</button>
                </div>
            </div>
        </div>
    )
}
