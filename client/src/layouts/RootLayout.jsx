import { Outlet } from 'react-router-dom';
import { Logo } from '../components/common/Logo';

export function RootLayout() {
  return (
    <div className="app-shell">
      <header className="topbar">
        <Logo compact />
      </header>
      <main className="page-shell">
        <Outlet />
      </main>
    </div>
  );
}
