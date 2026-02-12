import React, { useState, useEffect } from 'react';
import api from '../lib/api';
import Alerts from './Alerts';

const AdminDashboard: React.FC = () => {
    const [stats, setStats] = useState<any>(null);
    const [activeTab, setActiveTab] = useState<'system' | 'alerts' | 'users'>('system');
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (activeTab === 'system') {
            loadStats();
            const interval = setInterval(loadStats, 5000);
            return () => clearInterval(interval);
        }
    }, [activeTab]);

    const loadStats = async () => {
        try {
            const response = await api.get('/admin/system/stats');
            if (response.data.success) {
                setStats(response.data.data);
            }
        } catch (error) {
            console.error('Failed to load system stats:', error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="h-[calc(100vh-64px)] flex overflow-hidden">
            {/* Sidebar */}
            <div className="w-64 bg-white border-r border-gray-100 p-6 flex flex-col gap-2">
                <h2 className="text-xl font-black text-gray-900 mb-6 px-4">Admin Area</h2>

                <button
                    onClick={() => setActiveTab('system')}
                    className={`text-left px-4 py-3 rounded-xl font-bold transition-all ${activeTab === 'system' ? 'bg-blue-50 text-blue-600' : 'text-gray-500 hover:bg-gray-50'
                        }`}
                >
                    🖥️ System Health
                </button>
                <button
                    onClick={() => setActiveTab('alerts')}
                    className={`text-left px-4 py-3 rounded-xl font-bold transition-all ${activeTab === 'alerts' ? 'bg-red-50 text-red-600' : 'text-gray-500 hover:bg-gray-50'
                        }`}
                >
                    🔔 Alerts & Logs
                </button>
                <button
                    onClick={() => setActiveTab('users')}
                    className={`text-left px-4 py-3 rounded-xl font-bold transition-all ${activeTab === 'users' ? 'bg-purple-50 text-purple-600' : 'text-gray-500 hover:bg-gray-50'
                        }`}
                >
                    👥 User Management
                </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-auto bg-gray-50/50 p-8">
                {activeTab === 'alerts' && <Alerts />}

                {activeTab === 'system' && stats && (
                    <div className="max-w-5xl mx-auto">
                        <h1 className="text-3xl font-black text-gray-900 mb-8">System Status</h1>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
                            {/* Memory Card */}
                            <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-gray-100">
                                <h3 className="text-gray-500 font-bold mb-4 uppercase text-xs tracking-wider">Memory Usage</h3>
                                <div className="flex items-end gap-2 mb-2">
                                    <span className="text-4xl font-black text-gray-900">{stats.memory.percentUsed}%</span>
                                    <span className="text-sm text-gray-400 font-mono mb-1">
                                        {(stats.memory.used / 1024 / 1024 / 1024).toFixed(2)} / {(stats.memory.total / 1024 / 1024 / 1024).toFixed(2)} GB
                                    </span>
                                </div>
                                <div className="w-full bg-gray-100 rounded-full h-3 overflow-hidden">
                                    <div
                                        className={`h-full rounded-full transition-all duration-500 ${stats.memory.percentUsed > 80 ? 'bg-red-500' : 'bg-blue-500'}`}
                                        style={{ width: `${stats.memory.percentUsed}%` }}
                                    ></div>
                                </div>
                            </div>

                            {/* CPU Card */}
                            <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-gray-100">
                                <h3 className="text-gray-500 font-bold mb-4 uppercase text-xs tracking-wider">CPU Load</h3>
                                <div className="flex items-end gap-2 mb-2">
                                    <span className="text-4xl font-black text-gray-900">{stats.cpu.loadAvg[0].toFixed(2)}</span>
                                    <span className="text-xs text-gray-400 font-mono mb-2">1 min avg</span>
                                </div>
                                <div className="text-sm text-gray-500">
                                    {stats.cpu.cores} Cores - {stats.cpu.model}
                                </div>
                            </div>

                            {/* System Info */}
                            <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-gray-100">
                                <h3 className="text-gray-500 font-bold mb-4 uppercase text-xs tracking-wider">Host Info</h3>
                                <div className="space-y-3">
                                    <div className="flex justify-between">
                                        <span className="text-gray-500 text-sm">Hostname</span>
                                        <span className="font-bold">{stats.hostname}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-gray-500 text-sm">Platform</span>
                                        <span className="font-bold capitalize">{stats.platform}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-gray-500 text-sm">Uptime</span>
                                        <span className="font-mono text-xs bg-gray-100 px-2 py-1 rounded">{(stats.uptime / 3600).toFixed(1)} hours</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'users' && (
                    <div className="p-8 text-center text-gray-500">
                        <div className="text-4xl mb-4">🚧</div>
                        <h3>User Management coming soon...</h3>
                    </div>
                )}
            </div>
        </div>
    );
};

export default AdminDashboard;
