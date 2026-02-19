import { useState } from 'react'
import Header from '../../components/customer/Header'
import BottomNav from '../../components/customer/BottomNav'

export default function ProfilePage() {
    const [editing, setEditing] = useState(false)
    const [form, setForm] = useState({ name: 'Arjun Mehta', email: 'arjun.mehta@email.com', phone: '+91 98765 43210', dob: 'Apr 12, 1990' })

    return (
        <div className="min-h-screen bg-background-dark text-slate-100 flex flex-col pb-32">
            <Header />
            <main className="mx-auto w-full max-w-2xl px-4 pt-8 space-y-6">
                {/* Avatar */}
                <div className="flex flex-col items-center gap-4 py-4">
                    <div className="relative">
                        <img
                            src="https://lh3.googleusercontent.com/aida-public/AB6AXuDleG16gFqC-iP0ymDrU_oL6sZKoL3OhPs-ub-MxgThoHT9ceIPiipeOC-iXaU_SjMolsAnHjfdH9e0dRZ7DIy6eho-cqPeVpbrFUNkyOyzdnk2QKG6tdzK0I9_z7iXKUc9M3r1SOce9A5wHn6Wiwq9vDJjuAYlosPd_-blLwwBIGnNmhBN30QfdaKEjkimWPA5TOf_kN1aWfgr1jNT9-rarv0BJIfnRKcrWf8rgJqEw2QiE1MtPXbIf6fOKkwapWnpvPlJ-W7ZiJWl"
                            alt="Profile"
                            className="size-24 rounded-full object-cover border-4 border-primary/30"
                        />
                        <button className="absolute bottom-0 right-0 size-8 bg-primary rounded-full flex items-center justify-center shadow-lg">
                            <span className="material-symbols-outlined text-white text-[16px]">photo_camera</span>
                        </button>
                    </div>
                    <div className="text-center">
                        <h1 className="text-xl font-bold text-white">{form.name}</h1>
                        <p className="text-slate-500 text-sm">Policy holder since 2022</p>
                    </div>
                </div>

                {/* Details */}
                <div className="rounded-2xl border border-surface-border bg-surface-dark-customer">
                    <div className="flex items-center justify-between p-5 border-b border-surface-border">
                        <h2 className="text-sm font-semibold text-white">Personal Information</h2>
                        <button
                            onClick={() => setEditing(!editing)}
                            className="text-sm text-primary font-medium hover:underline"
                        >{editing ? 'Save' : 'Edit'}</button>
                    </div>
                    <div className="divide-y divide-surface-border">
                        {[
                            { label: 'Full Name', field: 'name' },
                            { label: 'Email', field: 'email' },
                            { label: 'Phone', field: 'phone' },
                            { label: 'Date of Birth', field: 'dob' },
                        ].map((f) => (
                            <div key={f.field} className="flex items-center justify-between px-5 py-4">
                                <span className="text-sm text-slate-500 w-28 shrink-0">{f.label}</span>
                                {editing ? (
                                    <input
                                        value={form[f.field]}
                                        onChange={(e) => setForm({ ...form, [f.field]: e.target.value })}
                                        className="flex-1 text-sm text-white bg-background-dark border border-surface-border rounded-lg px-3 py-1.5 outline-none focus:border-primary"
                                    />
                                ) : (
                                    <span className="text-sm font-medium text-white">{form[f.field]}</span>
                                )}
                            </div>
                        ))}
                    </div>
                </div>

                {/* More options */}
                <div className="rounded-2xl border border-surface-border bg-surface-dark-customer divide-y divide-surface-border">
                    {[
                        { icon: 'security', label: 'Security & Privacy', color: 'text-blue-400' },
                        { icon: 'notifications', label: 'Notifications', color: 'text-yellow-400' },
                        { icon: 'help', label: 'Help & Support', color: 'text-slate-400' },
                        { icon: 'logout', label: 'Sign Out', color: 'text-red-400' },
                    ].map((item) => (
                        <button key={item.label} className="w-full flex items-center gap-4 px-5 py-4 hover:bg-surface-border/30 transition-colors text-left">
                            <span className={`material-symbols-outlined text-[22px] ${item.color}`}>{item.icon}</span>
                            <span className="text-sm font-medium text-white flex-1">{item.label}</span>
                            <span className="material-symbols-outlined text-slate-600 text-[18px]">chevron_right</span>
                        </button>
                    ))}
                </div>
            </main>
            <BottomNav />
        </div>
    )
}
