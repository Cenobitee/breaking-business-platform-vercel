import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from './AuthContext'

export function ProtectedRoute({ roles }) {
  const { user, loading } = useAuth()
  const location = useLocation()

  if (loading) return <main className="page-container">Loading secure session…</main>
  if (!user) return <Navigate to="/login" replace state={{ from: location }} />
  if (!roles.includes(user.role)) return <Navigate to="/" replace />
  return <Outlet />
}
