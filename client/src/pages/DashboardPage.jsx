import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Swords } from 'lucide-react';
import { Button, Spinner } from '../components/ui';
import { useAuthStore } from '../store/useAuthStore';
import { problemService } from '../services/problemService';
import { userService } from '../services/userService';
import { submissionService } from '../services/submissionService';
import { PlayerLink } from '../components/common/PlayerLink';

const DIFFICULTIES = ['EASY', 'MEDIUM', 'HARD'];

const formatDuration = (ms) => {
  if (ms === null || ms === undefined) return '—';
  const totalSeconds = Math.floor(ms / 1000);
  return `${Math.floor(totalSeconds / 60)}:${String(totalSeconds % 60).padStart(2, '0')}`;
};

const RESULT_LETTER = { WIN: 'W', LOSS: 'L', DRAW: 'D' };

export function DashboardPage() {
  const user = useAuthStore((state) => state.user);
  const refreshUser = useAuthStore((state) => state.refreshUser);

  const [problems, setProblems] = useState([]);
  const [battles, setBattles] = useState([]);
  const [rank, setRank] = useState(null);
  const [solvedIds, setSolvedIds] = useState(() => new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    refreshUser();
  }, [refreshUser]);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        setLoading(true);
        const [problemData, battleData, leaderboard, progress] = await Promise.all([
          problemService.getProblems(),
          userService.getMyBattles({ limit: 6 }),
          userService.getLeaderboard({ limit: 1 }),
          submissionService.getMyProgress().catch(() => null),
        ]);
        if (cancelled) return;
        setProblems(problemData.problems || []);
        setSolvedIds(new Set(progress?.solvedProblemIds || []));
        setBattles(battleData.battles || []);
        setRank(leaderboard.me?.rank ?? null);
      } catch (err) {
        if (!cancelled) setError(err.message || 'Failed to load your dashboard');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const wins = user?.wins || 0;
  const losses = user?.losses || 0;
  const draws = user?.draws || 0;
  const games = wins + losses + draws;
  const share = (count) => (games ? `${(count / games) * 100}%` : '0%');

  // One unsolved problem per difficulty.
  const upNext = DIFFICULTIES.map((difficulty) =>
    problems.find((problem) => problem.difficulty === difficulty && !solvedIds.has(problem.id))
  ).filter(Boolean);

  return (
    <div className="page-view animate-fade-in">
      <header className="page-header">
        <div>
          <h1 className="page-title">{user?.username ? `Hi, ${user.username}` : 'Dashboard'}</h1>
          <p className="page-subtitle">Your record, your recent battles, and something to solve next.</p>
        </div>
        <div className="header-actions">
          <Link to="/battles">
            <Button variant="primary">
              <Swords size={16} /> New battle
            </Button>
          </Link>
        </div>
      </header>

      {error && (
        <p className="notice" role="alert">
          {error}
        </p>
      )}

      <div className="dash-grid">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', minWidth: 0 }}>
          <section className="panel record-card" aria-label="Your record">
            <div className="record-rating">
              <span className="eyebrow">Rating</span>
              <span className="record-rating-value">{user?.rating ?? '—'}</span>
              <span className="record-rank">
                {rank ? (
                  <>
                    Rank <strong>#{rank}</strong>
                  </>
                ) : (
                  'Unranked until your first battle'
                )}
              </span>
            </div>

            <div className="record-tally">
              <span className="eyebrow">Record · {games} {games === 1 ? 'battle' : 'battles'}</span>
              <div className="tally-bar" role="img" aria-label={`${wins} wins, ${losses} losses, ${draws} draws`}>
                <span className="t-win" style={{ width: share(wins) }} />
                <span className="t-loss" style={{ width: share(losses) }} />
                <span className="t-draw" style={{ width: share(draws) }} />
              </div>
              <div className="tally-legend">
                <span>
                  <strong>{wins}</strong>W
                </span>
                <span>
                  <strong>{losses}</strong>L
                </span>
                <span>
                  <strong>{draws}</strong>D
                </span>
              </div>
            </div>
          </section>

          <section className="panel" aria-labelledby="recent-title">
            <div className="panel-head">
              <h2 id="recent-title" className="section-title">
                Recent battles
              </h2>
              <Link to="/leaderboard">
                <Button variant="ghost" size="small">
                  Leaderboard <ArrowRight size={14} />
                </Button>
              </Link>
            </div>
            {loading ? (
              <div className="placeholder-content">
                <Spinner label="Loading battles" />
              </div>
            ) : battles.length === 0 ? (
              <div className="placeholder-content">
                <p>No finished battles yet. Open a room and send the code to a friend.</p>
                <Link to="/battles">
                  <Button variant="secondary" size="small">
                    Start a battle
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="sheet-table-wrap">
                <table className="sheet-table">
                  <thead>
                    <tr>
                      <th aria-label="Result" />
                      <th>Opponent</th>
                      <th>Problem</th>
                      <th className="numeric">Solve</th>
                      <th className="numeric">Rating</th>
                    </tr>
                  </thead>
                  <tbody>
                    {battles.map((battle) => (
                      <tr key={battle.roomCode} className="battle-log-row">
                        <td>
                          <span className={`result-pill ${battle.result.toLowerCase()}`} title={battle.result}>
                            {RESULT_LETTER[battle.result]}
                          </span>
                        </td>
                        <td>
                          <PlayerLink username={battle.opponent?.username} />
                          {battle.endReason === 'FORFEIT' && <span className="muted"> · forfeit</span>}
                        </td>
                        <td className="muted">{battle.problem?.title || 'Problem removed'}</td>
                        <td className="numeric">{formatDuration(battle.solveTimeMs)}</td>
                        <td className="numeric">
                          {battle.ratingChange === null ? (
                            '—'
                          ) : (
                            <span className={`rating-delta ${battle.ratingChange >= 0 ? 'positive' : 'negative'}`}>
                              {battle.ratingChange >= 0 ? '+' : ''}
                              {battle.ratingChange}
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </div>

        <section className="panel" aria-labelledby="next-title">
          <div className="panel-head">
            <h2 id="next-title" className="section-title">
              Up next
            </h2>
            <span className="eyebrow">
              {solvedIds.size} / {problems.length} solved
            </span>
          </div>
          {loading ? (
            <div className="placeholder-content">
              <Spinner label="Loading problems" />
            </div>
          ) : upNext.length === 0 ? (
            <div className="placeholder-content">
              <p>{problems.length ? 'You have solved every problem. Nice.' : 'No published problems yet.'}</p>
            </div>
          ) : (
            <ul className="up-next-list">
              {upNext.map((problem) => (
                <li key={problem.id}>
                  <Link to={`/problems/${problem.slug}`}>
                    <span className="up-next-title">{problem.title}</span>
                    <span className={`difficulty-badge ${problem.difficulty.toLowerCase()}`}>{problem.difficulty}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
          <div className="panel-body" style={{ borderTop: '1px solid var(--rule)' }}>
            <Link to="/problems">
              <Button variant="secondary" size="small">
                All problems <ArrowRight size={14} />
              </Button>
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
}
