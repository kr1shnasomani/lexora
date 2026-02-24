import { useState, useEffect, useRef } from 'react'
import { useLocation } from 'react-router-dom'
import ChatAssistant from './ChatAssistant'

export default function AdminGlobalOverlay() {
    const location = useLocation()
    const isAdminRoute = location.pathname.startsWith('/admin')

    if (!isAdminRoute) return null

    return (
        <div className="pointer-events-none fixed inset-0 z-[100]">
            {/* The ChatAssistant handles its own pointer-events (auto) internally */}
            <ChatAssistant />
        </div>
    )
}
