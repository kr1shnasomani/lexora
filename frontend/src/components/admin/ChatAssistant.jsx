import { useState, useRef, useEffect } from 'react'

export default function ChatAssistant() {
    const [mode, setMode] = useState('minimized')
    const [messages, setMessages] = useState([])
    const [inputValue, setInputValue] = useState('')
    const [position, setPosition] = useState({ x: 0, y: 0 })
    const [isDragging, setIsDragging] = useState(false)
    const [isLoading, setIsLoading] = useState(false)
    const [sessionId, setSessionId] = useState(null)
    const dragRef = useRef({ startX: 0, startY: 0, initialX: 0, initialY: 0, hasDragged: false })
    const messagesEndRef = useRef(null)

    // Auto scroll to bottom
    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }

    useEffect(() => {
        if (mode !== 'minimized') {
            scrollToBottom()
        }
    }, [messages, mode])

    // Remove Auto Load History per User preference
    useEffect(() => {
        // Chat starts fresh on mount
    }, [])


    // Drag handlers for Docked and Minimized modes
    const handleDragStart = (e) => {
        if (mode === 'expanded') return // Only drag docked or minimized
        setIsDragging(true)
        dragRef.current = {
            startX: e.clientX,
            startY: e.clientY,
            initialX: position.x,
            initialY: position.y,
            hasDragged: false
        }
    }

    const handleDragMove = (e) => {
        if (!isDragging || mode === 'expanded') return
        const dx = e.clientX - dragRef.current.startX
        const dy = e.clientY - dragRef.current.startY

        if (Math.abs(dx) > 3 || Math.abs(dy) > 3) {
            dragRef.current.hasDragged = true
        }

        let newX = dragRef.current.initialX + dx
        let newY = dragRef.current.initialY + dy

        // Enforce bounds based on the docked panel dimensions (360x520) 
        // starting at bottom=24, right=24
        const panelW = 360
        const panelH = 520
        const padding = 24

        const minX = -window.innerWidth + panelW + padding * 2
        const maxX = 0
        const minY = -window.innerHeight + panelH + padding * 2
        const maxY = 0

        setPosition({
            x: Math.max(minX, Math.min(newX, maxX)),
            y: Math.max(minY, Math.min(newY, maxY))
        })
    }

    const handleDragEnd = () => {
        setIsDragging(false)
    }

    useEffect(() => {
        if (isDragging) {
            window.addEventListener('mousemove', handleDragMove)
            window.addEventListener('mouseup', handleDragEnd)
        } else {
            window.removeEventListener('mousemove', handleDragMove)
            window.removeEventListener('mouseup', handleDragEnd)
        }
        return () => {
            window.removeEventListener('mousemove', handleDragMove)
            window.removeEventListener('mouseup', handleDragEnd)
        }
    }, [isDragging])

    // Formatting markdown-ish text simply
    const formatMessage = (text) => {
        if (!text) return null

        // Simple bold parser
        const boldRegex = /\*\*(.*?)\*\*/g

        const lines = text.split('\n')
        return lines.map((line, i) => {
            if (line.trim().startsWith('- ')) {
                // Bullet point
                const content = line.substring(2)
                const parts = content.split(boldRegex)
                return (
                    <li key={i} className="flex items-start gap-2 mb-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-primary mt-2 shrink-0 lg:mt-1.5" />
                        <span>
                            {parts.map((part, j) => (
                                j % 2 === 1 ? <strong key={j} className="text-white font-bold">{part}</strong> : part
                            ))}
                        </span>
                    </li>
                )
            }

            // Normal line
            const parts = line.split(boldRegex)
            return (
                <p key={i} className={i < lines.length - 1 ? "mb-3" : ""}>
                    {parts.map((part, j) => (
                        j % 2 === 1 ? <strong key={j} className="text-white font-bold">{part}</strong> : part
                    ))}
                </p>
            )
        })
    }

    const handleSend = async () => {
        if (!inputValue.trim() || isLoading) return

        const userText = inputValue
        const newMsg = {
            id: Date.now(),
            role: 'user',
            content: userText,
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            read: false
        }

        setMessages(prev => [...prev, newMsg])
        setInputValue('')
        setIsLoading(true)

        try {
            // Get current active context if any
            const uiContext = {
                currentPath: window.location.pathname,
                // We'd add other relevant app state here if hooked into Redux/Context
            }

            const res = await fetch('http://localhost:8000/api/chat/message', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    session_id: sessionId,
                    message: userText,
                    ui_context: uiContext
                })
            })

            if (!res.ok) throw new Error("Failed to fetch from LLM Engine")

            const data = await res.json()

            // Save initial session id returned by backend
            if (!sessionId && data.session_id) {
                setSessionId(data.session_id)
            }

            const botMsg = {
                id: Date.now() + 1,
                role: 'assistant',
                content: data.message,
                time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                hasActions: data.tool_calls_executed && data.tool_calls_executed.length > 0,
                toolCalls: data.tool_calls_executed || []
            }

            setMessages(prev => [...prev, botMsg])

        } catch (err) {
            console.error("Chat API Error:", err)
            setMessages(prev => [...prev, {
                id: Date.now() + 1,
                role: 'assistant',
                content: "I'm having trouble connecting to the Intelligence core right now. Please try again later.",
                time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            }])
        } finally {
            setIsLoading(false)
        }
    }

    const handleKeyPress = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault()
            handleSend()
        }
    }

    // --- RENDER MINIMIZED ---
    if (mode === 'minimized') {
        const handleFabClick = () => {
            if (dragRef.current.hasDragged) {
                dragRef.current.hasDragged = false
                return
            }
            setMode('docked')
        }

        return (
            <div
                className="fixed bottom-6 right-6 z-[100] pointer-events-auto transition-transform duration-200"
                style={{ transform: `translate(${position.x}px, ${position.y}px)` }}
            >
                <button
                    onMouseDown={handleDragStart}
                    onClick={handleFabClick}
                    className="w-14 h-14 rounded-full bg-primary text-white shadow-[0_8px_32px_rgba(232,48,73,0.4)] flex items-center justify-center hover:scale-110 active:scale-95 transition-all duration-300 group cursor-grab active:cursor-grabbing"
                >
                    <span className="material-symbols-outlined text-2xl group-hover:rotate-12 transition-transform">smart_toy</span>
                </button>
            </div>
        )
    }

    // --- RENDER DOCKED ---
    if (mode === 'docked') {
        return (
            <div
                className="fixed bottom-6 right-6 z-[100] pointer-events-auto transition-transform duration-200"
                style={{ transform: `translate(${position.x}px, ${position.y}px)` }}
            >
                <div className="w-[360px] h-[520px] bg-[#161618] border border-white/10 rounded-xl flex flex-col shadow-[0_24px_80px_rgba(0,0,0,0.6)] overflow-hidden">
                    {/* Header */}
                    <div
                        className="h-14 border-b border-border-dark flex items-center justify-between px-4 bg-[#1e1e22]/50 cursor-grab active:cursor-grabbing shrink-0"
                        onMouseDown={handleDragStart}
                    >
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center border border-primary/20">
                                <span className="material-symbols-outlined text-primary text-sm">smart_toy</span>
                            </div>
                            <div>
                                <h3 className="text-sm font-bold text-white tracking-wide font-display">Lexora Assistant</h3>
                                <p className="text-[10px] text-emerald-400 flex items-center gap-1">
                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                                    Online
                                </p>
                            </div>
                        </div>
                        <div className="flex items-center gap-1">
                            <button onClick={() => setMode('minimized')} className="p-1.5 text-slate-400 hover:text-white rounded-md hover:bg-white/10 transition-colors">
                                <span className="material-symbols-outlined text-lg">minimize</span>
                            </button>
                            <button onClick={() => setMode('expanded')} className="p-1.5 text-slate-400 hover:text-white rounded-md hover:bg-white/10 transition-colors">
                                <span className="material-symbols-outlined text-lg">open_in_full</span>
                            </button>
                        </div>
                    </div>

                    {/* Messages */}
                    <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-[#131316]">
                        <div className="flex justify-center">
                            <span className="text-[10px] text-slate-500">Today, 10:43 AM</span>
                        </div>

                        {messages.map(msg => (
                            <div key={msg.id} className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                                {msg.role === 'assistant' ? (
                                    <div className="w-8 h-8 rounded-lg bg-primary flex-shrink-0 flex items-center justify-center mt-1 shadow-lg shadow-primary/20">
                                        <span className="material-symbols-outlined text-white text-xs">smart_toy</span>
                                    </div>
                                ) : (
                                    <div className="w-8 h-8 rounded-full bg-surface-dark border border-border-dark flex-shrink-0 flex items-center justify-center mt-1 text-xs text-white font-bold">
                                        JD
                                    </div>
                                )}

                                <div className={`flex flex-col gap-1 max-w-[80%] ${msg.role === 'user' ? 'items-end' : ''}`}>
                                    <div className={`p-3 text-[13px] leading-relaxed shadow-sm ${msg.role === 'user'
                                        ? 'bg-gradient-to-br from-[#e8354a] to-[#b01d32] text-white rounded-2xl rounded-tr-none'
                                        : 'bg-[#1e1e24] border border-white/5 text-slate-200 rounded-2xl rounded-tl-none'
                                        }`}>
                                        {msg.role === 'assistant' ? (
                                            <>
                                                {msg.content.includes('- ') ? <ul className="list-none m-0 p-0 text-slate-300">{formatMessage(msg.content)}</ul> : formatMessage(msg.content)}
                                                {msg.hasActions && msg.toolCalls && (
                                                    <div className="flex gap-2 mt-3 pt-3 border-t border-white/5 flex-wrap">
                                                        {msg.toolCalls.map((tool, tIdx) => (
                                                            <div key={tIdx} className="px-3 py-1.5 bg-surface-dark border border-border-dark text-emerald-400 text-[10px] font-mono rounded transition-colors flex items-center gap-1">
                                                                <span className="material-symbols-outlined text-[12px] text-emerald-400">api</span>
                                                                {tool}()
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                            </>
                                        ) : (
                                            <p>{msg.content}</p>
                                        )}
                                    </div>
                                    <span className="text-[10px] text-slate-500">
                                        {msg.role === 'user' ? (msg.read ? `Read ${msg.time}` : `Sent ${msg.time}`) : `Lexora Core v2.4 • ${msg.time}`}
                                    </span>
                                </div>
                            </div>
                        ))}
                        <div ref={messagesEndRef} />
                    </div>

                    {/* Input */}
                    <div className="p-3 border-t border-border-dark bg-[#161618] shrink-0">
                        <div className="flex items-center gap-2 p-1 bg-[#1e1e22] border border-border-dark rounded-xl focus-within:border-primary/50 transition-colors">
                            <button className="p-2 text-slate-400 hover:text-white transition-colors rounded-lg">
                                <span className="material-symbols-outlined text-lg">mic</span>
                            </button>
                            <input
                                className="flex-1 bg-transparent border-none text-[13px] text-white placeholder-slate-500 focus:outline-none focus:ring-0 px-1 disabled:opacity-50"
                                placeholder={isLoading ? "Lexora is thinking..." : "Ask Lexora..."}
                                type="text"
                                value={inputValue}
                                disabled={isLoading}
                                onChange={e => setInputValue(e.target.value)}
                                onKeyDown={handleKeyPress}
                            />
                            <button
                                onClick={handleSend}
                                className="w-8 h-8 bg-primary hover:bg-primary-hover text-white rounded-lg shadow-md flex items-center justify-center transition-all transform hover:scale-105 active:scale-95 mx-1"
                            >
                                <span className="material-symbols-outlined text-[16px]">arrow_upward</span>
                            </button>
                        </div>
                        <div className="text-center mt-2">
                            <p className="text-[10px] text-slate-500">Lexora Intelligence can make mistakes. Verify critical alerts.</p>
                        </div>
                    </div>
                </div>
            </div>
        )
    }

    // --- RENDER EXPANDED (MODAL) ---
    if (mode === 'expanded') {
        return (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 pointer-events-auto">
                <div className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity" onClick={() => setMode('minimized')}></div>

                <div className="relative w-full max-w-[850px] h-[700px] bg-[#0d0d0f] rounded-2xl shadow-[0_24px_80px_rgba(0,0,0,0.8)] border border-white/10 flex overflow-hidden ring-1 ring-[#00d9ff]/10 animate-fade-in shadow-neon">

                    {/* Main Chat Column */}
                    <div className="flex-1 flex flex-col relative min-w-0">
                        {/* Header */}
                        <div className="h-16 border-b border-white/5 bg-[#161618] flex items-center justify-between px-6 z-10 shrink-0">
                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-primary-dark flex items-center justify-center text-white shadow-lg shadow-primary/20">
                                    <span className="material-symbols-outlined text-[18px]">smart_toy</span>
                                </div>
                                <div>
                                    <h3 className="text-slate-100 font-display font-semibold text-sm tracking-wide">Lexora Assistant</h3>
                                    <p className="text-[10px] text-slate-400 font-mono uppercase tracking-wider">Session ID: LX-9284</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <button className="p-1.5 text-slate-400 hover:text-white transition-colors rounded hover:bg-white/5">
                                    <span className="material-symbols-outlined text-xl">history</span>
                                </button>
                                <button className="p-1.5 text-slate-400 hover:text-white transition-colors rounded hover:bg-white/5">
                                    <span className="material-symbols-outlined text-xl">settings</span>
                                </button>
                                <div className="w-px h-4 bg-border-dark mx-1"></div>
                                <button onClick={() => setMode('minimized')} className="p-1.5 text-slate-400 hover:text-white transition-colors rounded hover:bg-white/5">
                                    <span className="material-symbols-outlined text-xl">close</span>
                                </button>
                            </div>
                        </div>

                        {/* Messages */}
                        <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-gradient-to-b from-[#0d0d0f] to-[#131316]">
                            <div className="flex justify-center">
                                <span className="text-[11px] text-slate-500">Today, 10:43 AM</span>
                            </div>

                            {messages.map(msg => (
                                <div key={msg.id} className={`flex gap-4 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                                    {msg.role === 'assistant' ? (
                                        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary to-primary-dark flex-shrink-0 flex items-center justify-center mt-1 shadow-lg shadow-primary/20">
                                            <span className="material-symbols-outlined text-white text-[18px]">smart_toy</span>
                                        </div>
                                    ) : (
                                        <div className="w-9 h-9 border border-border-dark rounded-full bg-surface-dark flex-shrink-0 flex items-center justify-center mt-1 text-[13px] text-white font-bold">
                                            JD
                                        </div>
                                    )}

                                    <div className={`flex flex-col gap-1.5 max-w-[85%] ${msg.role === 'user' ? 'items-end' : ''}`}>
                                        <div className={`px-5 py-4 text-[14px] leading-relaxed shadow-sm ${msg.role === 'user'
                                            ? 'bg-gradient-to-br from-[#e8354a] to-[#b01d32] text-white rounded-[20px] rounded-tr-sm'
                                            : 'bg-[#1e1e24] border border-white/5 text-slate-200 rounded-[20px] rounded-tl-sm'
                                            }`}>
                                            {msg.role === 'assistant' ? (
                                                <>
                                                    {msg.content.includes('- ') ? <ul className="list-none m-0 p-0 text-slate-300">{formatMessage(msg.content)}</ul> : formatMessage(msg.content)}
                                                    {msg.hasActions && msg.toolCalls && (
                                                        <div className="flex gap-2.5 mt-4 pt-4 border-t border-white/5 flex-wrap">
                                                            {msg.toolCalls.map((tool, tIdx) => (
                                                                <div key={tIdx} className="px-4 py-2 bg-surface-dark border border-border-dark text-emerald-400 text-[11px] font-mono rounded-lg transition-colors flex items-center gap-1.5">
                                                                    <span className="material-symbols-outlined text-[14px]">api</span>
                                                                    Data via {tool}()
                                                                </div>
                                                            ))}
                                                        </div>
                                                    )}
                                                </>
                                            ) : (
                                                <p>{msg.content}</p>
                                            )}
                                        </div>
                                        <span className="text-[11px] text-slate-500">
                                            {msg.role === 'user' ? (msg.read ? `Read ${msg.time}` : `Sent ${msg.time}`) : `Lexora Core v2.4 • ${msg.time}`}
                                        </span>
                                    </div>
                                </div>
                            ))}
                            <div ref={messagesEndRef} />
                        </div>

                        {/* Input Area */}
                        <div className="p-5 bg-[#161618] border-t border-white/5">
                            <div className="relative bg-[#0d0d0f] rounded-xl border border-border-dark focus-within:border-primary/50 focus-within:ring-1 focus-within:ring-primary/20 transition-all flex items-start">
                                <div className="flex items-center p-2 shrink-0 h-[56px] pt-3 pl-3">
                                    <button className="p-2 text-slate-400 hover:text-primary transition-colors rounded-lg">
                                        <span className="material-symbols-outlined text-[20px]">mic</span>
                                    </button>
                                </div>
                                <textarea
                                    className="w-full bg-transparent text-slate-200 placeholder-slate-500 text-[14px] px-2 py-4 focus:outline-none resize-none h-[56px] font-body disabled:opacity-50"
                                    placeholder={isLoading ? "Lexora is thinking..." : "Ask Lexora about risk patterns..."}
                                    value={inputValue}
                                    disabled={isLoading}
                                    onChange={e => setInputValue(e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter' && !e.shiftKey) {
                                            e.preventDefault()
                                            handleSend()
                                        }
                                    }}
                                />
                                <div className="flex items-center gap-1.5 p-2 shrink-0 h-[56px] pt-2.5 pr-2.5">
                                    <button
                                        onClick={handleSend}
                                        className="p-2 bg-primary hover:bg-primary-hover text-white rounded-lg transition-colors shadow-lg shadow-primary/20"
                                    >
                                        <span className="material-symbols-outlined text-[20px]">arrow_upward</span>
                                    </button>
                                </div>
                            </div>
                            <div className="flex justify-center mt-3">
                                <p className="text-[11px] text-slate-500">Lexora Intelligence can make mistakes. Verify critical alerts.</p>
                            </div>
                        </div>
                    </div>

                    {/* Context Panel Sidebar */}
                    <div className="w-[240px] bg-[#161618] border-l border-white/5 hidden md:flex flex-col shrink-0">
                        <div className="p-4 border-b border-border-dark">
                            <h4 className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-2">Context</h4>
                            <div className="flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full bg-primary animate-pulse"></span>
                                <span className="text-[13px] font-bold text-white">Active Threat</span>
                            </div>
                        </div>

                        <div className="p-4 space-y-7 overflow-y-auto flex-1">
                            {/* Metric 1 */}
                            <div>
                                <div className="flex justify-between items-center mb-3">
                                    <span className="text-[11px] text-slate-500">Risk Score Trend</span>
                                    <span className="text-xs font-bold text-primary">High (92)</span>
                                </div>
                                <div className="h-10 w-full flex items-end gap-[3px]">
                                    {[20, 30, 25, 40, 35, 50, 65, 80, 90, 95].map((val, i) => (
                                        <div
                                            key={i}
                                            className={`w-full rounded-sm ${i >= 7 ? 'bg-primary' : 'bg-surface-dark border border-white/5'}`}
                                            style={{ height: `${val}%`, opacity: i >= 7 ? (i - 5) / 5 : 1, boxShadow: i === 9 ? '0 0 10px rgba(232,48,73,0.5)' : 'none' }}
                                        />
                                    ))}
                                </div>
                            </div>

                            {/* Metric 2 */}
                            <div>
                                <div className="flex justify-between items-center mb-3">
                                    <span className="text-[11px] text-slate-500">Velocity (req/s)</span>
                                    <span className="text-xs font-bold text-amber-400">1,240</span>
                                </div>
                                <div className="h-10 w-full flex items-end gap-[3px]">
                                    {[40, 45, 42, 50, 55, 70, 85, 80, 95, 88].map((val, i) => (
                                        <div
                                            key={i}
                                            className={`w-full rounded-sm ${i > 4 ? 'bg-amber-500' : 'bg-surface-dark border border-white/5'}`}
                                            style={{ height: `${val}%`, opacity: i > 4 ? (i - 2) / 8 : 1 }}
                                        />
                                    ))}
                                </div>
                            </div>

                            {/* Tags */}
                            <div className="pt-5 border-t border-border-dark">
                                <h5 className="text-[11px] text-slate-500 mb-3">Related Entities</h5>
                                <div className="flex flex-wrap gap-2">
                                    {['#medical-equip', '#botnet-sig', 'Region-US-E'].map(tag => (
                                        <span key={tag} className="px-2 py-1 bg-white/5 border border-border-dark rounded text-[11px] text-slate-300">
                                            {tag}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* Telemetry Button */}
                        <div className="p-4 border-t border-border-dark bg-[#131316]">
                            <button className="w-full py-2 text-[12px] text-slate-300 font-medium border border-border-dark hover:border-slate-500 rounded-lg transition-colors bg-surface-dark">
                                Full Telemetry Report
                            </button>
                        </div>
                    </div>

                </div>
            </div>
        )
    }

    return null
}
