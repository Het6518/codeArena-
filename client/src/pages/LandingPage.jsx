import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  Clock3,
  Code2,
  Gauge,
  PanelsTopLeft,
  Scale,
  Swords,
  Timer,
  Trophy,
  Zap,
} from 'lucide-react';
import { Button } from '../components/ui';
import { ThemeToggle } from '../components/common/ThemeToggle';
import { VerdictBadge } from '../components/common/VerdictBadge';
import { useAuthStore } from '../store/useAuthStore';
import { problemService } from '../services/problemService';

const STEPS = [
  {
    title: 'Create a room',
    text: 'Get a six-character room code and send it to your opponent.',
  },
  {
    title: 'Ready up',
    text: 'When both players are ready, the server picks a random problem and starts the clock.',
  },
  {
    title: 'Solve',
    text: 'Write in JavaScript, Python, C++ or Java. Run against the samples as often as you like.',
  },
  {
    title: 'Submit',
    text: 'Every submission is judged against all tests, hidden ones included. The first accepted submission the server receives wins.',
  },
];

const FEATURES = [
  {
    icon: Code2,
    title: 'Practice library',
    text: 'Codeforces problems sorted into Easy, Medium and Hard, each with public samples and hidden tests. Run, submit and review your history per problem.',
  },
  {
    icon: Scale,
    title: 'Judged by the server',
    text: 'Battles are decided by when the server received each accepted submission, not by whose result came back first. A simultaneous solve is a draw.',
  },
  {
    icon: Trophy,
    title: 'Elo ratings',
    text: 'Everyone starts at 1200. Beating a stronger player earns more than beating a weaker one, and the leaderboard updates the moment a battle ends.',
  },
  {
    icon: PanelsTopLeft,
    title: 'A real editor',
    text: 'Monaco, the editor inside VS Code, with problem, editor and console panels you can drag to the size you like.',
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

  const primaryCta = isAuthenticated ? (
    <Link to="/dashboard">
      <Button variant="primary">
        Open dashboard <ArrowRight size={16} />
      </Button>
    </Link>
  ) : (
    <Link to="/register">
      <Button variant="primary">
        Create a free account <ArrowRight size={16} />
      </Button>
    </Link>
  );

  return (
    <div className="landing">
      <header className="landing-header">
        <Link to="/" className="navbar-logo-link" aria-label="CodeArena home">
          <span className="brand-title">
            Code<span className="brand-highlight">Arena</span>
          </span>
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
            {/* <p className="landing-eyebrow"> */}
              {/* <Swords size={14} /> 1v1 competitive programming */}
            {/* </p> */}
            <h1>
              Same problem. Same clock.
              <br />
              <span className="brand-highlight">First accepted wins.</span>
            </h1>
            <p className="landing-lede">
              Open a private room, share the code with a friend, and race through the same Codeforces problem. Every
              submission is judged on the server against hidden tests, and your rating moves with every battle.
            </p>
            <div className="landing-cta-row">
              {primaryCta}
              <Link to={isAuthenticated ? '/problems' : '/login'}>
                <Button variant="secondary">{isAuthenticated ? 'Browse problems' : 'Sign in'}</Button>
              </Link>
            </div>
            <ul className="landing-facts" aria-label="Platform facts">
              <li>
                <Code2 size={15} />
                {problemCount === null ? 'Codeforces problem library' : `${problemCount} problems to practice`}
              </li>
              <li>
                <Zap size={15} /> JavaScript · Python · C++ · Java
              </li>
              <li>
                <Gauge size={15} /> Elo rated, starting at 1200
              </li>
            </ul>
          </div>

          <figure className="arena-preview" aria-label="Preview of the battle arena">
            <div className="arena-preview-hud">
              <span className="live-pill">
                <Zap size={12} /> BATTLE LIVE
              </span>
              <span className="arena-preview-timer">
                <Timer size={15} /> 04:37
              </span>
              <span className="arena-preview-room">Room K7Q2MX</span>
            </div>

            <div className="arena-preview-players">
              <div className="arena-preview-player me">
                <span>You</span>
                <span className="status-indicator solved">SOLVED</span>
              </div>
              <span className="vs-divider">VS</span>
              <div className="arena-preview-player">
                <span>rival_dev</span>
                <span className="status-indicator">WRONG ANSWER</span>
              </div>
            </div>

            <div className="arena-preview-body">
              <div className="arena-preview-problem">
                <span className="difficulty-badge easy">EASY</span>
                <strong>Vova and Train</strong>
                <span className="arena-preview-source">Codeforces 1066A</span>
              </div>
              <pre className="arena-preview-code" aria-label="Example C++ solution">
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
            </div>

            <div className="arena-preview-verdict">
              <VerdictBadge status="ACCEPTED" compact />
              <span>6/6 tests passed</span>
              <span className="arena-preview-metric">
                <Clock3 size={13} /> 42 ms
              </span>
            </div>
            <figcaption>Example battle. Times and names are illustrative.</figcaption>
          </figure>
        </section>

        <section className="landing-section" id="how-it-works" aria-labelledby="how-title">
          <div className="landing-section-head">
            <h2 id="how-title">How a battle works</h2>
            <p>From room code to rating change in four steps.</p>
          </div>
          <ol className="landing-steps">
            {STEPS.map((step, index) => (
              <li key={step.title}>
                <span className="landing-step-number">{index + 1}</span>
                <h3>{step.title}</h3>
                <p>{step.text}</p>
              </li>
            ))}
          </ol>
        </section>

        <section className="landing-section" id="features" aria-labelledby="features-title">
          <div className="landing-section-head">
            <h2 id="features-title">Built for fair, fast duels</h2>
            <p>Everything that decides a result happens on the server.</p>
          </div>
          <div className="landing-features">
            {FEATURES.map(({ icon: Icon, title, text }) => (
              <article key={title} className="landing-feature">
                <span className="landing-feature-icon">
                  <Icon size={18} />
                </span>
                <h3>{title}</h3>
                <p>{text}</p>
              </article>
            ))}
          </div>

          <div className="landing-verdicts">
            <span className="landing-verdicts-label">Verdicts you will see</span>
            <div className="landing-verdicts-list">
              {VERDICTS.map((status) => (
                <VerdictBadge key={status} status={status} compact />
              ))}
            </div>
          </div>
        </section>

        <section className="landing-cta-band" aria-labelledby="cta-title">
          <div>
            <h2 id="cta-title">Challenge someone today.</h2>
            <p>Create a room, send the code, and see who solves it first.</p>
          </div>
          {primaryCta}
        </section>
      </main>

      <footer className="landing-footer">
        <span>
          Code<span className="brand-highlight">Arena</span>
        </span>
        <span>Problems from Codeforces via DeepMind CodeContests (CC BY 4.0).</span>
      </footer>
    </div>
  );
}
