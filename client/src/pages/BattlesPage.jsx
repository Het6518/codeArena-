import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Card, Button, Spinner } from '../components/ui';
import { Swords, Plus, LogIn, Copy, Check, Users, Zap, LogOut } from 'lucide-react';
import { getSocket, emitWithAck } from '../services/socket';
import { useAuthStore } from '../store/useAuthStore';

// Remembers the open lobby so a page refresh reconnects to it.
const LOBBY_KEY = 'codearena_lobby_room';

const readStoredLobby = () => {
  try {
    return sessionStorage.getItem(LOBBY_KEY);
  } catch {
    return null;
  }
};

const storeLobby = (roomCode) => {
  try {
    if (roomCode) sessionStorage.setItem(LOBBY_KEY, roomCode);
    else sessionStorage.removeItem(LOBBY_KEY);
  } catch {
    // Storage unavailable; refresh recovery is a convenience only.
  }
};

export function BattlesPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const user = useAuthStore((state) => state.user);

  const [room, setRoom] = useState(null);
  const [joinCodeInput, setJoinCodeInput] = useState('');
  const [pendingAction, setPendingAction] = useState(null);
  const [error, setError] = useState(null);
  const [copied, setCopied] = useState(false);
  const roomCodeRef = useRef(null);

  const applyRoom = useCallback(
    (nextRoom) => {
      if (!nextRoom) return;
      if (nextRoom.status === 'IN_PROGRESS' || nextRoom.status === 'FINISHED') {
        storeLobby(null);
        navigate(`/battles/${nextRoom.roomCode}`);
        return;
      }
      roomCodeRef.current = nextRoom.roomCode;
      storeLobby(nextRoom.roomCode);
      setRoom(nextRoom);
    },
    [navigate]
  );

  useEffect(() => {
    const socket = getSocket();
    const rejoinCode = location.state?.roomCode || readStoredLobby();

    function handleRoomUpdate(data) {
      // Ignore updates for a lobby this page is no longer showing.
      if (data?.success && data?.room && data.room.roomCode === roomCodeRef.current) {
        applyRoom(data.room);
      }
    }

    function handleBattleStart(data) {
      if (data?.success && data?.room) {
        applyRoom(data.room);
      }
    }

    function handleConnectError(connectError) {
      setError(connectError.message || 'Could not connect to the battle server');
    }

    function handleConnect() {
      setError(null);
      if (!rejoinCode) return;
      emitWithAck('join-room', { roomCode: rejoinCode })
        .then((response) => applyRoom(response.room))
        .catch(() => storeLobby(null));
    }

    function handlePresence(data) {
      setRoom((current) =>
        current
          ? {
              ...current,
              players: current.players.map((player) =>
                player.id === data?.userId ? { ...player, online: data.online } : player
              ),
            }
          : current
      );
    }

    socket.on('player-presence', handlePresence);
    socket.on('room-update', handleRoomUpdate);
    socket.on('battle-start', handleBattleStart);
    socket.on('connect_error', handleConnectError);
    socket.on('connect', handleConnect);

    if (socket.connected) {
      handleConnect();
    } else {
      socket.connect();
    }

    return () => {
      socket.off('player-presence', handlePresence);
      socket.off('room-update', handleRoomUpdate);
      socket.off('battle-start', handleBattleStart);
      socket.off('connect_error', handleConnectError);
      socket.off('connect', handleConnect);
    };
  }, [applyRoom, location.state]);

  const runAction = async (actionName, eventName, payload, onSuccess) => {
    if (pendingAction) return;
    setPendingAction(actionName);
    setError(null);

    try {
      const response = await emitWithAck(eventName, payload);
      onSuccess?.(response);
    } catch (actionError) {
      setError(actionError.message);
    } finally {
      setPendingAction(null);
    }
  };

  const handleCreateRoom = () => {
    runAction('create', 'create-room', {}, (response) => applyRoom(response.room));
  };

  const handleJoinRoom = (e) => {
    e.preventDefault();
    const code = joinCodeInput.trim().toUpperCase();
    if (!/^[A-Z0-9]{6}$/.test(code)) {
      setError('Room codes are exactly 6 letters or digits.');
      return;
    }
    runAction('join', 'join-room', { roomCode: code }, (response) => applyRoom(response.room));
  };

  const handleToggleReady = () => {
    if (!room) return;
    const isCurrentlyReady = room.players.find((p) => p.id === user?.id)?.ready;
    runAction('ready', isCurrentlyReady ? 'player-unready' : 'player-ready', { roomCode: room.roomCode }, (response) =>
      applyRoom(response.room)
    );
  };

  const handleLeaveRoom = () => {
    if (!room) return;
    runAction('leave', 'leave-room', { roomCode: room.roomCode }, () => {
      roomCodeRef.current = null;
      storeLobby(null);
      setRoom(null);
    });
  };

  const handleCopyCode = async () => {
    if (!room?.roomCode) return;
    try {
      await navigator.clipboard.writeText(room.roomCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setError('Could not copy to the clipboard. Select the code and copy it manually.');
    }
  };

  const currentPlayer = room?.players?.find((p) => p.id === user?.id);
  const isFull = (room?.players?.length || 0) >= 2;

  return (
    <div className="page-view animate-fade-in">
      <header className="page-header">
        <div>
          <h1 className="page-title">Battles</h1>
          <p className="page-subtitle">Create a private 1v1 room or join one with a room code.</p>
        </div>
      </header>

      {error && (
        <Card style={{ borderLeft: '4px solid var(--color-danger)', marginBottom: '16px' }}>
          <p style={{ color: 'var(--color-danger)' }} role="alert">
            {error}
          </p>
        </Card>
      )}

      {!room ? (
        <div className="dashboard-content-grid">
          <Card className="content-card">
            <div className="card-title-row">
              <h2>Host a Battle Room</h2>
              <span className="live-pill">1v1</span>
            </div>
            <p className="problem-desc">
              Get a 6-character room code to share with your opponent. A random problem is chosen when both players are ready.
            </p>
            <div className="card-footer-action">
              <Button variant="primary" onClick={handleCreateRoom} disabled={Boolean(pendingAction)}>
                {pendingAction === 'create' ? <Spinner size="small" /> : <Plus size={16} />}
                <span>Create Room</span>
              </Button>
            </div>
          </Card>

          <Card className="content-card">
            <div className="card-title-row">
              <h2>Join Existing Room</h2>
            </div>
            <p className="problem-desc">Enter the 6-character code you received.</p>
            <form onSubmit={handleJoinRoom} style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
              <input
                type="text"
                maxLength={6}
                placeholder="e.g. AB12CD"
                aria-label="Room code"
                value={joinCodeInput}
                onChange={(e) => setJoinCodeInput(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))}
                style={{
                  flex: 1,
                  minWidth: 0,
                  padding: '8px 12px',
                  borderRadius: '8px',
                  border: '1px solid var(--color-border)',
                  background: 'var(--color-bg)',
                  color: 'var(--color-text)',
                  textTransform: 'uppercase',
                  fontFamily: 'monospace',
                  letterSpacing: '0.1em',
                  fontWeight: 700,
                }}
              />
              <Button type="submit" variant="secondary" disabled={Boolean(pendingAction) || joinCodeInput.length !== 6}>
                {pendingAction === 'join' ? <Spinner size="small" /> : <LogIn size={16} />}
                <span>Join</span>
              </Button>
            </form>
          </Card>
        </div>
      ) : (
        <div className="dashboard-content-grid">
          <Card className="content-card" style={{ gridColumn: '1 / -1' }}>
            <div className="card-title-row" style={{ flexWrap: 'wrap', gap: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <Swords size={24} style={{ color: 'var(--color-accent)' }} />
                <div>
                  <h2 style={{ fontSize: '20px' }}>Room {room.roomCode}</h2>
                  <p className="problem-desc">
                    {isFull ? 'Both players are here. Ready up to start.' : 'Waiting for an opponent to join...'}
                  </p>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <Button variant="secondary" size="small" onClick={handleCopyCode}>
                  {copied ? <Check size={14} /> : <Copy size={14} />}
                  <span>{copied ? 'Copied' : 'Copy Code'}</span>
                </Button>

                <Button
                  variant="secondary"
                  size="small"
                  onClick={handleLeaveRoom}
                  disabled={Boolean(pendingAction)}
                  style={{ color: 'var(--color-danger)' }}
                >
                  <LogOut size={14} />
                  <span>Leave</span>
                </Button>
              </div>
            </div>

            <div className="user-menu-divider" style={{ margin: '16px 0' }} />

            <h3>Players ({room.players?.length || 0} / 2)</h3>
            <div className="stats-grid" style={{ marginTop: '12px' }}>
              {room.players?.map((player) => (
                <Card
                  key={player.id}
                  className="stat-card"
                  style={{ border: player.id === user?.id ? '1px solid var(--color-accent)' : undefined }}
                >
                  <div className="stat-icon-wrap accent-blue">
                    <Users size={20} />
                  </div>
                  <div className="stat-info">
                    <span className="stat-label">
                      {player.isHost ? 'Host' : 'Challenger'} · {player.rating} rating
                      {player.online === false ? ' · offline' : ''}
                    </span>
                    <span className="stat-value">
                      {player.username}
                      {player.id === user?.id ? ' (you)' : ''}
                    </span>
                  </div>
                  <span className={`status-indicator ${player.ready ? 'solved' : ''}`}>{player.ready ? 'READY' : 'NOT READY'}</span>
                </Card>
              ))}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '12px', marginTop: '20px' }}>
              {currentPlayer?.ready && !isFull && <span className="problem-desc">The battle starts once your opponent joins and is ready.</span>}
              <Button
                variant={currentPlayer?.ready ? 'secondary' : 'primary'}
                onClick={handleToggleReady}
                disabled={Boolean(pendingAction)}
              >
                {pendingAction === 'ready' ? <Spinner size="small" /> : <Zap size={16} />}
                <span>{currentPlayer?.ready ? 'Cancel Ready' : 'I Am Ready'}</span>
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
