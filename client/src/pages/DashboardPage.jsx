import { useEffect, useState } from 'react';
import { Zap, Code2, Swords, Trophy, ArrowUpRight } from 'lucide-react';
import { Card, Button, Spinner } from '../components/ui';
import { useAuthStore } from '../store/useAuthStore';
import { problemService } from '../services/problemService';
import { Link } from 'react-router-dom';

export function DashboardPage() {
  const user = useAuthStore((state) => state.user);
  const username = user?.username || 'Developer';
  const rating = user?.rating || 1500;

  const [totalProblems, setTotalProblems] = useState(0);
  const [recommendedProblem, setRecommendedProblem] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadDashboardData() {
      try {
        setLoading(true); 
        const data = await problemService.getProblems();
        const problems = data.problems || [];
        setTotalProblems(problems.length);
        if (problems.length > 0) {
          setRecommendedProblem(problems[0]);
        }
      } catch (err) {
        // Fallback gracefully if backend is seeding
      } finally {
        setLoading(false);
      }
    }
    loadDashboardData();
  }, []); // to get the total number of problems and recommended problem from the backend 

  return (
    <div className="dashboard-view animate-fade-in">
      <header className="page-header">
        <div>
          <h1 className="page-title">Welcome back, {username} </h1>
          <p className="page-subtitle">Track your rank, hone your coding skills, and challenge rivals in real-time.</p>
        </div>
        <div className="header-actions">
          <Link to="/battles">
            <Button variant="primary">
              <Swords size={16} />
              <span>Quick Match</span>
            </Button>
          </Link>
        </div>
      </header>

      <div className="stats-grid">
        <Card className="stat-card">
          {/* <div className="stat-icon-wrap accent-blue">
            <Code2 size={20} />
          </div> */}
          <div className="stat-info">
            <span className="stat-label">Available Problems</span>
            <span className="stat-value">{loading ? '...' : totalProblems}</span>
          </div>
          {/* <span className="stat-trend positive">
            Live Database <ArrowUpRight size={14} />
          </span> */}
        </Card>

        <Card className="stat-card">
          {/* <div className="stat-icon-wrap accent-amber">
            <Trophy size={20} />
          </div> */}
          <div className="stat-info">
            <span className="stat-label">Arena Rating</span>
            <span className="stat-value">{rating} ELO</span>
          </div>
          {/* <span className="stat-trend positive">
            Ranked Tier <ArrowUpRight size={14} />
          </span> */}
        </Card>

        {/* <Card className="stat-card">
          <div className="stat-icon-wrap accent-emerald">
            <Zap size={20} />
          </div>
          <div className="stat-info">
            <span className="stat-label">Current Streak</span>
            <span className="stat-value">7 Days 🔥</span>
          </div>
          <span className="stat-subtext">Active Developer</span>
        </Card> */}
      </div>

      <div className="dashboard-content-grid">
        <Card className="content-card">
          <div className="card-title-row">
            <h2>Recommended Problem</h2>
            <span className="difficulty-badge medium">
              {recommendedProblem?.difficulty || 'Medium'}
            </span>
          </div>
          <p className="problem-title">
            {recommendedProblem?.title || 'LRU Cache Implementation'}
          </p>
          <p className="problem-desc">
            {recommendedProblem?.description ||
              'Design a data structure that follows the constraints of a Least Recently Used (LRU) cache with O(1) time complexity operations.'}
          </p>
          <div className="card-footer-action">
            <Link to={recommendedProblem ? `/problems/${recommendedProblem.slug}` : '/problems'}>
              <Button variant="secondary" size="small">Solve Problem</Button>
            </Link>
          </div>
        </Card>

        <Card className="content-card">
          <div className="card-title-row">
            <h2>Active Tournament</h2>
            {/* <span className="live-pill">LIVE</span> */}
          </div>
          <p className="problem-title">Weekend Algorithm Sprint #42</p>
          <p className="problem-desc">
            30-minute speed-coding battle against registered global developers.
          </p>
          <div className="card-footer-action">
            <Link to="/battles">
              <Button variant="primary" size="small">Join Arena</Button>
            </Link>
          </div>
        </Card>
      </div>
    </div>
  );
}
