import { useState, useEffect } from 'react'

/**
 * ErrorToast — appears in the bottom-right corner whenever `message` is truthy.
 * Auto-dismisses after `duration` ms (default 6s). Click X to dismiss early.
 * Follows the Lexora dark-theme design system.
 *
 * Props:
 *   message  {string|null}  — error text; falsy = hidden
 *   onClose  {Function}     — called when user dismisses
 *   duration {number}       — ms before auto-dismiss (0 = never)
 */
export default function ErrorToast({ message, onClose, duration = 6000 }) {
    const [visible, setVisible] = useState(false)

    useEffect(() => {
        if (!message) { setVisible(false); return }
        setVisible(true)
        if (duration > 0) {
            const t = setTimeout(() => { setVisible(false); onClose?.() }, duration)
            return () => clearTimeout(t)
        }
    }, [message, duration, onClose])

    if (!visible || !message) return null

    return (
        /* Fixed to bottom-right, above bottom-nav (pb-20 on mobile) */
        <div
            role="alert"
            className="fixed bottom-20 right-4 z-[9999] w-full max-w-sm animate-fade-in"
        >
            <div className="flex items-start gap-3 rounded-xl border border-primary/30 bg-[#1a0d10]/95 backdrop-blur-md p-4 shadow-2xl shadow-black/60 ring-1 ring-primary/10">
                {/* Icon */}
                <span className="material-symbols-outlined text-primary mt-0.5 shrink-0 text-[22px]">
                    error
                </span>

                {/* Body */}
                <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-primary uppercase tracking-wider mb-0.5">
                        Connection Error
                    </p>
                    <p className="text-sm text-slate-300 leading-relaxed break-words">
                        {message}
                    </p>
                </div>

                {/* Dismiss */}
                <button
                    onClick={() => { setVisible(false); onClose?.() }}
                    className="text-slate-500 hover:text-white transition-colors shrink-0 mt-0.5"
                    aria-label="Dismiss"
                >
                    <span className="material-symbols-outlined text-[18px]">close</span>
                </button>
            </div>

            {/* Progress bar */}
            {duration > 0 && (
                <div className="h-0.5 w-full overflow-hidden rounded-b-xl bg-border-dark">
                    <div
                        className="h-full bg-primary origin-left"
                        style={{ animation: `shrink ${duration}ms linear forwards` }}
                    />
                </div>
            )}
        </div>
    )
}
