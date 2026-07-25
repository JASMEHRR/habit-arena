import { useRoom } from './RoomProvider.jsx'
import ChatPanel from '../../components/ChatPanel.jsx'

export default function ChatView() {
  const { state, me } = useRoom()

  return (
    <>
      <div className="page-head">
        <p className="caption">{state.players.length} in the room</p>
        <h1 className="page-head__title">Chat</h1>
      </div>
      <ChatPanel room={state.room} players={state.players} me={me} />
    </>
  )
}
