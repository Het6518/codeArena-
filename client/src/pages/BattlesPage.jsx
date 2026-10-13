import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Button, Spinner } from '../components/ui';
import { Plus, LogIn, Copy, Check, Users, Zap, LogOut } from 'lucide-react';
import { getSocket, emitWithAck } from '../services/socket';
import { useAuthStore } from '../store/useAuthStore';

const DIFFICULTY_LABELS = { RANDOM: 'Random', EASY: 'Easy', MEDIUM: 'Medium', HARD: 'Hard' };

function DifficultyPicker({ value, onChange, disabled }) {
  return (
    <div className="segmented" role="group" aria-label="Problem difficulty">
      {Object.entries(DIFFICULTY_LABELS).map(([key, label]) => (
        <button key={key} type="button" aria-pressed={value === key} disabled={disabled} onClick={() => onChange(key)}>
          {label}
        </button>
      ))}
    </div>
  );
}

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
  const [createDifficulty, setCreateDifficulty] = useState('RANDOM');
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
    runAction('create', 'create-room', { difficulty: createDifficulty }, (response) => applyRoom(response.room));
  };

  const handleSetDifficulty = (difficulty) => {
    if (!room || (room.difficulty || 'RANDOM') === difficulty) return;
    runAction('difficulty', 'set-difficulty', { roomCode: room.roomCode, difficulty }, (response) =>
      applyRoom(response.room)
    );
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

  // Seat the current player on the left face, the opponent (or an empty seat) on the right.
  const seats = room
    ? [
        room.players.find((player) => player.id === user?.id),
        room.players.find((player) => player.id !== user?.id) || null,
      ]
    : [];

  return (
    <div className="page-view animate-fade-in">
      <header className="page-header">
        <div>
          <h1 className="page-title">Battles</h1>
          <p className="page-subtitle">
            Private 1v1 rooms. Both players get the same random problem, and the first accepted submission wins.
          </p>
        </div>
      </header>

      {error && (
        <p className="notice" role="alert">
          {error}
        </p>
      )}

      {!room ? (
        <div className="lobby-grid">
          <section className="panel lobby-card" aria-labelledby="host-title">
            <span className="eyebrow">Host</span>
            <h2 id="host-title">Open a room</h2>
            <p>You get a six-character code to send to your opponent. The problem is drawn when both of you are ready.</p>
            <DifficultyPicker value={createDifficulty} onChange={setCreateDifficulty} disabled={Boolean(pendingAction)} />
            <Button variant="primary" size="large" onClick={handleCreateRoom} disabled={Boolean(pendingAction)}>
              {pendingAction === 'create' ? <Spinner label="Creating room" /> : <Plus size={18} />}
              Create room
            </Button>
          </section>

          <section className="panel lobby-card" aria-labelledby="join-title">
            <span className="eyebrow">Challenger</span>
            <h2 id="join-title">Join with a code</h2>
            <p>Enter the code your opponent sent you.</p>
            <form onSubmit={handleJoinRoom} className="join-row">
              <input
                className="code-input"
                type="text"
                inputMode="text"
                autoComplete="off"
                spellCheck={false}
                maxLength={6}
                placeholder="K7Q2MX"
                aria-label="Room code"
                value={joinCodeInput}
                onChange={(e) => setJoinCodeInput(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))}
              />
              <Button type="submit" variant="secondary" disabled={Boolean(pendingAction) || joinCodeInput.length !== 6}>
                {pendingAction === 'join' ? <Spinner label="Joining" /> : <LogIn size={16} />}
                Join
              </Button>
            </form>
          </section>
        </div>
      ) : (
        <section className="panel" aria-labelledby="room-title">
          <div className="panel-body" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div className="room-header">
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <span className="eyebrow" id="room-title">
                  Room code
                </span>
                <span className="room-code">{room.roomCode}</span>
              </div>
              <div className="header-actions">
                <Button variant="secondary" size="small" onClick={handleCopyCode}>
                  {copied ? <Check size={14} /> : <Copy size={14} />}
                  {copied ? 'Copied' : 'Copy code'}
                </Button>
                <Button
                  variant="ghost"
                  size="small"
                  className="button-danger"
                  onClick={handleLeaveRoom}
                  disabled={Boolean(pendingAction)}
                >
                  <LogOut size={14} /> Leave
                </Button>
              </div>
            </div>

            <div className="room-settings">
              <div className="room-setting">
                <span className="eyebrow">Difficulty</span>
                {currentPlayer?.isHost ? (
                  <DifficultyPicker
                    value={room.difficulty || 'RANDOM'}
                    onChange={handleSetDifficulty}
                    disabled={Boolean(pendingAction)}
                  />
                ) : (
                  <span className="room-setting-value">
                    {DIFFICULTY_LABELS[room.difficulty || 'RANDOM']}
                    <span className="muted"> · set by the host</span>
                  </span>
                )}
              </div>
              <div className="room-setting">
                <span className="eyebrow">Time limit</span>
                <span className="room-setting-value mono">{Math.round((room.durationMs || 1800000) / 60000)}:00</span>
              </div>
            </div>

            <div className="clock" aria-label="Players">
              {seats.map((player, index) =>
                player ? (
                  <div key={player.id} className={`clock-face${player.ready ? ' is-ready' : ''}`}>
                    <div className="clock-face-top">
                      <span className="clock-face-role">
                        {player.id === user?.id ? 'You' : 'Opponent'}
                        {player.isHost ? ' · host' : ''}
                      </span>
                      {player.online === false && <span className="status-indicator offline">OFFLINE</span>}
                    </div>
                    <span className="clock-face-name">{player.username}</span>
                    <span className="clock-face-meta">{player.rating} rating</span>
                    <span className="clock-face-state">{player.ready ? 'READY' : 'NOT READY'}</span>
                  </div>
                ) : (
                  <div key={`empty-${index}`} className="clock-face is-empty">
                    <Users size={22} />
                    <span>Waiting for an opponent</span>
                    <span className="mono">Share {room.roomCode}</span>
                  </div>
                )
              )}
            </div>

            <div className="room-actions">
              <span className="muted">
                {!isFull
                  ? 'The battle starts once your opponent joins and both of you are ready.'
                  : currentPlayer?.ready
                    ? 'Waiting for your opponent to ready up.'
                    : 'Both players are here. Ready up to start.'}
              </span>
              <Button
                variant={currentPlayer?.ready ? 'secondary' : 'primary'}
                size="large"
                onClick={handleToggleReady}
                disabled={Boolean(pendingAction)}
              >
                {pendingAction === 'ready' ? <Spinner label="Updating" /> : <Zap size={16} />}
                {currentPlayer?.ready ? 'Cancel ready' : "I'm ready"}
              </Button>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
