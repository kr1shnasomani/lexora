import { useState } from 'react'
import Sidebar from '../../components/admin/Sidebar'
import TopHeader from '../../components/admin/TopHeader'

/* ─── Data ─────────────────────────────────────────────── */
const claims = [
    {
        id: 'CLM-9942',
        holder: 'Sarah Jenkins',
        avatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDGnYAmwE0BVqlLq_GybRpf6bVtZ_GSxpvJliipTesOSKbsimSk8Rv-27L1O1C4Ju1KfbbQW8UafNpxhrvyUBHPCehuhcRGzCwLZcUCNHa6VNz9hE_mpslx56wNlqgxGONU5VlOADPHsqMun_xCMPEZ-mAg3_8aBnHZq_pxmyr33elnfcXGAtjcgcebhceQ6HLkcmitalMrB8r4SDvhGeyF0o0d3CVsz5E8xDnTQ8yadY_GsnKnpCWsrzCpwcPAYE-XAGDL3FTvhpRJ',
        type: 'Auto (Collision)',
        amount: '$12,450.00',
        risk: 92,
        ringColor: '#e83049',
        status: 'Checking',
        statusClass: 'bg-amber-500/10 text-amber-500 border-amber-500/20',
        dotClass: 'bg-amber-500',
        date: 'Oct 24, 2023',
        riskBand: 'High',
        adjuster: 'Senior Adjudicator',
        statusBadge: 'Manual Review',
        confidence: 96.4,
        policy: '#9921-A-Secure',
        since: 'Aug 2019',
        prevClaims: '2 (Low Value)',
        financials: [
            { label: 'Vehicle Repair Est.', value: '$8,250.00' },
            { label: 'Medical Expenses', value: '$4,200.00' },
        ],
        total: '$12,450.00',
        flags: [
            {
                icon: 'location_off',
                color: 'text-primary',
                title: 'Location Anomaly',
                desc: 'Claim incident reported in Chicago, IL but metadata from uploaded images contains GPS coordinates from Miami, FL (1,300 miles discrepancy).',
                critical: true,
            },
            {
                icon: 'image_search',
                color: 'text-primary',
                title: 'Mismatched Metadata',
                desc: 'EXIF data creation date predates the policy active period by 4 days.',
                critical: true,
            },
            {
                icon: 'history',
                color: 'text-amber-500',
                title: 'Frequency Spike',
                desc: 'Unusual claim submission velocity within family plan group.',
                critical: false,
            },
        ],
    },
    {
        id: 'CLM-8821',
        holder: 'Mark Thompson',
        avatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAW7SnFDk5o9_RBY_AtWg5cv-1Y8yjUpmpflNqyrFVKF5IYfc35dqrbT5AjKj8POyuGbrZku4oTMQcfE0M9EOxYANc8myKlagx_iZ4U2dldqh3SkvlNak2I6o4HMiO0bSfEgXb-RcwA49CHPGq-QP_lxA5VhE5bUCKizwJdbql045M9qnPrW0uGT8Di8-FxcJxEDgzv9xotw0q6jk9rfZoLWTtwv-sWJ8UJWXW_yIFpxDQOcyiTJcUXGakp47kLmnMYfdGdVDQBa6zJ',
        type: 'Medical',
        amount: '$450.00',
        risk: 14,
        ringColor: '#22c55e',
        status: 'Approved',
        statusClass: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20',
        dotClass: 'bg-emerald-500',
        date: 'Oct 24, 2023',
        riskBand: 'Low',
        adjuster: 'Auto-Adjudicator',
        statusBadge: 'Approved',
        confidence: 12.1,
        policy: '#4432-B-Health',
        since: 'Mar 2021',
        prevClaims: '1 (Low Value)',
        financials: [{ label: 'Medical Expenses', value: '$450.00' }],
        total: '$450.00',
        flags: [],
    },
    {
        id: 'CLM-9941',
        holder: 'David Chen',
        avatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuD2tGokLzc6T7d0-NZMIl-NJGl6vx5i-Rl5NJi4E5iHYCPh2xk5O4sIVEXOXJDjBbca6FLGjCXmSkH37pY_fXUPO5CG8B0r9vK3TqlPBqQyR0jquVOoP2jxVrcTFQIQNYs8pgBp2BxpjBnL40SaVfeG_AITJ-pozieuNO-8-IrZbhikGoz_CBo2xdCoOGEVxvtOYTGQwWk1uyw5xR2SO4-kLSpwfDq90a6No8WQEmwDjhGnR8ecmsJ_tMTgjsocl3k-A8lzue4NS1Dv',
        type: 'Property',
        amount: '$8,200.00',
        risk: 78,
        ringColor: '#f97316',
        status: 'Escalated',
        statusClass: 'bg-purple-500/10 text-purple-500 border-purple-500/20',
        dotClass: 'bg-purple-500',
        date: 'Oct 23, 2023',
        riskBand: 'High',
        adjuster: 'Fraud Analyst',
        statusBadge: 'Escalated',
        confidence: 74.5,
        policy: '#8801-C-Prop',
        since: 'Jan 2020',
        prevClaims: '3 (Mixed)',
        financials: [{ label: 'Property Damage', value: '$8,200.00' }],
        total: '$8,200.00',
        flags: [
            { icon: 'gpp_bad', color: 'text-orange-500', title: 'Prior Dispute', desc: 'Previous policy dispute on record from 2021.', critical: false },
        ],
    },
    {
        id: 'CLM-9935',
        holder: 'Emily Ross',
        avatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAFgKmWyNdPA8rNlFnZ09csERqMrpQr6czJi0z4WL_VwacJPsDCt9kluhPBdzeGpa5VQmvGinhgXDR3LZgMDu5qc10G4uTKcITwGyMfoXg4H8h8j0gkPgw5Ec1ef4TRoS33faIHFmK8MAUz06NWzQWqEAmRrT47ol6lr-0XGw4u6_vssmBjHIXnqqpGPDRYL302owOHM5NZjIHapbEm_KB08zxqGdIylkKMgGc5IejB6xcDp1N5MzypAp-gskKEOjEMm_Y1gNLpn2xn',
        type: 'Property',
        amount: '$15,000.00',
        risk: 88,
        ringColor: '#e83049',
        status: 'Flagged',
        statusClass: 'bg-primary/10 text-primary border-primary/20',
        dotClass: 'bg-primary',
        date: 'Oct 22, 2023',
        riskBand: 'High',
        adjuster: 'Senior Adjudicator',
        statusBadge: 'Under Review',
        confidence: 88.2,
        policy: '#3345-A-Prop',
        since: 'Nov 2018',
        prevClaims: '0',
        financials: [{ label: 'Property Loss', value: '$15,000.00' }],
        total: '$15,000.00',
        flags: [
            { icon: 'image_search', color: 'text-primary', title: 'Document Inconsistency', desc: 'Submitted repair quotes contain logos from non-existent vendors.', critical: true },
        ],
    },
    {
        id: 'CLM-8819',
        holder: 'Marcus Johnson',
        avatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAnrrEPk6C1WF28I40g208JF7pSD6neeqF0djR-Z7w64dqyYa0P2mDMisrNx4MTrHJQ-4SA8GPhr2PAgQBgTTO9N1fFCugJQS5Fk-074N1_RsKXg3J3Hu_FJcc2nnjPVEcccIrsk2F5o36KMjjAHJEd1NUmPcOyuosZ0MbFMkO5k9e3ppHFyku0mwV-KwSGoWB1uDGTwFEMCAc6UEp_XPq4baAqESyvBgZ8S6oXVl0Gg45B23sTQop4wlHy9icnX1sdpvX6lMhBAtIU',
        type: 'Auto',
        amount: '$2,100.00',
        risk: 5,
        ringColor: '#22c55e',
        status: 'Approved',
        statusClass: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20',
        dotClass: 'bg-emerald-500',
        date: 'Oct 23, 2023',
        riskBand: 'Low',
        adjuster: 'Auto-Adjudicator',
        statusBadge: 'Approved',
        confidence: 5.3,
        policy: '#1192-D-Auto',
        since: 'Jun 2022',
        prevClaims: '1 (Low Value)',
        financials: [{ label: 'Auto Repair', value: '$2,100.00' }],
        total: '$2,100.00',
        flags: [],
    },
]

/* ─── Helpers ───────────────────────────────────────────── */
const CIRC = 2 * Math.PI * 15.9155 // circumference of SVG path

function RingScore({ score, color }) {
    const dash = (score / 100) * 100
    return (
        <div className="relative w-10 h-10 flex items-center justify-center">
            <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
                <path
                    fill="none" stroke="#2a2d35" strokeWidth="3"
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                />
                <path
                    fill="none" stroke={color} strokeWidth="3"
                    strokeDasharray={`${dash}, 100`}
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                    className={score >= 80 ? 'drop-shadow-[0_0_2px_rgba(232,48,73,0.8)]' : ''}
                />
            </svg>
            <span className="absolute text-[10px] font-bold text-white">
                {String(score).padStart(2, '0')}
            </span>
        </div>
    )
}

const FILTER_TABS = ['All Claims', 'High Risk (12)', 'Medium Risk (4)', 'Low Risk (88)']
const FILTER_ICONS = ['view_list', 'warning', 'error', 'check_circle']
const FILTER_BANDS = [null, 'High', 'Medium', 'Low']

export default function ClaimsQueuePage() {
    const [selected, setSelected] = useState(claims[0])
    const [activeTab, setActiveTab] = useState(0)

    const filtered = FILTER_BANDS[activeTab]
        ? claims.filter((c) => c.riskBand === FILTER_BANDS[activeTab])
        : claims

    return (
        <div className="flex h-screen bg-background-dark overflow-hidden">
            <Sidebar />
            <div className="flex flex-col flex-1 overflow-hidden">
                <TopHeader title="Claims Queue" />

                {/* Split layout */}
                <div className="flex flex-1 overflow-hidden relative">

                    {/* ── LEFT: Table panel ─────────────────────── */}
                    <div className="flex-1 flex flex-col overflow-hidden">
                        <div className="p-6 pb-3 space-y-4">
                            {/* Header */}
                            <div className="flex flex-wrap justify-between items-end gap-4">
                                <div>
                                    <h1 className="text-white text-2xl font-bold tracking-tight">Claims Process Queue</h1>
                                    <p className="text-slate-400 text-sm mt-0.5">
                                        Real-time adjudication and fraud detection stream.{' '}
                                        <span className="text-primary font-medium">12 High Risk</span> items pending.
                                    </p>
                                </div>
                                <div className="flex gap-2">
                                    <button className="flex items-center gap-2 px-3 py-2 bg-surface-dark border border-border-dark rounded-lg text-white hover:bg-border-dark transition-colors text-sm">
                                        <span className="material-symbols-outlined text-[18px]">filter_list</span>
                                        Filters
                                    </button>
                                    <button className="flex items-center gap-2 px-3 py-2 bg-primary hover:bg-primary-dark text-white rounded-lg transition-colors text-sm font-medium shadow-[0_0_15px_rgba(232,48,73,0.3)]">
                                        <span className="material-symbols-outlined text-[18px]">download</span>
                                        Export Data
                                    </button>
                                </div>
                            </div>

                            {/* Filter pills */}
                            <div className="flex items-center gap-2 overflow-x-auto pb-1">
                                {FILTER_TABS.map((tab, i) => (
                                    <button
                                        key={tab}
                                        onClick={() => setActiveTab(i)}
                                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm whitespace-nowrap transition-colors border ${activeTab === i
                                                ? 'bg-primary/20 border-primary/50 text-primary font-medium'
                                                : 'bg-surface-dark border-border-dark text-slate-300 hover:bg-border-dark'
                                            }`}
                                    >
                                        <span className="material-symbols-outlined text-[16px]">{FILTER_ICONS[i]}</span>
                                        {tab}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Table */}
                        <div className="flex-1 overflow-y-auto px-6 pb-6">
                            <div className="rounded-xl border border-border-dark bg-surface-dark overflow-hidden shadow-2xl shadow-black/50">
                                <table className="w-full text-left border-collapse">
                                    <thead>
                                        <tr className="bg-border-dark/40 border-b border-border-dark text-slate-400 text-xs uppercase tracking-wider">
                                            <th className="p-4 font-medium w-20">Risk</th>
                                            <th className="p-4 font-medium">Claim ID</th>
                                            <th className="p-4 font-medium">Claimant</th>
                                            <th className="p-4 font-medium">Type</th>
                                            <th className="p-4 font-medium text-right">Amount</th>
                                            <th className="p-4 font-medium">Status</th>
                                            <th className="p-4 font-medium text-right">Date</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-border-dark text-sm">
                                        {filtered.map((c) => {
                                            const isSelected = selected?.id === c.id
                                            return (
                                                <tr
                                                    key={c.id}
                                                    onClick={() => setSelected(c)}
                                                    className={`group transition-colors cursor-pointer border-l-4 ${isSelected
                                                            ? 'bg-primary/10 border-l-primary hover:bg-primary/15'
                                                            : 'border-l-transparent hover:bg-border-dark/30'
                                                        }`}
                                                >
                                                    <td className="p-4">
                                                        <RingScore score={c.risk} color={c.ringColor} />
                                                    </td>
                                                    <td className="p-4 font-mono text-white font-medium">
                                                        #{c.id}
                                                    </td>
                                                    <td className="p-4">
                                                        <div className="flex items-center gap-3">
                                                            <img
                                                                src={c.avatar}
                                                                alt={c.holder}
                                                                className="w-8 h-8 rounded-full object-cover"
                                                                onError={(e) => { e.target.style.display = 'none' }}
                                                            />
                                                            <span className={`font-medium ${isSelected ? 'text-white' : 'text-slate-300'}`}>
                                                                {c.holder}
                                                            </span>
                                                        </div>
                                                    </td>
                                                    <td className="p-4 text-slate-400">{c.type}</td>
                                                    <td className="p-4 text-right font-mono text-slate-200">{c.amount}</td>
                                                    <td className="p-4">
                                                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium border ${c.statusClass}`}>
                                                            <span className={`w-1.5 h-1.5 rounded-full ${c.dotClass}`}></span>
                                                            {c.status}
                                                        </span>
                                                    </td>
                                                    <td className="p-4 text-right text-slate-500">{c.date}</td>
                                                </tr>
                                            )
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>

                    {/* ── RIGHT: Detail Drawer ───────────────────── */}
                    {selected && (
                        <aside className="w-[400px] xl:w-[440px] shrink-0 border-l border-border-dark bg-surface-dark flex flex-col overflow-hidden relative shadow-[-10px_0_30px_rgba(0,0,0,0.4)]">
                            {/* Drawer header */}
                            <div className="flex items-center justify-between p-5 border-b border-border-dark bg-border-dark/20">
                                <div>
                                    <div className="flex items-center gap-3 mb-1">
                                        <h2 className="text-xl font-bold text-white font-mono">#{selected.id}</h2>
                                        <span className="px-2 py-0.5 bg-amber-500/20 text-amber-500 text-xs font-medium rounded border border-amber-500/30">
                                            {selected.statusBadge}
                                        </span>
                                    </div>
                                    <p className="text-slate-400 text-sm">
                                        Assigned to <span className="text-white">{selected.adjuster}</span>
                                    </p>
                                </div>
                                <button
                                    onClick={() => setSelected(null)}
                                    className="text-slate-400 hover:text-white transition-colors p-2 rounded-lg hover:bg-white/5"
                                >
                                    <span className="material-symbols-outlined">close</span>
                                </button>
                            </div>

                            {/* Scrollable content */}
                            <div className="flex-1 overflow-y-auto p-5 space-y-6 pb-36">

                                {/* Fraud hero card */}
                                <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-primary/10 to-background-dark border border-primary/20 p-5">
                                    <div className="absolute -top-8 -right-8 w-32 h-32 bg-primary/20 blur-[50px] rounded-full pointer-events-none"></div>
                                    <div className="flex items-start justify-between relative z-10">
                                        <div>
                                            <h3 className="text-primary font-bold text-base flex items-center gap-2">
                                                <span className="material-symbols-outlined text-[20px]">warning</span>
                                                Fraud Detected
                                            </h3>
                                            <p className="text-slate-400 text-xs mt-1 max-w-[200px] leading-relaxed">
                                                High precision analysis indicates significant anomalies in claim metadata.
                                            </p>
                                        </div>
                                        <div className="text-right">
                                            <div className="text-3xl font-bold text-white tracking-tighter drop-shadow-[0_0_10px_rgba(232,48,73,0.5)]">
                                                {selected.confidence}%
                                            </div>
                                            <div className="text-primary text-[10px] font-medium uppercase tracking-widest mt-0.5">
                                                Confidence Score
                                            </div>
                                        </div>
                                    </div>
                                    <div className="mt-4 h-2 w-full bg-black/40 rounded-full overflow-hidden flex">
                                        <div className="h-full bg-emerald-500 opacity-30" style={{ width: '10%' }}></div>
                                        <div className="h-full bg-amber-500 opacity-30" style={{ width: '20%' }}></div>
                                        <div className="h-full bg-primary shadow-[0_0_8px_currentColor]" style={{ width: `${Math.min(selected.confidence, 70)}%` }}></div>
                                    </div>
                                    <div className="flex justify-between mt-1.5 text-[10px] text-slate-500 font-mono">
                                        <span>Low Risk</span>
                                        <span>High Probability</span>
                                    </div>
                                </div>

                                {/* Claimant & Policy */}
                                <div>
                                    <h4 className="text-slate-400 text-xs font-bold uppercase tracking-widest border-b border-border-dark pb-2 mb-3">
                                        Claimant &amp; Policy
                                    </h4>
                                    <div className="flex items-start gap-4">
                                        <img
                                            src={selected.avatar}
                                            alt={selected.holder}
                                            className="w-14 h-14 rounded-lg object-cover border border-white/10"
                                            onError={(e) => { e.target.style.display = 'none' }}
                                        />
                                        <div className="grid grid-cols-2 gap-x-6 gap-y-2.5 flex-1">
                                            {[
                                                { label: 'Full Name', value: selected.holder },
                                                { label: 'Policy Number', value: selected.policy },
                                                { label: 'Member Since', value: selected.since },
                                                { label: 'Previous Claims', value: selected.prevClaims },
                                            ].map(({ label, value }) => (
                                                <div key={label}>
                                                    <div className="text-slate-500 text-[10px] uppercase tracking-wide">{label}</div>
                                                    <div className="text-white text-sm font-medium mt-0.5">{value}</div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>

                                {/* AI Flag Analysis */}
                                <div>
                                    <h4 className="text-slate-400 text-xs font-bold uppercase tracking-widest border-b border-border-dark pb-2 mb-3">
                                        AI Flag Analysis
                                    </h4>
                                    {selected.flags.length === 0 ? (
                                        <p className="text-slate-500 text-sm py-2">No anomalies detected for this claim.</p>
                                    ) : (
                                        <div className="space-y-2">
                                            {selected.flags.map((f, i) => (
                                                <div
                                                    key={i}
                                                    className={`flex gap-3 p-3 rounded-lg border ${f.critical
                                                            ? 'bg-background-dark border-primary/20'
                                                            : 'bg-background-dark border-white/10 opacity-70'
                                                        }`}
                                                >
                                                    <span className={`material-symbols-outlined text-[20px] mt-0.5 shrink-0 ${f.color}`}>
                                                        {f.icon}
                                                    </span>
                                                    <div>
                                                        <p className="text-white text-sm font-medium">{f.title}</p>
                                                        <p className="text-slate-400 text-xs mt-1 leading-relaxed">{f.desc}</p>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                {/* Claim Details */}
                                <div>
                                    <h4 className="text-slate-400 text-xs font-bold uppercase tracking-widest border-b border-border-dark pb-2 mb-3">
                                        Claim Details
                                    </h4>
                                    <div className="bg-background-dark rounded-lg p-4 border border-border-dark">
                                        {selected.financials.map(({ label, value }) => (
                                            <div key={label} className="flex justify-between items-center mb-2">
                                                <span className="text-slate-400 text-sm">{label}</span>
                                                <span className="text-white font-mono">{value}</span>
                                            </div>
                                        ))}
                                        <div className="h-px bg-white/10 my-2"></div>
                                        <div className="flex justify-between items-center">
                                            <span className="text-white text-sm font-medium">Total Claimed</span>
                                            <span className="text-xl text-white font-bold font-mono">{selected.total}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Sticky action footer */}
                            <div className="absolute bottom-0 left-0 w-full bg-surface-dark border-t border-border-dark p-4 z-20 shadow-[0_-5px_20px_rgba(0,0,0,0.4)]">
                                <div className="grid grid-cols-2 gap-3">
                                    <button className="col-span-1 py-2.5 px-4 rounded-lg border border-white/20 text-white font-medium hover:bg-white/5 transition-colors flex items-center justify-center gap-2 text-sm">
                                        Escalate
                                        <span className="material-symbols-outlined text-[18px]">arrow_upward</span>
                                    </button>
                                    <div className="col-span-1 flex gap-2">
                                        <button className="flex-1 py-2.5 px-3 rounded-lg bg-emerald-500/10 border border-emerald-500/50 text-emerald-500 font-medium hover:bg-emerald-500/20 transition-colors flex items-center justify-center gap-1 text-sm">
                                            Approve
                                            <span className="material-symbols-outlined text-[16px]">check</span>
                                        </button>
                                        <button className="flex-1 py-2.5 px-3 rounded-lg bg-primary text-white font-bold hover:bg-primary-dark transition-colors shadow-lg shadow-primary/25 flex items-center justify-center gap-1 text-sm">
                                            Reject
                                            <span className="material-symbols-outlined text-[16px]">close</span>
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </aside>
                    )}
                </div>
            </div>
        </div>
    )
}
