import { LogOut } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button, Card } from '../components/ui';
import { Logo } from '../components/common/Logo';
import { ThemeToggle } from '../components/common/ThemeToggle';
import { useAuthStore } from '../store/useAuthStore';

export function DashboardPage() {
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  return (
    <main className="protected-page">
      <header className="protected-header">
        <Logo compact />
        <div className="protected-actions">
          <ThemeToggle />
          <Button variant="secondary" onClick={handleLogout}>
            <LogOut size={16} />
            Logout
          </Button>
        </div>
      </header>
      <Card>
        <h1>Protected Route</h1>
        <p>You are signed in{user?.username ? ` as ${user.username}` : ''}. Future dashboard modules will build here.</p>
      </Card>
    </main>
  );
}
