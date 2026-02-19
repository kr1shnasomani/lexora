import { useState, useRef, useEffect } from 'react'
import Header from '../../components/customer/Header'
import BottomNav from '../../components/customer/BottomNav'

const initMessages = [
    { role: 'assistant', text: "Hi Arjun! I'm Lexora AI. I can help you with your policies, claims, coverage questions, or anything else insurance-related. How can I help you today?" },
]

const suggestions = ['Check my claim status', 'How do I file a claim?', "What's my deductible?", 'Explain my coverage']

export default function ChatPage() {
    const [messages, setMessages] = useState(initMessages)
    const [input, setInput] = useState('')
    const [loading, setLoading] = useState(false)
    const bottomRef = useRef(null)

    const send = (text) => {
        if (!text.trim()) return
        const userMsg = { role: 'user', text }
        setMessages((m) => [...m, userMsg])
        setInput('')
        setLoading(true)
        setTimeout(() => {
            setMessages((m) => [...m, {
                role: 'assistant',
                text: "Thanks for your message. I'm processing your query and will fetch the relevant details from your policy. This feature will be fully connected to Lexora's AI backend soon."
            }])
            setLoading(false)
        }, 1200)
    }

    useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages, loading])

    return (
        <div className="flex flex-col h-screen bg-background-dark text-slate-100">
            <Header />
            <main className="flex-1 overflow-y-auto px-4 py-6 max-w-2xl w-full mx-auto space-y-4">
                {messages.map((m, i) => (
                    <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                        {m.role === 'assistant' && (
                            <div className="size-8 rounded-full bg-primary/10 flex items-center justify-center mr-3 shrink-0 mt-1">
                                <span className="material-symbols-outlined text-primary text-[18px]">smart_toy</span>
                            </div>
                        )}
                        <div className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${m.role === 'user' ? 'bg-primary text-white rounded-br-sm' : 'bg-surface-dark-customer border border-surface-border text-slate-200 rounded-bl-sm'}`}>
                            {m.text}
                        </div>
                    </div>
                ))}
                {loading && (
                    <div className="flex justify-start">
                        <div className="size-8 rounded-full bg-primary/10 flex items-center justify-center mr-3 shrink-0">
                            <span className="material-symbols-outlined text-primary text-[18px]">smart_toy</span>
                        </div>
                        <div className="bg-surface-dark-customer border border-surface-border rounded-2xl rounded-bl-sm px-4 py-3 flex gap-1.5 items-center">
                            {[0, 1, 2].map((i) => (
                                <span key={i} className="size-2 bg-slate-500 rounded-full animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />
                            ))}
                        </div>
                    </div>
                )}
                <div ref={bottomRef} />
            </main>

            {/* Suggestions */}
            {messages.length <= 1 && (
                <div className="px-4 pb-4 max-w-2xl w-full mx-auto">
                    <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
                        {suggestions.map((s) => (
                            <button
                                key={s}
                                onClick={() => send(s)}
                                className="shrink-0 px-4 py-2 rounded-xl border border-surface-border bg-surface-dark-customer text-sm text-slate-300 hover:text-white hover:border-primary/40 transition-colors whitespace-nowrap"
                            >
                                {s}
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {/* Input */}
            <div className="border-t border-surface-border bg-surface-dark-customer px-4 py-4 mb-20">
                <div className="max-w-2xl mx-auto flex gap-3">
                    <input
                        type="text"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && send(input)}
                        placeholder="Ask Lexora AI anything..."
                        className="flex-1 bg-background-dark border border-surface-border rounded-xl px-4 py-3 text-sm text-white placeholder-slate-500 focus:ring-2 focus:ring-primary outline-none"
                    />
                    <button
                        onClick={() => send(input)}
                        className="size-12 rounded-xl bg-primary hover:bg-primary-dark text-white flex items-center justify-center transition-colors shrink-0"
                    >
                        <span className="material-symbols-outlined text-[20px]">send</span>
                    </button>
                </div>
            </div>

            <BottomNav />
        </div>
    )
}
