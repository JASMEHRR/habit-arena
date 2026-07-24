import { Routes, Route } from 'react-router-dom'
import Landing from './pages/Landing.jsx'
import Room from './pages/Room.jsx'
import Auth from './pages/Auth.jsx'
import { useAuth } from './context/AuthContext.jsx'

export default function App() {
  const { session, loading } = useAuth()

  if (loading) return <div className="wrap"><div className="card center">Loading…</div></div>
  if (!session) return <Auth />

  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/room/:code" element={<Room />} />
    </Routes>
  )
}
