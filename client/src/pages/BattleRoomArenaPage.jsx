import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Timer,
  CheckCircle2,
  XCircle,
  Trophy,
  Send,
  RotateCcw,
  LogOut,
  Zap,
  Code2,
} from 'lucide-react';
import { Card, Button, Spinner } from '../components/ui';
import { CodeEditor } from '../components/editor/CodeEditor';
import { getSocket } from '../services/socket';
import { useAuthStore } from '../store/useAuthStore';
import { submissionService } from '../services/submissionService';
import toast from 'react-hot-toast';

const DEFAULT_BOILERPLATES = {
  javascript: `/**
 * @param {number[]} nums
 * @param {number} target
 * @return {number[]}
 */
function solution(nums, target) {
    // Write your competitive battle solution here
    return [0, 1];
};`,
  python: `class Solution:
    def solve(self, nums, target):
        # Write your competitive battle solution here
        return [0, 1]`,
};

export function BattleRoomArenaPage() {
  const { roomCode } = useParams();
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);

  const [socket, setSocket] = useState(null);
  const [room, setRoom] = useState(null);
  const [problem, setProblem] = useState(null);

  const [language, setLanguage] = useState('javascript');
  const [code, setCode] = useState(DEFAULT_BOILERPLATES.javascript);

  const [timeLeft, setTimeLeft] = useState(900);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [verdict, setVerdict] = useState(null);
  const [winner, setWinner] = useState(null);
  const [battleLocked, setBattleLocked] = useState(false);

  const battleLockedRef = useRef(false);

  const syncWinnerState = (winnerUsername) => {
    if (!winnerUsername) return;
    battleLockedRef.current = true;
    setBattleLocked(true);
    setWinner(winnerUsername);
    setVerdict('ACCEPTED');
    setIsSubmitting(false);
  };

  const declareWinner = (winnerName) => {
    if (battleLockedRef.current) return;

    battleLockedRef.current = true;
    setBattleLocked(true);
    setWinner(winnerName);
    setVerdict('ACCEPTED');
    setIsSubmitting(false);

    if (socket && roomCode) {
      socket.emit('battle-first-submit-wins', {
        roomCode,
        winnerUsername: winnerName,
      });
    }

    toast.success(`🎉 ${winnerName} won the battle!`);
  };

  useEffect(() => {
    const activeSocket = getSocket();
    setSocket(activeSocket);

    if (!activeSocket.connected) {
      activeSocket.connect();
    }

    activeSocket.emit(
      'join-room',
      { roomCode: roomCode?.toUpperCase() },
      (res) => {
        if (res?.success && res?.room) {
          setRoom(res.room);
          if (res.room.selectedProblem) {
            setProblem(res.room.selectedProblem);
          }
          if (res.room.winnerUsername) {
            syncWinnerState(res.room.winnerUsername);
          }
        }
      }
    );

    function handleRoomUpdate(data) {
      if (data?.success && data?.room) {
        setRoom(data.room);
        if (data.room.selectedProblem) {
          setProblem(data.room.selectedProblem);
        }
        if (data.room.winnerUsername) {
          syncWinnerState(data.room.winnerUsername);
        }
      }
    }

    function handleBattleStart(data) {
      if (data?.room) {
        setRoom(data.room);
        if (data.selectedProblem || data.room.selectedProblem) {
          setProblem(data.selectedProblem || data.room.selectedProblem);
        }
        if (data.room.winnerUsername) {
          syncWinnerState(data.room.winnerUsername);
        }
      }
    }

    function handleFirstSubmitWins(data) {
      if (data?.winnerUsername) {
        syncWinnerState(data.winnerUsername);
      }
    }

    activeSocket.on('room-update', handleRoomUpdate);
    activeSocket.on('battle-start', handleBattleStart);
    activeSocket.on('battle-first-submit-wins', handleFirstSubmitWins);

    return () => {
      activeSocket.off('room-update', handleRoomUpdate);
      activeSocket.off('battle-start', handleBattleStart);
      activeSocket.off('battle-first-submit-wins', handleFirstSubmitWins);
    };
  }, [roomCode]);

  useEffect(() => {
    if (timeLeft <= 0 || winner) return;

    const timer = setInterval(() => {
      setTimeLeft((prev) => prev - 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [timeLeft, winner]);

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleLeaveBattle = () => {
    if (socket && roomCode) {
      socket.emit('leave-room', { roomCode });
    }
    navigate('/battles');
  };

  const handleSubmitBattleSolution = async () => {
    if (!problem?.id || battleLockedRef.current || winner) return;

    setIsSubmitting(true);

    try {
      await submissionService.createSubmission({
        problemId: problem.id,
        language,
        sourceCode: code,
      });
    } catch (err) {
      // No compiler right now, so we simulate the battle result locally.
      // First submit still wins.
    } finally {
      setIsSubmitting(false);
    }

    if (!battleLockedRef.current) {
      declareWinner(user?.username || 'You');
    }
  };

  const opponent =
    room?.players?.find((p) => p.id !== user?.id) || { username: 'Challenger' };

  return (
    <div className="leetcode-workspace animate-fade-in">
      <div className="battle-hud-bar">
        <div className="hud-left">
          <span className="live-pill">
            <Zap size={12} /> BATTLE LIVE
          </span>
          <span className="hud-room-code">Room: {roomCode}</span>
        </div>

        <div className="hud-center-timer">
          <Timer size={18} className="pulse-icon" style={{ color: 'var(--color-accent)' }} />
          <span className="timer-text">{formatTime(timeLeft)}</span>
        </div>

        <div className="hud-right-players">
          <div className="player-badge me">
            <span className="player-name">You ({user?.username || 'Player 1'})</span>
            <span className="status-indicator ready">CODING</span>
          </div>

          <span className="vs-divider">VS</span>

          <div className="player-badge opponent">
            <span className="player-name">{opponent.username}</span>
            <span className="status-indicator ready">CODING</span>
          </div>

          <Button
            variant="secondary"
            size="small"
            onClick={handleLeaveBattle}
            style={{ color: 'var(--color-danger)' }}
          >
            <LogOut size={14} /> Leave
          </Button>
        </div>
      </div>

      {winner && (
        <div className="victory-modal-overlay">
          <Card className="victory-card animate-fade-in">
            <Trophy size={56} style={{ color: '#f59e0b', margin: '0 auto' }} />
            <h2>VICTORY DECLARED!</h2>
            <p style={{ color: 'var(--color-muted)', textAlign: 'center' }}>
              <strong>{winner}</strong> solved the problem first and won the match!
            </p>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', marginTop: '16px' }}>
              <Button variant="primary" onClick={() => navigate('/battles')}>
                Return to Battle Lobby
              </Button>
            </div>
          </Card>
        </div>
      )}

      <div className="workspace-grid" style={{ marginTop: '12px' }}>
        <div className="left-panel">
          <div className="panel-tab-bar">
            <div className="panel-tab active">
              <Code2 size={15} />
              <span>Battle Problem</span>
            </div>
          </div>

          <div className="panel-content-scroll">
            <div className="problem-header-row">
              <h1 className="problem-title-text">{problem?.title || 'Two Sum'}</h1>
              <span className={`difficulty-badge ${problem?.difficulty?.toLowerCase() || 'easy'}`}>
                {problem?.difficulty || 'EASY'}
              </span>
            </div>

            <div className="user-menu-divider" style={{ margin: '16px 0' }} />

            <p style={{ whiteSpace: 'pre-line', lineHeight: '1.65' }}>
              {problem?.description ||
                'Given an array of integers nums and an integer target, return indices of the two numbers such that they add up to target.'}
            </p>

            {problem?.sampleInput && (
              <div className="sample-block">
                <span className="block-label">Sample Input:</span>
                <div className="code-box">{problem.sampleInput}</div>
                <span className="block-label" style={{ marginTop: '8px' }}>
                  Sample Output:
                </span>
                <div className="code-box">{problem.sampleOutput}</div>
              </div>
            )}
          </div>
        </div>

        <div className="right-panel">
          <div className="editor-control-header">
            <select
              className="language-select"
              value={language}
              onChange={(e) => {
                const nextLanguage = e.target.value;
                setLanguage(nextLanguage);
                setCode(DEFAULT_BOILERPLATES[nextLanguage]);
              }}
            >
              <option value="javascript">JavaScript (ES6)</option>
              <option value="python">Python 3</option>
            </select>

            <button
              type="button"
              className="editor-icon-btn"
              onClick={() => setCode(DEFAULT_BOILERPLATES[language])}
            >
              <RotateCcw size={14} /> Reset
            </button>
          </div>

          <div className="editor-workspace-container">
            <CodeEditor
              value={code}
              onChange={(val) => setCode(val || '')}
              language={language}
            />
          </div>

          <div className="console-panel" style={{ height: '140px' }}>
            <div className="console-actions-bar" style={{ height: '100%', alignItems: 'center' }}>
              {verdict && (
                <div
                  className={`verdict-badge ${verdict === 'ACCEPTED' ? 'accepted' : 'wrong'}`}
                  style={{ marginRight: 'auto' }}
                >
                  {verdict === 'ACCEPTED' ? <CheckCircle2 size={16} /> : <XCircle size={16} />}
                  {verdict}
                </div>
              )}

              <Button
                variant="primary"
                onClick={handleSubmitBattleSolution}
                disabled={isSubmitting || Boolean(winner) || battleLocked}
              >
                {isSubmitting ? <Spinner size="small" /> : <Send size={16} />}
                <span>Submit Solution</span>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}