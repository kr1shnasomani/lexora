import { Link, useLocation } from 'react-router-dom'
import { useState } from 'react'
import { useAuth } from '../../contexts/AuthContext'

const Sidebar = () => {
    const location = useLocation()
    const { user, role } = useAuth()
    const [isCollapsed, setIsCollapsed] = useState(false)

    const isActive = (path) => location.pathname === path
    const linkClass = (path) =>
        `flex items-center gap-3 px-3 py-2 rounded-lg transition-colors group ${isActive(path)
            ? 'bg-primary/10 text-primary'
            : 'text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-primary/10 dark:hover:text-primary'
        } ${isCollapsed ? 'justify-center lg:justify-start' : ''}`

    return (
        <aside className={`flex-shrink-0 flex flex-col border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-[#181112] transition-all duration-300 h-full overflow-hidden w-20 ${isCollapsed ? 'lg:w-20' : 'lg:w-72'}`}>
            {/* Logo */}
            <div className="h-20 flex items-center justify-between px-6 border-b border-slate-200 dark:border-slate-800 shrink-0">
                <Link to="/" className="flex items-center gap-2">
                    <img src="/lexora-logo.png" alt="Lexora" className="size-8 shrink-0 drop-shadow-[0_0_12px_rgba(232,48,73,0.3)]" />
                    {!isCollapsed && <span className="text-lg font-bold tracking-tight text-slate-900 dark:text-white hidden lg:block whitespace-nowrap">Lexora</span>}
                </Link>
                {/* Collapse Toggle */}
                <button
                    onClick={() => setIsCollapsed(!isCollapsed)}
                    className="hidden lg:flex items-center justify-center text-slate-400 hover:text-white transition-colors size-6"
                >
                    <span className="material-symbols-outlined text-[18px]">
                        {isCollapsed ? 'menu_open' : 'menu'}
                    </span>
                </button>
            </div>

            {/* Nav */}
            <nav className="flex-1 overflow-y-auto py-6 flex flex-col gap-2 px-3 pb-20">
                <div className={`px-3 pt-2 pb-2 hidden lg:block ${isCollapsed ? 'opacity-0 h-0 hidden' : 'opacity-100'}`}>
                    <p className="text-xs font-bold text-slate-400 dark:text-slate-600 uppercase tracking-wider transition-opacity duration-300 whitespace-nowrap">Overview</p>
                </div>
                <Link to="/admin/dashboard" className={linkClass('/admin/dashboard')}>
                    <span className="material-symbols-outlined shrink-0 text-xl">dashboard</span>
                    <span className={`font-medium hidden lg:block whitespace-nowrap transition-all duration-300 ${isCollapsed ? 'opacity-0 w-0 overflow-hidden' : 'opacity-100'}`}>Dashboard</span>
                </Link>
                <Link to="/admin/analytics" className={linkClass('/admin/analytics')}>
                    <span className="material-symbols-outlined shrink-0 text-xl">pie_chart</span>
                    <span className={`font-medium hidden lg:block whitespace-nowrap transition-all duration-300 ${isCollapsed ? 'opacity-0 w-0 overflow-hidden' : 'opacity-100'}`}>Analytics</span>
                </Link>

                <div className={`px-3 pt-6 pb-2 hidden lg:block ${isCollapsed ? 'opacity-0 h-0 hidden' : 'opacity-100'}`}>
                    <p className="text-xs font-bold text-slate-400 dark:text-slate-600 uppercase tracking-wider transition-opacity duration-300 whitespace-nowrap">Operations</p>
                </div>
                <Link to="/admin/claims" className={linkClass('/admin/claims')}>
                    <span className="material-symbols-outlined shrink-0 text-xl">description</span>
                    <span className={`font-medium hidden lg:block whitespace-nowrap transition-all duration-300 ${isCollapsed ? 'opacity-0 w-0 overflow-hidden' : 'opacity-100'}`}>Manual Review</span>
                </Link>
                <Link to="/admin/audit" className={linkClass('/admin/audit')}>
                    <span className="material-symbols-outlined shrink-0 text-xl">fact_check</span>
                    <span className={`font-medium hidden lg:block whitespace-nowrap transition-all duration-300 ${isCollapsed ? 'opacity-0 w-0 overflow-hidden' : 'opacity-100'}`}>AI Audit Log</span>
                </Link>

                <div className={`px-3 pt-6 pb-2 hidden lg:block ${isCollapsed ? 'opacity-0 h-0 hidden' : 'opacity-100'}`}>
                    <p className="text-xs font-bold text-slate-400 dark:text-slate-600 uppercase tracking-wider transition-opacity duration-300 whitespace-nowrap">Intelligence</p>
                </div>
                <Link to="/admin/threat-feed" className={linkClass('/admin/threat-feed')}>
                    <span className="material-symbols-outlined shrink-0 text-xl">notifications_active</span>
                    <span className={`font-medium hidden lg:block whitespace-nowrap transition-all duration-300 ${isCollapsed ? 'opacity-0 w-0 overflow-hidden' : 'opacity-100'}`}>Threat Feed</span>
                </Link>
                <Link to="/admin/network" className={linkClass('/admin/network')}>
                    <span className="material-symbols-outlined shrink-0 text-xl">hub</span>
                    <span className={`font-medium hidden lg:block whitespace-nowrap transition-all duration-300 ${isCollapsed ? 'opacity-0 w-0 overflow-hidden' : 'opacity-100'}`}>Network Graph</span>
                </Link>

                <div className={`px-3 pt-6 pb-2 hidden lg:block ${isCollapsed ? 'opacity-0 h-0 hidden' : 'opacity-100'}`}>
                    <p className="text-xs font-bold text-slate-400 dark:text-slate-600 uppercase tracking-wider transition-opacity duration-300 whitespace-nowrap">Admin</p>
                </div>
                <Link to="/admin/config" className={linkClass('/admin/config')}>
                    <span className="material-symbols-outlined shrink-0 text-xl">settings</span>
                    <span className={`font-medium hidden lg:block whitespace-nowrap transition-all duration-300 ${isCollapsed ? 'opacity-0 w-0 overflow-hidden' : 'opacity-100'}`}>System Config</span>
                </Link>
                <Link to="/" className={linkClass('/')}>
                    <span className="material-symbols-outlined shrink-0 text-xl">logout</span>
                    <span className={`font-medium hidden lg:block whitespace-nowrap transition-all duration-300 ${isCollapsed ? 'opacity-0 w-0 overflow-hidden' : 'opacity-100'}`}>Logout</span>
                </Link>
            </nav>

            {/* User profile */}
            <div className={`p-4 border-t border-slate-200 dark:border-slate-800 shrink-0 bg-white dark:bg-[#181112]`}>
                <div className={`flex items-center gap-3 ${isCollapsed ? 'justify-center' : ''}`}>
                    <div
                        className="size-10 rounded-full bg-slate-200 dark:bg-slate-700 bg-cover bg-center shrink-0 border border-slate-300 dark:border-slate-600"
                        style={{ backgroundImage: "url('https://lh3.googleusercontent.com/aida-public/AB6AXuCl8YXpjqHMjliKXtt1vTIedRcVnq3V8z_OnKlJbkwA2V9IZbof9PuCv8wy2fbl_AGcpD4ZYkNsUV27yQP4At-9jGLhw51iDBJ_8fEWsfCLfRWeelmv_N2qruyrPmdicKiRdaRlN0LJ71GtkaC0hhwKw3nbZ1t074NxkSZpNWQ1Ah2qcui2dA303KQQxSIHZxI7rPOtKyCljcxvjb-HrxONLhU_3-oAlmneer9-X-peEXuHouorHt5oLWPpWLm6RQzh1ae1cAHQy_Xr')" }}
                    />
                    {!isCollapsed && (
                        <div className="hidden lg:flex flex-col overflow-hidden whitespace-nowrap">
                            <span className="text-sm font-medium text-slate-900 dark:text-white truncate" title={user?.name || "Administrator"}>{user?.name || "Administrator"}</span>
                            <span className="text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wide truncate" title={role || "System Admin"}>{role || "System Admin"}</span>
                        </div>
                    )}
                </div>
            </div>
        </aside>
    )
}

export default Sidebar
