import { Routes, Route, useLocation } from 'react-router-dom'
import Landing from './pages/Landing.jsx'
import Room from './pages/Room.jsx'
import Auth from './pages/Auth.jsx'
import ResetPassword from './pages/ResetPassword.jsx'
import { useAuth } from './context/AuthContext.jsx'

export default function App() {
  const { session, loading } = useAuth()
  const location = useLocation()

  // Must sit above the session gate: Supabase's recovery link establishes a
  // session before this renders, so the gate below would otherwise send someone
  // mid-reset to the Landing page instead of the form. ResetPassword handles
  // its own loading/invalid-link states.
  if (location.pathname === '/reset-password') return <ResetPassword />

  if (loading) return <div className="wrap"><div className="card center">Loading…</div></div>
  if (!session) return <Auth />

  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/room/:code" element={<Room />} />
    </Routes>
  )
}
