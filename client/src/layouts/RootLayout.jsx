import { Outlet } from 'react-router-dom';
import { Code2 } from 'lucide-react';
import { APP_NAME } from '../constants/app';

export function RootLayout() {
  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="brand-mark" aria-hidden="true">
          <Code2 size={20} />
        </div>
        <span>{APP_NAME}</span>
      </header>
      <main className="page-shell">
        <Outlet />
      </main>
    </div>
  );
}
