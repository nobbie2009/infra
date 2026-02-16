import React, { useState, useEffect } from 'react';
import api from '../lib/api';
import { format } from 'date-fns';
import Alerts from './Alerts';
import Backups from './Backups';
import Documentation from './Documentation';

interface SystemStats {
    hostname: string;
    platform: string;
    uptime: number;
    cpu: {
        cores: number;
        model: string;
        load: number;
    };
    memory: {
        total: number;
        free: number;
        used: number;
        percentage: number;
    };
}

const AdminDashboard: React.FC = () => {
    const [stats, setStats] = useState<SystemStats | null>(null);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'overview' | 'alerts' | 'backups' | 'users' | 'docs'>('overview');

    useEffect(() => {
        fetchStats();
        // Poll stats every 30 seconds
        const interval = setInterval(fetchStats, 30000);
        return () => clearInterval(interval);
    }, []);

    const fetchStats = async () => {
        try {
            const response = await api.get('/admin/system/stats');
            setStats(response.data.data);
        } catch (error) {
            console.error('Failed to fetch system stats', error);
        } finally {
            setLoading(false);
        }
    };

    const formatUptime = (seconds: number) => {
        const d = Math.floor(seconds / (3600 * 24));
        const h = Math.floor((seconds % (3600 * 24)) / 3600);
        const m = Math.floor((seconds % 3600) / 60);
        return `${d}d ${h}h ${m}m`;
    };

    const formatBytes = (bytes: number) => {
        const gb = bytes / (1024 * 1024 * 1024);
        return `${gb.toFixed(2)} GB`;
    };

    return (
        <div className="space-y-6 bg-terminal-bg min-h-screen p-6">
            <h1 className="text-3xl font-bold text-terminal-primary text-glow section-header">ADMIN DASHBOARD</h1>

            {/* Navigation Tabs */}
            <div className="card-terminal overflow-x-auto">
                <nav className="flex divide-x divide-terminal-border font-mono text-sm">
                    <button
                        onClick={() => setActiveTab('overview')}
                        className={`flex-1 min-w-[100px] py-3 px-3 text-center uppercase tracking-wider ${activeTab === 'overview' ? 'text-terminal-accent bg-terminal-accent/10 border-b-2 border-terminal-accent' : 'text-terminal-secondary hover:text-terminal-primary'}`}
                    >
                        [ HEALTH ]
                    </button>
                    <button
                        onClick={() => setActiveTab('alerts')}
                        className={`flex-1 min-w-[100px] py-3 px-3 text-center uppercase tracking-wider ${activeTab === 'alerts' ? 'text-terminal-accent bg-terminal-accent/10 border-b-2 border-terminal-accent' : 'text-terminal-secondary hover:text-terminal-primary'}`}
                    >
                        [ ALERTS ]
                    </button>
                    <button
                        onClick={() => setActiveTab('backups')}
                        className={`flex-1 min-w-[100px] py-3 px-3 text-center uppercase tracking-wider ${activeTab === 'backups' ? 'text-terminal-accent bg-terminal-accent/10 border-b-2 border-terminal-accent' : 'text-terminal-secondary hover:text-terminal-primary'}`}
                    >
                        [ BACKUP ]
                    </button>
                    <button
                        onClick={() => setActiveTab('users')}
                        className={`flex-1 min-w-[100px] py-3 px-3 text-center uppercase tracking-wider ${activeTab === 'users' ? 'text-terminal-accent bg-terminal-accent/10 border-b-2 border-terminal-accent' : 'text-terminal-secondary hover:text-terminal-primary'}`}
                    >
                        [ USERS ]
                    </button>
                    <button
                        onClick={() => setActiveTab('docs')}
                        className={`flex-1 min-w-[100px] py-3 px-3 text-center uppercase tracking-wider ${activeTab === 'docs' ? 'text-terminal-accent bg-terminal-accent/10 border-b-2 border-terminal-accent' : 'text-terminal-secondary hover:text-terminal-primary'}`}
                    >
                        [ DOCS ]
                    </button>
                </nav>
            </div>

            {/* Tab Content */}
            {activeTab === 'overview' && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {/* Host Info */}
                    <div className="card-terminal border-t-2 border-terminal-primary">
                        <h3 className="text-sm font-mono text-terminal-secondary uppercase tracking-wider mb-4">[ HOST INFO ]</h3>
                        {stats ? (
                            <div className="space-y-3 text-sm font-mono">
                                <div className="flex justify-between">
                                    <span className="text-terminal-muted">hostname</span>
                                    <span className="text-terminal-primary">{stats.hostname}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-terminal-muted">platform</span>
                                    <span className="text-terminal-primary">{stats.platform}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-terminal-muted">uptime</span>
                                    <span className="text-terminal-primary">{formatUptime(stats.uptime)}</span>
                                </div>
                            </div>
                        ) : (
                            <div className="text-terminal-muted font-mono text-xs">[ loading... ]</div>
                        )}
                    </div>

                    {/* CPU Usage */}
                    <div className="card-terminal border-t-2 border-terminal-accent">
                        <h3 className="text-sm font-mono text-terminal-secondary uppercase tracking-wider mb-4">[ CPU USAGE ]</h3>
                        {stats ? (
                            <div className="space-y-3 text-sm font-mono">
                                <div className="text-terminal-muted truncate text-xs">{stats.cpu.model}</div>
                                <div className="flex justify-between mb-1 text-terminal-secondary">
                                    <span>load avg</span>
                                    <span className="text-terminal-primary">{stats.cpu?.load?.toFixed(1) ?? '0.0'}%</span>
                                </div>
                                <div className="w-full bg-terminal-border h-2">
                                    <div
                                        className="bg-terminal-accent h-2 transition-all"
                                        style={{ width: `${Math.min(stats.cpu?.load ?? 0, 100)}%` }}
                                    ></div>
                                </div>
                            </div>
                        ) : (
                            <div className="text-terminal-muted font-mono text-xs">[ loading... ]</div>
                        )}
                    </div>

                    {/* Memory Usage */}
                    <div className="card-terminal border-t-2 border-terminal-danger">
                        <h3 className="text-sm font-mono text-terminal-secondary uppercase tracking-wider mb-4">[ MEMORY USAGE ]</h3>
                        {stats ? (
                            <div className="space-y-3 text-sm font-mono">
                                <div className="flex justify-between">
                                    <span className="text-terminal-muted">total</span>
                                    <span className="text-terminal-primary">{formatBytes(stats.memory.total)}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-terminal-muted">free</span>
                                    <span className="text-terminal-primary">{formatBytes(stats.memory.free)}</span>
                                </div>
                                <div className="flex justify-between mb-1 text-terminal-secondary">
                                    <span>used</span>
                                    <span className="text-terminal-primary">{stats.memory?.percentage?.toFixed(1) ?? '0.0'}%</span>
                                </div>
                                <div className="w-full bg-terminal-border h-2">
                                    <div
                                        className={`h-2 transition-all ${(stats.memory?.percentage ?? 0) > 80 ? 'bg-terminal-danger' : 'bg-terminal-primary'}`}
                                        style={{ width: `${stats.memory?.percentage ?? 0}%` }}
                                    ></div>
                                </div>
                            </div>
                        ) : (
                            <div className="text-terminal-muted font-mono text-xs">[ loading... ]</div>
                        )}
                    </div>
                </div>
            )}

            {activeTab === 'alerts' && <Alerts />}

            {activeTab === 'backups' && <Backups />}

            {activeTab === 'docs' && <Documentation />}

            {activeTab === 'users' && (
                <div className="card-terminal text-center py-12">
                    <p className="text-terminal-muted font-mono mb-4">[ v2.0 ] user management coming soon</p>
                    <span className="text-5xl">👥</span>
                </div>
            )}
        </div>
    );
};

export default AdminDashboard;
