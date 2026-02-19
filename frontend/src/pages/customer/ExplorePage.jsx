import { useNavigate } from 'react-router-dom'
import Header from '../../components/customer/Header'
import BottomNav from '../../components/customer/BottomNav'

const plans = [
    { title: 'Critical Illness Rider', desc: 'Lump-sum payout on diagnosis of 36 critical illnesses including cancer, stroke, and heart attack.', price: '$44/mo', icon: 'medical_services', color: 'text-red-400 bg-red-400/10', popular: false },
    { title: 'Accidental Death & Disability', desc: 'Additional coverage for accidental disability or death — up to $500,000 benefit.', price: '$31/mo', icon: 'personal_injury', color: 'text-orange-400 bg-orange-400/10', popular: true },
    { title: 'Travel Insurance Bundle', desc: 'International medical, trip cancellation, and lost luggage coverage for frequent travelers.', price: '$18/mo', icon: 'flight', color: 'text-blue-400 bg-blue-400/10', popular: false },
    { title: 'Pet Insurance', desc: 'Comprehensive vet coverage for accidents, illnesses, and routine checkups for your pet.', price: '$22/mo', icon: 'pets', color: 'text-purple-400 bg-purple-400/10', popular: false },
]

export default function ExplorePage() {
    const navigate = useNavigate()
    return (
        <div className="min-h-screen bg-background-dark text-slate-100 flex flex-col pb-32">
            <Header showBack />
            <main className="mx-auto w-full max-w-2xl px-4 pt-8 space-y-6">
                <div>
                    <h1 className="text-2xl font-bold text-white">Explore Coverage</h1>
                    <p className="text-slate-500 text-sm mt-1">AI-recommended plans based on your profile</p>
                </div>
                <div className="space-y-4">
                    {plans.map((p) => (
                        <div key={p.title} className="relative rounded-2xl border border-surface-border bg-surface-dark-customer p-6">
                            {p.popular && (
                                <span className="absolute top-4 right-4 text-[11px] font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-full">Popular</span>
                            )}
                            <div className="flex items-start gap-4 mb-4">
                                <div className={`size-11 rounded-xl flex items-center justify-center ${p.color}`}>
                                    <span className="material-symbols-outlined text-[22px]">{p.icon}</span>
                                </div>
                                <div className="flex-1">
                                    <p className="font-semibold text-white">{p.title}</p>
                                    <p className="text-xs text-slate-500 mt-1 leading-relaxed">{p.desc}</p>
                                </div>
                            </div>
                            <div className="flex items-center justify-between">
                                <p className="text-lg font-bold text-white">{p.price}</p>
                                <button
                                    onClick={() => navigate('/customer/policy-detail')}
                                    className="px-5 py-2 rounded-xl bg-primary/10 text-primary hover:bg-primary hover:text-white font-semibold text-sm transition-all"
                                >
                                    Get Quote
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            </main>
            <BottomNav />
        </div>
    )
}
