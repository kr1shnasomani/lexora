# Lexora — Frontend Reference

## Auth Model
- **No real auth**. Mock only via `frontend/src/contexts/AuthContext.jsx`.
- Hook: `const { user, role, logout } = useAuth()` — available everywhere via Context.
- Session stored in `sessionStorage`. Cleared on tab close.
- `user.email` used to scope customer API calls.
- Demo accounts:
  - `admin@lexora.com` → admin portal (`/admin/*`)
  - `johndoe@example.com` → customer portal (has demo data)
  - `customer@demo.com` → customer portal (empty state)
- OTP: any 6 digits accepted.

## Routes (`App.jsx`)
- `/` → `LoginPage`
- `/select` → `ModeSelectionPage`
- `/admin/*` → protected, role=admin
- `/customer/*` → protected, role=customer

## Admin Pages → API Endpoints

| Page | File | API Calls |
|---|---|---|
| Dashboard | `pages/admin/DashboardPage.jsx` | `GET /api/dashboard/summary` (polls 30s) |
| Claims Queue | `pages/admin/ClaimsQueuePage.jsx` | `GET /api/claims?page=&status=&risk_band=` |
| Analytics | `pages/admin/AnalyticsPage.jsx` | `GET /api/analytics/summary` (polls 60s) |
| Network Graph | `pages/admin/NetworkGraphPage.jsx` | `GET /api/network/graph` |
| Threat Feed | `pages/admin/ThreatFeedPage.jsx` | `GET /api/dashboard/summary` (threat_alerts slice) |
| Audit Log | `pages/admin/AuditLogPage.jsx` | `GET /api/claims/{id}/audit` |
| Config | `pages/admin/ConfigPage.jsx` | `GET /api/config`, `PUT /api/config/{key}` |

## Customer Pages → API Endpoints

| Page | File | API Calls |
|---|---|---|
| Home | `pages/customer/HomePage.jsx` | `GET /api/customer/dashboard-stats`, `/api/customer/policies?page_size=2`, `/api/customer/claims?page_size=3` |
| Policies | `pages/customer/PoliciesPage.jsx` | `GET /api/customer/policies?status=&page=` |
| Policy Detail | `pages/customer/PolicyDetailPage.jsx` | `GET /api/customer/policies/{id}?email=` |
| Claims | `pages/customer/ClaimsPage.jsx` | `GET /api/customer/claims?email=` |
| Claim Status | `pages/customer/ClaimStatus.jsx` | `GET /api/customer/claims/{id}` |
| File Claim | `pages/customer/FileClaimPage.jsx` | `POST /api/claims` |
| Chat | `pages/customer/ChatPage.jsx` | `POST /api/chat/customer/message` |
| Notifications | `pages/customer/NotificationsPage.jsx` | `GET /api/notifications`, `GET/PUT /api/notifications/prefs` |
| Profile | `pages/customer/ProfilePage.jsx` | `GET /api/user/profile` |
| Renewal | `pages/customer/RenewalPage.jsx` | `GET /api/customer/policies?email=` |

## Shared Components
| Component | Location | Purpose |
|---|---|---|
| `ProtectedRoute` | `components/shared/ProtectedRoute.jsx` | Reads AuthContext, redirects if wrong role |
| `ErrorToast` | `components/shared/ErrorToast.jsx` | Global error notification |
| `Skeleton`, `SkeletonCard`, `SkeletonList` | `components/shared/Skeleton.jsx` | Loading placeholders |
| `useFetch(url)` | `hooks/useFetch.js` | Generic GET hook — returns `{ data, loading, error }`. Pass `null` to skip. |

## AI Chat Components
| Component | Used by | Endpoint |
|---|---|---|
| `ChatAssistant.jsx` | Admin portal (FAB) | `POST /api/chat/message` |
| `CustomerAssistant.jsx` | Customer portal (FAB) | `POST /api/chat/customer/message` |

Both use `${import.meta.env.VITE_API_URL || 'http://localhost:8000'}/api/chat/...`

## Design Tokens (from `frontend/src/index.css`)
```css
/* @theme block — Tailwind v4 custom properties */
--background-dark:   #0a0a0f   /* page bg */
--surface-dark:      #111118   /* card/panel */
--border-dark:       #1e1e2e   /* borders */
--brand-purple:      #7c3aed   /* primary accent */
--brand-purple-light:#a855f7
--text-primary:      #f1f5f9
--text-secondary:    #94a3b8
--text-muted:        #475569
```
Use Tailwind utility classes like `bg-background-dark`, `text-brand-purple`, etc.

## Frontend Rules
- **No hardcoded data** — all numbers come from API endpoints.
- Dynamic totals: use `.reduce()` on API response arrays, never static values.
- All customer endpoints require `?email=${encodeURIComponent(user.email)}` scoping.
- Policy detail navigation: `useSearchParams()` to read `?id=`.
