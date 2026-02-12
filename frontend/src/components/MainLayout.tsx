import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

interface MainLayoutProps {
    children: React.ReactNode;
}

export const MainLayout: React.FC<MainLayoutProps> = ({ children }) => {
    const navigate = useNavigate();
    const location = useLocation();
    const { user, logout, loading } = useAuth();

    const handleLogout = async () => {
        try {
            await logout();
            navigate('/login');
        } catch (err) {
            console.error('Logout failed:', err);
        }
    };

    const navItems = [
        { name: 'Dashboard', path: '/dashboard', icon: '🏠' },
        { name: 'Projekte', path: '/projects', icon: '📁' },
        { name: 'VMs', path: '/vms', icon: '🖥️' },
        { name: 'Credentials', path: '/credentials', icon: '🔐' },
        { name: 'Reports', path: '/reports', icon: '📊' },
    ];

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Header */}
            <header className="bg-white shadow">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
                    <div className="flex items-center gap-8">
                        <div
                            className="cursor-pointer flex items-center gap-2"
                            onClick={() => navigate('/dashboard')}
                        >
                            <span className="text-2xl">🏗️</span>
                            <h1 className="text-xl font-bold text-gray-900 hidden sm:block">InfraManager</h1>
                        </div>

                        <nav className="flex items-center gap-1 sm:gap-4">
                            {navItems.map((item) => (
                                <button
                                    key={item.path}
                                    onClick={() => navigate(item.path)}
                                    className={`px-3 py-2 rounded-lg text-sm font-medium transition flex items-center gap-2 ${location.pathname === item.path
                                        ? 'bg-blue-100 text-blue-700'
                                        : 'text-gray-600 hover:bg-gray-100'
                                        }`}
                                >
                                    <span>{item.icon}</span>
                                    <span className="hidden md:inline">{item.name}</span>
                                </button>
                            ))}
                            {user?.role === 'admin' && (
                                <button
                                    onClick={() => navigate('/admin')}
                                    className={`px-3 py-2 rounded-lg text-sm font-medium transition flex items-center gap-2 ${location.pathname.startsWith('/admin')
                                        ? 'bg-purple-100 text-purple-700'
                                        : 'text-gray-600 hover:bg-gray-100'
                                        }`}
                                >
                                    <span>🛡️</span>
                                    <span className="hidden md:inline">Admin</span>
                                </button>
                            )}
                        </nav>
                    </div>

                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => navigate('/admin')}
                            className="p-2 text-gray-400 hover:text-gray-500 relative"
                            title="Alerts"
                        >
                            <span className="text-xl">🔔</span>
                            {/* <span className="absolute top-1 right-1 block h-2 w-2 rounded-full bg-red-400 ring-2 ring-white" /> */}
                        </button>
                        <div className="hidden md:block text-right">
                            <p className="text-sm font-medium text-gray-900">{user?.username || 'User'}</p>
                            <p className="text-xs text-gray-500">{user?.role || 'Guest'}</p>
                        </div>
                        <button
                            onClick={handleLogout}
                            disabled={loading}
                            className="px-4 py-2 bg-red-50 text-red-600 border border-red-100 rounded-lg hover:bg-red-100 disabled:opacity-50 transition text-sm font-medium"
                        >
                            {loading ? '...' : 'Abmelden'}
                        </button>
                    </div>
                </div>
            </header>

            {/* Content */}
            <main>
                {children}
            </main>
        </div>
    );
};
