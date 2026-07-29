import { Navigate, useLocation } from 'react-router-dom';//use location to get the current location and pass it to the login page so that we can redirect the user back to the page they were trying to access after they log in
import { Spinner } from '../components/ui';
import { useAuthStore } from '../store/useAuthStore';

export function ProtectedRoute({ children }) {
  const location = useLocation();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const loading = useAuthStore((state) => state.loading);

  if (loading) {
    return (
      <main className="auth-page">
        <Spinner label="Restoring session" />
      </main>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  return children;
}
