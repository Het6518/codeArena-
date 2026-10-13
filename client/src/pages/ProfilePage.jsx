import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Swords } from 'lucide-react';
import { Button, Spinner } from '../components/ui';
import { RatingChart } from '../components/common/RatingChart';
import { PlayerLink } from '../components/common/PlayerLink';
import { useAuthStore } from '../store/useAuthStore';
import { userService } from '../services/userService';

const RESULT_LETTER = { WIN: 'W', LOSS: 'L', DRAW: 'D' };
const DIFFICULTY_ROWS = [
  ['EASY', 'Easy'],
  ['MEDIUM', 'Medium'],
  ['HARD', 'Hard'],
];

const formatDuration = (ms) => {
  if (ms === null || ms === undefined) return '—';
  const totalSeconds = Math.floor(ms / 1000);
  return `${Math.floor(totalSeconds / 60)}:${String(totalSeconds % 60).padStart(2, '0')}`;
};

export function ProfilePage() {
  const { username } = useParams();
  const currentUser = useAuthStore((state) => state.user);
  const [profile, setProfile] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const data = await userService.getProfile(username);
        if (!cancelled) setProfile(data);
      } catch (err) {
        if (!cancelled) setError(err.message || 'Could not load this profile');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [username]);

  if (loading) {
    return (
      <div className="placeholder-content" style={{ minHeight: '50vh' }}>
        <Spinner label="Loading profile" />
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="page-view">
        <div className="panel placeholder-content">
          <h2>Player not found</h2>
          <p>{error || `There is no player called ${username}.`}</p>
          <Link to="/leaderboard">
            <Button variant="secondary">
              <ArrowLeft size={16} /> Leaderboard
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  const { user, ratingHistory, solved, recentBattles } = profile;
  const isMe = currentUser?.username === user.username;
  const peak = ratingHistory.length ? Math.max(...ratingHistory.map((point) => point.rating)) : user.rating;
  const maxSolved = Math.max(1, solved.EASY, solved.MEDIUM, solved.HARD);

  return (
    <div className="page-view animate-fade-in">
      <header className="page-header profile-header">
        <div className="profile-identity">
          <span className="profile-initials" aria-hidden="true">
            {user.username.slice(0, 2).toUpperCase()}
          </span>
          <div>
            <h1 className="page-title">{user.username}</h1>
            <p className="page-subtitle">
              Joined {new Date(user.joinedAt).toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}
              {isMe && ' · this is you'}
            </p>
          </div>
        </div>
        {isMe && (
          <div className="header-actions">
            <Link to="/battles">
              <Button variant="primary">
                <Swords size={16} /> New battle
              </Button>
            </Link>
          </div>
        )}
      </header>

      <section className="scorecard" aria-label="Standing">
        <div>
          <span className="eyebrow">Rating</span>
          <span className="scorecard-value">{user.rating}</span>
        </div>
        <div>
          <span className="eyebrow">Rank</span>
          <span className="scorecard-value">{user.rank ? `#${user.rank}` : '—'}</span>
        </div>
        <div>
          <span className="eyebrow">W / L / D</span>
          <span className="scorecard-value">
            {user.wins}/{user.losses}/{user.draws}
          </span>
        </div>
        <div>
          <span className="eyebrow">Peak</span>
          <span className="scorecard-value">{peak}</span>
        </div>
      </section>

      <div className="dash-grid">
        <section className="panel" aria-labelledby="history-title">
          <div className="panel-head">
            <h2 id="history-title" className="section-title">
              Rating history
            </h2>
            <span className="eyebrow">{Math.max(0, ratingHistory.length - 1)} battles</span>
          </div>
          <div className="panel-body">
            <RatingChart points={ratingHistory} />
          </div>
        </section>

        <section className="panel" aria-labelledby="solved-title">
          <div className="panel-head">
            <h2 id="solved-title" className="section-title">
              Problems solved
            </h2>
            <span className="eyebrow">{solved.total} total</span>
          </div>
          <div className="panel-body solved-bars">
            {DIFFICULTY_ROWS.map(([key, label]) => (
              <div key={key} className="solved-bar-row">
                <span className={`difficulty-badge ${key.toLowerCase()}`}>{label}</span>
                <span className="solved-bar-track">
                  <span className={`solved-bar-fill ${key.toLowerCase()}`} style={{ width: `${(solved[key] / maxSolved) * 100}%` }} />
                </span>
                <span className="mono solved-bar-count">{solved[key]}</span>
              </div>
            ))}
          </div>
        </section>
      </div>

      <section className="panel" aria-labelledby="battles-title">
        <div className="panel-head">
          <h2 id="battles-title" className="section-title">
            Recent battles
          </h2>
        </div>
        {recentBattles.length === 0 ? (
          <div className="placeholder-content">
            <p>No finished battles yet.</p>
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
                {recentBattles.map((battle) => (
                  <tr key={battle.roomCode} className="battle-log-row">
                    <td>
                      <span className={`result-pill ${battle.result.toLowerCase()}`} title={battle.result}>
                        {RESULT_LETTER[battle.result]}
                      </span>
                    </td>
                    <td>
                      <PlayerLink username={battle.opponent?.username} />
                      {battle.endReason === 'FORFEIT' && <span className="muted"> · forfeit</span>}
                      {battle.endReason === 'TIMEOUT' && <span className="muted"> · time ran out</span>}
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
  );
}
