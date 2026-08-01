import { Card } from '../components/ui';
import { Trophy } from 'lucide-react';

export function LeaderboardPage() {
  return (
    <div className="page-view animate-fade-in">
      <header className="page-header">
        <div>
          <h1 className="page-title">Global Leaderboard</h1>
          <p className="page-subtitle">Top algorithm competitors and season rankings.</p>
        </div>
      </header>
      <Card>
        <div className="placeholder-content">
          <Trophy size={48} className="placeholder-icon" />
          <h2>Global Rankings</h2>
          <p>Compete across ELO brackets and earn badges for your developer profile.</p>
        </div>
      </Card>
    </div>
  );
}
