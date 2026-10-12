import { useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import { Navbar } from '../components/layout/Navbar';
import { connectSocket, disconnectSocket } from '../services/socket';

export function AppLayout() {
  // Connect socket connection on shell load
  useEffect(() => {
    connectSocket();
    return () => {
      disconnectSocket();
    };
  }, []);

  return (
    <div className="app-shell">
      <Navbar />

      <main className="app-main-content" id="main-content">
        <div className="content-container">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
