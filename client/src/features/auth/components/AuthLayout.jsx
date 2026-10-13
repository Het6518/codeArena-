import { Link } from 'react-router-dom';
import { Logo } from '../../../components/common/Logo';
import { ThemeToggle } from '../../../components/common/ThemeToggle';

const HOUSE_RULES = [
  'Both players get the same problem at the same moment.',
  'Every submission runs against hidden tests on the server.',
  'The first accepted submission the server receives wins.',
  'Leaving mid-battle is a forfeit. Ratings move either way.',
];

export function AuthLayout({ children, eyebrow, title, description, footerText, footerLinkText, footerTo }) {
  return (
    <main className="auth-page auth-split">
      <aside className="auth-side-panel" aria-label="About CodeArena">
        <div className="auth-side-top">
          <Link to="/" aria-label="CodeArena home">
            <Logo />
          </Link>
          <ThemeToggle />
        </div>

        <div className="auth-side-content">
          <h2>
            Same problem. <mark>Same clock.</mark>
          </h2>
          <p>Private 1v1 rooms, Codeforces problems and Elo ratings. Practice alone or race a friend.</p>
        </div>

        <ol className="auth-rules" aria-label="Battle rules">
          {HOUSE_RULES.map((rule, index) => (
            <li key={rule}>
              <span>{String(index + 1).padStart(2, '0')}</span>
              {rule}
            </li>
          ))}
        </ol>
      </aside>

      <section className="auth-form-panel">
        <div>
          <div className="auth-mobile-top">
            <Link to="/" aria-label="CodeArena home">
              <Logo compact />
            </Link>
            <ThemeToggle />
          </div>

          <section className="auth-card" aria-labelledby="auth-title">
            <div className="auth-header">
              {eyebrow && <p className="auth-eyebrow">{eyebrow}</p>}
              <div className="auth-title-group">
                <h1 id="auth-title">{title}</h1>
                <p>{description}</p>
              </div>
            </div>

            {children}

            <p className="auth-footer">
              {footerText} <Link to={footerTo}>{footerLinkText}</Link>
            </p>
          </section>
        </div>
      </section>
    </main>
  );
}
