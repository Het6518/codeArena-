import { useEffect, useState } from 'react';
import { Card, Button, Spinner } from '../components/ui';
import { Code2, ArrowUpRight, Search, Filter } from 'lucide-react';
import { problemService } from '../services/problemService';
import { Link } from 'react-router-dom';

export function ProblemsPage() {
  const [problems, setProblems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    async function fetchProblems() {
      try {
        setLoading(true);
        const data = await problemService.getProblems();
        setProblems(data.problems || []);
      } catch (err) {
        setError(err.message || 'Failed to load problems from backend');
      } finally {
        setLoading(false);
      }
    }
    fetchProblems();
  }, []);

  const filteredProblems = problems.filter((p) => 
    p.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.slug?.toLowerCase().includes(searchQuery.toLowerCase())
  );
//The filter() method creates a new array containing only the elements for which the callback returns true. 
  return (
    <div className="page-view animate-fade-in">
      <header className="page-header">
        <div>
          <h1 className="page-title">Problem Repository</h1>
          <p className="page-subtitle">Master algorithms, data structures, and system design challenges.</p>
        </div>
        <div className="header-actions">
          <div className="navbar-search-btn" style={{ minWidth: '240px' }}>
            <Search size={15} />
            <input
              type="text"
              placeholder="Filter problems..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                background: 'transparent',
                border: 'none',
                color: 'inherit',
                outline: 'none',
                width: '100%',
              }}
            />
          </div>
        </div>
      </header>

      {loading ? (
        <Card className="placeholder-content">
          <Spinner label="Connecting to backend & loading problems..." />
        </Card>
      ) : error ? (
        <Card className="placeholder-content">
          <Code2 size={40} style={{ color: 'var(--color-danger)' }} />
          <h3>Error Loading Problems</h3>
          <p>{error}</p>
          <Button variant="secondary" onClick={() => window.location.reload()}>
            Retry Connection
          </Button>
        </Card>
      ) : filteredProblems.length === 0 ? (
        <Card className="placeholder-content">
          <Code2 size={48} className="placeholder-icon" />
          <h2>No Problems Found</h2>
          <p>
            {problems.length === 0
              ? 'No problems created in backend database yet.'
              : 'No problems matching your search filter.'}
          </p>
        </Card>
      ) : (
        <div className="dashboard-content-grid">
          {filteredProblems.map((problem) => (
            <Card key={problem.id} className="content-card">
              <div className="card-title-row">
                <span className="problem-title">{problem.title}</span>
                <span className={`difficulty-badge ${problem.difficulty?.toLowerCase() || 'medium'}`}>
                  {problem.difficulty || 'Medium'}
                </span>
              </div>
              <p className="problem-desc">
                {problem.description || 'Interactive algorithm problem from CodeArena repository.'}
              </p>
              <div className="card-footer-action">
                <Link to={`/problems/${problem.slug}`}>
                  <Button variant="secondary" size="small">
                    Solve Challenge <ArrowUpRight size={14} />
                  </Button>
                </Link>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
