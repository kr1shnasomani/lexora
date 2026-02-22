import { useState, useRef, useEffect } from 'react'
import { useNavigate, useSearchParams, Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

/* ─── Demo credentials ────────────────────────────────────────────────────────
   The OTP verification step accepts any 6-digit code or DEMO_OTP.
──────────────────────────────────────────────────────────────────────────────*/
const DEMO_OTP = '123456'

/* ─── Logo ───────────────────────────────────────────────────────────────────*/
function Logo() {
    return (
        <div className="flex flex-col items-center mb-10">
            <div className="flex items-center gap-3 mb-2">
                <div className="size-8 text-[#E83049]">
                    <svg className="w-full h-full" fill="none" viewBox="0 0 48 48">
                        <path d="M36.7273 44C33.9891 44 31.6043 39.8386 30.3636 33.69C29.123 39.8386 26.7382 44 24 44C21.2618 44 18.877 39.8386 17.6364 33.69C16.3957 39.8386 14.0109 44 11.2727 44C7.25611 44 4 35.0457 4 24C4 12.9543 7.25611 4 11.2727 4C14.0109 4 16.3957 8.16144 17.6364 14.31C18.877 8.16144 21.2618 4 24 4C26.7382 4 29.123 8.16144 30.3636 14.31C31.6043 8.16144 33.9891 4 36.7273 4C40.7439 4 44 12.9543 44 24C44 35.0457 40.7439 44 36.7273 44Z" fill="currentColor" />
                    </svg>
                </div>
                <h1 className="text-3xl font-bold tracking-tight text-white uppercase" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                    Lexora
                </h1>
            </div>
            <p className="text-sm text-[#9CA3AF] text-center">Intelligence Core Portal</p>
        </div>
    )
}

/* ─── Step indicator ──────────────────────────────────────────────────────── */
function StepBar({ step }) {
    return (
        <div className="flex items-center justify-center mb-10 text-sm">
            {/* Step 1 */}
            <div className="flex items-center">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center font-semibold border transition-all ${step > 1 ? 'bg-[#E83049] border-[#E83049] text-white' : step === 1 ? 'bg-[#E83049]/10 border-[#E83049]/20 text-[#E83049]' : 'bg-[#1A1A20] border-[#27272F] text-gray-500'}`}>
                    {step > 1
                        ? <span className="material-symbols-outlined text-base">check</span>
                        : '1'
                    }
                </div>
                <span className={`ml-2 font-medium hidden sm:inline-block transition-colors ${step >= 1 ? 'text-[#E83049]' : 'text-gray-500'}`}>Email</span>
            </div>

            {/* Connector */}
            <div className={`w-16 h-px mx-4 transition-colors ${step > 1 ? 'bg-[#E83049]' : 'bg-[#27272F]'}`} />

            {/* Step 2 */}
            <div className="flex items-center">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center font-semibold border transition-all ${step === 2 ? 'bg-[#E83049]/10 border-[#E83049]/20 text-[#E83049]' : 'bg-[#1A1A20] border-[#27272F] text-gray-500 opacity-50'}`}>
                    2
                </div>
                <span className={`ml-2 font-medium transition-colors ${step === 2 ? 'text-[#E83049]' : 'text-gray-500 opacity-50'}`}>Verify</span>
            </div>
        </div>
    )
}

/* ─── OTP Input ──────────────────────────────────────────────────────────── */
function OtpInput({ value, onChange }) {
    // Single ref array — avoids calling useRef in a loop (hooks rules violation)
    const inputRefs = useRef([])
    const digits = value.split('')

    const handleKey = (e, i) => {
        if (e.key === 'Backspace') {
            const next = digits.map((d, idx) => idx === i ? '' : d).join('')
            onChange(next)
            if (i > 0) inputRefs.current[i - 1]?.focus()
        }
    }

    const handleChange = (e, i) => {
        const char = e.target.value.replace(/\D/g, '').slice(-1)
        const arr = Array(6).fill('')
        digits.forEach((d, idx) => { arr[idx] = d })
        arr[i] = char
        onChange(arr.join(''))
        if (char && i < 5) inputRefs.current[i + 1]?.focus()
    }

    const handlePaste = (e) => {
        e.preventDefault()
        const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6)
        onChange(pasted.padEnd(6, ' '))
        const lastIndex = Math.min(pasted.length, 5)
        inputRefs.current[lastIndex]?.focus()
    }

    return (
        <div className="flex justify-between gap-2">
            {Array.from({ length: 6 }, (_, i) => (
                <input
                    key={i}
                    ref={el => inputRefs.current[i] = el}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={(digits[i] || '').trim()}
                    onChange={e => handleChange(e, i)}
                    onKeyDown={e => handleKey(e, i)}
                    onPaste={handlePaste}
                    className="w-12 h-12 md:w-[52px] md:h-[52px] text-center text-xl font-semibold rounded-lg bg-[#1A1A20] border border-[#27272F] text-white focus:outline-none focus:ring-2 focus:ring-[#E83049] focus:border-[#E83049] transition-all duration-200 caret-[#E83049]"
                />
            ))}
        </div>
    )
}

/* ─── Main Login Page ─────────────────────────────────────────────────────── */
export default function LoginPage() {
    const navigate = useNavigate()
    const [params] = useSearchParams()
    const { signIn } = useAuth()

    // Pre-fill role hint from query param: /login?role=customer or /login?role=admin
    const roleHint = params.get('role') // 'customer' | 'admin' | null

    const [step, setStep] = useState(1)
    const [email, setEmail] = useState('')
    const [otp, setOtp] = useState('')
    const [error, setError] = useState('')
    const [loading, setLoading] = useState(false)
    const [countdown, setCountdown] = useState(30)
    const [validatedUser, setValidatedUser] = useState(null)

    // Resend countdown timer for step 2
    useEffect(() => {
        if (step !== 2) return
        setCountdown(30)
        const id = setInterval(() => setCountdown(c => c <= 1 ? (clearInterval(id), 0) : c - 1), 1000)
        return () => clearInterval(id)
    }, [step])

    /* Step 1 — email submission */
    const handleEmailSubmit = async (e) => {
        e.preventDefault()
        setError('')

        const trimmed = email.trim().toLowerCase()
        if (!trimmed) { setError('Please enter your email address.'); return }

        setLoading(true)
        try {
            const res = await fetch('/api/auth/verify-email', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: trimmed })
            })

            if (!res.ok) throw new Error('Failed to verify email.')

            const data = await res.json()

            if (!data.exists) {
                setLoading(false)
                setError(`No account found under that email.`)
                return
            }

            setValidatedUser({ email: trimmed, role: data.role, name: data.name })
            setLoading(false)
            setStep(2)
        } catch (err) {
            setLoading(false)
            setError('Could not connect to the authentication server.')
        }
    }

    /* Step 2 — OTP verification */
    const handleOtpSubmit = async (e) => {
        e.preventDefault()
        setError('')
        const code = otp.replace(/\s/g, '')

        if (code.length !== 6) { setError('Please enter all 6 digits.'); return }

        setLoading(true)
        await new Promise(r => setTimeout(r, 700))

        // Demo mode: accept DEMO_OTP or the real 6-digit code (any 6 digits in demo)
        const isValid = code === DEMO_OTP || code.length === 6
        if (!isValid) {
            setLoading(false)
            setError('Invalid code. Use 123456 in demo mode.')
            return
        }

        if (!validatedUser) {
            setLoading(false)
            setError('Session expired. Please restart login.')
            return
        }

        // Set auth in context
        await signIn({ email: validatedUser.email, role: validatedUser.role, name: validatedUser.name })
        setLoading(false)

        // Navigate based on role
        navigate(validatedUser.role === 'admin' ? '/admin/dashboard' : '/customer', { replace: true })
    }

    return (
        <div className="min-h-screen flex flex-col antialiased" style={{ backgroundColor: '#0A0A0C', fontFamily: "'Inter', sans-serif" }}>
            {/* Red radial glow */}
            <div className="fixed inset-0 pointer-events-none z-0" style={{ background: 'radial-gradient(circle at 50% 30%, rgba(211, 47, 47, 0.15) 0%, transparent 60%)' }} />

            <main className="flex-grow flex items-center justify-center p-4 relative z-10">
                <div className="w-full max-w-md bg-[#111115] rounded-2xl shadow-xl border border-[#27272F] p-8 md:p-10">
                    <Logo />
                    <StepBar step={step} />

                    {/* ── Step 1: Email ──────────────────────────────── */}
                    {step === 1 && (
                        <>
                            <div className="mb-6 text-center sm:text-left">
                                <h2 className="text-xl font-semibold text-white mb-2" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>Enter your email</h2>
                                <p className="text-[#9CA3AF] text-sm leading-relaxed">
                                    Access your secure claims dashboard. We'll send a one-time verification code to this address.
                                </p>
                            </div>

                            <form onSubmit={handleEmailSubmit} className="space-y-6">
                                <div className="space-y-2">
                                    <label htmlFor="email" className="block text-sm font-medium text-gray-300">Email Address</label>
                                    <div className="relative group">
                                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                            <span className="material-symbols-outlined text-gray-500 group-focus-within:text-[#E83049] transition-colors text-[20px]">mail</span>
                                        </div>
                                        <input
                                            id="email"
                                            type="email"
                                            required
                                            value={email}
                                            onChange={e => { setEmail(e.target.value); setError('') }}
                                            placeholder="name@company.com"
                                            className="block w-full pl-10 pr-3 py-3 rounded-lg bg-[#1A1A20] border border-[#27272F] text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-[#E83049] focus:border-[#E83049] text-sm transition-all duration-200"
                                        />
                                    </div>
                                    {/* Demo hint */}
                                    <p className="text-[11px] text-gray-600 mt-1">
                                        Demo: <button type="button" onClick={() => setEmail('admin@lexora.test')} className="text-[#E83049]/70 hover:text-[#E83049] underline underline-offset-2">admin@lexora.test</button>
                                        {' '}·{' '}
                                        <button type="button" onClick={() => setEmail('asha@lexora.test')} className="text-[#E83049]/70 hover:text-[#E83049] underline underline-offset-2">asha@lexora.test</button>
                                    </p>
                                </div>

                                {error && <p className="text-sm text-[#E83049] bg-[#E83049]/10 border border-[#E83049]/20 rounded-lg px-4 py-2">{error}</p>}

                                <button type="submit" disabled={loading}
                                    className="w-full flex justify-center items-center gap-2 py-3 px-4 rounded-lg text-sm font-semibold text-white bg-[#E83049] hover:bg-[#B71C1C] disabled:opacity-60 transition-all duration-200 shadow-lg shadow-[#E83049]/20">
                                    {loading
                                        ? <><span className="material-symbols-outlined text-lg animate-spin">progress_activity</span>Sending…</>
                                        : <><span>Send OTP</span><span className="material-symbols-outlined text-lg">arrow_forward</span></>
                                    }
                                </button>

                                <div className="text-center">
                                    <Link to="/" className="inline-flex items-center gap-1 text-sm text-[#9CA3AF] hover:text-white transition-colors">
                                        <span className="material-symbols-outlined text-base">arrow_back</span>Back to Selection
                                    </Link>
                                </div>
                            </form>
                        </>
                    )}

                    {/* ── Step 2: OTP ───────────────────────────────── */}
                    {step === 2 && (
                        <>
                            <div className="mb-8 text-center sm:text-left">
                                <h2 className="text-xl font-semibold text-white mb-2" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>Verify your identity</h2>
                                <p className="text-[#9CA3AF] text-sm leading-relaxed">
                                    We've sent a 6-digit code to <strong className="text-white">{email}</strong>.
                                    In demo mode, use <strong className="text-[#E83049]">123456</strong>.
                                </p>
                            </div>

                            <form onSubmit={handleOtpSubmit} className="space-y-6">
                                <div className="space-y-4">
                                    <OtpInput value={otp} onChange={setOtp} />
                                    <div className="text-center">
                                        {countdown > 0
                                            ? <p className="text-sm text-[#9CA3AF]">Resend code in <span className="text-[#E83049] font-medium">0:{String(countdown).padStart(2, '0')}</span></p>
                                            : <button type="button" onClick={() => { setCountdown(30); setOtp('') }} className="text-sm text-[#E83049] hover:text-[#B71C1C] font-medium transition-colors">Resend code</button>
                                        }
                                    </div>
                                </div>

                                {error && <p className="text-sm text-[#E83049] bg-[#E83049]/10 border border-[#E83049]/20 rounded-lg px-4 py-2">{error}</p>}

                                <button type="submit" disabled={loading || otp.replace(/\s/g, '').length !== 6}
                                    className="w-full flex justify-center items-center gap-2 py-3 px-4 rounded-lg text-sm font-semibold text-white bg-[#E83049] hover:bg-[#B71C1C] disabled:opacity-60 transition-all duration-200 shadow-lg shadow-[#E83049]/20">
                                    {loading
                                        ? <><span className="material-symbols-outlined text-lg animate-spin">progress_activity</span>Verifying…</>
                                        : <><span>Verify &amp; Continue</span><span className="material-symbols-outlined text-lg">arrow_forward</span></>
                                    }
                                </button>

                                <div className="text-center">
                                    <button type="button" onClick={() => { setStep(1); setOtp(''); setError(''); setValidatedUser(null) }}
                                        className="inline-flex items-center gap-1 text-sm text-[#9CA3AF] hover:text-white transition-colors">
                                        <span className="material-symbols-outlined text-base">arrow_back</span>Back to Email
                                    </button>
                                </div>
                            </form>
                        </>
                    )}
                </div>
            </main>

            <footer className="py-6 text-center relative z-10">
                <div className="flex justify-center items-center gap-6 mb-4 text-xs font-medium text-gray-600">
                    <a href="#" className="hover:text-gray-400 transition-colors">Privacy Policy</a>
                    <span className="w-1 h-1 rounded-full bg-gray-700" />
                    <a href="#" className="hover:text-gray-400 transition-colors">Terms of Service</a>
                    <span className="w-1 h-1 rounded-full bg-gray-700" />
                    <a href="#" className="hover:text-gray-400 transition-colors">Help Center</a>
                </div>
                <p className="text-[10px] text-gray-700">© 2024 Lexora Intelligence. All rights reserved.</p>
            </footer>
        </div>
    )
}
