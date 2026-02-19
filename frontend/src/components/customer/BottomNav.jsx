import { Link, useLocation } from 'react-router-dom'

const BottomNav = () => {
    const location = useLocation()
    const isActive = (path) => location.pathname === path

    const navLink = (to, icon, label, raised = false) => {
        const active = isActive(to)
        if (raised) {
            return (
                <Link to={to} className="group relative flex flex-col items-center">
                    <div className={`relative p-3 -mt-8 rounded-full shadow-lg transition-transform group-hover:scale-110 ${active ? 'bg-primary border-4 border-background-dark shadow-primary/40' : 'bg-surface-dark-customer border border-surface-border'}`}>
                        <span className={`material-symbols-outlined text-[28px] ${active ? 'text-white' : 'text-slate-400 group-hover:text-white'}`}>{icon}</span>
                    </div>
                    <span className={`text-[10px] mt-1 font-medium ${active ? 'text-white font-bold' : 'text-slate-400 group-hover:text-white'}`}>{label}</span>
                </Link>
            )
        }
        return (
            <Link to={to} className={`flex flex-col items-center gap-1 p-2 group ${active ? '' : 'opacity-60 hover:opacity-100'}`}>
                {active ? (
                    <div className="relative">
                        <span className="material-symbols-outlined text-primary text-[28px] transition-transform group-hover:-translate-y-1">{icon}</span>
                        <span className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-1 h-1 bg-primary rounded-full"></span>
                    </div>
                ) : (
                    <span className="material-symbols-outlined text-slate-400 text-[28px] group-hover:text-white transition-all group-hover:-translate-y-1">{icon}</span>
                )}
                <span className={`text-[10px] font-medium ${active ? 'text-white font-bold' : 'text-slate-400 group-hover:text-white'}`}>{label}</span>
            </Link>
        )
    }

    return (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 w-full max-w-lg px-4">
            <nav className="flex items-center justify-between bg-surface-dark-customer/90 backdrop-blur-md border border-surface-border shadow-2xl shadow-black rounded-2xl p-2 px-6">
                {navLink('/customer', 'home', 'Home')}
                {navLink('/customer/policies', 'shield', 'Policies')}
                {navLink('/customer/claims', 'description', 'Claims', true)}
                {navLink('/customer/docs', 'folder_open', 'Docs')}
                {navLink('/customer/profile', 'account_circle', 'Profile')}
            </nav>
        </div>
    )
}

export default BottomNav
