
import { createBrowserRouter, Navigate } from 'react-router-dom'
import { RequireRole, RequireGuest } from './components/Guards'
import { AdminLayout, UserLayout } from './components/Layouts'

import Login from './pages/auth/Login'
import SignUp from './pages/auth/SignUp'
import ForgotPassword from './pages/auth/ForgotPassword'
import AdminForgotPassword from './pages/auth/AdminForgotPassword'
import ResetPassword from './pages/auth/ResetPassword'
import Terms from './pages/auth/Terms'
import PrivacyPolicy from './pages/auth/PrivacyPolicy'

import { Forbidden, NotFound } from './pages/Misc'

import Dashboard from './pages/user/Dashboard'
import Expenses from './pages/user/Expenses'
import Budgets from './pages/user/Budgets'
import Reports from './pages/user/Reports'
import ExportReports from './pages/user/ExportReports'
import Archive from './pages/user/Archive'
import Settings from './pages/user/Settings'
import { LearnHub, Lesson } from './pages/user/Learn'

import AdminOverview from './pages/admin/Overview'
import AdminUsers from './pages/admin/Users'
import AdminCategories from './pages/admin/Categories'
import AdminReports from './pages/admin/Reports'
import AdminAudit from './pages/admin/Audit'

export const router = createBrowserRouter([
  {
    path: '/',
    element: <Navigate to="/app" replace />,
  },

  // Public Terms and Privacy Policy pages
  {
    path: '/terms',
    element: <Terms />,
  },
  {
    path: '/privacy-policy',
    element: <PrivacyPolicy />,
  },

  // Guest and authentication routes
  {
    element: <RequireGuest />,
    children: [
      {
        path: '/login',
        element: <Login />,
      },
      {
        path: '/signup',
        element: <SignUp />,
      },

      // User password recovery
      {
        path: '/forgot-password',
        element: <ForgotPassword />,
      },

      // Admin password recovery
      {
        path: '/admin/forgot-password',
        element: <AdminForgotPassword />,
      },
    ],
  },

  // Shared password reset route
  {
    path: '/reset-password',
    element: <ResetPassword />,
  },

  // Forbidden page
  {
    path: '/forbidden',
    element: <Forbidden />,
  },

  // User protected routes
  {
    element: <RequireRole role="user" />,
    children: [
      {
        path: '/app',
        element: <UserLayout />,
        children: [
          {
            index: true,
            element: <Dashboard />,
          },
          {
            path: 'expenses',
            element: <Expenses />,
          },
          {
            path: 'budgets',
            element: <Budgets />,
          },
          {
            path: 'reports',
            element: <Reports />,
          },
          {
            path: 'reports/export',
            element: <ExportReports />,
          },
          {
            path: 'archive',
            element: <Archive />,
          },
          {
            path: 'settings',
            element: <Settings />,
          },
          {
            path: 'learn',
            element: <LearnHub />,
          },
          {
            path: 'learn/:id',
            element: <Lesson />,
          },
        ],
      },
    ],
  },

  // Admin protected routes
  {
    element: <RequireRole role="admin" />,
    children: [
      {
        path: '/admin',
        element: <AdminLayout />,
        children: [
          {
            index: true,
            element: <AdminOverview />,
          },
          {
            path: 'users',
            element: <AdminUsers />,
          },
          {
            path: 'categories',
            element: <AdminCategories />,
          },
          {
            path: 'reports',
            element: <AdminReports />,
          },
          {
            path: 'audit',
            element: <AdminAudit />,
          },
        ],
      },
    ],
  },

  // Catch-all route
  {
    path: '*',
    element: <NotFound />,
  },
])
