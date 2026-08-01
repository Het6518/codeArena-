import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Code2,
  Swords,
  Trophy,
  SlidersHorizontal,
  ChevronLeft,
  ChevronRight,
  Terminal,
  Zap,
} from 'lucide-react';

const NAV_ITEMS = [
  {
    path: '/dashboard',
    label: 'Dashboard',
    icon: LayoutDashboard,
    badge: null,
  },
  {
    path: '/problems',
    label: 'Problems',
    icon: Code2,
    badge: null,
  },
  {
    path: '/battles',
    label: 'Battles',
    icon: Swords,
    // badge: 'LIVE',
    // badgeVariant: 'live',
  },
  {
    path: '/leaderboard',
    label: 'Leaderboard',
    icon: Trophy,
    badge: null,
  },
  {
    path: '/settings',
    label: 'Settings',
    icon: SlidersHorizontal,
    badge: null,
  },
];

export function Sidebar({ isCollapsed, onToggleCollapse, isMobileOpen, onCloseMobile }) {
  return (
    <>
      {/* Mobile Backdrop Overlay */}
      {isMobileOpen && (
        <div
          className="sidebar-mobile-backdrop"
          onClick={onCloseMobile}
          aria-hidden="true"
        />
      )}

      <aside
        className={`app-sidebar ${isCollapsed ? 'collapsed' : ''} ${
          isMobileOpen ? 'mobile-open' : ''
        }`}
      >
        <div className="sidebar-header">
          <div className="sidebar-section-title">
            {!isCollapsed && (
              <>
                {/* <Terminal size={14} className="section-icon" /> */}
                <span>NAVIGATION</span>
              </>
            )}
          </div>
          <button
            type="button"
            className="sidebar-collapse-btn"
            onClick={onToggleCollapse}
            aria-label={isCollapsed ? 'Expand sidebar navigation' : 'Collapse sidebar navigation'}
            title={isCollapsed ? 'Expand navigation (Ctrl+B)' : 'Collapse navigation (Ctrl+B)'}
          >
            {isCollapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
          </button>
        </div>

        <nav className="sidebar-nav">
          <ul className="nav-list">
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;

              return (
                <li key={item.path} className="nav-item-wrap">
                  <NavLink
                    to={item.path}
                    onClick={onCloseMobile}
                    className={({ isActive }) =>
                      `nav-item ${isActive ? 'active' : ''}`
                    }
                    title={isCollapsed ? item.label : undefined}
                  >
                    <div className="nav-icon-container">
                      <Icon size={18} className="nav-icon" />
                    </div>

                    {!isCollapsed && (
                      <span className="nav-label">{item.label}</span>
                    )}

                    {!isCollapsed && item.badge && (
                      <span
                        className={`nav-badge ${
                          item.badgeVariant === 'live' ? 'badge-live' : ''
                        }`}
                      >
                        {item.badgeVariant === 'live' && <Zap size={10} />}
                        {item.badge}
                      </span>
                    )}

                    {isCollapsed && item.badgeVariant === 'live' && (
                      <span className="collapsed-live-dot" title="Live Battle Active" />
                    )}
                  </NavLink>
                </li>
              );
            })}
          </ul>
        </nav>

        {!isCollapsed && (
          <div className="sidebar-footer">
            {/* <div className="arena-status-card">
              <div className="status-card-header">
                <span className="pulse-dot" />
                <span className="status-title">Matchmaking Queue</span>
              </div>
              <p className="status-desc">Ranked Season 4 Active</p>
            </div> */}
          </div>
        )}
      </aside>
    </>
  );
}
