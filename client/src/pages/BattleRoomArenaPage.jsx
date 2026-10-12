import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Timer, Trophy, Send, RotateCcw, LogOut, Zap, Code2, ArrowLeft, Swords } from 'lucide-react';
import { Card, Button, Spinner } from '../components/ui';
import { CodeEditor } from '../components/editor/CodeEditor';
import { SplitPane } from '../components/layout/SplitPane';
import { VerdictBadge } from '../components/common/VerdictBadge';
import { getSocket, emitWithAck } from '../services/socket';
import { useAuthStore } from '../store/useAuthStore';
import { submissionService } from '../services/submissionService';
import { DEFAULT_BOILERPLATES, LANGUAGE_OPTIONS, getVerdictLabel } from '../constants/languages';

const formatElapsed = (ms) => {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const mmss = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  return hours ? `${hours}:${mmss}` : mmss;
};

const END_REASON_TEXT = {
  SOLVED: 'solved the problem first',
  DRAW: 'Both players solved it at the same moment',
  FORFEIT: 'won by forfeit',
};

const draftKey = (roomCode) => `codearena_battle_draft_${roomCode}`;

const loadDraft = (roomCode) => {
  try {
    return JSON.parse(sessionStorage.getItem(draftKey(roomCode))) || null;
  } catch {
    return null;
  }
};

export function BattleRoomArenaPage() {
  const params = useParams();
  const roomCode = params.roomCode?.toUpperCase();
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const refreshUser = useAuthStore((state) => state.refreshUser);

  const [room, setRoom] = useState(null);
  const [loadError, setLoadError] = useState(null);
  const [retryKey, setRetryKey] = useState(0);
  const [clockOffsetMs, setClockOffsetMs] = useState(0);
  const [now, setNow] = useState(() => Date.now());

  const initialDraft = loadDraft(roomCode);
  const [language, setLanguage] = useState(initialDraft?.language || 'javascript');
  const [code, setCode] = useState(initialDraft?.code || DEFAULT_BOILERPLATES.javascript);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [lastResult, setLastResult] = useState(null);
  const [opponentActivity, setOpponentActivity] = useState(null);
  const [showResults, setShowResults] = useState(true);
  const submittingRef = useRef(false);

  const applyRoom = useCallback((nextRoom) => {
    if (!nextRoom) return;
    if (nextRoom.serverTime) {
      setClockOffsetMs(new Date(nextRoom.serverTime).getTime() - Date.now());
    }
    setRoom(nextRoom);
  }, [setClockOffsetMs, setRoom]);

  useEffect(() => {
    const socket = getSocket();
    let cancelled = false;

    const join = () => {
      emitWithAck('join-room', { roomCode })
        .then((response) => {
          if (cancelled) return;
          if (response.room.status === 'WAITING') {
            navigate('/battles', { replace: true, state: { roomCode } });
            return;
          }
          applyRoom(response.room);
        })
        .catch((error) => {
          if (!cancelled) setLoadError(error.message);
        });
    };

    function handleRoomUpdate(data) {
      if (data?.room?.roomCode === roomCode) applyRoom(data.room);
    }

    function handleBattleEnd(data) {
      if (data?.room?.roomCode !== roomCode) return;
      applyRoom(data.room);
      setShowResults(true);
      refreshUser();
    }

    function handleActivity(data) {
      if (data?.userId && data.userId !== user?.id) {
        setOpponentActivity(data.status);
      }
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
    socket.on('battle-end', handleBattleEnd);
    socket.on('battle-activity', handleActivity);
    // Re-join after a reconnect so this socket is subscribed to the room again.
    function handleConnectError(error) {
      if (!cancelled) setLoadError(error.message || 'Could not connect to the battle server');
    }

    socket.on('connect', join);
    socket.on('connect_error', handleConnectError);

    if (socket.connected) {
      join();
    } else {
      socket.connect();
    }

    return () => {
      cancelled = true;
      socket.off('player-presence', handlePresence);
      socket.off('room-update', handleRoomUpdate);
      socket.off('battle-end', handleBattleEnd);
      socket.off('battle-activity', handleActivity);
      socket.off('connect', join);
      socket.off('connect_error', handleConnectError);
    };
  }, [roomCode, navigate, applyRoom, refreshUser, user?.id, retryKey]);

  const isFinished = room?.status === 'FINISHED';

  useEffect(() => {
    if (!room?.startedAt || isFinished) return undefined;
    const interval = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(interval);
  }, [room?.startedAt, isFinished]);

  useEffect(() => {
    try {
      sessionStorage.setItem(draftKey(roomCode), JSON.stringify({ language, code }));
    } catch {
      // Storage may be unavailable (private mode); drafts are a convenience only.
    }
  }, [roomCode, language, code]);

  const startedAtMs = room?.startedAt ? new Date(room.startedAt).getTime() : null;
  const endMs = isFinished && room?.finishedAt ? new Date(room.finishedAt).getTime() : now + clockOffsetMs;
  const elapsedMs = startedAtMs ? endMs - startedAtMs : 0;

  const problem = room?.selectedProblem;
  const me = room?.players?.find((player) => player.id === user?.id);
  const opponent = room?.players?.find((player) => player.id !== user?.id);

  const handleLeaveBattle = async () => {
    if (room?.status === 'IN_PROGRESS') {
      const confirmed = window.confirm('Leaving now forfeits the battle and your opponent wins. Leave anyway?');
      if (!confirmed) return;
    }

    try {
      await emitWithAck('leave-room', { roomCode });
    } catch {
      // Navigation should not be blocked by a failed leave acknowledgement.
    }
    sessionStorage.removeItem(draftKey(roomCode));
    navigate('/battles');
  };

  const handleSubmitBattleSolution = async () => {
    if (!problem?.id || submittingRef.current || room?.status !== 'IN_PROGRESS') return;

    submittingRef.current = true;
    setIsSubmitting(true);
    setLastResult(null);

    try {
      const response = await submissionService.createSubmission({
        problemId: problem.id,
        language,
        sourceCode: code,
        roomCode,
      });
      setLastResult({ submission: response.submission });
    } catch (error) {
      setLastResult({ error: error.message || 'Submission could not be evaluated' });
    } finally {
      submittingRef.current = false;
      setIsSubmitting(false);
    }
  };

  if (loadError) {
    return (
      <div className="page-view">
        <Card className="placeholder-content">
          <Swords size={40} style={{ color: 'var(--color-danger)' }} />
          <h2>Cannot open battle {roomCode}</h2>
          <p>{loadError}</p>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', justifyContent: 'center' }}>
            <Button
              variant="primary"
              onClick={() => {
                setLoadError(null);
                setRetryKey((key) => key + 1);
              }}
            >
              <RotateCcw size={16} /> Try again
            </Button>
            <Link to="/battles">
              <Button variant="secondary">
                <ArrowLeft size={16} /> Back to Battles
              </Button>
            </Link>
          </div>
        </Card>
      </div>
    );
  }

  if (!room) {
    return (
      <div className="placeholder-content" style={{ minHeight: '60vh' }}>
        <Spinner label="Joining battle..." />
        <p className="problem-desc">Joining battle {roomCode}...</p>
      </div>
    );
  }

  const opponentStatus = (() => {
    if (!opponent) return { label: 'LEFT', className: 'offline' };
    if (opponent.solveTimeMs !== null && opponent.solveTimeMs !== undefined) return { label: 'SOLVED', className: 'solved' };
    if (opponent.online === false) return { label: 'OFFLINE', className: 'offline' };
    if (opponentActivity === 'PENDING') return { label: 'SUBMITTING', className: '' };
    if (opponentActivity) return { label: getVerdictLabel(opponentActivity).toUpperCase(), className: '' };
    return { label: 'CODING', className: '' };
  })();

  const resultTitle = !isFinished
    ? ''
    : room.winner === null
      ? 'Draw'
      : room.winner.id === user?.id
        ? 'Victory'
        : 'Defeat';

  return (
    <div className="leetcode-workspace animate-fade-in">
      <div className="battle-hud-bar">
        <div className="hud-left">
          <span className="live-pill">
            <Zap size={12} /> {isFinished ? 'BATTLE OVER' : 'BATTLE LIVE'}
          </span>
          <span className="hud-room-code">Room: {roomCode}</span>
        </div>

        <div className="hud-center-timer" title="Elapsed time since the battle started (server time)">
          <Timer size={18} style={{ color: 'var(--color-accent)' }} />
          <span className="timer-text">{formatElapsed(elapsedMs)}</span>
        </div>

        <div className="hud-right-players">
          <div className="player-badge me">
            <span className="player-name">You ({user?.username})</span>
            <span className={`status-indicator ${me?.solveTimeMs !== null && me?.solveTimeMs !== undefined ? 'solved' : ''}`}>
              {me?.solveTimeMs !== null && me?.solveTimeMs !== undefined ? 'SOLVED' : 'CODING'}
            </span>
          </div>

          <span className="vs-divider">VS</span>

          <div className="player-badge opponent">
            <span className="player-name">{opponent?.username || 'Opponent'}</span>
            <span className={`status-indicator ${opponentStatus.className}`}>{opponentStatus.label}</span>
          </div>

          <Button variant="secondary" size="small" onClick={handleLeaveBattle} style={{ color: 'var(--color-danger)' }}>
            <LogOut size={14} /> {isFinished ? 'Exit' : 'Forfeit'}
          </Button>
        </div>
      </div>

      {isFinished && showResults && (
        <div className="victory-modal-overlay" role="dialog" aria-modal="true" aria-labelledby="battle-result-title">
          <Card className="victory-card animate-fade-in">
            <Trophy size={48} style={{ color: 'var(--color-accent)', margin: '0 auto' }} />
            <h2 id="battle-result-title">{resultTitle}</h2>
            <p style={{ color: 'var(--color-muted)' }}>
              {room.endReason === 'DRAW' || !room.winner ? (
                END_REASON_TEXT.DRAW
              ) : (
                <>
                  <strong>{room.winner.username}</strong> {END_REASON_TEXT[room.endReason] || 'won'}
                </>
              )}
            </p>

            <table className="battle-result-table">
              <thead>
                <tr>
                  <th>Player</th>
                  <th>Solve time</th>
                  <th>Rating</th>
                </tr>
              </thead>
              <tbody>
                {room.players.map((player) => {
                  const delta =
                    player.ratingAfter !== null && player.ratingBefore !== null && player.ratingAfter !== undefined
                      ? player.ratingAfter - player.ratingBefore
                      : null;
                  return (
                    <tr key={player.id}>
                      <td>
                        {player.username}
                        {player.id === user?.id ? ' (you)' : ''}
                      </td>
                      <td>{player.solveTimeMs !== null && player.solveTimeMs !== undefined ? formatElapsed(player.solveTimeMs) : '—'}</td>
                      <td>
                        {player.ratingAfter ?? player.rating}
                        {delta !== null && (
                          <span className={`rating-delta ${delta >= 0 ? 'positive' : 'negative'}`}>
                            {' '}
                            ({delta >= 0 ? '+' : ''}
                            {delta})
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', marginTop: '8px', flexWrap: 'wrap' }}>
              <Button variant="primary" onClick={() => navigate('/battles')}>
                Back to Battles
              </Button>
              <Button variant="secondary" onClick={() => navigate('/leaderboard')}>
                Leaderboard
              </Button>
              <Button variant="ghost" onClick={() => setShowResults(false)}>
                Review code
              </Button>
            </div>
          </Card>
        </div>
      )}

      <SplitPane
        direction="horizontal"
        className="workspace-split"
        defaultSize={42}
        min={25}
        max={70}
        storageKey="codearena_split_arena"
        label="Resize problem and editor panels"
      >
        <div className="left-panel">
          <div className="panel-tab-bar">
            <div className="panel-tab active">
              <Code2 size={15} />
              <span>Battle Problem</span>
            </div>
          </div>

          <div className="panel-content-scroll">
            {problem ? (
              <>
                <div className="problem-header-row">
                  <h1 className="problem-title-text">{problem.title}</h1>
                  <span className={`difficulty-badge ${problem.difficulty?.toLowerCase()}`}>{problem.difficulty}</span>
                </div>

                <div className="user-menu-divider" style={{ margin: '16px 0' }} />

                <p style={{ whiteSpace: 'pre-line', lineHeight: '1.65' }}>{problem.description}</p>

                {problem.sampleInput && (
                  <div className="sample-block">
                    <span className="block-label">Sample Input:</span>
                    <div className="code-box">{problem.sampleInput}</div>
                    <span className="block-label" style={{ marginTop: '8px' }}>
                      Sample Output:
                    </span>
                    <div className="code-box">{problem.sampleOutput}</div>
                  </div>
                )}

                {problem.constraints && (
                  <div className="sample-block">
                    <span className="block-label">Constraints:</span>
                    <ul className="constraints-list">
                      {problem.constraints.split('\n').map((constraint, index) => (
                        <li key={index}>
                          <code>{constraint}</code>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </>
            ) : (
              <p className="problem-desc">The battle problem is not available.</p>
            )}
          </div>
        </div>

        <div className="right-panel">
          <div className="editor-control-header">
            <select
              className="language-select"
              value={language}
              disabled={isFinished}
              onChange={(e) => {
                const nextLanguage = e.target.value;
                setLanguage(nextLanguage);
                setCode(DEFAULT_BOILERPLATES[nextLanguage]);
              }}
            >
              {LANGUAGE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>

            <button
              type="button"
              className="editor-icon-btn"
              disabled={isFinished}
              onClick={() => setCode(DEFAULT_BOILERPLATES[language])}
            >
              <RotateCcw size={14} /> Reset
            </button>
          </div>

          <SplitPane
            direction="vertical"
            defaultSize={70}
            min={25}
            max={88}
            storageKey="codearena_split_arena_editor"
            label="Resize editor and result panel"
          >
          <div className="editor-workspace-container">
            <CodeEditor value={code} onChange={(val) => setCode(val || '')} language={language} />
          </div>

          <div className="console-panel">
            <div className="console-body">
              {isSubmitting ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <Spinner size="small" />
                  <span>Judging against all test cases...</span>
                </div>
              ) : lastResult?.error ? (
                <div className="verdict-card">
                  <p className="verdict-output" style={{ color: 'var(--color-danger)' }}>
                    {lastResult.error}
                  </p>
                </div>
              ) : lastResult?.submission ? (
                <div className="verdict-card">
                  <div className="verdict-status-row">
                    <VerdictBadge status={lastResult.submission.status} />
                    {lastResult.submission.totalTestCases ? (
                      <span className="metric-tag">
                        {lastResult.submission.passedTestCases}/{lastResult.submission.totalTestCases} tests passed
                      </span>
                    ) : null}
                  </div>
                  {lastResult.submission.errorMessage && (
                    <pre className="input-preview error-output">{lastResult.submission.errorMessage}</pre>
                  )}
                  {lastResult.submission.status === 'ACCEPTED' && !isFinished && (
                    <p className="verdict-output">Accepted. Waiting for the server to confirm the result...</p>
                  )}
                </div>
              ) : (
                <p style={{ color: 'var(--color-muted)', fontSize: '13px' }}>
                  {isFinished
                    ? 'The battle is over.'
                    : 'Your submission is judged against every test case, including hidden ones. The first accepted submission received by the server wins.'}
                </p>
              )}
            </div>

            <div className="console-actions-bar">
              <Button variant="primary" onClick={handleSubmitBattleSolution} disabled={isSubmitting || isFinished || !problem}>
                {isSubmitting ? <Spinner size="small" /> : <Send size={16} />}
                <span>Submit Solution</span>
              </Button>
            </div>
          </div>
          </SplitPane>
        </div>
      </SplitPane>
    </div>
  );
}
