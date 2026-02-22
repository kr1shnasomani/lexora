import { useState } from 'react'
import Sidebar from '../../components/admin/Sidebar'
import TopHeader from '../../components/admin/TopHeader'
import { useFetch } from '../../hooks/useFetch'
import { Skeleton } from '../../components/shared/Skeleton'
import ErrorToast from '../../components/shared/ErrorToast'

const nodeColor = (type) =>
    type === 'target' ? '#e83049' : type === 'vendor' ? '#f97316' : type === 'provider' ? '#a855f7' : '#3b82f6'

export default function NetworkGraphPage() {
    const { data, loading, error } = useFetch('/api/network/graph')
    const [selected, setSelected] = useState(null)
    const [toastError, setToastError] = useState(null)

    if (error && !toastError) setToastError(error)

    const nodes = data?.nodes || []
    const edges = data?.edges || []
    const selectedNode = nodes.find(n => n.id === selected)

    const getXY = (id) => {
        const n = nodes.find(n => n.id === id)
        return n ? { x: (n.x / 100) * 520, y: (n.y / 100) * 360 } : { x: 0, y: 0 }
    }

    return (
        <div className="flex h-screen bg-background-dark overflow-hidden">
            <Sidebar />
            <div className="flex flex-col flex-1 overflow-hidden">
                <TopHeader title="Fraud Network Graph" />
                <main className="flex-1 overflow-y-auto p-6 flex gap-6">

                    {/* Graph canvas */}
                    <div className="flex-1 rounded-2xl border border-border-dark bg-surface-dark flex flex-col overflow-hidden">
                        <div className="p-4 border-b border-border-dark flex items-center gap-4">
                            <span className="text-xs font-medium text-white">Entity connections</span>
                            {[['Target', '#e83049'], ['Connected', '#3b82f6'], ['Vendor', '#f97316'], ['Provider', '#a855f7']].map(([l, c]) => (
                                <div key={l} className="flex items-center gap-1.5">
                                    <span className="size-2.5 rounded-full" style={{ background: c }} />
                                    <span className="text-xs text-slate-400">{l}</span>
                                </div>
                            ))}
                        </div>

                        {loading
                            ? <div className="flex-1 flex items-center justify-center">
                                <div className="space-y-4 w-full px-8">
                                    <Skeleton className="h-4 w-1/2 mx-auto" />
                                    <Skeleton className="h-64 w-full rounded-xl" />
                                </div>
                            </div>
                            : (
                                <svg className="flex-1 w-full" viewBox="0 0 520 380" xmlns="http://www.w3.org/2000/svg">
                                    <defs>
                                        <radialGradient id="bg-g" cx="50%" cy="50%" r="60%">
                                            <stop offset="0%" stopColor="#1a0d10" />
                                            <stop offset="100%" stopColor="#0A0A0C" />
                                        </radialGradient>
                                    </defs>
                                    <rect width="520" height="380" fill="url(#bg-g)" />

                                    {/* Edges */}
                                    {edges.map((e, i) => {
                                        const f = getXY(e.from_node), t = getXY(e.to_node)
                                        return (
                                            <g key={i}>
                                                <line x1={f.x} y1={f.y} x2={t.x} y2={t.y} stroke="#27272a" strokeWidth="1.5" strokeDasharray="4 4" />
                                            </g>
                                        )
                                    })}

                                    {/* Nodes */}
                                    {nodes.map(n => {
                                        const px = (n.x / 100) * 520, py = (n.y / 100) * 360
                                        return (
                                            <g key={n.id} onClick={() => setSelected(n.id === selected ? null : n.id)} style={{ cursor: 'pointer' }}>
                                                <circle cx={px} cy={py} r={selected === n.id ? 24 : 20} fill={nodeColor(n.type)} opacity="0.15" />
                                                <circle cx={px} cy={py} r={selected === n.id ? 14 : 12} fill={nodeColor(n.type)} />
                                                <text x={px} y={py + 26} textAnchor="middle" fontSize="9" fill="#94a3b8">{n.label}</text>
                                            </g>
                                        )
                                    })}
                                </svg>
                            )
                        }
                    </div>

                    {/* Detail panel */}
                    <div className="w-72 shrink-0 rounded-2xl border border-border-dark bg-surface-dark flex flex-col">
                        <div className="p-5 border-b border-border-dark">
                            <h3 className="text-sm font-semibold text-white">Entity Intelligence</h3>
                        </div>

                        {loading
                            ? <div className="p-5 space-y-4">
                                <div className="flex items-center gap-3"><Skeleton className="size-10 rounded-full" /><div className="space-y-1 flex-1"><Skeleton className="h-4 w-3/4" /><Skeleton className="h-3 w-1/2" /></div></div>
                                <Skeleton className="h-20 rounded-xl" />
                            </div>
                            : selectedNode
                                ? (
                                    <div className="p-5 space-y-4">
                                        <div className="flex items-center gap-3">
                                            <div className="size-10 rounded-full flex items-center justify-center" style={{ background: nodeColor(selectedNode.type) + '22' }}>
                                                <span className="material-symbols-outlined text-[18px]" style={{ color: nodeColor(selectedNode.type) }}>person</span>
                                            </div>
                                            <div>
                                                <p className="text-white font-semibold text-sm">{selectedNode.label}</p>
                                                <p className="text-slate-500 text-xs capitalize">{selectedNode.type}</p>
                                            </div>
                                        </div>
                                        <div className="rounded-xl bg-border-dark/40 p-4">
                                            <p className="text-xs text-slate-500 mb-1">Risk Score</p>
                                            <p className="text-2xl font-bold text-white">{selectedNode.risk}<span className="text-slate-500 text-sm">/100</span></p>
                                        </div>
                                        <div>
                                            <p className="text-xs text-slate-500 mb-2">Connections</p>
                                            {edges
                                                .filter(e => e.from_node === selectedNode.id || e.to_node === selectedNode.id)
                                                .map((e, i) => (
                                                    <div key={i} className="flex items-center gap-2 py-1.5 border-b border-border-dark/50 last:border-0">
                                                        <span className="size-1.5 rounded-full bg-slate-500" />
                                                        <span className="text-xs text-slate-400">{e.label}</span>
                                                    </div>
                                                ))
                                            }
                                        </div>
                                    </div>
                                )
                                : (
                                    <div className="flex-1 flex items-center justify-center p-6 text-center">
                                        <p className="text-slate-600 text-sm">Click a node to inspect entity intelligence</p>
                                    </div>
                                )
                        }
                    </div>
                </main>
            </div>

            <ErrorToast message={toastError} onClose={() => setToastError(null)} />
        </div>
    )
}
