import { Link } from 'react-router-dom'

const ModeSelectionPage = () => (
    <div className="relative flex min-h-screen w-full flex-col items-center justify-center p-4 sm:p-8 glow-effect bg-background-dark text-slate-100">
        <header className="mb-12 flex flex-col items-center gap-4 text-center z-10">
            <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <span className="material-symbols-outlined text-[32px]">shield_lock</span>
                </div>
                <h1 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">LEXORA</h1>
            </div>
            <p className="max-w-md text-slate-400 text-lg">
                Intelligence Core portal for high-precision claims adjudication.
            </p>
        </header>

        <main className="grid w-full max-w-5xl grid-cols-1 gap-6 md:grid-cols-2 lg:gap-8 z-10">
            {/* Customer Portal */}
            <Link
                to="/login?role=customer"
                className="group card-hover relative flex flex-col gap-6 rounded-2xl border border-border-dark bg-surface-dark p-8 transition-all duration-300 ease-out hover:-translate-y-1"
            >
                <div className="flex items-start justify-between">
                    <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-white/5 text-slate-300 transition-colors duration-300">
                        <span className="material-symbols-outlined text-[32px]">person_filled</span>
                    </div>
                    <span className="material-symbols-outlined text-slate-400 transition-transform duration-300 group-hover:translate-x-1">arrow_forward</span>
                </div>
                <div className="flex flex-col gap-2">
                    <h2 className="text-2xl font-bold text-white">Customer Portal</h2>
                    <p className="text-slate-400 leading-relaxed">
                        Access your personal dashboard to manage active policies, file new claims, and track existing claim statuses in real-time.
                    </p>
                </div>
                <div className="mt-auto pt-4 flex items-center gap-2 text-sm font-semibold text-white group-hover:text-primary transition-colors">
                    <span>Enter Portal</span>
                </div>
            </Link>

            {/* Admin / Agent Portal */}
            <Link
                to="/login?role=admin"
                className="group card-hover relative flex flex-col gap-6 rounded-2xl border border-border-dark bg-surface-dark p-8 transition-all duration-300 ease-out hover:-translate-y-1"
            >
                <div className="flex items-start justify-between">
                    <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-white/5 text-slate-300 transition-colors duration-300">
                        <span className="material-symbols-outlined text-[32px]">admin_panel_settings</span>
                    </div>
                    <span className="material-symbols-outlined text-slate-400 transition-transform duration-300 group-hover:translate-x-1">arrow_forward</span>
                </div>
                <div className="flex flex-col gap-2">
                    <h2 className="text-2xl font-bold text-white">Agent &amp; Admin Portal</h2>
                    <p className="text-slate-400 leading-relaxed">
                        Secure workspace for claims intelligence, fraud detection analysis, adjudication processing, and system administration.
                    </p>
                </div>
                <div className="mt-auto pt-4 flex items-center gap-2 text-sm font-semibold text-white group-hover:text-primary transition-colors">
                    <span>Secure Login</span>
                </div>
            </Link>
        </main>

        <footer className="mt-16 flex flex-col items-center gap-3 text-center z-10">
            <div className="flex items-center gap-4 text-sm text-slate-500">
                <a href="#" className="hover:text-slate-300 transition-colors">Privacy Policy</a>
                <span>•</span>
                <a href="#" className="hover:text-slate-300 transition-colors">Terms of Service</a>
                <span>•</span>
                <a href="#" className="hover:text-slate-300 transition-colors">Help Center</a>
            </div>
            <p className="text-xs text-slate-600">© 2024 Lexora Intelligence. All rights reserved.</p>
        </footer>
    </div>
)

export default ModeSelectionPage
