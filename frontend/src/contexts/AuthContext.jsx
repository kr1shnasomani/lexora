import { createContext, useContext, useState, useEffect } from 'react'

// ─────────────────────────────────────────────────────────────────────────────
// Auth Context — Demo mode
// signIn() accepts { email, role, name } set by LoginPage after OTP verification.
// Replace with real Supabase calls when ready.
// ─────────────────────────────────────────────────────────────────────────────

const AuthContext = createContext(null)

const SESSION_KEY = 'lexora_demo_session'

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null)
    const [role, setRole] = useState(null)
    const [loading, setLoading] = useState(true)

    // Rehydrate session from localStorage on page refresh
    useEffect(() => {
        try {
            const stored = localStorage.getItem(SESSION_KEY)
            if (stored) {
                const { user: u, role: r } = JSON.parse(stored)
                setUser(u)
                setRole(r)
            }
        } catch (_) { }
        setLoading(false)
    }, [])

    /**
     * Demo signIn — called by LoginPage after OTP is accepted.
     * @param {{ email: string, role: 'customer'|'admin', name: string }} creds
     * Replace body with: supabase.auth.verifyOtp(...)
     */
    const signIn = async ({ email, role: r, name }) => {
        const u = { id: 'demo-user-001', email, name }
        setUser(u)
        setRole(r)
        // Persist until explicit sign-out (localStorage survives tab/browser close)
        localStorage.setItem(SESSION_KEY, JSON.stringify({ user: u, role: r }))
    }

    /**
     * Sign out — clears state and session.
     * Replace with: supabase.auth.signOut()
     */
    const signOut = async () => {
        setUser(null)
        setRole(null)
        localStorage.removeItem(SESSION_KEY)
    }

    return (
        <AuthContext.Provider value={{ user, role, loading, signIn, signOut }}>
            {children}
        </AuthContext.Provider>
    )
}

export const useAuth = () => {
    const ctx = useContext(AuthContext)
    if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>')
    return ctx
}
