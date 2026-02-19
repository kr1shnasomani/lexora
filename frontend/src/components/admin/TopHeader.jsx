const TopHeader = ({ title, showSearch = true }) => (
    <header className="h-16 border-b border-gray-200 dark:border-border-dark bg-white dark:bg-[#181112] flex items-center justify-between px-6 z-20 shadow-sm relative shrink-0">
        <div className="flex items-center gap-4">
            <div className="lg:hidden">
                <span className="material-symbols-outlined text-slate-500">menu</span>
            </div>
            <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">{title}</h1>
        </div>

        <div className="flex items-center gap-4">
            {showSearch && (
                <div className="hidden md:block relative">
                    <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-[20px]">search</span>
                    <input
                        className="pl-10 pr-4 py-2 w-64 rounded-lg bg-slate-100 dark:bg-[#2a1e20] border-none text-sm focus:ring-2 focus:ring-primary text-slate-900 dark:text-slate-100 placeholder-slate-500"
                        placeholder="Search..."
                        type="text"
                    />
                </div>
            )}
            <button className="relative p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-[#2a1e20] text-slate-500 dark:text-slate-400 transition-colors">
                <span className="material-symbols-outlined">notifications</span>
                <span className="absolute top-2 right-2 size-2 bg-primary rounded-full border-2 border-white dark:border-[#181112]"></span>
            </button>
        </div>
    </header>
)

export default TopHeader
