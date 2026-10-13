import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, CheckCircle2, CircleDot, Search } from 'lucide-react';
import { Button, Spinner } from '../components/ui';
import { problemService } from '../services/problemService';
import { submissionService } from '../services/submissionService';

const STATUS_FILTERS = [
  { value: 'ALL', label: 'Any status' },
  { value: 'UNSOLVED', label: 'Unsolved' },
  { value: 'SOLVED', label: 'Solved' },
];

const EMPTY_PROGRESS = { solved: new Set(), attempted: new Set() };

const FILTERS = [
  { value: 'ALL', label: 'All' },
  { value: 'EASY', label: 'Easy' },
  { value: 'MEDIUM', label: 'Medium' },
  { value: 'HARD', label: 'Hard' },
];

const DIFFICULTY_ORDER = { EASY: 0, MEDIUM: 1, HARD: 2 };

export function ProblemsPage() {
  const [problems, setProblems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [query, setQuery] = useState('');
  const [difficulty, setDifficulty] = useState('ALL');
  const [status, setStatus] = useState('ALL');
  const [progress, setProgress] = useState(EMPTY_PROGRESS);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let cancelled = false;

    async function fetchProblems() {
      try {
        setLoading(true);
        setError(null);
        // Progress is optional: the list still works if it fails.
        const [data, progressData] = await Promise.all([
          problemService.getProblems(),
          submissionService.getMyProgress().catch(() => null),
        ]);
        if (cancelled) return;
        setProblems(data.problems || []);
        setProgress(
          progressData
            ? {
                solved: new Set(progressData.solvedProblemIds),
                attempted: new Set(progressData.attemptedProblemIds),
              }
            : EMPTY_PROGRESS
        );
      } catch (err) {
        if (!cancelled) setError(err.message || 'Failed to load problems');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchProblems();
    return () => {
      cancelled = true;
    };
  }, [reloadKey]);

  const counts = useMemo(() => {
    const result = { ALL: problems.length, EASY: 0, MEDIUM: 0, HARD: 0 };
    problems.forEach((problem) => {
      result[problem.difficulty] = (result[problem.difficulty] || 0) + 1;
    });
    return result;
  }, [problems]);

  const visible = useMemo(() => {
    const search = query.trim().toLowerCase();
    return problems
      .filter((problem) => difficulty === 'ALL' || problem.difficulty === difficulty)
      .filter((problem) => {
        if (status === 'SOLVED') return progress.solved.has(problem.id);
        if (status === 'UNSOLVED') return !progress.solved.has(problem.id);
        return true;
      })
      .filter((problem) => !search || problem.title.toLowerCase().includes(search))
      .sort((a, b) => DIFFICULTY_ORDER[a.difficulty] - DIFFICULTY_ORDER[b.difficulty] || a.title.localeCompare(b.title));
  }, [problems, query, difficulty, status, progress]);

  const solvedCount = problems.filter((problem) => progress.solved.has(problem.id)).length;

  return (
    <div className="page-view animate-fade-in">
      <header className="page-header">
        <div>
          <h1 className="page-title">Problems</h1>
          <p className="page-subtitle">
            Practice on the same problems battles draw from. Each one has public samples to run against and hidden tests
            for the final verdict.
          </p>
        </div>
        {problems.length > 0 && (
          <div className="solved-meter" aria-label={`${solvedCount} of ${problems.length} solved`}>
            <span className="mono">
              <strong>{solvedCount}</strong> / {problems.length} solved
            </span>
            <span className="solved-meter-bar">
              <span style={{ width: `${(solvedCount / problems.length) * 100}%` }} />
            </span>
          </div>
        )}
      </header>

      <section className="panel" aria-label="Problem list">
        <div className="toolbar-row">
          <div className="segmented" role="group" aria-label="Filter by difficulty">
            {FILTERS.map((filter) => (
              <button
                key={filter.value}
                type="button"
                aria-pressed={difficulty === filter.value}
                onClick={() => setDifficulty(filter.value)}
              >
                {filter.label} <span className="mono muted">{counts[filter.value] ?? 0}</span>
              </button>
            ))}
          </div>

          <div className="segmented" role="group" aria-label="Filter by status">
            {STATUS_FILTERS.map((filter) => (
              <button
                key={filter.value}
                type="button"
                aria-pressed={status === filter.value}
                onClick={() => setStatus(filter.value)}
              >
                {filter.label}
              </button>
            ))}
          </div>

          <label className="search-field" htmlFor="problem-search" style={{ flex: '1 1 220px', maxWidth: '320px' }}>
            <Search size={15} />
            <input
              id="problem-search"
              className="input"
              type="search"
              placeholder="Search by title"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
          </label>
        </div>

        {loading ? (
          <div className="placeholder-content">
            <Spinner label="Loading problems" />
          </div>
        ) : error ? (
          <div className="placeholder-content">
            <h3>Could not load problems</h3>
            <p>{error}</p>
            <Button variant="secondary" onClick={() => setReloadKey((key) => key + 1)}>
              Try again
            </Button>
          </div>
        ) : visible.length === 0 ? (
          <div className="placeholder-content">
            <h3>{problems.length === 0 ? 'No problems yet' : 'No matches'}</h3>
            <p>
              {problems.length === 0
                ? 'An admin can import problems with npm run import:problems.'
                : 'Try a different title, difficulty or status.'}
            </p>
          </div>
        ) : (
          <div className="sheet-table-wrap">
            <table className="sheet-table">
              <thead>
                <tr>
                  <th className="index">#</th>
                  <th className="status-col">Status</th>
                  <th>Title</th>
                  <th>Difficulty</th>
                  <th aria-label="Open" />
                </tr>
              </thead>
              <tbody>
                {visible.map((problem, index) => (
                  <tr key={problem.id}>
                    <td className="index">{String(index + 1).padStart(3, '0')}</td>
                    <td className="status-col">
                      {progress.solved.has(problem.id) ? (
                        <span className="progress-mark solved" title="Solved">
                          <CheckCircle2 size={16} />
                          <span className="sr-only">Solved</span>
                        </span>
                      ) : progress.attempted.has(problem.id) ? (
                        <span className="progress-mark attempted" title="Attempted, not solved yet">
                          <CircleDot size={16} />
                          <span className="sr-only">Attempted</span>
                        </span>
                      ) : null}
                    </td>
                    <td>
                      <Link to={`/problems/${problem.slug}`} className="row-link">
                        {problem.title}
                      </Link>
                    </td>
                    <td>
                      <span className={`difficulty-badge ${problem.difficulty.toLowerCase()}`}>{problem.difficulty}</span>
                    </td>
                    <td className="numeric">
                      <Link to={`/problems/${problem.slug}`} aria-label={`Solve ${problem.title}`} className="muted">
                        <ArrowRight size={16} />
                      </Link>
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
