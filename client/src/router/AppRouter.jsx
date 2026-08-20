import { createBrowserRouter, Navigate, RouterProvider } from 'react-router-dom';
import { DashboardPage } from '../pages/DashboardPage';
import { LoginPage } from '../features/auth/pages/LoginPage';
import { RegisterPage } from '../features/auth/pages/RegisterPage';
import { ProtectedRoute } from './ProtectedRoute';
import Practical3Page from "../pages/Practical3Page";
import Practical4Page from "../pages/Practical4Page";
const router = createBrowserRouter([
  {
    path: '/',
    element: <Navigate to="/login" replace />,
  },
  {
    path: '/register',
    element: <RegisterPage />,
  },
  {
    path: '/login',
    element: <LoginPage />,
  },
  {
    path: '/dashboard',
    element: (
      <ProtectedRoute>
        <DashboardPage />
      </ProtectedRoute>
    ),
  },
  {
  path: "/practical-3",
  element: <Practical3Page />,
},
{
  path: "/practical-4",
  element: <Practical4Page />,
},
]);


export function AppRouter() {
  return <RouterProvider router={router} />;
}
