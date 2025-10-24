import { Toaster } from '@/components/ui/sonner';
import { TooltipProvider } from '@/components/ui/tooltip';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/SimpleAuthContext';
import { SimpleProfileSetup } from './components/auth/SimpleProfileSetup';
import { SimpleNavbar } from './components/SimpleNavbar';
import Index from './pages/Index';
import Landing from './pages/Landing';
import AuthPage from './pages/auth/AuthPage';
import ResetPassword from './pages/auth/ResetPassword';
import Dashboard from './pages/Dashboard';
import ProfilePage from './pages/profile/ProfilePage';
import ClassDetail from './pages/classes/ClassDetail';
import ClassesPage from './pages/classes/ClassesPage';
import ClassesDebugPage from './pages/classes/ClassesDebugPage';
import SchedulePage from './pages/schedule/SchedulePage';
import AssignmentsPage from './pages/assignments/AssignmentsPage';
import AssignmentDetail from './pages/assignments/AssignmentDetail';
import MessagesPage from './pages/messages/MessagesPage';
import DebugPage from './pages/Debug';
import DatabaseDebug from './pages/DatabaseDebug';
import ProfileDebug from './pages/ProfileDebug';
import ConfigPage from './pages/ConfigPage';
import SimpleVerifyEmailPage from './pages/auth/SimpleVerifyEmailPage';
import AuthStatusPage from './pages/auth/AuthStatusPage';
import PendingApprovalPage from './pages/auth/PendingApprovalPage';
import AdminDashboard from './pages/admin/AdminDashboard';
import ClearDataPage from './pages/ClearDataPage';
import QuickClearPage from './pages/QuickClearPage';
import NotFound from './pages/NotFound';
import { useEffect, useState } from 'react';
import { supabase } from './lib/supabase';
import { verifyDatabaseSetup } from './lib/db-setup-checker';

// Simple Protected Route wrapper
const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, profile, loading } = useAuth();
  const location = useLocation();
  
  // Show minimal loading state (reduced screen real estate)
  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[200px]">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent"></div>
      </div>
    );
  }
  
  // Redirect to login if not authenticated
  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }
  
  // Check if email is verified
  if (!user.email_confirmed_at) {
    return <Navigate to="/verify-email" state={{ from: location }} replace />;
  }
  
  // Check if profile is incomplete
  if (!profile?.full_name) {
    return <Navigate to="/setup-profile" state={{ from: location }} replace />;
  }
  
  // Check if user needs approval (except for admin users)
  if (profile.role !== 'admin' && !profile.approved) {
    return <Navigate to="/pending-approval" state={{ from: location }} replace />;
  }
  
  // User is authenticated, verified, has complete profile, and is approved
  return <>{children}</>;
};

// Dashboard route with navigation wrapper
const DashboardRoute = ({ element }: { element: React.ReactNode }) => {
  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gradient-to-b from-sky-950 via-blue-950 to-blue-900 text-white">
        <SimpleNavbar />
        <div className="container mx-auto p-6">
          {element}
        </div>
      </div>
    </ProtectedRoute>
  );
};

// Admin route wrapper - requires admin role
const AdminRoute = ({ element }: { element: React.ReactNode }) => {
  const { user, profile, loading } = useAuth();
  const location = useLocation();
  
  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[200px]">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-sky-400 border-t-transparent"></div>
      </div>
    );
  }
  
  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }
  
  if (!profile || profile.role !== 'admin') {
    return <Navigate to="/dashboard" state={{ from: location }} replace />;
  }
  
  return (
    <div className="min-h-screen bg-gradient-to-b from-sky-950 via-blue-950 to-blue-900 text-white">
      <SimpleNavbar />
      <div className="container mx-auto p-6">
        {element}
      </div>
    </div>
  );
};

const queryClient = new QueryClient();

const App = () => {
  // Verify database setup on app startup
  useEffect(() => {
    verifyDatabaseSetup().catch(err => console.error('Database verification failed:', err));
  }, []);
  
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthProvider>
          <TooltipProvider>
            <Toaster />
            <Routes>
              {/* Public routes */}
              <Route path="/" element={<Index />} />
              <Route path="/portal" element={<Landing />} />
              <Route path="/login" element={<AuthPage />} />
              <Route path="/register" element={<AuthPage />} />
              <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/debug" element={<DebugPage />} />
            <Route path="/db-debug" element={<DatabaseDebug />} />
            <Route path="/profile-debug" element={<ProfileDebug />} />
            <Route path="/classes-debug" element={<ClassesDebugPage />} />
            <Route path="/config" element={<ConfigPage />} />
            <Route path="/verify-email" element={<SimpleVerifyEmailPage />} />
            <Route path="/auth-status" element={<AuthStatusPage />} />
            <Route path="/clear-data" element={<ClearDataPage />} />
            <Route path="/quick-clear" element={<QuickClearPage />} />
            <Route path="/setup-profile" element={<SimpleProfileSetup />} />
            <Route path="/pending-approval" element={<PendingApprovalPage />} />              {/* Protected routes */}
              <Route path="/dashboard" element={<DashboardRoute element={<Dashboard />} />} />
              <Route path="/profile" element={<DashboardRoute element={<ProfilePage />} />} />
              <Route path="/classes" element={<DashboardRoute element={<ClassesPage />} />} />
              <Route path="/classes/create" element={<DashboardRoute element={<ClassDetail isCreateMode={true} />} />} />
              <Route path="/classes/:id" element={<DashboardRoute element={<ClassDetail />} />} />
              <Route path="/classes/:id/schedule" element={<DashboardRoute element={<ClassDetail defaultTab="schedule" />} />} />
              <Route path="/classes/:id/assignments" element={<DashboardRoute element={<ClassDetail defaultTab="assignments" />} />} />
              <Route path="/classes/:id/resources" element={<DashboardRoute element={<ClassDetail defaultTab="resources" />} />} />
              <Route path="/classes/:id/analytics" element={<DashboardRoute element={<ClassDetail defaultTab="analytics" />} />} />
              <Route path="/classes/:id/students" element={<DashboardRoute element={<ClassDetail defaultTab="students" />} />} />
              <Route path="/schedule" element={<DashboardRoute element={<SchedulePage />} />} />
              <Route path="/assignments" element={<DashboardRoute element={<AssignmentsPage />} />} />
              <Route path="/assignments/:id" element={<DashboardRoute element={<AssignmentDetail />} />} />
              <Route path="/messages" element={<DashboardRoute element={<MessagesPage />} />} />
              <Route path="/students" element={<DashboardRoute element={<div>Students Page</div>} />} />
              <Route path="/students/:id" element={<DashboardRoute element={<div>Student Detail Page</div>} />} />
              
              {/* Admin routes */}
              <Route path="/admin" element={<AdminRoute element={<AdminDashboard />} />} />
              
              {/* Fallback route */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </TooltipProvider>
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  );
};

export default App;
