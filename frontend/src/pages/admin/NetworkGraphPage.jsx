import { useState } from 'react'
import Sidebar from '../../components/admin/Sidebar'
import TopHeader from '../../components/admin/TopHeader'
import { useFetch } from '../../hooks/useFetch'
import { Skeleton } from '../../components/shared/Skeleton'
import ErrorToast from '../../components/shared/ErrorToast'
import { TransformWrapper, TransformComponent } from 'react-zoom-pan-pinch'

const nodeColor = (type) =>
    type === 'target' ? '#e83049' : type === 'vendor' ? '#f97316' : type === 'provider' ? '#a855f7' : type === 'doc' ? '#ec4899' : '#3b82f6'

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
        return n ? { x: (n.x / 100) * 2400, y: (n.y / 100) * 1600 } : { x: 0, y: 0 }
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
                            {[['Target', '#e83049'], ['Connected', '#3b82f6'], ['Vendor', '#f97316'], ['Provider', '#a855f7'], ['Document', '#ec4899']].map(([l, c]) => (
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
                                <div className="flex-1 relative overflow-hidden bg-[#0A0A0C]">
                                    <TransformWrapper initialScale={0.3} minScale={0.05} maxScale={4} wheel={{ step: 0.1 }} centerOnInit={true}>
                                        {({ zoomIn, zoomOut, resetTransform }) => (
                                            <>
                                                <div className="absolute bottom-4 right-4 flex gap-1 bg-border-dark/80 backdrop-blur-md p-1.5 rounded-lg border border-white/5 z-10 shadow-lg">
                                                    <button onClick={() => zoomIn()} className="p-1.5 hover:bg-white/10 rounded text-slate-400 hover:text-white transition-colors flex items-center"><span className="material-symbols-outlined text-[18px]">zoom_in</span></button>
                                                    <button onClick={() => zoomOut()} className="p-1.5 hover:bg-white/10 rounded text-slate-400 hover:text-white transition-colors flex items-center"><span className="material-symbols-outlined text-[18px]">zoom_out</span></button>
                                                    <button onClick={() => resetTransform()} className="p-1.5 hover:bg-white/10 rounded text-slate-400 hover:text-white transition-colors flex items-center"><span className="material-symbols-outlined text-[18px]">fit_screen</span></button>
                                                </div>
                                                <TransformComponent wrapperStyle={{ width: '100%', height: '100%' }}>
                                                    <svg className="w-full h-full" viewBox="0 0 2400 1600" xmlns="http://www.w3.org/2000/svg" style={{ minWidth: 2400, minHeight: 1600 }}>
                                                        <defs>
                                                            <radialGradient id="bg-g" cx="50%" cy="50%" r="60%">
                                                                <stop offset="0%" stopColor="#1a0d10" />
                                                                <stop offset="100%" stopColor="#0A0A0C" />
                                                            </radialGradient>
                                                        </defs>
                                                        <rect width="2400" height="1600" fill="url(#bg-g)" />

                                                        {/* Edges */}
                                                        {edges.map((e, i) => {
                                                            const f = getXY(e.from_node), t = getXY(e.to_node)
                                                            return (
                                                                <g key={i}>
                                                                    <line x1={f.x} y1={f.y} x2={t.x} y2={t.y} stroke="#94a3b8" strokeWidth="2.5" opacity="0.6" />
                                                                </g>
                                                            )
                                                        })}

                                                        {/* Nodes */}
                                                        {nodes.map(n => {
                                                            const px = (n.x / 100) * 2400, py = (n.y / 100) * 1600
                                                            return (
                                                                <g key={n.id} onClick={() => setSelected(n.id === selected ? null : n.id)} style={{ cursor: 'pointer' }}>
                                                                    <circle cx={px} cy={py} r={selected === n.id ? 28 : 22} fill={nodeColor(n.type)} opacity="0.15" />
                                                                    <circle cx={px} cy={py} r={selected === n.id ? 18 : 14} fill={nodeColor(n.type)} />
                                                                    <text x={px} y={py + 32} textAnchor="middle" fontSize="14" fill="#cbd5e1" fontWeight="500">{n.label}</text>
                                                                </g>
                                                            )
                                                        })}
                                                    </svg>
                                                </TransformComponent>
                                            </>
                                        )}
                                    </TransformWrapper>
                                </div>
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
                                                <p className="text-white font-semibold text-sm break-all pr-2">{selectedNode.full_label || selectedNode.label}</p>
                                                <p className="text-slate-500 text-xs capitalize mt-0.5">{selectedNode.type}</p>
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
                                                .map((e, i) => {
                                                    const connectedNodeId = e.from_node === selectedNode.id ? e.to_node : e.from_node;
                                                    const connectedNode = nodes.find(n => n.id === connectedNodeId);
                                                    return (
                                                        <div key={i} className="flex items-center gap-2 py-1.5 border-b border-border-dark/50 last:border-0 pl-1 pr-2">
                                                            <span className="size-2 shrink-0 rounded-full" style={{ background: nodeColor(connectedNode?.type) }} />
                                                            <span className="text-xs text-slate-300 break-all">{connectedNode?.full_label || connectedNode?.label || connectedNodeId}</span>
                                                        </div>
                                                    )
                                                })
                                            }
                                        </div>
                                    </div>
                                )
                                : (
                                    <div className="p-5 flex-1 overflow-y-auto bg-surface-dark">
                                        <h4 className="text-white text-[15px] font-semibold mb-5">Results overview</h4>
                                        <div className="space-y-6">
                                            {/* Nodes Section */}
                                            <div>
                                                <div className="flex items-center justify-between mb-3 border-b border-white/5 pb-2">
                                                    <span className="text-slate-300 text-sm font-medium tracking-wide">Nodes ({nodes.length})</span>
                                                    <span className="material-symbols-outlined text-[16px] text-slate-500">swap_vert</span>
                                                </div>
                                                <div className="space-y-1.5">
                                                    {['target', 'vendor', 'provider', 'connected'].map(type => {
                                                        const count = nodes.filter(n => n.type === type).length
                                                        if (count === 0) return null
                                                        const lbl = type === 'target' ? 'Claim' : type === 'connected' ? 'Entity' : type
                                                        return (
                                                            <div key={type} className="flex items-center gap-3 py-1 cursor-pointer hover:bg-white/5 px-2 -mx-2 rounded transition-colors">
                                                                <span className="min-w-[40px] rounded-full text-[11px] font-bold py-[2px] px-2 text-black text-center capitalize" style={{ background: nodeColor(type) }}>{count}</span>
                                                                <span className="text-slate-200 text-sm capitalize">{lbl}</span>
                                                            </div>
                                                        )
                                                    })}
                                                </div>
                                            </div>

                                            {/* Edges Section */}
                                            <div>
                                                <div className="flex items-center justify-between mb-3 border-b border-white/5 pb-2">
                                                    <span className="text-slate-300 text-sm font-medium tracking-wide">Relationships ({edges.length})</span>
                                                </div>
                                                <div className="flex items-center gap-3 py-1 hover:bg-white/5 px-2 -mx-2 rounded transition-colors cursor-pointer">
                                                    <span className="bg-slate-200 min-w-[40px] text-center rounded-full text-[11px] font-bold py-[2px] px-2 text-black">{edges.length}</span>
                                                    <span className="text-slate-200 text-sm font-mono tracking-tight text-white/90 bg-white/10 px-1.5 rounded">HAS_ENTITY</span>
                                                </div>
                                            </div>

                                        </div>
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
