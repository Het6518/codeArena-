import { Card, Button } from '../components/ui';
import { SlidersHorizontal, Moon, Sun } from 'lucide-react';
import { useThemeStore } from '../store/useThemeStore';

export function SettingsPage() {
  const theme = useThemeStore((state) => state.theme);
  const toggleTheme = useThemeStore((state) => state.toggleTheme);

  return (
    <div className="page-view animate-fade-in">
      <header className="page-header">
        <div>
          <h1 className="page-title">Preferences & Settings</h1>
          <p className="page-subtitle">Customize your coding environment, theme, and profile settings.</p>
        </div>
      </header>
      <div className="settings-grid">
        <Card>
          <div className="settings-section">
            <div className="section-header">
              <SlidersHorizontal size={20} />
              <h2>Appearance Theme</h2>
            </div>
            <p className="section-desc">Switch between Light and Dark developer themes.</p>
            <div className="theme-option-row">
              <span>Current Theme: <strong>{theme.toUpperCase()} MODE</strong></span>
              <Button variant="secondary" onClick={toggleTheme}>
                {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
                Switch Theme
              </Button>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
