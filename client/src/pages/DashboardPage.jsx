import { useEffect, useState } from 'react';
import { Swords, Trophy } from 'lucide-react';
import { Card, Button, Spinner } from '../components/ui';
import { useAuthStore } from '../store/useAuthStore';
import { problemService } from '../services/problemService';
import { userService } from '../services/userService';
import { Link } from 'react-router-dom';

const formatDuration = (ms) => {
  if (ms === null || ms === undefined) return null;
  const totalSeconds = Math.floor(ms / 1000);
  return `${Math.floor(totalSeconds / 60)}m ${String(totalSeconds % 60).padStart(2, '0')}s`;
};

export function DashboardPage() {
  const user = useAuthStore((state) => state.user);
  const refreshUser = useAuthStore((state) => state.refreshUser);
  const username = user?.username || 'Developer';

  const [problems, setProblems] = useState([]);
  const [battles, setBattles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    refreshUser();
  }, [refreshUser]);

  useEffect(() => {
    let cancelled = false;

    async function loadDashboardData() {
      try {
        setLoading(true);
        const [problemData, battleData] = await Promise.all([
          problemService.getProblems(),
          userService.getMyBattles({ limit: 5 }),
        ]);
        if (cancelled) return;
        setProblems(problemData.problems || []);
        setBattles(battleData.battles || []);
      } catch (err) {
        if (!cancelled) setError(err.message || 'Failed to load dashboard data');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadDashboardData();
    return () => {
      cancelled = true;
    };
  }, []);

  const recommendedProblem = problems[0];
  const games = (user?.wins || 0) + (user?.losses || 0) + (user?.draws || 0);

  return (
    <div className="dashboard-view animate-fade-in">
      <header className="page-header">
        <div>
          <h1 className="page-title">Welcome back, {username}</h1>
          <p className="page-subtitle">Practice problems and challenge rivals in real-time 1v1 battles.</p>
        </div>
        <div className="header-actions">
          <Link to="/battles">
            <Button variant="primary">
              <Swords size={16} />
              <span>New Battle</span>
            </Button>
          </Link>
        </div>
      </header>

      {error && (
        <Card style={{ borderLeft: '4px solid var(--color-danger)', marginBottom: '16px' }}>
          <p style={{ color: 'var(--color-danger)' }}>{error}</p>
        </Card>
      )}

      <div className="stats-grid">
        <Card className="stat-card">
          <div className="stat-info">
            <span className="stat-label">Rating</span>
            <span className="stat-value">{user?.rating ?? '—'}</span>
          </div>
        </Card>

        <Card className="stat-card">
          <div className="stat-info">
            <span className="stat-label">Battles (W / L / D)</span>
            <span className="stat-value">
              {games ? `${user.wins} / ${user.losses} / ${user.draws}` : 'None yet'}
            </span>
          </div>
        </Card>

        <Card className="stat-card">
          <div className="stat-info">
            <span className="stat-label">Available Problems</span>
            <span className="stat-value">{loading ? '...' : problems.length}</span>
          </div>
        </Card>
      </div>

      <div className="dashboard-content-grid">
        <Card className="content-card">
          <div className="card-title-row">
            <h2>Recommended Problem</h2>
            {recommendedProblem && (
              <span className={`difficulty-badge ${recommendedProblem.difficulty?.toLowerCase()}`}>
                {recommendedProblem.difficulty}
              </span>
            )}
          </div>
          {loading ? (
            <Spinner label="Loading problems" />
          ) : recommendedProblem ? (
            <>
              <p className="problem-title">{recommendedProblem.title}</p>
              <p className="problem-desc line-clamp">{recommendedProblem.description}</p>
              <div className="card-footer-action">
                <Link to={`/problems/${recommendedProblem.slug}`}>
                  <Button variant="secondary" size="small">
                    Solve Problem
                  </Button>
                </Link>
              </div>
            </>
          ) : (
            <p className="problem-desc">No published problems yet.</p>
          )}
        </Card>

        <Card className="content-card">
          <div className="card-title-row">
            <h2>Recent Battles</h2>
            <Link to="/leaderboard">
              <Button variant="ghost" size="small">
                <Trophy size={14} /> Leaderboard
              </Button>
            </Link>
          </div>
          {loading ? (
            <Spinner label="Loading battles" />
          ) : battles.length === 0 ? (
            <p className="problem-desc">You have not finished a battle yet.</p>
          ) : (
            <ul className="recent-battles-list">
              {battles.map((battle) => (
                <li key={battle.roomCode}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
                    <span className={`result-pill ${battle.result.toLowerCase()}`}>{battle.result}</span>
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      vs {battle.opponent?.username || 'unknown'} · {battle.problem?.title || 'Problem removed'}
                      {battle.endReason === 'FORFEIT' ? ' · forfeit' : ''}
                    </span>
                  </div>
                  <span style={{ color: 'var(--color-muted)', whiteSpace: 'nowrap' }}>
                    {formatDuration(battle.solveTimeMs) ? `${formatDuration(battle.solveTimeMs)} · ` : ''}
                    {battle.ratingChange !== null && (
                      <span className={`rating-delta ${battle.ratingChange >= 0 ? 'positive' : 'negative'}`}>
                        {battle.ratingChange >= 0 ? '+' : ''}
                        {battle.ratingChange}
                      </span>
                    )}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}
