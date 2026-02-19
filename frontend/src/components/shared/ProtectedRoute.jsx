// ─────────────────────────────────────────────────────────────────────────────
// PLACEHOLDER — Protected Route
// Currently always renders children (no auth check).
// Uncomment the redirect logic once Supabase auth is wired up.
// ─────────────────────────────────────────────────────────────────────────────
import { Navigate } from 'react-router-dom'
// import { useAuth } from '../../contexts/AuthContext'

/**
 * @param {string} [requiredRole] - 'admin' | 'customer' | undefined (any auth)
 */
const ProtectedRoute = ({ children, requiredRole }) => {
    // TODO: Uncomment once AuthContext is wired to Supabase
    // const { user, role, loading } = useAuth()
    // if (loading) return <div className="min-h-screen bg-background-dark flex items-center justify-center text-white">Loading...</div>
    // if (!user) return <Navigate to="/" replace />
    // if (requiredRole && role !== requiredRole) return <Navigate to="/" replace />

    return children
}

export default ProtectedRoute
