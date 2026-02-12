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
        <div className="space-y-6">
            <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>

            {/* Navigation Tabs */}
            <div className="bg-white shadow rounded-lg max-w-full overflow-x-auto">
                <nav className="flex divide-x divide-gray-200">
                    <button
                        onClick={() => setActiveTab('overview')}
                        className={`flex-1 min-w-[120px] py-4 px-4 text-center font-medium text-sm hover:bg-gray-50 focus:outline-none ${activeTab === 'overview' ? 'text-indigo-600 bg-indigo-50 border-b-2 border-indigo-600' : 'text-gray-500'}`}
                    >
                        📊 System Health
                    </button>
                    <button
                        onClick={() => setActiveTab('alerts')}
                        className={`flex-1 min-w-[120px] py-4 px-4 text-center font-medium text-sm hover:bg-gray-50 focus:outline-none ${activeTab === 'alerts' ? 'text-indigo-600 bg-indigo-50 border-b-2 border-indigo-600' : 'text-gray-500'}`}
                    >
                        🔔 Alerts & Logs
                    </button>
                    <button
                        onClick={() => setActiveTab('backups')}
                        className={`flex-1 min-w-[120px] py-4 px-4 text-center font-medium text-sm hover:bg-gray-50 focus:outline-none ${activeTab === 'backups' ? 'text-indigo-600 bg-indigo-50 border-b-2 border-indigo-600' : 'text-gray-500'}`}
                    >
                        💾 Backups
                    </button>
                    <button
                        onClick={() => setActiveTab('users')}
                        className={`flex-1 min-w-[120px] py-4 px-4 text-center font-medium text-sm hover:bg-gray-50 focus:outline-none ${activeTab === 'users' ? 'text-indigo-600 bg-indigo-50 border-b-2 border-indigo-600' : 'text-gray-500'}`}
                    >
                        👥 Users
                    </button>
                    <button
                        onClick={() => setActiveTab('docs')}
                        className={`flex-1 min-w-[120px] py-4 px-4 text-center font-medium text-sm hover:bg-gray-50 focus:outline-none ${activeTab === 'docs' ? 'text-indigo-600 bg-indigo-50 border-b-2 border-indigo-600' : 'text-gray-500'}`}
                    >
                        📚 Docs
                    </button>
                </nav>
            </div>

            {/* Tab Content */}
            {activeTab === 'overview' && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {/* Host Info */}
                    <div className="bg-white p-6 shadow rounded-lg border-t-4 border-indigo-500">
                        <h3 className="text-lg font-medium text-gray-900 mb-4">Host Info</h3>
                        {stats ? (
                            <div className="space-y-4">
                                <div className="flex justify-between items-center">
                                    <span className="text-gray-500">Hostname</span>
                                    <span className="font-mono text-gray-900">{stats.hostname}</span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-gray-500">Platform</span>
                                    <span className="text-gray-900">{stats.platform}</span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-gray-500">Uptime</span>
                                    <span className="text-gray-900">{formatUptime(stats.uptime)}</span>
                                </div>
                            </div>
                        ) : (
                            <div className="animate-pulse space-y-4">
                                <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                                <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                            </div>
                        )}
                    </div>

                    {/* CPU Usage */}
                    <div className="bg-white p-6 shadow rounded-lg border-t-4 border-blue-500">
                        <h3 className="text-lg font-medium text-gray-900 mb-4">CPU Usage</h3>
                        {stats ? (
                            <div className="space-y-4">
                                <div className="flex justify-between items-center">
                                    <span className="text-gray-500">Model</span>
                                    <span className="text-xs text-gray-900 text-right">{stats.cpu.model}</span>
                                </div>
                                <div className="mt-4">
                                    <div className="flex justify-between mb-1">
                                        <span className="text-sm font-medium text-blue-700">Load Average</span>
                                        <span className="text-sm font-medium text-blue-700">{stats.cpu?.load?.toFixed(1) ?? '0.0'}%</span>
                                    </div>
                                    <div className="w-full bg-gray-200 rounded-full h-2.5">
                                        <div
                                            className="bg-blue-600 h-2.5 rounded-full"
                                            style={{ width: `${Math.min(stats.cpu?.load ?? 0, 100)}%` }}
                                        ></div>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="animate-pulse space-y-4">
                                <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                                <div className="h-4 bg-gray-200 rounded w-full"></div>
                            </div>
                        )}
                    </div>

                    {/* Memory Usage */}
                    <div className="bg-white p-6 shadow rounded-lg border-t-4 border-purple-500">
                        <h3 className="text-lg font-medium text-gray-900 mb-4">Memory Usage</h3>
                        {stats ? (
                            <div className="space-y-4">
                                <div className="flex justify-between items-center">
                                    <span className="text-gray-500">Total</span>
                                    <span className="text-gray-900">{formatBytes(stats.memory.total)}</span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-gray-500">Free</span>
                                    <span className="text-gray-900">{formatBytes(stats.memory.free)}</span>
                                </div>
                                <div className="mt-4">
                                    <div className="flex justify-between mb-1">
                                        <span className="text-sm font-medium text-purple-700">Used ({stats.memory?.percentage?.toFixed(1) ?? '0.0'}%)</span>
                                    </div>
                                    <div className="w-full bg-gray-200 rounded-full h-2.5">
                                        <div
                                            className="bg-purple-600 h-2.5 rounded-full"
                                            style={{ width: `${stats.memory?.percentage ?? 0}%` }}
                                        ></div>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="animate-pulse space-y-4">
                                <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                                <div className="h-4 bg-gray-200 rounded w-full"></div>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {activeTab === 'alerts' && <Alerts />}

            {activeTab === 'backups' && <Backups />}

            {activeTab === 'docs' && <Documentation />}

            {activeTab === 'users' && (
                <div className="bg-white shadow rounded-lg p-10 text-center">
                    <p className="text-gray-500 mb-4">User management module coming soon.</p>
                    <span className="text-6xl">👥</span>
                </div>
            )}
        </div>
    );
};

export default AdminDashboard;
