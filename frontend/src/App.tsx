import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { PrivateRoute } from './components/PrivateRoute';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import CredentialsVault from './pages/CredentialsVault';
import VMDashboard from './pages/VMDashboard';
import Projects from './pages/Projects';
import ProjectDetail from './pages/ProjectDetail';
import Kanban from './pages/Kanban';
import { MainLayout } from './components/MainLayout';

const App: React.FC = () => {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* Public Routes */}
          <Route path="/login" element={<Login />} />

          {/* Protected Routes */}
          <Route
            path="/dashboard"
            element={
              <PrivateRoute>
                <MainLayout>
                  <Dashboard />
                </MainLayout>
              </PrivateRoute>
            }
          />

          <Route
            path="/credentials"
            element={
              <PrivateRoute>
                <MainLayout>
                  <CredentialsVault />
                </MainLayout>
              </PrivateRoute>
            }
          />

          <Route
            path="/vms"
            element={
              <PrivateRoute>
                <MainLayout>
                  <VMDashboard />
                </MainLayout>
              </PrivateRoute>
            }
          />

          <Route
            path="/projects"
            element={
              <PrivateRoute>
                <MainLayout>
                  <Projects />
                </MainLayout>
              </PrivateRoute>
            }
          />

          <Route
            path="/projects/:id"
            element={
              <PrivateRoute>
                <MainLayout>
                  <ProjectDetail />
                </MainLayout>
              </PrivateRoute>
            }
          />

          <Route
            path="/projects/:id/kanban"
            element={
              <PrivateRoute>
                <MainLayout>
                  <Kanban />
                </MainLayout>
              </PrivateRoute>
            }
          />

          {/* Redirect root to dashboard */}
          <Route path="/" element={<Navigate to="/dashboard" replace />} />

          {/* 404 */}
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
};

export default App;
