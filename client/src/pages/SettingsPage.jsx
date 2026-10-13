import { Check } from 'lucide-react';
import { useThemeStore } from '../store/useThemeStore';
import { useAuthStore } from '../store/useAuthStore';

const THEMES = [
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
];

export function SettingsPage() {
  const theme = useThemeStore((state) => state.theme);
  const toggleTheme = useThemeStore((state) => state.toggleTheme);
  const user = useAuthStore((state) => state.user);

  return (
    <div className="page-view animate-fade-in">
      <header className="page-header">
        <div>
          <h1 className="page-title">Settings</h1>
          <p className="page-subtitle">Your profile and how CodeArena looks on this device.</p>
        </div>
      </header>

      <section className="panel" aria-labelledby="profile-title">
        <div className="panel-head">
          <h2 id="profile-title" className="section-title">
            Profile
          </h2>
        </div>
        <dl className="panel-body" style={{ display: 'grid', gridTemplateColumns: 'max-content minmax(0, 1fr)', gap: '10px 28px' }}>
          <dt className="eyebrow">Handle</dt>
          <dd>{user?.username || '—'}</dd>
          <dt className="eyebrow">Email</dt>
          <dd>{user?.email || '—'}</dd>
          <dt className="eyebrow">Rating</dt>
          <dd className="mono">{user?.rating ?? '—'}</dd>
        </dl>
      </section>

      <section className="panel" aria-labelledby="theme-title">
        <div className="panel-head">
          <h2 id="theme-title" className="section-title">
            Appearance
          </h2>
        </div>
        <div className="panel-body">
          <div className="theme-choices" role="group" aria-label="Theme">
            {THEMES.map((option) => (
              <button
                key={option.value}
                type="button"
                className="theme-choice"
                aria-pressed={theme === option.value}
                onClick={() => theme !== option.value && toggleTheme()}
              >
                <span className={`theme-swatch ${option.value}`} aria-hidden="true">
                  <span className="flag" />
                  <span />
                  <span />
                </span>
                <span className="theme-choice-label">
                  {option.label}
                  {theme === option.value && <Check size={15} />}
                </span>
              </button>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
