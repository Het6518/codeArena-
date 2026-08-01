import { useState, useRef, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { User, Settings, LogOut, ChevronDown, ShieldCheck } from 'lucide-react';
import { useAuthStore } from '../../store/useAuthStore';

export function UserMenu() {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef(null);
  const navigate = useNavigate();
  
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);

  const username = user?.username || user?.name || 'Developer';
  const email = user?.email || 'dev@codearena.io';
  const initials = username.substring(0, 2).toUpperCase();

  const handleLogout = () => {
    setIsOpen(false);
    logout();
    navigate('/login', { replace: true });
  };

  useEffect(() => {
    function handleClickOutside(event) {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    function handleKeyDown(event) {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  return (
    <div className="user-menu-container" ref={menuRef}>
      <button
        type="button"
        className="user-menu-trigger"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-expanded={isOpen}
        aria-haspopup="true"
        aria-label="User account menu"
      >
        <div className="avatar-badge-wrap">
          <div className="user-avatar">{initials}</div>
          <span className="status-dot-online" title="Online" />
        </div>
        <span className="user-menu-name">{username}</span>
        <ChevronDown size={14} className={`menu-chevron ${isOpen ? 'rotate' : ''}`} />
      </button>

      {isOpen && (
        <div className="user-menu-dropdown animate-fade-in" role="menu">
          <div className="user-menu-header">
            <div className="user-menu-header-avatar">{initials}</div>
            <div className="user-menu-header-info">
              <span className="user-menu-header-name">{username}</span>
              <span className="user-menu-header-email">{email}</span>
            </div>
            {/* <span className="user-rank-badge">
              <ShieldCheck size={12} /> PRO
            </span> */}
          </div>

          <div className="user-menu-divider" />

          <div className="user-menu-links">
            <Link
              to="/settings"
              className="user-menu-item"
              onClick={() => setIsOpen(false)}
              role="menuitem"
            >
              <User size={16} />
              <span>Profile Details</span>
            </Link>
            <Link
              to="/settings"
              className="user-menu-item"
              onClick={() => setIsOpen(false)}
              role="menuitem"
            >
              <Settings size={16} />
              <span>Preferences</span>
            </Link>
          </div>

          <div className="user-menu-divider" />

          <button
            type="button"
            className="user-menu-item user-menu-logout"
            onClick={handleLogout}
            role="menuitem"
          >
            <LogOut size={16} />
            <span>Sign Out</span>
          </button>
        </div>
      )}
    </div>
  );
}
