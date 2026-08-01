import { createBrowserRouter, Navigate, RouterProvider } from 'react-router-dom';
import { AppLayout } from '../layouts/AppLayout';
import { DashboardPage } from '../pages/DashboardPage';
import { ProblemsPage } from '../pages/ProblemsPage';
import { ProblemWorkspacePage } from '../pages/ProblemWorkspacePage';
import { BattlesPage } from '../pages/BattlesPage';
import { BattleRoomArenaPage } from '../pages/BattleRoomArenaPage';
import { LeaderboardPage } from '../pages/LeaderboardPage';
import { SettingsPage } from '../pages/SettingsPage';
import { LoginPage } from '../features/auth/pages/LoginPage';
import { RegisterPage } from '../features/auth/pages/RegisterPage';
import { ProtectedRoute } from './ProtectedRoute';

const router = createBrowserRouter([
  {
    path: '/',
    element: <Navigate to="/dashboard" replace />,
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
    element: (
      <ProtectedRoute>
        <AppLayout />
      </ProtectedRoute>
    ),
    children: [
      {
        path: '/dashboard',
        element: <DashboardPage />,
      },
      {
        path: '/problems',
        element: <ProblemsPage />,
      },
      {
        path: '/problems/:slug',
        element: <ProblemWorkspacePage />,
      },
      {
        path: '/battles',
        element: <BattlesPage />,
      },
      {
        path: '/battles/:roomCode',
        element: <BattleRoomArenaPage />,
      },
      {
        path: '/leaderboard',
        element: <LeaderboardPage />,
      },
      {
        path: '/settings',
        element: <SettingsPage />,
      },
    ],
  },
  {
    path: '*',
    element: <Navigate to="/dashboard" replace />,
  },
]);

export function AppRouter() {
  return <RouterProvider router={router} />; // makes the router available to the entire app, enabling navigation and route matching based on the defined routes.
}
