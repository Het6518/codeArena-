import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Clock3, Code2, PanelsTopLeft, Scale, Trophy } from 'lucide-react';
import { Button } from '../components/ui';
import { Logo } from '../components/common/Logo';
import { ThemeToggle } from '../components/common/ThemeToggle';
import { VerdictBadge } from '../components/common/VerdictBadge';
import { useAuthStore } from '../store/useAuthStore';
import { problemService } from '../services/problemService';

const STEPS = [
  { title: 'Create a room', text: 'You get a six-character code. Send it to your opponent.' },
  { title: 'Ready up', text: 'When both players are ready, the server picks a random problem and starts the clock.' },
  { title: 'Solve', text: 'Write in JavaScript, Python, C++ or Java. Run against the samples as often as you like.' },
  {
    title: 'Submit',
    text: 'Each submission is judged against every test, hidden ones included. The first accepted one the server receives wins.',
  },
];

const SPECS = [
  {
    icon: Code2,
    title: 'Practice library',
    text: 'Codeforces problems sorted into Easy, Medium and Hard, each with public samples and hidden tests. Run, submit and review your history per problem.',
  },
  {
    icon: Scale,
    title: 'Judged by the server',
    text: 'Results are decided by when the server received each accepted submission, not by whose result came back first. A same-millisecond solve is a draw.',
  },
  {
    icon: Trophy,
    title: 'Elo ratings',
    text: 'Everyone starts at 1200. An upset earns more than an expected win, and the leaderboard updates the moment a battle ends.',
  },
  {
    icon: PanelsTopLeft,
    title: 'A proper editor',
    text: 'Monaco, the editor inside VS Code, with problem, editor and console panels you can drag to any size.',
  },
];

const VERDICTS = ['ACCEPTED', 'WRONG_ANSWER', 'TIME_LIMIT_EXCEEDED', 'RUNTIME_ERROR', 'COMPILATION_ERROR'];

const PREVIEW_CODE = [
  ['kw', 'int'], ['', ' t; cin >> t;\n'],
  ['kw', 'while'], ['', ' (t--) {\n  '],
  ['kw', 'long long'], ['', ' L, v, l, r;\n  cin >> L >> v >> l >> r;\n  cout << L / v - (r / v - (l - '],
  ['num', '1'], ['', ') / v) << '],
  ['str', "'\\n'"], ['', ';\n}'],
];

export function LandingPage() {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const [problemCount, setProblemCount] = useState(null);

  useEffect(() => {
    let cancelled = false;
    problemService
      .getProblems()
      .then((data) => {
        if (!cancelled) setProblemCount(data.problems?.length ?? null);
      })
      .catch(() => {
        // The count is optional; the page reads fine without it.
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const primaryCta = (
    <Link to={isAuthenticated ? '/dashboard' : '/register'}>
      <Button variant="primary" size="large">
        {isAuthenticated ? 'Open dashboard' : 'Create a free account'} <ArrowRight size={16} />
      </Button>
    </Link>
  );

  return (
    <div className="landing">
      <header className="landing-header">
        <Link to="/" aria-label="CodeArena home">
          <Logo />
        </Link>

        <nav className="landing-header-links" aria-label="Page sections">
          <a href="#how-it-works">How it works</a>
          <a href="#features">Features</a>
        </nav>

        <div className="landing-header-actions">
          <ThemeToggle />
          {isAuthenticated ? (
            <Link to="/dashboard">
              <Button variant="primary">Dashboard</Button>
            </Link>
          ) : (
            <>
              <Link to="/login" className="landing-signin">
                Sign in
              </Link>
              <Link to="/register">
                <Button variant="primary">Get started</Button>
              </Link>
            </>
          )}
        </div>
      </header>

      <main>
        <section className="landing-hero">
          <div className="landing-hero-copy">
            <h1>
              Same problem.
              <br />
              Same clock.
              <br />
              <mark>First accepted wins.</mark>
            </h1>
            <p className="landing-lede">
              Open a private room, share the code with a friend, and race through the same Codeforces problem. Every
              submission is judged on the server against hidden tests, and your rating moves with every battle.
            </p>
            <div className="landing-cta-row">
              {primaryCta}
              <Link to={isAuthenticated ? '/problems' : '/login'}>
                <Button variant="secondary" size="large">
                  {isAuthenticated ? 'Browse problems' : 'Sign in'}
                </Button>
              </Link>
            </div>
            <ul className="landing-facts" aria-label="Platform facts">
              <li>
                <strong>{problemCount ?? '—'}</strong>
                <span>problems to practice</span>
              </li>
              <li>
                <strong>4</strong>
                <span>languages</span>
              </li>
              <li>
                <strong>1200</strong>
                <span>starting rating</span>
              </li>
            </ul>
          </div>

          <figure className="device" aria-label="Preview of a battle">
            <div className="device-clock">
              <div className="device-buttons" aria-hidden="true">
                <span />
                <span />
              </div>
              <div className="device-faces">
                <div className="device-face running">
                  <span className="device-face-name">You</span>
                  <span className="device-face-time">04:37</span>
                  <span className="device-face-state">SOLVED</span>
                </div>
                <div className="device-face">
                  <span className="device-face-name">rival_dev</span>
                  <span className="device-face-time">04:37</span>
                  <span className="device-face-state">WRONG ANSWER ON TEST 3</span>
                </div>
              </div>
            </div>

            <div className="device-card">
              <div className="device-card-head">
                <span className="difficulty-badge easy">Easy</span>
                <strong>Vova and Train</strong>
                <span className="muted">CF 1066A · C++</span>
              </div>
              <pre className="device-code" aria-label="Example C++ solution">
                {PREVIEW_CODE.map(([kind, text], index) =>
                  kind ? (
                    <span key={index} className={`tok-${kind}`}>
                      {text}
                    </span>
                  ) : (
                    text
                  )
                )}
              </pre>
              <div className="device-verdict">
                <VerdictBadge status="ACCEPTED" compact />
                <span>6/6 tests passed</span>
                <span className="metric-tag">
                  <Clock3 size={13} /> 42 ms
                </span>
              </div>
            </div>
            <figcaption className="device-caption">Example battle. Names and times are illustrative.</figcaption>
          </figure>
        </section>

        <section className="landing-section" id="how-it-works" aria-labelledby="how-title">
          <div className="landing-section-head">
            <h2 id="how-title">How a battle runs</h2>
            <p>From room code to rating change in four steps.</p>
          </div>
          <ol className="landing-steps">
            {STEPS.map((step, index) => (
              <li key={step.title}>
                <span className="landing-step-number">{String(index + 1).padStart(2, '0')}</span>
                <h3>{step.title}</h3>
                <p>{step.text}</p>
              </li>
            ))}
          </ol>
        </section>

        <section className="landing-section" id="features" aria-labelledby="features-title">
          <div className="landing-section-head">
            <h2 id="features-title">Built for fair duels</h2>
            <p>Everything that decides a result happens on the server.</p>
          </div>
          <div>
            <dl className="spec-list">
              {SPECS.map(({ icon: Icon, title, text }) => (
                <div key={title} className="spec-row">
                  <dt>
                    <Icon size={17} /> {title}
                  </dt>
                  <dd>{text}</dd>
                </div>
              ))}
            </dl>
            <div className="landing-verdicts" aria-label="Verdicts the judge returns">
              <span className="eyebrow">Verdicts</span>
              {VERDICTS.map((status) => (
                <VerdictBadge key={status} status={status} compact />
              ))}
            </div>
          </div>
        </section>

        <section className="landing-cta-band" aria-labelledby="cta-title">
          <div>
            <h2 id="cta-title">Your move.</h2>
            <p>Create a room, send the code, and find out who solves it first.</p>
          </div>
          {primaryCta}
        </section>
      </main>

      <footer className="landing-footer">
        <Logo compact />
        <span>Problems from Codeforces via DeepMind CodeContests (CC BY 4.0).</span>
      </footer>
    </div>
  );
}
