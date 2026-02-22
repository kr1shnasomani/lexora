import { useNavigate } from 'react-router-dom'
import Header from '../../components/customer/Header'
import BottomNav from '../../components/customer/BottomNav'
import { useFetch } from '../../hooks/useFetch'
import { Skeleton } from '../../components/shared/Skeleton'
import ErrorToast from '../../components/shared/ErrorToast'
import { useState } from 'react'

const accountMenuItems = [
    { icon: 'person', label: 'Personal Details', sub: 'Name, Phone, Email', route: null },
    { icon: 'credit_card', label: 'Payment Methods', sub: 'Visa •••• 4892', route: null },
    { icon: 'notifications', label: 'Notifications', sub: 'Email, SMS, Push', route: '/customer/notifications' },
    { icon: 'lock', label: 'Security & Privacy', sub: 'Password, 2FA', route: '/customer/security' },
]

const claimsMenuItems = [
    { icon: 'history_edu', label: 'Claim History', sub: 'Past and active claims', route: '/customer/claims' },
    { icon: 'folder_shared', label: 'Documents', sub: 'Policy docs, ID cards', route: '/customer/docs' },
]

function MenuGroup({ title, items, navigate }) {
    return (
        <div className="space-y-3">
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest px-2">{title}</h3>
            <div className="bg-surface-dark-customer border border-surface-border rounded-2xl overflow-hidden divide-y divide-surface-border">
                {items.map(item => (
                    <button key={item.label} onClick={() => item.route && navigate(item.route)}
                        className={`w-full flex items-center justify-between p-4 transition-colors group text-left ${item.danger ? 'hover:bg-red-900/10' : 'hover:bg-surface-border/50'}`}>
                        <div className="flex items-center gap-4">
                            <div className={`h-10 w-10 rounded-full flex items-center justify-center transition-colors border-0 ${item.danger ? 'bg-slate-800 text-red-400 group-hover:text-red-300 group-hover:bg-red-900/30' : 'bg-slate-800 text-slate-400 group-hover:text-white group-hover:bg-slate-700'}`}>
                                <span className="material-symbols-outlined">{item.icon}</span>
                            </div>
                            <div>
                                <p className={`font-medium ${item.danger ? 'text-red-400 group-hover:text-red-300' : 'text-white'}`}>{item.label}</p>
                                {item.sub && <p className="text-slate-400 text-xs">{item.sub}</p>}
                            </div>
                        </div>
                        {!item.danger && <span className="material-symbols-outlined text-slate-500 group-hover:text-white">chevron_right</span>}
                    </button>
                ))}
            </div>
        </div>
    )
}

export default function ProfilePage() {
    const navigate = useNavigate()
    const [toastError, setToastError] = useState(null)
    const { data: profile, loading, error } = useFetch('/api/user/profile')
    if (error && !toastError) setToastError(error)

    return (
        <div className="min-h-screen bg-background-dark text-slate-100 flex flex-col font-display antialiased overflow-x-hidden selection:bg-primary selection:text-white pb-32">
            <Header />
            <main className="flex-1 max-w-3xl mx-auto w-full p-4 md:p-8 pb-32">

                {/* Profile Hero */}
                <section className="flex flex-col items-center justify-center text-center mb-10 pt-4">
                    <div className="relative mb-4">
                        <div className="h-[72px] w-[72px] rounded-full bg-gradient-to-tr from-primary to-purple-600 p-[3px]">
                            {profile?.avatar_url
                                ? <img alt="Profile" className="h-full w-full rounded-full object-cover border-4 border-background-dark" src={profile.avatar_url} />
                                : <div className="h-full w-full rounded-full border-4 border-background-dark bg-slate-800 flex items-center justify-center">
                                    <span className="material-symbols-outlined text-slate-400 text-[32px]">person</span>
                                </div>
                            }
                        </div>
                        <button className="absolute bottom-0 right-0 h-7 w-7 bg-surface-border hover:bg-primary text-white rounded-full flex items-center justify-center border-2 border-background-dark transition-colors">
                            <span className="material-symbols-outlined text-[14px]">edit</span>
                        </button>
                    </div>
                    {loading
                        ? <div className="flex flex-col items-center gap-2 mt-2"><Skeleton className="h-7 w-40" /><Skeleton className="h-4 w-28" /></div>
                        : <>
                            <h2 className="text-3xl font-bold text-white mb-1">{profile?.name || '—'}</h2>
                            <p className="text-slate-400 text-sm mb-4">Member since {profile?.member_since || '—'}</p>
                        </>
                    }
                    <button className="text-primary hover:text-white text-sm font-medium transition-colors">Edit Profile</button>
                </section>

                {/* Stats */}
                <section className="grid grid-cols-3 gap-4 mb-10">
                    {loading
                        ? [0, 1, 2].map(i => <div key={i} className="flex flex-col items-center p-4 rounded-2xl bg-surface-dark-customer border border-surface-border"><Skeleton className="h-8 w-12 mb-1" /><Skeleton className="h-3 w-16" /></div>)
                        : [
                            { value: profile?.policy_count ?? '—', label: 'Policies', valueClass: 'text-white' },
                            { value: profile?.active_claim_count ?? '—', label: 'Claims', valueClass: 'text-white' },
                            { value: '100%', label: 'Coverage', valueClass: 'text-emerald-400' },
                        ].map(s => (
                            <div key={s.label} className="flex flex-col items-center justify-center p-4 rounded-2xl bg-surface-dark-customer border border-surface-border">
                                <span className={`text-2xl font-bold ${s.valueClass}`}>{s.value}</span>
                                <span className="text-xs text-slate-400 uppercase tracking-wider font-medium">{s.label}</span>
                            </div>
                        ))
                    }
                </section>

                {/* Menu groups */}
                <div className="flex flex-col gap-8">
                    <MenuGroup title="My Account" items={accountMenuItems} navigate={navigate} />
                    <MenuGroup title="Claims & Policies" items={claimsMenuItems} navigate={navigate} />
                    <MenuGroup title="Support" navigate={navigate} items={[
                        { icon: 'help', label: 'Help Center', sub: 'FAQ, Contact Support', route: null },
                        { icon: 'logout', label: 'Log Out', danger: true, route: '/' },
                    ]} />
                </div>
            </main>
            <BottomNav />
            <ErrorToast message={toastError} onClose={() => setToastError(null)} />
        </div>
    )
}
