import { Link } from 'react-router-dom';
import { Logo } from '../../../components/common/Logo';
import { ThemeToggle } from '../../../components/common/ThemeToggle';

export function AuthLayout({ children, eyebrow, title, description, footerText, footerLinkText, footerTo }) {
  return (
    <main className="auth-page auth-split">
      <aside className="auth-side-panel" aria-label="CodeArena product summary">
        <div className="auth-side-top">
          <Logo />
          <ThemeToggle />
        </div>

        <div className="auth-side-content">
          <p className="auth-eyebrow">CodeArena</p>
          <h2>Competitive programming, built like a developer tool.</h2>
          <p>Practice problems, real-time battles, submissions, and rankings share one clean interface.</p>
        </div>

        <dl className="auth-side-stats" aria-label="Platform areas">
          <div>
            <dt>01</dt>
            <dd>Problems</dd>
          </div>
          <div>
            <dt>02</dt>
            <dd>Battles</dd>
          </div>
          <div>
            <dt>03</dt>
            <dd>Submissions</dd>
          </div>
        </dl>
      </aside>

      <section className="auth-form-panel">
        <div className="auth-mobile-top">
          <Logo compact />
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
            {footerText}{' '}
            <Link to={footerTo}>{footerLinkText}</Link>
          </p>
        </section>
      </section>
    </main>
  );
}
