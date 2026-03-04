/**
 * Skeleton — Neutral shimmer placeholder matching the Lexora dark theme.
 *
 * Usage:
 *   <Skeleton className="h-8 w-48 rounded-lg" />           // single bar
 *   <SkeletonCard />                                        // KPI card
 *   <SkeletonList items={3} />                              // list rows
 */

/* Base pulse bar — all other variants build on this */
export function Skeleton({ className = '' }) {
    return (
        <div
            className={`bg-border-dark/60 animate-pulse rounded ${className}`}
            aria-hidden="true"
        />
    )
}

/* KPI stat card */
export function SkeletonCard() {
    return (
        <div className="bg-surface-dark rounded-xl border border-border-dark p-5 space-y-3">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-8 w-32" />
            <Skeleton className="h-3 w-40" />
        </div>
    )
}

/* Vertical list of rows */
export function SkeletonList({ items = 3 }) {
    return (
        <div className="space-y-3" aria-hidden="true">
            {Array.from({ length: items }).map((_, i) => (
                <div key={i} className="flex items-center gap-4 p-4 rounded-xl border border-border-dark bg-surface-dark">
                    <Skeleton className="h-10 w-10 rounded-full shrink-0" />
                    <div className="flex-1 space-y-2">
                        <Skeleton className="h-4 w-1/2" />
                        <Skeleton className="h-3 w-3/4" />
                    </div>
                    <Skeleton className="h-5 w-16 rounded-full" />
                </div>
            ))}
        </div>
    )
}

/* Policy / large card */
export function SkeletonPolicyCard() {
    return (
        <div className="rounded-2xl border border-border-dark bg-surface-dark p-6 space-y-5">
            <div className="flex items-center gap-4">
                <Skeleton className="h-14 w-14 rounded-2xl shrink-0" />
                <div className="space-y-2 flex-1">
                    <Skeleton className="h-5 w-48" />
                    <Skeleton className="h-3 w-28" />
                </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
                {[0, 1, 2].map(i => (
                    <div key={i} className="space-y-1">
                        <Skeleton className="h-3 w-16" />
                        <Skeleton className="h-5 w-24" />
                    </div>
                ))}
            </div>
            <div className="flex gap-3 pt-2">
                <Skeleton className="h-11 flex-1 rounded-lg" />
                <Skeleton className="h-11 flex-1 rounded-lg" />
            </div>
        </div>
    )
}
