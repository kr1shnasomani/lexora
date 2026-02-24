import { useNavigate } from 'react-router-dom'
import { useState } from 'react'

export default function CustomerClaimsPanel({ isOpen, onClose }) {
    const navigate = useNavigate()
    const [filter, setFilter] = useState('All Claims')

    if (!isOpen) return null

    return (
        <div className="fixed inset-x-0 bottom-0 z-50 flex flex-col items-center justify-end md:justify-center h-full pointer-events-none p-4 w-full">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm pointer-events-auto" onClick={onClose}></div>

            <div className="w-full max-w-3xl bg-[#18181b] border border-[#27272a] shadow-2xl rounded-t-3xl md:rounded-2xl pointer-events-auto flex flex-col max-h-[90vh] md:max-h-[85vh] relative overflow-hidden animate-slide-up">

                {/* Mobile Drag Handle */}
                <div className="w-full flex justify-center pt-3 pb-1 md:hidden bg-[#18181b] sticky top-0 z-20">
                    <div className="w-12 h-1.5 bg-[#27272a] rounded-full"></div>
                </div>

                <div className="px-6 py-6 border-b border-[#27272a] bg-[#18181b] sticky top-0 z-10 flex flex-col gap-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <h2 className="text-2xl md:text-3xl font-bold text-white tracking-tight">Claims</h2>
                            <p className="text-slate-400 text-sm mt-1">Manage and track your insurance claims</p>
                        </div>
                        <button onClick={onClose} className="p-2 text-slate-400 hover:text-white hover:bg-[#27272a] rounded-full transition-colors md:absolute md:top-6 md:right-6 shadow-md">
                            <span className="material-symbols-outlined">close</span>
                        </button>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-4">
                        <button onClick={() => navigate('/customer/file-claim')} className="flex-1 bg-primary hover:bg-red-600 text-white font-bold py-3 px-6 rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-primary/20">
                            <span className="material-symbols-outlined">add_circle</span>
                            File a New Claim
                        </button>
                        <button onClick={() => navigate('/customer/claims')} className="flex-1 bg-transparent border border-[#27272a] hover:bg-[#27272a] text-slate-300 hover:text-white font-bold py-3 px-6 rounded-xl transition-all flex items-center justify-center gap-2">
                            <span className="material-symbols-outlined">search</span>
                            Track Existing
                        </button>
                    </div>

                    <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-hide">
                        {['All Claims', 'In Review', 'Action Required', 'Settled'].map(f => (
                            <button
                                key={f}
                                onClick={() => setFilter(f)}
                                className={`px-4 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors border ${filter === f
                                    ? 'bg-primary text-white border-primary'
                                    : 'bg-[#18181b] border-[#27272a] text-slate-400 hover:text-white hover:border-slate-500'
                                    }`}
                            >
                                {f}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto p-6 bg-[#121214]">
                    <div className="flex flex-col gap-4">

                        {/* Static Fallback Claim 1 */}
                        {(filter === 'All Claims' || filter === 'In Review') && (
                            <div className="bg-[#18181b] border border-[#27272a] rounded-xl p-5 hover:border-primary/40 transition-colors group cursor-pointer relative overflow-hidden">
                                <div className="absolute top-0 left-0 w-1 h-full bg-amber-500"></div>
                                <div className="flex justify-between items-start mb-4">
                                    <div>
                                        <div className="flex items-center gap-3 mb-1">
                                            <h3 className="text-white font-bold text-lg">Windshield Crack</h3>
                                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/10 text-amber-500 border border-amber-500/20 uppercase tracking-wide">Reviewing</span>
                                        </div>
                                        <p className="text-slate-500 text-xs font-mono">ID: #CLM-2024-8892 • Auto Policy</p>
                                    </div>
                                    <span className="text-slate-400 text-xs">Updated 2h ago</span>
                                </div>
                                <div className="mb-4">
                                    <div className="flex justify-between text-[10px] uppercase font-bold text-slate-500 mb-2 tracking-wider">
                                        <span className="text-primary">Filed</span>
                                        <span className="text-amber-500">Review</span>
                                        <span>Approval</span>
                                        <span>Payout</span>
                                    </div>
                                    <div className="flex gap-1 h-1.5 w-full">
                                        <div className="flex-1 bg-primary rounded-full"></div>
                                        <div className="flex-1 bg-amber-500 rounded-full animate-pulse"></div>
                                        <div className="flex-1 bg-[#27272a] rounded-full"></div>
                                        <div className="flex-1 bg-[#27272a] rounded-full"></div>
                                    </div>
                                </div>
                                <div className="flex items-center justify-between mt-2 pt-3 border-t border-[#27272a]/50">
                                    <div className="flex -space-x-2">
                                        <div className="h-6 w-6 rounded-full border border-[#18181b] bg-[#27272a] flex items-center justify-center text-[10px] text-white" title="Adjuster assigned">AD</div>
                                    </div>
                                    <button className="text-xs font-medium text-slate-300 group-hover:text-primary flex items-center gap-1 transition-colors">
                                        View Details <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* Static Fallback Claim 2 */}
                        {(filter === 'All Claims' || filter === 'Action Required') && (
                            <div className="bg-[#18181b] border border-[#27272a] rounded-xl p-5 hover:border-primary/40 transition-colors group cursor-pointer relative overflow-hidden">
                                <div className="absolute top-0 left-0 w-1 h-full bg-primary"></div>
                                <div className="flex justify-between items-start mb-4">
                                    <div>
                                        <div className="flex items-center gap-3 mb-1">
                                            <h3 className="text-white font-bold text-lg">Travel Delay - Tokyo</h3>
                                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-primary/10 text-primary border border-primary/20 uppercase tracking-wide">Action Required</span>
                                        </div>
                                        <p className="text-slate-500 text-xs font-mono">ID: #CLM-2024-8841 • Travel Policy</p>
                                    </div>
                                    <span className="text-slate-400 text-xs">Yesterday</span>
                                </div>
                                <div className="bg-primary/5 border border-primary/10 rounded-lg p-3 mb-3 flex gap-3 items-start">
                                    <span className="material-symbols-outlined text-primary text-lg mt-0.5">upload_file</span>
                                    <div>
                                        <p className="text-sm text-slate-200 font-medium">Missing Documents</p>
                                        <p className="text-xs text-slate-400">Please upload your boarding pass and original itinerary.</p>
                                    </div>
                                </div>
                                <div className="flex items-center justify-between mt-2">
                                    <button className="px-3 py-1.5 rounded-lg bg-primary text-white text-xs font-bold hover:bg-red-600 transition-colors">
                                        Upload Now
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* Static Fallback Claim 3 */}
                        {(filter === 'All Claims' || filter === 'Settled') && (
                            <div className="bg-[#18181b] border border-[#27272a] rounded-xl p-5 hover:border-emerald-500/40 transition-colors group cursor-pointer relative overflow-hidden opacity-75 hover:opacity-100">
                                <div className="absolute top-0 left-0 w-1 h-full bg-emerald-500"></div>
                                <div className="flex justify-between items-start mb-4">
                                    <div>
                                        <div className="flex items-center gap-3 mb-1">
                                            <h3 className="text-white font-bold text-lg">Routine Dental Checkup</h3>
                                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 uppercase tracking-wide">Settled</span>
                                        </div>
                                        <p className="text-slate-500 text-xs font-mono">ID: #CLM-2023-1024 • Health Policy</p>
                                    </div>
                                    <span className="text-slate-400 text-xs">Oct 12, 2023</span>
                                </div>
                                <div className="flex items-center justify-between mt-2 pt-3 border-t border-[#27272a]/50">
                                    <div className="flex flex-col">
                                        <span className="text-[10px] text-slate-500 uppercase tracking-wider">Payout Amount</span>
                                        <span className="text-sm font-bold text-white">₹240.00</span>
                                    </div>
                                    <button className="text-xs font-medium text-slate-300 hover:text-white flex items-center gap-1 transition-colors">
                                        <span className="material-symbols-outlined text-[14px]">download</span> Statement
                                    </button>
                                </div>
                            </div>
                        )}

                    </div>
                </div>

                <div className="absolute bottom-0 left-0 w-full h-8 bg-gradient-to-t from-[#121214] to-transparent pointer-events-none"></div>
            </div>
        </div>
    )
}
