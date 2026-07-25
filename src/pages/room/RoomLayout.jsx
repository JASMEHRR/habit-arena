import { NavLink, Outlet, Link, useNavigate } from 'react-router-dom'
import {
  LayoutGrid, Trophy, MessageSquare, BarChart3, Settings, LogOut, Trash2,
  Users, Copy, Check, Plus, MoreHorizontal, Sun, Moon, Monitor,
} from 'lucide-react'
import { useState } from 'react'
import { RoomProvider, useRoom } from './RoomProvider.jsx'
import { planeOn } from '../../components/HabitRoster.jsx'
import JoinRoom from './JoinRoom.jsx'
import { Avatar, Button, EmptyState, Loading } from '../../components/ui/Primitives.jsx'
import { Menu, MenuItem, MenuSeparator } from '../../components/ui/Menu.jsx'
import { useTheme } from '../../hooks.js'
import { useToast } from '../../components/ui/Toast.jsx'

export default function RoomLayout() {
  return (
    <RoomProvider>
      <RoomChrome />
    </RoomProvider>
  )
}

// Four primary destinations, and that is the whole tab bar. Everything
// secondary — invite link, switch room, theme, leave, delete — lives in the
// header menu, because the sidebar this replaces put eight items ahead of the
// habits on a phone.
const TABS = [
  { to: '.', end: true, label: 'Today', Icon: LayoutGrid },
  { to: 'leaderboard', label: 'Board', Icon: Trophy },
  { to: 'chat', label: 'Chat', Icon: MessageSquare },
  { to: 'stats', label: 'Stats', Icon: BarChart3 },
]

function RoomChrome() {
  const { status, loadError, state, me, code } = useRoom()

  if (status === 'loading') {
    return (
      <main className="main main--narrow">
        <Loading label="Opening the room" lines={5} />
      </main>
    )
  }

  // These three used to be identical centred paragraphs. They are different
  // problems and now say so, each with the action that resolves it.
  if (status === 'notfound') {
    return (
      <main className="main main--narrow">
        <EmptyState title="No room with that code">
          The invite link may be mistyped, or this room was deleted by whoever
          created it. Room codes are six characters and never use 0, O, 1 or I.
        </EmptyState>
        <Link className="btn btn--primary" to="/">
          Your rooms
        </Link>
      </main>
    )
  }
  if (status === 'error') {
    return (
      <main className="main main--narrow">
        <EmptyState title="Couldn't load this room">{loadError}</EmptyState>
        <Button variant="primary" onClick={() => window.location.reload()}>
          Try again
        </Button>
      </main>
    )
  }

  if (!me) return <JoinRoom />

  return (
    <div className="shell">
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <Header />
      <Rail missingCount={missingCount(me, state)} />
      <main className="main" id="main">
        <Outlet />
        <footer className="foot">
          Room {code} · {state.players.length}{' '}
          {state.players.length === 1 ? 'player' : 'players'} · updates live
        </footer>
      </main>
      <TabBar missingCount={missingCount(me, state)} />
    </div>
  )
}

function Header() {
  const { code, state, me, myRooms, isOwner, leave, destroy } = useRoom()
  const navigate = useNavigate()
  const toast = useToast()
  const [theme, setTheme] = useTheme()
  const [copied, setCopied] = useState(false)

  const inviteUrl = `${window.location.origin}/room/${code}`

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(inviteUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 1600)
    } catch {
      // Clipboard is blocked on insecure origins and in some in-app browsers.
      // Silently doing nothing was the old behaviour; tell them instead.
      toast.push(`Copy this link manually: ${inviteUrl}`, 'ok')
    }
  }

  return (
    <header className="topbar">
      <Link className="wordmark" to="/">
        <span className="wordmark__mark" aria-hidden="true" />
        <span className="wordmark__text">Habit Arena</span>
      </Link>
      <span className="topbar__ref">{code}</span>

      <div className="push row row--tight">
        <span className="roster-strip" aria-hidden="true">
          {state.players.slice(0, 5).map((p) => (
            <Avatar key={p.id} name={p.display_name} seed={p.avatar} size="sm" />
          ))}
        </span>
        <Menu label="Room menu" align="right" trigger={<MoreHorizontal size={20} />}>
          <MenuItem onClick={copyLink}>
            {copied ? <Check size={16} /> : <Copy size={16} />}
            {copied ? 'Link copied' : 'Copy invite link'}
          </MenuItem>
          <MenuItem as={Link} to="settings">
            <Settings size={16} /> Settings
          </MenuItem>
          <MenuSeparator />
          <p className="caption" style={{ padding: '4px 12px' }}>
            Your rooms
          </p>
          {myRooms.map((r) => (
            <MenuItem
              key={r.roomId}
              current={r.code === code}
              onClick={() => r.code !== code && navigate(`/room/${r.code}`)}
            >
              <Users size={16} />
              {r.name ? `${r.name}'s room` : 'Room'} · {r.code}
            </MenuItem>
          ))}
          <MenuItem as={Link} to="/">
            <Plus size={16} /> Start or join another
          </MenuItem>
          <MenuSeparator />
          <p className="caption" style={{ padding: '4px 12px' }}>
            Appearance
          </p>
          <MenuItem current={theme === 'light'} onClick={() => setTheme('light')}>
            <Sun size={16} /> Paper
          </MenuItem>
          <MenuItem current={theme === 'dark'} onClick={() => setTheme('dark')}>
            <Moon size={16} /> Night
          </MenuItem>
          <MenuItem current={theme === 'system'} onClick={() => setTheme('system')}>
            <Monitor size={16} /> Match system
          </MenuItem>
          <MenuSeparator />
          <MenuItem
            danger
            onClick={() => {
              if (
                window.confirm(
                  'Leave this room? Your habits and history in it will be deleted.'
                )
              )
                leave()
            }}
          >
            <LogOut size={16} /> Leave room
          </MenuItem>
          {isOwner && (
            <MenuItem
              danger
              onClick={() => {
                if (
                  window.confirm(
                    "Delete this room for everyone? All members' habits and history will be permanently deleted."
                  )
                )
                  destroy()
              }}
            >
              <Trash2 size={16} /> Delete room
            </MenuItem>
          )}
        </Menu>
        <Link to="settings" aria-label={`Your account — ${me.display_name}`}>
          <Avatar name={me.display_name} seed={me.avatar} />
        </Link>
      </div>
    </header>
  )
}

function tabClass({ isActive }) {
  return 'tab'
}

// Count of planes still missing today, not the total habit count — a fixed
// habit total sitting in the notification-badge position read as an unread
// count. This is the one number worth surfacing there: it is true, and it's
// exactly what the direction is about.
function missingCount(me, state) {
  return me.habits.filter((h) => !planeOn(h, state.entriesByHabit, state.date)).length
}

function TabBar({ missingCount }) {
  return (
    <nav className="tabbar" aria-label="Room sections">
      {TABS.map(({ to, end, label, Icon }) => (
        <NavLink key={label} to={to} end={end} className={tabClass}>
          {({ isActive }) => (
            <>
              <Icon size={20} aria-hidden="true" />
              <span>{label}</span>
              {label === 'Today' && missingCount > 0 && (
                <>
                  <span className="tab__badge" aria-hidden="true">
                    {missingCount}
                  </span>
                  <span className="sr-only">
                    , {missingCount} {missingCount === 1 ? 'plane' : 'planes'} missing today
                  </span>
                </>
              )}
              {/* aria-current is what NavLink sets; the .active class alone told
                  assistive tech nothing in the old sidebar. */}
              {isActive && <span className="sr-only">(current)</span>}
            </>
          )}
        </NavLink>
      ))}
    </nav>
  )
}

function Rail({ missingCount }) {
  return (
    <nav className="rail" aria-label="Room sections">
      {TABS.map(({ to, end, label, Icon }) => (
        <NavLink key={label} to={to} end={end} className="tab">
          <Icon size={18} aria-hidden="true" />
          <span>{label}</span>
          {label === 'Today' && missingCount > 0 && <span className="tab__badge">{missingCount}</span>}
        </NavLink>
      ))}
      <div className="rail__group">
        <NavLink to="settings" className="tab">
          <Settings size={18} aria-hidden="true" />
          <span>Settings</span>
        </NavLink>
      </div>
    </nav>
  )
}
