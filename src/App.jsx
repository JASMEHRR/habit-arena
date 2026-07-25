import { Component } from 'react'
import { Routes, Route, Navigate, Link, useLocation } from 'react-router-dom'
import Landing from './pages/Landing.jsx'
import Auth from './pages/Auth.jsx'
import ResetPassword from './pages/ResetPassword.jsx'
import RoomLayout from './pages/room/RoomLayout.jsx'
import Today from './pages/room/Today.jsx'
import LeaderboardView from './pages/room/LeaderboardView.jsx'
import ChatView from './pages/room/ChatView.jsx'
import StatsView from './pages/room/StatsView.jsx'
import SettingsView from './pages/room/SettingsView.jsx'
import { useAuth } from './context/AuthContext.jsx'
import { Button, EmptyState, Loading } from './components/ui/Primitives.jsx'

export default function App() {
  const { session, loading } = useAuth()
  const location = useLocation()

  // /reset-password is a real route now, but it still has to sit above the
  // session gate: Supabase's recovery link establishes a session before this
  // renders, so the gate would otherwise send someone mid-reset to the landing
  // page instead of the form.
  if (location.pathname === '/reset-password') {
    return (
      <ErrorBoundary>
        <ResetPassword />
      </ErrorBoundary>
    )
  }

  if (loading) {
    return (
      <main className="main main--narrow">
        <Loading label="Signing you in" lines={4} />
      </main>
    )
  }

  return (
    <ErrorBoundary>
      <Routes>
        {!session ? (
          <>
            {/* Sign-in has URLs now. It had none: Auth was rendered by the gate
                rather than routed, so it could not be linked or recovered. */}
            <Route path="/signin" element={<Auth mode="signin" />} />
            <Route path="/signup" element={<Auth mode="signup" />} />
            <Route path="/forgot" element={<Auth mode="forgot" />} />
            <Route path="*" element={<Auth mode="signin" />} />
          </>
        ) : (
          <>
            <Route path="/" element={<Landing />} />
            <Route path="/signin" element={<Navigate to="/" replace />} />
            <Route path="/signup" element={<Navigate to="/" replace />} />
            {/* Nested, so the room shell persists and each tab is a real URL:
                deep-linkable, shareable, and the phone's back button works. */}
            <Route path="/room/:code" element={<RoomLayout />}>
              <Route index element={<Today />} />
              <Route path="leaderboard" element={<LeaderboardView />} />
              <Route path="chat" element={<ChatView />} />
              <Route path="stats" element={<StatsView />} />
              <Route path="settings" element={<SettingsView />} />
            </Route>
            <Route path="*" element={<NotFound />} />
          </>
        )}
      </Routes>
    </ErrorBoundary>
  )
}

function NotFound() {
  return (
    <main className="main main--narrow">
      <EmptyState title="That page isn't here">
        The link may be mistyped, or the room it pointed at was deleted.
      </EmptyState>
      <Button as="a" variant="primary" onClick={() => (window.location.href = '/')}>
        Back to your rooms
      </Button>
    </main>
  )
}

// A render error used to leave a blank page. It now leaves something a user can
// act on, and keeps the actual error in the console for whoever is debugging.
class ErrorBoundary extends Component {
  state = { error: null }

  static getDerivedStateFromError(error) {
    return { error }
  }

  componentDidCatch(error, info) {
    console.error('Habit Arena crashed:', error, info)
  }

  render() {
    if (!this.state.error) return this.props.children
    return (
      <main className="main main--narrow">
        <EmptyState title="Something broke on this screen">
          The error is logged to the console. Reloading usually clears it — your
          habits and history are stored on the server, so nothing is lost.
        </EmptyState>
        <div className="row">
          <Button variant="primary" onClick={() => window.location.reload()}>
            Reload
          </Button>
          <Link className="btn btn--secondary" to="/" onClick={() => this.setState({ error: null })}>
            Your rooms
          </Link>
        </div>
      </main>
    )
  }
}
