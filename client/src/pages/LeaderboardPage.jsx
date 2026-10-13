import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Swords } from 'lucide-react';
import { Button, Spinner } from '../components/ui';
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
          <p className="page-subtitle">Ranked by Elo from finished battles. Equal ratings share a rank.</p>
        </div>
      </header>

      {me && (
        <section className="scorecard" aria-label="Your standing">
          <div>
            <span className="eyebrow">Your rank</span>
            <span className="scorecard-value">{me.rank ? `#${me.rank}` : '—'}</span>
          </div>
          <div>
            <span className="eyebrow">Rating</span>
            <span className="scorecard-value">{me.rating}</span>
          </div>
          <div>
            <span className="eyebrow">W / L / D</span>
            <span className="scorecard-value">
              {me.wins}/{me.losses}/{me.draws}
            </span>
          </div>
          <div>
            <span className="eyebrow">Win rate</span>
            <span className="scorecard-value">{me.games ? `${me.winRate}%` : '—'}</span>
          </div>
          {!me.rank && <p className="scorecard-note">Finish one battle to get ranked.</p>}
        </section>
      )}

      <section className="panel" aria-label="Rankings">
        {loading ? (
          <div className="placeholder-content">
            <Spinner label="Loading leaderboard" />
          </div>
        ) : error ? (
          <div className="placeholder-content">
            <h3>Could not load the leaderboard</h3>
            <p>{error}</p>
            <Button variant="secondary" onClick={() => setReloadKey((key) => key + 1)}>
              Try again
            </Button>
          </div>
        ) : entries.length === 0 ? (
          <div className="placeholder-content">
            <h3>No ranked players yet</h3>
            <p>Players appear here after their first finished battle.</p>
            <Link to="/battles">
              <Button variant="primary">
                <Swords size={16} /> Start a battle
              </Button>
            </Link>
          </div>
        ) : (
          <>
            <div className="sheet-table-wrap">
              <table className="sheet-table" style={{ minWidth: '560px' }}>
                <thead>
                  <tr>
                    <th>Rank</th>
                    <th>Player</th>
                    <th className="numeric">Rating</th>
                    <th className="numeric">W</th>
                    <th className="numeric">L</th>
                    <th className="numeric">D</th>
                    <th className="numeric">Win rate</th>
                  </tr>
                </thead>
                <tbody>
                  {entries.map((entry) => (
                    <tr key={entry.id} className={entry.id === me?.id ? 'is-me' : ''}>
                      <td>
                        <span className={`rank-cell${entry.rank <= 3 ? ` rank-${entry.rank}` : ''}`}>{entry.rank}</span>
                      </td>
                      <td>
                        <Link to={`/u/${encodeURIComponent(entry.username)}`} className="row-link">
                          <span className="player-initials">{entry.username.slice(0, 2).toUpperCase()}</span>
                          {entry.username}
                          {entry.id === me?.id && <span className="muted">(you)</span>}
                        </Link>
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
      </section>
    </div>
  );
}
