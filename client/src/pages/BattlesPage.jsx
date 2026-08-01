import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, Button, Spinner } from '../components/ui';
import { Swords, Plus, LogIn, Copy, Check, Users, Shield, Zap, LogOut } from 'lucide-react';
import { getSocket } from '../services/socket';
import { useAuthStore } from '../store/useAuthStore';

export function BattlesPage() {
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const [socket, setSocket] = useState(null);
  
  const [room, setRoom] = useState(null);
  const [joinCodeInput, setJoinCodeInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const activeSocket = getSocket();
    setSocket(activeSocket);

    if (!activeSocket.connected) {
      activeSocket.connect();
    }

    function handleRoomUpdate(data) {
      if (data?.success && data?.room) {
        setRoom(data.room);
        setLoading(false);
        if (data.room.status === 'IN_PROGRESS') {
          navigate(`/battles/${data.room.roomCode}`);
        }
      }
    }

    function handleBattleStart(data) {
      if (data?.success && data?.room) {
        setRoom(data.room);
        navigate(`/battles/${data.room.roomCode}`);
      }
    }

    function handleRoomError(data) {
      setError(data?.message || 'Room error occurred');
      setLoading(false);
    }

    activeSocket.on('room-update', handleRoomUpdate);
    activeSocket.on('battle-start', handleBattleStart);
    activeSocket.on('room-error', handleRoomError);

    return () => {
      activeSocket.off('room-update', handleRoomUpdate);
      activeSocket.off('battle-start', handleBattleStart);
      activeSocket.off('room-error', handleRoomError);
    };
  }, [navigate]);

  const handleCreateRoom = () => {
    if (!socket) return;
    setLoading(true);
    setError(null);

    socket.emit('create-room', (response) => {
      setLoading(false);
      if (response?.success) {
        setRoom(response.room);
      } else {
        setError(response?.message || 'Failed to create room');
      }
    });
  };

  const handleJoinRoom = (e) => {
    e.preventDefault();
    if (!socket || !joinCodeInput.trim()) return;
    setLoading(true);
    setError(null);

    socket.emit('join-room', { roomCode: joinCodeInput.trim().toUpperCase() }, (response) => {
      setLoading(false);
      if (response?.success) {
        setRoom(response.room);
      } else {
        setError(response?.message || 'Failed to join room');
      }
    });
  };

  const handleToggleReady = () => {
    if (!socket || !room) return;
    const isCurrentlyReady = room.players.find((p) => p.id === user?.id)?.ready;

    const eventName = isCurrentlyReady ? 'player-unready' : 'player-ready';
    socket.emit(eventName, { roomCode: room.roomCode });
  };

  const handleLeaveRoom = () => {
    if (!socket || !room) return;
    socket.emit('leave-room', { roomCode: room.roomCode }, () => {
      setRoom(null);
    });
  };

  const handleCopyCode = () => {
    if (!room?.roomCode) return;
    navigator.clipboard.writeText(room.roomCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const currentPlayer = room?.players?.find((p) => p.id === user?.id);

  return (
    <div className="page-view animate-fade-in">
      <header className="page-header">
        <div>
          <h1 className="page-title">Real-Time Battle Arenas</h1>
          <p className="page-subtitle">Create a 1v1 speed-coding room or join a room code to duel live.</p>
        </div>
      </header>

      {error && (
        <Card style={{ borderLeft: '4px solid var(--color-danger)', marginBottom: '16px' }}>
          <p style={{ color: 'var(--color-danger)' }}>{error}</p>
        </Card>
      )}

      {!room ? (
        <div className="dashboard-content-grid">
          {/* Create Room Card */}
          <Card className="content-card">
            <div className="card-title-row">
              <h2>Host a Battle Room</h2>
              <span className="live-pill">1v1 DUEL</span>
            </div>
            <p className="problem-desc">
              Generate a unique 6-character room code and invite any developer to a speed-coding match.
            </p>
            <div className="card-footer-action">
              <Button variant="primary" onClick={handleCreateRoom} disabled={loading}>
                {loading ? <Spinner size="small" /> : <Plus size={16} />}
                <span>Create New Room</span>
              </Button>
            </div>
          </Card>

          {/* Join Room Card */}
          <Card className="content-card">
            <div className="card-title-row">
              <h2>Join Existing Room</h2>
              <span className="difficulty-badge medium">ENTER CODE</span>
            </div>
            <p className="problem-desc">
              Have a 6-character code from a friend or opponent? Enter it below to join the match lobby.
            </p>
            <form onSubmit={handleJoinRoom} style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
              <input
                type="text"
                maxLength={6}
                placeholder="e.g. AB12CD"
                value={joinCodeInput}
                onChange={(e) => setJoinCodeInput(e.target.value.toUpperCase())}
                style={{
                  flex: 1,
                  padding: '8px 12px',
                  borderRadius: '6px',
                  border: '1px solid var(--color-border)',
                  background: 'var(--color-bg)',
                  color: 'var(--color-text)',
                  textTransform: 'uppercase',
                  fontFamily: 'monospace',
                  letterSpacing: '0.1em',
                  fontWeight: 700,
                }}
              />
              <Button type="submit" variant="secondary" disabled={loading || !joinCodeInput.trim()}>
                <LogIn size={16} />
                <span>Join</span>
              </Button>
            </form>
          </Card>
        </div>
      ) : (
        /* Active Battle Room Lobby */
        <div className="dashboard-content-grid">
          <Card className="content-card" style={{ gridColumn: '1 / -1' }}>
            <div className="card-title-row">
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <Swords size={24} className="pulse-icon" style={{ color: 'var(--color-accent)' }} />
                <div>
                  <h2 style={{ fontSize: '20px' }}>Battle Room: {room.roomCode}</h2>
                  <p className="problem-desc">Status: <strong>{room.status}</strong></p>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <Button variant="secondary" size="small" onClick={handleCopyCode}>
                  {copied ? <Check size={14} /> : <Copy size={14} />}
                  <span>{copied ? 'Copied Code!' : 'Copy Code'}</span>
                </Button>

                <Button variant="secondary" size="small" onClick={handleLeaveRoom} style={{ color: 'var(--color-danger)' }}>
                  <LogOut size={14} />
                  <span>Leave</span>
                </Button>
              </div>
            </div>

            <div className="user-menu-divider" style={{ margin: '16px 0' }} />

            <h3>Players in Room ({room.players?.length || 0} / 2)</h3>
            <div className="stats-grid" style={{ marginTop: '12px' }}>
              {room.players?.map((player) => (
                <Card key={player.id} className="stat-card" style={{ border: player.isHost ? '1px solid var(--color-accent)' : undefined }}>
                  <div className="stat-icon-wrap accent-blue">
                    <Users size={20} />
                  </div>
                  <div className="stat-info">
                    <span className="stat-label">{player.isHost ? 'Host' : 'Challenger'}</span>
                    <span className="stat-value">{player.username}</span>
                  </div>
                  <span className={`nav-badge ${player.ready ? 'badge-live' : ''}`} style={{ background: player.ready ? '#22c55e' : undefined, color: player.ready ? '#fff' : undefined }}>
                    {player.ready ? 'READY' : 'WAITING'}
                  </span>
                </Card>
              ))}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '20px' }}>
              <Button
                variant={currentPlayer?.ready ? 'secondary' : 'primary'}
                onClick={handleToggleReady}
              >
                <Zap size={16} />
                <span>{currentPlayer?.ready ? 'Cancel Ready' : 'I Am Ready'}</span>
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
