import { useNavigate, useSearchParams } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { useFetch } from '../../hooks/useFetch'

export default function ClaimStatus() {
    const navigate = useNavigate()
    const [searchParams] = useSearchParams()
    const claimId = searchParams.get('id')

    const { user } = useAuth()
    const { data: claim, loading, error } = useFetch(user?.email && claimId ? `/api/customer/claims/${claimId}?email=${encodeURIComponent(user.email)}` : null)

    // Normalize status into 3 known states for the UI
    let viewState = 'pending'
    const finalDec = (claim?.final_decision || '').toLowerCase()
    const statusVal = (claim?.status || 'pending').toLowerCase()

    if (finalDec.includes('reject') || statusVal.includes('reject') || statusVal === 'error') {
        viewState = 'rejected'
    } else if (finalDec.includes('approve') || ['approved', 'settled', 'finalized'].includes(statusVal)) {
        viewState = 'approved'
    }

    const fmt = (num) => `₹${Number(num || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
    const pd = claim?.policy_decision || {}
    const fins = pd.financials || {}
    const reasons = pd.reasons || []

    // UI Configuration based on state mapping exactly to the 3 mockups
    const uiConfig = {
        approved: {
            accentColor: 'text-[#10b981]',
            bgGlow: 'bg-[#10b981]/10',
            ringColor: 'ring-[#10b981]/50',
            shadowGlow: 'shadow-[0_0_40px_-10px_rgba(16,185,129,0.5)]',
            icon: 'check',
            title: 'Claim Approved',
            decisionId: claim?.claim_number || '#N/A',
            amountLabel: 'Total Approved Amount',
            amountValue: fmt(fins.recommended_amount || claim?.approved_amount || claim?.claimed_amount),
            logicTitle: 'Intelligence Decision Logic',
            logicBadge: 'Verified',
            logicBadgeColor: 'bg-[#10b981]/20 text-[#10b981]',
            logicIcon: 'psychology',
            logicIconBg: 'bg-primary/10 text-primary',
            logicDesc: <>This claim matches <strong className="text-white">Policy {claim?.policy?.policy_number}</strong> active coverage. Recommended payout generated based on terms. {reasons.length > 0 ? reasons[0].message : 'No anomalies detected.'}</>,
            stats: [
                { label: 'Original Claim', value: fmt(fins.claimed_amount || claim?.claimed_amount || claim?.amount) },
                { label: 'Deductible/Co-pay', value: `- ${fmt(fins.deductible || 0)}`, color: 'text-primary' },
                { label: 'Policy Match', value: <span className="flex items-center gap-1"><span className="material-symbols-outlined text-sm">verified_user</span> 100% Match</span>, color: 'text-[#10b981]' }
            ],
            btn1: { label: 'Download Decision Letter', icon: 'download' },
            btn2: { label: 'Return to Queue', icon: 'arrow_forward', primary: true },
            gradientBottom: 'via-[#10b981]'
        },
        pending: {
            accentColor: 'text-[#f59e0b]',
            bgGlow: 'bg-[#f59e0b]/10',
            ringColor: 'ring-[#f59e0b]/50',
            shadowGlow: 'shadow-[0_0_40px_-10px_rgba(245,158,11,0.5)]',
            icon: 'schedule',
            iconAnimate: 'animate-pulse',
            title: 'Decision Pending',
            decisionId: claim?.claim_number || '#N/A',
            amountLabel: 'Estimated Completion',
            amountValue: <>24-48 <span className="text-2xl md:text-4xl font-light text-[#f59e0b]/60">HRS</span></>,
            logicTitle: 'Manual Verification Required',
            logicBadge: 'In Progress',
            logicBadgeColor: 'bg-[#f59e0b]/20 text-[#f59e0b]',
            logicIcon: 'person_search',
            logicIconBg: 'bg-[#f59e0b]/10 text-[#f59e0b]',
            logicDesc: <>Our automated system has flagged this claim for additional review. {reasons.length > 0 ? <strong className="text-white">{reasons[0].message}</strong> : 'A specialist is verifying the reports.'}</>,
            stats: [
                { label: <span className="flex items-center gap-1"><span className="material-symbols-outlined text-sm">check_circle</span> Submission</span>, value: 'Received', opacity: 'opacity-50', color: 'text-white' },
                { label: <span className="flex items-center gap-1 text-[#f59e0b]"><span className="material-symbols-outlined text-sm animate-spin">sync</span> Review</span>, value: 'Processing...', color: 'text-[#f59e0b]' },
                { label: <span className="flex items-center gap-1"><span className="material-symbols-outlined text-sm">circle</span> Decision</span>, value: 'Pending', color: 'text-slate-400', opacity: 'opacity-50' }
            ],
            btn1: { label: 'Support Center', icon: 'help' },
            btn2: { label: 'Notify Me When Ready', icon: 'notifications', primary: true, btnColor: 'bg-[#f59e0b] hover:bg-amber-600 text-black hover:text-white shadow-[0_4px_14px_0_rgba(245,158,11,0.2)] hover:shadow-[0_6px_20px_rgba(245,158,11,0.4)]' },
            gradientBottom: 'via-[#f59e0b]'
        },
        rejected: {
            accentColor: 'text-primary',
            bgGlow: 'bg-primary/15',
            ringColor: 'ring-primary/50',
            shadowGlow: 'shadow-[0_0_40px_-10px_rgba(232,48,73,0.5)]',
            icon: 'close',
            title: 'Claim Not Approved',
            decisionId: claim?.claim_number || '#N/A',
            amountLabel: 'Primary Rejection Reason',
            amountValue: <span className="text-2xl md:text-3xl font-bold text-white tracking-tighter drop-shadow-lg text-center max-w-lg leading-tight">{reasons.length > 0 ? reasons[0].message : 'Policy Exclusion'}</span>,
            logicTitle: 'Intelligence Decision Logic',
            logicBadge: 'Final',
            logicBadgeColor: 'bg-primary/20 text-primary',
            logicIcon: 'policy',
            logicIconBg: 'bg-primary/10 text-primary',
            logicDesc: <>This claim has been flagged based on the policy terms. The submitted procedure documentation does not meet the specified criteria for disbursement.</>,
            stats: [
                { label: 'Claimed Amount', value: <span className="line-through decoration-slate-600">{fmt(fins.claimed_amount || claim?.claimed_amount || claim?.amount)}</span>, color: 'text-slate-400' },
                { label: 'Reason Code', value: reasons.length > 0 ? reasons[0].code : 'N/A', color: 'text-primary' },
                { label: 'Status', value: <span className="flex items-center gap-1"><span className="material-symbols-outlined text-sm">block</span> Rejected</span>, color: 'text-primary' }
            ],
            btn1: { label: 'View Full Report', icon: 'description' },
            btn2: { label: 'Next Claim', icon: 'arrow_forward', primary: true, btnColor: 'bg-white/5 hover:bg-white/10 text-white border border-white/10 shadow-none hover:shadow-none' },
            gradientBottom: 'via-primary'
        }
    }

    const c = uiConfig[viewState]

    if (loading || !claim) {
        return (
            <div className="bg-background-dark min-h-screen flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            </div>
        )
    }

    if (error) {
        return (
            <div className="bg-background-dark min-h-screen flex items-center justify-center text-white">
                <div className="text-center space-y-4">
                    <span className="material-symbols-outlined text-4xl text-primary flex justify-center">error</span>
                    <p>Failed to load claim details.</p>
                    <button onClick={() => navigate(-1)} className="text-sm text-primary hover:underline">Go Back</button>
                </div>
            </div>
        )
    }

    return (
        <div className="bg-background-light dark:bg-background-dark min-h-screen flex flex-col font-display antialiased overflow-x-hidden text-slate-900 dark:text-slate-100 selection:bg-primary selection:text-white relative">

            {/* Background Glow */}
            <div className={`absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-3xl h-64 ${c.bgGlow} blur-[100px] rounded-full pointer-events-none z-0`}></div>

            <header className="absolute top-0 left-0 w-full p-6 flex justify-between items-center z-20">
                <div className="flex items-center gap-3 opacity-80 hover:opacity-100 transition-opacity cursor-pointer" onClick={() => navigate('/customer')}>
                    <div className="size-8 text-primary">
                        <svg className="w-full h-full" fill="none" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
                            <path d="M36.7273 44C33.9891 44 31.6043 39.8386 30.3636 33.69C29.123 39.8386 26.7382 44 24 44C21.2618 44 18.877 39.8386 17.6364 33.69C16.3957 39.8386 14.0109 44 11.2727 44C7.25611 44 4 35.0457 4 24C4 12.9543 7.25611 4 11.2727 4C14.0109 4 16.3957 8.16144 17.6364 14.31C18.877 8.16144 21.2618 4 24 4C26.7382 4 29.123 8.16144 30.3636 14.31C31.6043 8.16144 33.9891 4 36.7273 4C40.7439 4 44 12.9543 44 24C44 35.0457 40.7439 44 36.7273 44Z" fill="currentColor"></path>
                        </svg>
                    </div>
                    <span className="text-sm font-bold tracking-wider uppercase text-slate-400">Intelligence Core</span>
                </div>
                <button onClick={() => navigate(-1)} className="text-slate-400 hover:text-white transition-colors">
                    <span className="material-symbols-outlined text-3xl">close</span>
                </button>
            </header>

            <div className="flex-1 flex flex-col items-center justify-center p-4 md:p-8 w-full z-10 pt-24 pb-12">
                <main className="w-full max-w-2xl flex flex-col items-center gap-8 animate-fade-in-up">

                    {/* Status Header */}
                    <div className="flex flex-col items-center text-center gap-6">
                        <div className={`relative flex items-center justify-center size-24 rounded-full ${c.bgGlow} ${c.accentColor} ring-1 ${c.ringColor} ${c.shadowGlow} ${c.iconAnimate || ''}`}>
                            <span className="material-symbols-outlined text-6xl font-bold">{c.icon}</span>
                        </div>
                        <div className="space-y-1">
                            <h1 className="text-4xl md:text-5xl font-bold text-white tracking-tight">{c.title}</h1>
                            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#38292b]/50 border border-[#38292b] text-slate-400 text-xs font-mono mt-2">
                                <span className="material-symbols-outlined text-sm">fingerprint</span>
                                <span>Decision ID: {c.decisionId}</span>
                            </div>
                        </div>
                    </div>

                    {/* Value Amount */}
                    <div className="flex flex-col items-center justify-center py-2 min-h-[96px]">
                        <p className={`text-sm ${c.accentColor} opacity-80 font-medium uppercase tracking-widest mb-2`}>{c.amountLabel}</p>
                        <div className={`text-5xl md:text-7xl font-bold ${c.accentColor} tracking-tighter drop-shadow-lg flex items-baseline gap-2 justify-center`}>
                            {c.amountValue}
                        </div>
                    </div>

                    {/* Decision Logic Box */}
                    <div className="w-full bg-[#38292b]/40 backdrop-blur-md border border-[#38292b] rounded-2xl p-1 shadow-xl">
                        <div className="bg-[#261c1d] rounded-xl p-6 md:p-8 flex flex-col gap-6">
                            <div className="flex items-start gap-4">
                                <div className={`p-2 rounded-lg shrink-0 mt-1 ${c.logicIconBg}`}>
                                    <span className="material-symbols-outlined">{c.logicIcon}</span>
                                </div>
                                <div className="space-y-2">
                                    <h3 className="text-lg font-bold text-white flex items-center gap-2">
                                        {c.logicTitle}
                                        <span className={`${c.logicBadgeColor} text-[10px] px-2 py-0.5 rounded uppercase font-bold tracking-wide`}>{c.logicBadge}</span>
                                    </h3>
                                    <p className="text-slate-300 leading-relaxed text-sm md:text-base">
                                        {c.logicDesc}
                                    </p>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 border-t border-[#38292b] pt-6 mt-2">
                                {c.stats.map((s, i) => (
                                    <div key={i} className={`flex flex-col gap-1 ${s.opacity || ''}`}>
                                        <span className="text-xs text-slate-500 uppercase font-bold tracking-wider">{s.label}</span>
                                        <span className={`font-medium ${s.color || 'text-white'}`}>{s.value}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="flex flex-col md:flex-row items-center gap-4 w-full md:w-auto mt-4">
                        <button className="w-full md:w-auto flex items-center justify-center gap-2 bg-[#38292b] hover:bg-[#4a3b3d] text-white px-6 py-3 rounded-lg font-medium transition-colors border border-transparent hover:border-slate-600">
                            <span className="material-symbols-outlined">{c.btn1.icon}</span>
                            <span>{c.btn1.label}</span>
                        </button>
                        <button
                            onClick={() => navigate('/customer/claims')}
                            className={`w-full md:w-auto flex items-center justify-center gap-2 px-8 py-3 rounded-lg font-bold transition-all ${c.btn2.btnColor || 'bg-primary hover:bg-red-600 text-white shadow-lg shadow-primary/20 hover:shadow-primary/40'}`}
                        >
                            <span>{c.btn2.label}</span>
                            <span className="material-symbols-outlined text-sm">{c.btn2.icon}</span>
                        </button>
                    </div>

                </main>
            </div>

            {/* Bottom Gradient Line */}
            <div className={`fixed bottom-0 left-0 w-full h-1 bg-gradient-to-r from-transparent ${c.gradientBottom} to-transparent opacity-50`}></div>
        </div>
    )
}
