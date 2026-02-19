import { createContext, useContext, useState } from 'react'

// ─────────────────────────────────────────────────────────────────────────────
// PLACEHOLDER — Auth Context
// Currently returns a passthrough (always "authenticated").
// Replace the TODO sections with real Supabase calls when ready.
// ─────────────────────────────────────────────────────────────────────────────

const AuthContext = createContext(null)

export const AuthProvider = ({ children }) => {
    // TODO: Replace with supabase.auth.getUser() on mount
    const [user, setUser] = useState(null)
    // 'admin' | 'customer' | null — set from Supabase user metadata/role
    const [role, setRole] = useState(null)
    const [loading, setLoading] = useState(false)

    // TODO: Replace with supabase.auth.signInWithPassword(...)
    const signIn = async ({ email, password }) => {
        console.log('[Auth] signIn placeholder — wire Supabase here')
        // On success: setUser(data.user), setRole(data.user.user_metadata.role)
    }

    // TODO: Replace with supabase.auth.signOut()
    const signOut = async () => {
        console.log('[Auth] signOut placeholder — wire Supabase here')
        setUser(null)
        setRole(null)
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
