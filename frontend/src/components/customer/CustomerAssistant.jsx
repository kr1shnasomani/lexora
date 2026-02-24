import { useState, useRef, useEffect } from 'react'
import { useAuth } from '../../contexts/AuthContext'

export default function CustomerAssistant() {
    const { user } = useAuth()
    const [isOpen, setIsOpen] = useState(false)
    const [messages, setMessages] = useState([])
    const [inputValue, setInputValue] = useState('')
    const [isLoading, setIsLoading] = useState(false)
    const [sessionId, setSessionId] = useState(null)
    const messagesEndRef = useRef(null)

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }

    useEffect(() => {
        if (isOpen) scrollToBottom()
    }, [messages, isOpen])

    useEffect(() => {
        if (isOpen && messages.length === 0) {
            setMessages([{
                id: Date.now(),
                role: 'assistant',
                content: `Hi ${user?.name?.split(' ')[0] || 'there'}! I'm Lexora Assistant. How can I help you today?`,
                time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            }])
        }
    }, [isOpen, messages.length, user])

    const formatMessage = (text) => {
        if (!text) return null
        const boldRegex = /\*\*(.*?)\*\*/g
        const lines = text.split('\n')
        return lines.map((line, i) => {
            if (line.trim().startsWith('- ')) {
                const content = line.substring(2)
                const parts = content.split(boldRegex)
                return (
                    <li key={i} className="flex items-start gap-2 mb-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-primary mt-2 shrink-0 lg:mt-1.5" />
                        <span>{parts.map((part, j) => j % 2 === 1 ? <strong key={j} className="text-white font-bold">{part}</strong> : part)}</span>
                    </li>
                )
            }
            const parts = line.split(boldRegex)
            return (
                <p key={i} className={i < lines.length - 1 ? "mb-3" : ""}>
                    {parts.map((part, j) => j % 2 === 1 ? <strong key={j} className="text-white font-bold">{part}</strong> : part)}
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
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }

        setMessages(prev => [...prev, newMsg])
        setInputValue('')
        setIsLoading(true)

        try {
            const res = await fetch('http://localhost:8000/api/chat/customer/message', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    session_id: sessionId,
                    message: userText,
                    email: user?.email || '',
                    ui_context: { currentPath: window.location.pathname }
                })
            })

            if (!res.ok) throw new Error("Failed to fetch from LLM Engine")

            const data = await res.json()
            if (!sessionId && data.session_id) setSessionId(data.session_id)

            setMessages(prev => [...prev, {
                id: Date.now() + 1,
                role: 'assistant',
                content: data.message,
                time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            }])

        } catch (err) {
            console.error("Chat API Error:", err)
            setMessages(prev => [...prev, {
                id: Date.now() + 1,
                role: 'assistant',
                content: "I'm having trouble connecting right now. Please try again later.",
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

    return (
        <div className="fixed bottom-6 right-6 z-[100] flex flex-col items-end gap-4 pointer-events-auto">
            {isOpen && (
                <div className="chat-glass w-[360px] h-[500px] rounded-2xl shadow-2xl border border-white/10 flex flex-col overflow-hidden animate-slide-up origin-bottom-right">

                    {/* Header */}
                    <div className="bg-primary px-5 py-4 flex items-center justify-between shrink-0 hover:bg-red-600 transition-colors cursor-pointer" onClick={() => setIsOpen(false)}>
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center backdrop-blur-sm">
                                <span className="material-symbols-outlined text-white text-xl">smart_toy</span>
                            </div>
                            <div>
                                <h3 className="text-white font-bold text-base leading-none">Lexora Assistant</h3>
                                <p className="text-white/80 text-xs mt-0.5">Always here to help</p>
                            </div>
                        </div>
                        <button className="text-white/80 hover:text-white transition-colors" onClick={(e) => { e.stopPropagation(); setIsOpen(false) }}>
                            <span className="material-symbols-outlined">minimize</span>
                        </button>
                    </div>

                    {/* Chat Area */}
                    <div className="flex-1 p-5 overflow-y-auto flex flex-col gap-4 bg-black/40">
                        {messages.map(msg => (
                            <div key={msg.id} className={`flex gap-3 items-end ${msg.role === 'user' ? 'justify-end' : ''}`}>
                                {msg.role === 'assistant' && (
                                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-rose-700 flex items-center justify-center shrink-0 shadow-lg shadow-rose-900/20">
                                        <span className="material-symbols-outlined text-white text-xs">smart_toy</span>
                                    </div>
                                )}

                                <div className={`flex flex-col gap-2 max-w-[85%] ${msg.role === 'user' ? 'items-end' : ''}`}>
                                    <div className={`p-3 text-sm shadow-sm leading-relaxed ${msg.role === 'user'
                                            ? 'bg-primary text-white rounded-2xl rounded-br-none shadow-md shadow-rose-900/20'
                                            : 'bg-surface-dark border border-white/5 text-slate-200 rounded-2xl rounded-bl-none'
                                        }`}>
                                        {msg.role === 'assistant' ? (
                                            msg.content.includes('- ') ? <ul className="list-none m-0 p-0">{formatMessage(msg.content)}</ul> : formatMessage(msg.content)
                                        ) : (
                                            <p>{msg.content}</p>
                                        )}
                                    </div>
                                </div>

                                {msg.role === 'user' && (
                                    <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center shrink-0 border border-white/10 text-xs text-white uppercase">
                                        {user?.name?.slice(0, 2) || 'ME'}
                                    </div>
                                )}
                            </div>
                        ))}

                        {isLoading && (
                            <div className="flex gap-2 items-center text-slate-500 text-xs ml-11">
                                <span className="w-1.5 h-1.5 bg-slate-500 rounded-full animate-bounce"></span>
                                <span className="w-1.5 h-1.5 bg-slate-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></span>
                                <span className="w-1.5 h-1.5 bg-slate-500 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></span>
                            </div>
                        )}
                        <div ref={messagesEndRef} />
                    </div>

                    {/* Input Area */}
                    <div className="p-4 bg-surface-dark border-t border-white/5 shrink-0">
                        <div className="relative flex items-center">
                            <input
                                className="w-full bg-black/20 border border-white/10 rounded-full pl-4 pr-12 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/50 transition-all disabled:opacity-50"
                                placeholder={isLoading ? "Thinking..." : "Type your message..."}
                                type="text"
                                value={inputValue}
                                disabled={isLoading}
                                onChange={e => setInputValue(e.target.value)}
                                onKeyDown={handleKeyPress}
                            />
                            <button
                                onClick={handleSend}
                                disabled={isLoading}
                                className="absolute right-2 p-1.5 bg-primary hover:bg-red-600 rounded-full text-white transition-colors flex items-center justify-center shadow-lg shadow-rose-900/30 disabled:opacity-50"
                            >
                                <span className="material-symbols-outlined text-[18px]">send</span>
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {!isOpen && (
                <button
                    onClick={() => setIsOpen(true)}
                    className="h-14 w-14 rounded-full bg-primary text-white shadow-[0_8px_32px_rgba(232,48,73,0.4)] flex items-center justify-center pulse-glow hover:scale-105 active:scale-95 transition-transform z-50 overflow-hidden"
                >
                    <span className="material-symbols-outlined text-[28px] absolute inset-0 flex items-center justify-center group-hover:rotate-12 transition-transform">chat_bubble</span>
                </button>
            )}
        </div>
    )
}
