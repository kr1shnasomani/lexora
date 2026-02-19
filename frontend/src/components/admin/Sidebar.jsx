import { Link, useLocation } from 'react-router-dom'

const Sidebar = () => {
    const location = useLocation()
    const isActive = (path) => location.pathname === path
    const linkClass = (path) =>
        `flex items-center gap-3 px-3 py-2 rounded-lg transition-colors group ${isActive(path)
            ? 'bg-primary/10 text-primary'
            : 'text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-primary/10 dark:hover:text-primary'
        }`

    return (
        <aside className="w-20 lg:w-72 flex-shrink-0 flex flex-col border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-[#181112] transition-all duration-300 h-full overflow-hidden">
            {/* Logo */}
            <div className="h-20 flex items-center px-6 gap-3 border-b border-slate-200 dark:border-slate-800 shrink-0">
                <Link to="/" className="flex items-center gap-2">
                    <div className="size-8 rounded bg-primary flex items-center justify-center text-white shadow-[0_0_15px_rgba(232,48,73,0.4)]">
                        <span className="material-symbols-outlined text-xl">shield_lock</span>
                    </div>
                    <span className="text-lg font-bold tracking-tight text-slate-900 dark:text-white hidden lg:block">Lexora</span>
                </Link>
            </div>

            {/* Nav */}
            <nav className="flex-1 overflow-y-auto py-6 flex flex-col gap-2 px-3">
                <div className="px-3 pt-2 pb-2 hidden lg:block">
                    <p className="text-xs font-bold text-slate-400 dark:text-slate-600 uppercase tracking-wider">Overview</p>
                </div>
                <Link to="/admin/dashboard" className={linkClass('/admin/dashboard')}>
                    <span className="material-symbols-outlined">dashboard</span>
                    <span className="font-medium hidden lg:block">Sentinel Dashboard</span>
                </Link>
                <Link to="/admin/analytics" className={linkClass('/admin/analytics')}>
                    <span className="material-symbols-outlined">pie_chart</span>
                    <span className="font-medium hidden lg:block">Analytics</span>
                </Link>

                <div className="px-3 pt-6 pb-2 hidden lg:block">
                    <p className="text-xs font-bold text-slate-400 dark:text-slate-600 uppercase tracking-wider">Operations</p>
                </div>
                <Link to="/admin/claims" className={linkClass('/admin/claims')}>
                    <span className="material-symbols-outlined">description</span>
                    <span className="font-medium hidden lg:block">Claims Queue</span>
                </Link>
                <Link to="/admin/audit" className={linkClass('/admin/audit')}>
                    <span className="material-symbols-outlined">fact_check</span>
                    <span className="font-medium hidden lg:block">AI Audit Log</span>
                </Link>

                <div className="px-3 pt-6 pb-2 hidden lg:block">
                    <p className="text-xs font-bold text-slate-400 dark:text-slate-600 uppercase tracking-wider">Intelligence</p>
                </div>
                <Link to="/admin/threat-feed" className={linkClass('/admin/threat-feed')}>
                    <span className="material-symbols-outlined">notifications_active</span>
                    <span className="font-medium hidden lg:block">Threat Feed</span>
                </Link>
                <Link to="/admin/network" className={linkClass('/admin/network')}>
                    <span className="material-symbols-outlined">hub</span>
                    <span className="font-medium hidden lg:block">Network Graph</span>
                </Link>

                <div className="px-3 pt-6 pb-2 hidden lg:block">
                    <p className="text-xs font-bold text-slate-400 dark:text-slate-600 uppercase tracking-wider">Admin</p>
                </div>
                <Link to="/admin/config" className={linkClass('/admin/config')}>
                    <span className="material-symbols-outlined">settings</span>
                    <span className="font-medium hidden lg:block">System Config</span>
                </Link>
                <Link to="/" className={linkClass('/')}>
                    <span className="material-symbols-outlined">logout</span>
                    <span className="font-medium hidden lg:block">Logout</span>
                </Link>
            </nav>

            {/* User profile */}
            <div className="p-4 border-t border-slate-200 dark:border-slate-800 shrink-0">
                <div className="flex items-center gap-3">
                    <div
                        className="size-10 rounded-full bg-slate-200 dark:bg-slate-700 bg-cover bg-center shrink-0"
                        style={{ backgroundImage: "url('https://lh3.googleusercontent.com/aida-public/AB6AXuCl8YXpjqHMjliKXtt1vTIedRcVnq3V8z_OnKlJbkwA2V9IZbof9PuCv8wy2fbl_AGcpD4ZYkNsUV27yQP4At-9jGLhw51iDBJ_8fEWsfCLfRWeelmv_N2qruyrPmdicKiRdaRlN0LJ71GtkaC0hhwKw3nbZ1t074NxkSZpNWQ1Ah2qcui2dA303KQQxSIHZxI7rPOtKyCljcxvjb-HrxONLhU_3-oAlmneer9-X-peEXuHouorHt5oLWPpWLm6RQzh1ae1cAHQy_Xr')" }}
                    />
                    <div className="hidden lg:flex flex-col overflow-hidden">
                        <span className="text-sm font-medium text-slate-900 dark:text-white truncate">Alex Chen</span>
                        <span className="text-xs text-slate-500 dark:text-slate-400 truncate">Lead Analyst</span>
                    </div>
                </div>
            </div>
        </aside>
    )
}

export default Sidebar
