import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const { user, logout, loading } = useAuth();

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
    } catch (err) {
      console.error('Logout failed:', err);
    }
  };

  return (
    <div className="p-6">
      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Welcome Card */}
          <div className="lg:col-span-3 bg-white rounded-lg shadow p-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Welcome to Infrastruktur-Manager</h2>
            <p className="text-gray-600 mb-4">
              This is your centralized infrastructure and project management dashboard. More features coming soon!
            </p>
            <div className="text-sm text-gray-500">
              <p>
                <strong>User Info:</strong>
              </p>
              <ul className="mt-2 space-y-1">
                <li>Username: {user?.username}</li>
                <li>Email: {user?.email}</li>
                <li>Role: {user?.role}</li>
              </ul>
            </div>
          </div>

          {/* Feature Cards */}
          <button
            onClick={() => navigate('/vms')}
            className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition text-left"
          >
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
              <span className="text-2xl">🖥️</span>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">VM Dashboard</h3>
            <p className="text-gray-600 text-sm">Monitor and control your virtual machines</p>
          </button>

          <button
            onClick={() => navigate('/credentials')}
            className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition text-left"
          >
            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mb-4">
              <span className="text-2xl">🔐</span>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Credentials Vault</h3>
            <p className="text-gray-600 text-sm">Securely manage API keys and tokens</p>
          </button>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mb-4">
              <span className="text-2xl">📋</span>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Projects</h3>
            <p className="text-gray-600 text-sm">Track projects and features (coming soon)</p>
          </div>
        </div>

        {/* Status */}
        <div className="mt-12 bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">System Status</h3>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-gray-700">Database Connection</span>
              <span className="text-green-600 font-medium">✓ Connected</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-700">Authentication</span>
              <span className="text-green-600 font-medium">✓ Active</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-700">API Server</span>
              <span className="text-green-600 font-medium">✓ Running</span>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Dashboard;
