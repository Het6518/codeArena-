import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Trophy, ChevronLeft, ChevronRight, Swords } from 'lucide-react';
import { Card, Button, Spinner } from '../components/ui';
import { userService } from '../services/userService';

const PAGE_SIZE = 25;

export function LeaderboardPage() {
  const [page, setPage] = useState(1);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const response = await userService.getLeaderboard({ page, limit: PAGE_SIZE });
        if (!cancelled) setData(response);
      } catch (err) {
        if (!cancelled) setError(err.message || 'Failed to load the leaderboard');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [page, reloadKey]);

  const me = data?.me;
  const entries = data?.entries || [];
  const totalPages = data?.pagination?.totalPages || 1;

  return (
    <div className="page-view animate-fade-in">
      <header className="page-header">
        <div>
          <h1 className="page-title">Leaderboard</h1>
          <p className="page-subtitle">Players ranked by Elo rating from 1v1 battles.</p>
        </div>
      </header>

      {me && (
        <Card className="leaderboard-me-card">
          <div className="leaderboard-me-stat">
            <span className="stat-label">Your rank</span>
            <span className="stat-value">{me.rank ? `#${me.rank}` : 'Unranked'}</span>
          </div>
          <div className="leaderboard-me-stat">
            <span className="stat-label">Rating</span>
            <span className="stat-value">{me.rating}</span>
          </div>
          <div className="leaderboard-me-stat">
            <span className="stat-label">W / L / D</span>
            <span className="stat-value">
              {me.wins} / {me.losses} / {me.draws}
            </span>
          </div>
          <div className="leaderboard-me-stat">
            <span className="stat-label">Win rate</span>
            <span className="stat-value">{me.games ? `${me.winRate}%` : '—'}</span>
          </div>
          {!me.rank && <p className="problem-desc">Finish a battle to appear on the leaderboard.</p>}
        </Card>
      )}

      <Card>
        {loading ? (
          <div className="placeholder-content">
            <Spinner label="Loading leaderboard" />
          </div>
        ) : error ? (
          <div className="placeholder-content">
            <Trophy size={40} style={{ color: 'var(--color-danger)' }} />
            <h3>Could not load the leaderboard</h3>
            <p>{error}</p>
            <Button variant="secondary" onClick={() => setReloadKey((key) => key + 1)}>
              Try again
            </Button>
          </div>
        ) : entries.length === 0 ? (
          <div className="placeholder-content">
            <Trophy size={48} className="placeholder-icon" />
            <h2>No ranked players yet</h2>
            <p>Players appear here after finishing their first battle.</p>
            <Link to="/battles">
              <Button variant="primary">
                <Swords size={16} /> Start a battle
              </Button>
            </Link>
          </div>
        ) : (
          <>
            <div className="leaderboard-table-wrap">
              <table className="leaderboard-table">
                <thead>
                  <tr>
                    <th>Rank</th>
                    <th>Player</th>
                    <th className="numeric">Rating</th>
                    <th className="numeric">Wins</th>
                    <th className="numeric">Losses</th>
                    <th className="numeric">Draws</th>
                    <th className="numeric">Win rate</th>
                  </tr>
                </thead>
                <tbody>
                  {entries.map((entry) => (
                    <tr key={entry.id} className={entry.id === me?.id ? 'is-me' : ''}>
                      <td>
                        <span className={`leaderboard-rank ${entry.rank <= 3 ? 'top' : ''}`}>{entry.rank}</span>
                      </td>
                      <td>
                        <div className="leaderboard-player">
                          <span className="leaderboard-avatar">{entry.username.slice(0, 2).toUpperCase()}</span>
                          <span>
                            {entry.username}
                            {entry.id === me?.id ? ' (you)' : ''}
                          </span>
                        </div>
                      </td>
                      <td className="numeric">
                        <strong>{entry.rating}</strong>
                      </td>
                      <td className="numeric">{entry.wins}</td>
                      <td className="numeric">{entry.losses}</td>
                      <td className="numeric">{entry.draws}</td>
                      <td className="numeric">{entry.winRate}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {totalPages > 1 && (
              <div className="pagination-bar">
                <span>
                  Page {page} of {totalPages}
                </span>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <Button variant="secondary" size="small" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                    <ChevronLeft size={14} /> Previous
                  </Button>
                  <Button variant="secondary" size="small" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
                    Next <ChevronRight size={14} />
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </Card>
    </div>
  );
}
