import { Search, Menu, X, Command, Activity } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Logo } from '../common/Logo';
import { ThemeToggle } from '../common/ThemeToggle';
import { UserMenu } from './UserMenu';

export function Navbar({ onToggleMobileSidebar, isMobileSidebarOpen }) {
  return (
    <header className="app-navbar">
      <div className="navbar-left">
        <button
          type="button"
          className="mobile-menu-btn"
          onClick={onToggleMobileSidebar}
          aria-label={isMobileSidebarOpen ? 'Close navigation sidebar' : 'Open navigation sidebar'}
        >
          {isMobileSidebarOpen ? <X size={20} /> : <Menu size={20} />}
        </button>

        <Link to="/dashboard" className="navbar-logo-link" aria-label="CodeArena Home">
          <Logo compact />
          <span className="brand-title">
            Code<span className="brand-highlight">Arena</span>
          </span>
        </Link>

        {/* <div className="navbar-ping-badge" title="System Latency">
          <Activity size={12} className="pulse-icon" />
          <span>EU-West: 38ms</span>
        </div> */}
      </div>

      <div className="navbar-center">
        <button type="button" className="navbar-search-btn" onClick={() => {}}>
          <Search size={15} />
          <span className="search-placeholder">Search problems, arenas, users...</span>
          {/* <kbd className="search-kbd">
            <Command size={11} /> K
          </kbd> */}
        </button>
      </div>

      <div className="navbar-right">
        <ThemeToggle />
        <div className="navbar-vr" />
        <UserMenu />
      </div>
    </header>
  );
}
