import { useNavigate } from 'react-router-dom'

const Header = ({ showBack = false }) => {
    const navigate = useNavigate()

    return (
        <header className="flex items-center justify-between border-b border-surface-border bg-surface-dark-customer px-6 py-4 sticky top-0 z-50">
            <div className="flex items-center gap-3">
                {showBack && (
                    <button
                        onClick={() => navigate(-1)}
                        className="mr-2 text-slate-400 hover:text-white transition-colors"
                    >
                        <span className="material-symbols-outlined text-[24px]">arrow_back</span>
                    </button>
                )}
                {/* Lexora logo mark */}
                <div
                    className="size-8 text-primary cursor-pointer"
                    onClick={() => navigate('/customer')}
                >
                    <svg className="w-full h-full" fill="none" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
                        <path
                            d="M36.7273 44C33.9891 44 31.6043 39.8386 30.3636 33.69C29.123 39.8386 26.7382 44 24 44C21.2618 44 18.877 39.8386 17.6364 33.69C16.3957 39.8386 14.0109 44 11.2727 44C7.25611 44 4 35.0457 4 24C4 12.9543 7.25611 4 11.2727 4C14.0109 4 16.3957 8.16144 17.6364 14.31C18.877 8.16144 21.2618 4 24 4C26.7382 4 29.123 8.16144 30.3636 14.31C31.6043 8.16144 33.9891 4 36.7273 4C40.7439 4 44 12.9543 44 24C44 35.0457 40.7439 44 36.7273 44Z"
                            fill="currentColor"
                        />
                    </svg>
                </div>
                <h1 className="text-white text-xl font-bold tracking-tight">Lexora</h1>
            </div>

            <div className="flex items-center gap-4">
                <div className="hidden md:flex items-center gap-2 px-3 py-1.5 bg-background-dark rounded-full border border-surface-border">
                    <span className="relative flex h-2.5 w-2.5 ml-1">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-primary"></span>
                    </span>
                    <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">System Operational</span>
                </div>
                <button
                    onClick={() => navigate('/customer/notifications')}
                    className="relative p-2 text-slate-400 hover:text-white transition-colors rounded-lg hover:bg-surface-border"
                >
                    <span className="material-symbols-outlined text-[24px]">notifications</span>
                    <span className="absolute top-2 right-2 h-2 w-2 rounded-full bg-primary border-2 border-surface-dark-customer"></span>
                </button>
                <div
                    className="h-8 w-8 rounded-full bg-gradient-to-tr from-primary to-purple-600 p-[2px] cursor-pointer"
                    onClick={() => navigate('/customer/profile')}
                >
                    <img
                        alt="Profile"
                        className="h-full w-full rounded-full object-cover border-2 border-surface-dark-customer"
                        src="https://lh3.googleusercontent.com/aida-public/AB6AXuDleG16gFqC-iP0ymDrU_oL6sZKoL3OhPs-ub-MxgThoHT9ceIPiipeOC-iXaU_SjMolsAnHjfdH9e0dRZ7DIy6eho-cqPeVpbrFUNkyOyzdnk2QKG6tdzK0I9_z7iXKUc9M3r1SOce9A5wHn6Wiwq9vDJjuAYlosPd_-blLwwBIGnNmhBN30QfdaKEjkimWPA5TOf_kN1aWfgr1jNT9-rarv0BJIfnRKcrWf8rgJqEw2QiE1MtPXbIf6fOKkwapWnpvPlJ-W7ZiJWl"
                    />
                </div>
            </div>
        </header>
    )
}

export default Header
