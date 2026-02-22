import { Navigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'

/**
 * Blocks unauthenticated users and wrong-role users.
 * @param {string} [requiredRole] - 'admin' | 'customer' | undefined (any authenticated user)
 *
 * Swap-in notes for Supabase:
 *  - `loading` will be true while supabase.auth.getUser() is in flight → shows spinner
 *  - `user` will be the Supabase User object
 *  - `role` will come from user.user_metadata.role
 */
const ProtectedRoute = ({ children, requiredRole }) => {
    const { user, role, loading } = useAuth()

    if (loading) {
        return (
            <div className="min-h-screen bg-[#0A0A0C] flex items-center justify-center">
                <span className="material-symbols-outlined text-[#E83049] text-5xl animate-spin">progress_activity</span>
            </div>
        )
    }

    if (!user) return <Navigate to="/login" replace />
    if (requiredRole && role !== requiredRole) return <Navigate to="/login" replace />

    return children
}

export default ProtectedRoute
