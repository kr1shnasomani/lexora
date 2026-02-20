import { useNavigate } from 'react-router-dom'
import Header from '../../components/customer/Header'
import BottomNav from '../../components/customer/BottomNav'

export default function HomePage() {
    const navigate = useNavigate()

    return (
        <div className="min-h-screen bg-background-dark text-slate-100 flex flex-col font-display antialiased overflow-x-hidden selection:bg-primary selection:text-white pb-32">
            <Header />

            {/* Main Content */}
            <main className="flex-1 max-w-7xl mx-auto w-full p-4 md:p-8 pb-32">

                {/* Welcome Section */}
                <section className="mb-10">
                    <div className="flex flex-col gap-2">
                        <h2 className="text-4xl md:text-5xl font-bold text-white tracking-tight">Good morning, Kumud</h2>
                        <p className="text-slate-400 text-lg">Intelligence Core active. Your coverage is optimized.</p>
                    </div>
                </section>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">

                    {/* Left Column: Active Policies (Span 7) */}
                    <div className="lg:col-span-7 flex flex-col gap-6">
                        <div className="flex items-center justify-between mb-2">
                            <h3 className="text-xl font-bold text-white">Your Active Protection</h3>
                            <button
                                onClick={() => navigate('/customer/policies')}
                                className="text-sm text-primary hover:text-red-400 font-medium flex items-center gap-1 group"
                            >
                                View All Policies
                                <span className="material-symbols-outlined text-[16px] group-hover:translate-x-1 transition-transform">arrow_forward</span>
                            </button>
                        </div>

                        {/* Policy Card 1: Health */}
                        <div className="group relative overflow-hidden rounded-2xl bg-surface-dark-customer border border-surface-border p-6 transition-all hover:border-primary/50 shadow-lg shadow-black/20">
                            {/* Ghost icon background */}
                            <div className="absolute top-0 right-0 p-6 opacity-10 group-hover:opacity-20 transition-opacity">
                                <span className="material-symbols-outlined text-[120px] text-white">medical_services</span>
                            </div>
                            <div className="flex flex-col h-full justify-between relative z-10">
                                <div className="flex justify-between items-start mb-6">
                                    <div className="flex gap-4 items-center">
                                        <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary border border-primary/20">
                                            <span className="material-symbols-outlined text-[28px]">cardiology</span>
                                        </div>
                                        <div>
                                            <h4 className="text-xl font-bold text-white">Health Shield Premier</h4>
                                            <p className="text-slate-400 text-sm font-mono">Policy #H-992-883</p>
                                        </div>
                                    </div>
                                    <span className="px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 text-xs font-bold border border-emerald-500/20 uppercase tracking-wide">Active</span>
                                </div>
                                <div className="grid grid-cols-2 gap-4 mb-8">
                                    <div>
                                        <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Coverage</p>
                                        <p className="text-white font-medium">$500,000</p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Renewal</p>
                                        <p className="text-white font-medium">Oct 24, 2024</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3 mt-auto">
                                    <button
                                        onClick={() => navigate('/customer/claims')}
                                        className="flex-1 bg-primary hover:bg-red-600 text-white font-bold py-3 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
                                    >
                                        <span className="material-symbols-outlined text-[20px]">description</span>
                                        File a Claim
                                    </button>
                                    <button
                                        onClick={() => navigate('/customer/policy-detail')}
                                        className="px-4 py-3 rounded-lg border border-surface-border text-slate-300 hover:text-white hover:bg-surface-border transition-colors font-medium"
                                    >
                                        Details
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Policy Card 2: Auto */}
                        <div className="group relative overflow-hidden rounded-2xl bg-surface-dark-customer border border-surface-border p-6 transition-all hover:border-primary/50 shadow-lg shadow-black/20">
                            {/* Ghost icon background */}
                            <div className="absolute top-0 right-0 p-6 opacity-10 group-hover:opacity-20 transition-opacity">
                                <span className="material-symbols-outlined text-[120px] text-white">directions_car</span>
                            </div>
                            <div className="flex flex-col h-full justify-between relative z-10">
                                <div className="flex justify-between items-start mb-6">
                                    <div className="flex gap-4 items-center">
                                        <div className="h-12 w-12 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-400 border border-blue-500/20">
                                            <span className="material-symbols-outlined text-[28px]">directions_car</span>
                                        </div>
                                        <div>
                                            <h4 className="text-xl font-bold text-white">Auto Drive Secure</h4>
                                            <p className="text-slate-400 text-sm font-mono">Policy #A-110-442</p>
                                        </div>
                                    </div>
                                    <span className="px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 text-xs font-bold border border-emerald-500/20 uppercase tracking-wide">Active</span>
                                </div>
                                <div className="grid grid-cols-2 gap-4 mb-8">
                                    <div>
                                        <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Vehicle</p>
                                        <p className="text-white font-medium">Tesla Model 3</p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Next Payment</p>
                                        <p className="text-white font-medium">Nov 01, 2024</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3 mt-auto">
                                    <button
                                        onClick={() => navigate('/customer/claims')}
                                        className="flex-1 bg-primary hover:bg-red-600 text-white font-bold py-3 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
                                    >
                                        <span className="material-symbols-outlined text-[20px]">build</span>
                                        Request Service
                                    </button>
                                    <button
                                        onClick={() => navigate('/customer/docs')}
                                        className="px-4 py-3 rounded-lg border border-surface-border text-slate-300 hover:text-white hover:bg-surface-border transition-colors font-medium"
                                    >
                                        ID Card
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Right Column: Explore & Promos (Span 5) */}
                    <div className="lg:col-span-5 flex flex-col gap-8">

                        {/* Explore Coverage Grid */}
                        <div>
                            <h3 className="text-xl font-bold text-white mb-4">Explore Coverage</h3>
                            <div className="grid grid-cols-2 gap-3">
                                {[
                                    { icon: 'home', label: 'Home' },
                                    { icon: 'flight', label: 'Travel' },
                                    { icon: 'pets', label: 'Pet' },
                                    { icon: 'favorite', label: 'Life' },
                                ].map(({ icon, label }) => (
                                    <button
                                        key={label}
                                        onClick={() => navigate('/customer/explore')}
                                        className="flex flex-col items-center justify-center gap-2 p-4 rounded-xl bg-surface-dark-customer border border-surface-border hover:border-primary/50 hover:bg-surface-border transition-all group"
                                    >
                                        <span className="material-symbols-outlined text-3xl text-slate-400 group-hover:text-primary transition-colors">{icon}</span>
                                        <span className="text-sm font-medium text-slate-300 group-hover:text-white">{label}</span>
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Promo Cards */}
                        <div className="flex flex-col gap-4">

                            {/* Tax Savings Promo */}
                            <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-surface-dark-customer to-surface-border border border-surface-border p-5">
                                <div className="absolute right-0 top-0 h-full w-1/3 bg-gradient-to-l from-primary/10 to-transparent"></div>
                                <div className="relative z-10">
                                    <div className="flex items-center gap-2 mb-2 text-primary">
                                        <span className="material-symbols-outlined text-[20px]">savings</span>
                                        <span className="text-xs font-bold uppercase tracking-wider">Tax Season</span>
                                    </div>
                                    <h4 className="text-lg font-bold text-white mb-1">Maximize Your Deductions</h4>
                                    <p className="text-slate-400 text-sm mb-4">See how your current health premiums can save you money this year.</p>
                                    <button className="text-white text-sm font-bold hover:text-primary transition-colors flex items-center gap-1">
                                        Calculate Savings
                                        <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
                                    </button>
                                </div>
                            </div>

                            {/* Travel Insurance Promo */}
                            <div className="relative overflow-hidden rounded-xl bg-surface-dark-customer border border-surface-border">
                                <div className="relative h-32 w-full overflow-hidden">
                                    <img
                                        src="https://images.unsplash.com/photo-1436491865332-7a61a109cc05?w=600&auto=format&fit=crop&q=60"
                                        alt="Airplane wing view above clouds"
                                        className="w-full h-full object-cover"
                                    />
                                    <div className="absolute inset-0 bg-gradient-to-t from-surface-dark-customer to-transparent"></div>
                                </div>
                                <div className="p-5 relative -mt-8">
                                    <span className="inline-block px-2 py-1 bg-blue-600 text-white text-[10px] font-bold uppercase tracking-wider rounded mb-2">New</span>
                                    <h4 className="text-lg font-bold text-white mb-1">Travel Insurance 2.0</h4>
                                    <p className="text-slate-400 text-sm mb-4">Instant coverage for flight delays and lost baggage. From $5/day.</p>
                                    <button
                                        onClick={() => navigate('/customer/explore')}
                                        className="w-full py-2 rounded-lg bg-surface-border text-white text-sm font-bold hover:bg-white hover:text-surface-dark-customer transition-colors"
                                    >
                                        Get a Quote
                                    </button>
                                </div>
                            </div>

                        </div>
                    </div>
                </div>
            </main>

            <BottomNav />
        </div>
    )
}
