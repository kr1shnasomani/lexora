import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom'
import { useEffect } from 'react'
import { AuthProvider } from './contexts/AuthContext'
import ProtectedRoute from './components/shared/ProtectedRoute'

// Shared
import ModeSelectionPage from './pages/ModeSelectionPage'
import LoginPage from './pages/LoginPage'

// Admin pages
import DashboardPage from './pages/admin/DashboardPage'
import ClaimsQueuePage from './pages/admin/ClaimsQueuePage'
import ThreatFeedPage from './pages/admin/ThreatFeedPage'
import AuditLogPage from './pages/admin/AuditLogPage'
import AnalyticsPage from './pages/admin/AnalyticsPage'
import NetworkGraphPage from './pages/admin/NetworkGraphPage'
import ConfigPage from './pages/admin/ConfigPage'
import AdminGlobalOverlay from './components/admin/AdminGlobalOverlay'
import CustomerGlobalOverlay from './components/customer/CustomerGlobalOverlay'

// Customer pages
import HomePage from './pages/customer/HomePage'
import PoliciesPage from './pages/customer/PoliciesPage'
import ClaimsPage from './pages/customer/ClaimsPage'
import ClaimStatus from './pages/customer/ClaimStatus'
import ExplorePage from './pages/customer/ExplorePage'
import PolicyDetailPage from './pages/customer/PolicyDetailPage'
import DocsPage from './pages/customer/DocsPage'
import ProfilePage from './pages/customer/ProfilePage'
import NotificationsPage from './pages/customer/NotificationsPage'
import SecurityPage from './pages/customer/SecurityPage'
import ChatPage from './pages/customer/ChatPage'
import RenewalPage from './pages/customer/RenewalPage'
import FileClaimPage from './pages/customer/FileClaimPage'

function ForceRedirect() {
    const navigate = useNavigate()

    useEffect(() => {
        // Only run this check once when the app first loads in the browser tab
        if (!sessionStorage.getItem('has_loaded_once')) {
            sessionStorage.setItem('has_loaded_once', 'true')

            // If the user lands on any path other than root during a fresh load, send them back
            if (window.location.pathname !== '/') {
                navigate('/', { replace: true })
            }
        }
    }, [navigate])

    return null
}

export default function App() {
    return (
        <AuthProvider>
            <BrowserRouter>
                <ForceRedirect />
                <AdminGlobalOverlay />
                <CustomerGlobalOverlay />
                <Routes>
                    {/* ─── Landing ─────────────────────────────────── */}
                    <Route path="/" element={<ModeSelectionPage />} />
                    <Route path="/login" element={<LoginPage />} />

                    {/* ─── Admin portal (/admin/*) ─────────────────── */}
                    <Route path="/admin/dashboard" element={<ProtectedRoute requiredRole="admin"><DashboardPage /></ProtectedRoute>} />
                    <Route path="/admin/claims" element={<ProtectedRoute requiredRole="admin"><ClaimsQueuePage /></ProtectedRoute>} />
                    <Route path="/admin/threat-feed" element={<ProtectedRoute requiredRole="admin"><ThreatFeedPage /></ProtectedRoute>} />
                    <Route path="/admin/audit" element={<ProtectedRoute requiredRole="admin"><AuditLogPage /></ProtectedRoute>} />
                    <Route path="/admin/analytics" element={<ProtectedRoute requiredRole="admin"><AnalyticsPage /></ProtectedRoute>} />
                    <Route path="/admin/network" element={<ProtectedRoute requiredRole="admin"><NetworkGraphPage /></ProtectedRoute>} />
                    <Route path="/admin/config" element={<ProtectedRoute requiredRole="admin"><ConfigPage /></ProtectedRoute>} />
                    {/* Redirect bare /admin → /admin/dashboard */}
                    <Route path="/admin" element={<Navigate to="/admin/dashboard" replace />} />

                    {/* ─── Customer portal (/customer/*) ──────────── */}
                    <Route path="/customer" element={<ProtectedRoute requiredRole="customer"><HomePage /></ProtectedRoute>} />
                    <Route path="/customer/policies" element={<ProtectedRoute requiredRole="customer"><PoliciesPage /></ProtectedRoute>} />
                    <Route path="/customer/claims" element={<ProtectedRoute requiredRole="customer"><ClaimsPage /></ProtectedRoute>} />
                    <Route path="/customer/claim-status" element={<ProtectedRoute requiredRole="customer"><ClaimStatus /></ProtectedRoute>} />
                    <Route path="/customer/explore" element={<ProtectedRoute requiredRole="customer"><ExplorePage /></ProtectedRoute>} />
                    <Route path="/customer/policy-detail" element={<ProtectedRoute requiredRole="customer"><PolicyDetailPage /></ProtectedRoute>} />
                    <Route path="/customer/docs" element={<ProtectedRoute requiredRole="customer"><DocsPage /></ProtectedRoute>} />
                    <Route path="/customer/profile" element={<ProtectedRoute requiredRole="customer"><ProfilePage /></ProtectedRoute>} />
                    <Route path="/customer/notifications" element={<ProtectedRoute requiredRole="customer"><NotificationsPage /></ProtectedRoute>} />
                    <Route path="/customer/security" element={<ProtectedRoute requiredRole="customer"><SecurityPage /></ProtectedRoute>} />
                    <Route path="/customer/chat" element={<ProtectedRoute requiredRole="customer"><ChatPage /></ProtectedRoute>} />
                    <Route path="/customer/renewal" element={<ProtectedRoute requiredRole="customer"><RenewalPage /></ProtectedRoute>} />
                    <Route path="/customer/file-claim" element={<ProtectedRoute requiredRole="customer"><FileClaimPage /></ProtectedRoute>} />

                    {/* ─── Catch-all ───────────────────────────────── */}
                    <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
            </BrowserRouter>
        </AuthProvider>
    )
}
