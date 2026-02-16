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
        { name: 'ChatBot', path: '/chatbot', icon: '🤖' },
        { name: 'Reports', path: '/reports', icon: '📊' },
    ];

    return (
        <div className="min-h-screen bg-terminal-bg">
            {/* Header */}
            <header className="bg-terminal-surface border-b border-terminal-border">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
                    <div className="flex items-center gap-8">
                        <div
                            className="cursor-pointer flex items-center gap-2"
                            onClick={() => navigate('/dashboard')}
                        >
                            <span className="text-2xl">⚙️</span>
                            <h1 className="text-xl font-bold text-terminal-primary hidden sm:block text-glow">[ INFRA-MANAGER ]</h1>
                        </div>

                        <nav className="flex items-center gap-1 sm:gap-4">
                            {navItems.map((item) => (
                                <button
                                    key={item.path}
                                    onClick={() => navigate(item.path)}
                                    className={`px-3 py-2 text-sm font-mono font-medium transition flex items-center gap-2 border-l-4 ${location.pathname === item.path
                                        ? 'bg-terminal-primary text-terminal-bg border-l-4 border-terminal-accent'
                                        : 'text-terminal-secondary hover:bg-terminal-surface hover:text-terminal-primary border-l-4 border-transparent'
                                        }`}
                                >
                                    <span>{item.icon}</span>
                                    <span className="hidden md:inline">{item.name}</span>
                                </button>
                            ))}
                            {user?.role === 'admin' && (
                                <button
                                    onClick={() => navigate('/admin')}
                                    className={`px-3 py-2 text-sm font-mono font-medium transition flex items-center gap-2 border-l-4 ${location.pathname.startsWith('/admin')
                                        ? 'bg-terminal-warning text-terminal-bg border-l-4 border-terminal-accent'
                                        : 'text-terminal-secondary hover:bg-terminal-surface hover:text-terminal-primary border-l-4 border-transparent'
                                        }`}
                                >
                                    <span>🛡️</span>
                                    <span className="hidden md:inline">ADMIN</span>
                                </button>
                            )}
                        </nav>
                    </div>

                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => navigate('/admin')}
                            className="p-2 text-terminal-secondary hover:text-terminal-primary relative transition"
                            title="Alerts"
                        >
                            <span className="text-xl">🔔</span>
                        </button>
                        <div className="hidden md:block text-right">
                            <p className="text-sm font-mono font-medium text-terminal-primary">[ {user?.username || 'USER'} ]</p>
                            <p className="text-xs text-terminal-muted">{(user?.role || 'guest').toUpperCase()}</p>
                        </div>
                        <button
                            onClick={handleLogout}
                            disabled={loading}
                            className="px-4 py-2 border border-terminal-danger text-terminal-danger font-mono hover:bg-terminal-danger hover:text-terminal-bg disabled:opacity-50 transition text-sm font-medium uppercase"
                        >
                            {loading ? '...' : 'Logout'}
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
