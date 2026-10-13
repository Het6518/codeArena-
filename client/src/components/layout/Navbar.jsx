import { useEffect, useState } from 'react';
import { Link, NavLink } from 'react-router-dom';
import { Code2, LayoutDashboard, Menu, Swords, Trophy, X } from 'lucide-react';
import { Logo } from '../common/Logo';
import { ThemeToggle } from '../common/ThemeToggle';
import { UserMenu } from './UserMenu';

const NAV_ITEMS = [
  { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/problems', label: 'Problems', icon: Code2 },
  { path: '/battles', label: 'Battles', icon: Swords },
  { path: '/leaderboard', label: 'Leaderboard', icon: Trophy },
];

export function Navbar() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    if (!isMobileMenuOpen) return undefined;

    function handleKeyDown(event) {
      if (event.key === 'Escape') setIsMobileMenuOpen(false);
    }

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isMobileMenuOpen]);

  return (
    <header className="app-navbar">
      <div className="navbar-left">
        <button
          type="button"
          className="mobile-menu-btn"
          onClick={() => setIsMobileMenuOpen((open) => !open)}
          aria-label={isMobileMenuOpen ? 'Close navigation menu' : 'Open navigation menu'}
          aria-expanded={isMobileMenuOpen}
          aria-controls="mobile-nav"
        >
          {isMobileMenuOpen ? <X size={18} /> : <Menu size={18} />}
        </button>

        <Link to="/dashboard" className="navbar-logo-link" aria-label="CodeArena dashboard">
          <Logo />
        </Link>

        <nav className="topnav" aria-label="Main navigation">
          {NAV_ITEMS.map(({ path, label, icon: Icon }) => (
            <NavLink key={path} to={path} className={({ isActive }) => `topnav-link${isActive ? ' active' : ''}`}>
              <Icon size={15} />
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>
      </div>

      <div className="navbar-right">
        <ThemeToggle />
        <div className="navbar-vr" />
        <UserMenu />
      </div>

      {isMobileMenuOpen && (
        <>
          <div className="mobile-nav-backdrop" onClick={() => setIsMobileMenuOpen(false)} aria-hidden="true" />
          <nav id="mobile-nav" className="mobile-nav animate-fade-in" aria-label="Main navigation">
            {NAV_ITEMS.map(({ path, label, icon: Icon }) => (
              <NavLink
                key={path}
                to={path}
                onClick={() => setIsMobileMenuOpen(false)}
                className={({ isActive }) => `mobile-nav-link${isActive ? ' active' : ''}`}
              >
                <Icon size={18} />
                <span>{label}</span>
              </NavLink>
            ))}
          </nav>
        </>
      )}
    </header>
  );
}
