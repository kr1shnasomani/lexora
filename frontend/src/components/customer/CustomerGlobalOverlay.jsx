import { useLocation } from 'react-router-dom'
import CustomerAssistant from './CustomerAssistant'

export default function CustomerGlobalOverlay() {
    const location = useLocation()
    const isCustomerRoute = location.pathname.startsWith('/customer')

    if (!isCustomerRoute) return null

    return (
        <div className="pointer-events-none fixed inset-0 z-[100]">
            <CustomerAssistant />
        </div>
    )
}
