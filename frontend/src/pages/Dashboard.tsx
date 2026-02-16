import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../lib/api';

interface SystemStats {
  cpu: { usage: number; load: number[] };
  memory: { total: number; free: number; used: number; usage: number };
  disk: { total: number; free: number; used: number; usage: number };
  uptime: number;
}

interface Alert {
  id: string;
  type: string;
  severity: 'info' | 'warning' | 'critical';
  title: string;
  message: string;
  created_at: string;
}

const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [stats, setStats] = useState<SystemStats | null>(null);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [vmCounts, setVmCounts] = useState({ total: 0, running: 0, stopped: 0 });
  const [serviceCounts, setServiceCounts] = useState({ total: 0, healthy: 0, unhealthy: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 30000); // 30s refresh
    return () => clearInterval(interval);
  }, []);

  const fetchData = async () => {
    try {
      const [statsRes, alertsRes, vmsRes] = await Promise.all([
        api.get('/admin/system/stats'),
        api.get('/admin/alerts?status=active'),
        api.get('/infrastructure/ip-allocations')
      ]);

      if (statsRes.data.success) setStats(statsRes.data.data);
      if (alertsRes.data.success) setAlerts(alertsRes.data.data);

      if (vmsRes.data.success) {
        const vms = vmsRes.data.data.allocations || [];
        setVmCounts({
          total: vms.length,
          running: vms.filter((v: any) => v.status === 'running').length,
          stopped: vms.filter((v: any) => v.status === 'stopped').length
        });

        // Calculate service health
        let totalServices = 0;
        let healthy = 0;
        let unhealthy = 0;
        vms.forEach((v: any) => {
          v.services?.forEach((s: any) => {
            totalServices++;
            if (s.health_status === 'healthy') healthy++;
            else unhealthy++;
          });
        });
        setServiceCounts({ total: totalServices, healthy, unhealthy });
      }

    } catch (error) {
      console.error('Failed to load dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'bg-red-100 text-red-800 border-red-200';
      case 'warning': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      default: return 'bg-blue-100 text-blue-800 border-blue-200';
    }
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-xl text-gray-500">Loading Mission Control...</div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">👋 Welcome back, {user?.username}</h1>
          <p className="text-gray-500">Here's what's happening in your infrastructure today.</p>
        </div>
        <div className="text-sm text-gray-400">
          Last updated: {new Date().toLocaleTimeString()}
        </div>
      </div>

      {/* Top Row: System Health & Infrastructure Summary */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* System Health Card */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
            🖥️ System Health
          </h2>
          <div className="space-y-4">
            {stats && (
              <>
                {/* CPU */}
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-600">CPU Usage</span>
                    <span className="font-medium text-gray-900">{stats.cpu.usage.toFixed(1)}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full transition-all duration-500 ${stats.cpu.usage > 80 ? 'bg-red-500' : 'bg-blue-500'}`}
                      style={{ width: `${stats.cpu.usage}%` }}
                    ></div>
                  </div>
                </div>

                {/* RAM */}
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-600">Memory</span>
                    <span className="font-medium text-gray-900">
                      {formatBytes(stats.memory.used)} / {formatBytes(stats.memory.total)}
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full transition-all duration-500 ${stats.memory.usage > 90 ? 'bg-red-500' : 'bg-purple-500'}`}
                      style={{ width: `${stats.memory.usage}%` }}
                    ></div>
                  </div>
                </div>

                {/* Disk */}
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-600">Disk Space</span>
                    <span className="font-medium text-gray-900">
                      {formatBytes(stats.disk.used)} / {formatBytes(stats.disk.total)}
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full transition-all duration-500 ${stats.disk.usage > 90 ? 'bg-red-500' : 'bg-green-500'}`}
                      style={{ width: `${stats.disk.usage}%` }}
                    ></div>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Infrastructure Summary */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
            🏗️ Infrastructure
          </h2>
          <div className="grid grid-cols-2 gap-4">
            <div onClick={() => navigate('/vms')} className="bg-blue-50 p-4 rounded-lg cursor-pointer hover:bg-blue-100 transition">
              <div className="text-2xl font-bold text-blue-700">{vmCounts.running}</div>
              <div className="text-sm text-blue-600 font-medium">Running VMs</div>
              <div className="text-xs text-blue-400 mt-1">Total: {vmCounts.total}</div>
            </div>
            <div onClick={() => navigate('/vms')} className="bg-purple-50 p-4 rounded-lg cursor-pointer hover:bg-purple-100 transition">
              <div className="text-2xl font-bold text-purple-700">{serviceCounts.healthy}</div>
              <div className="text-sm text-purple-600 font-medium">Healthy Services</div>
              <div className="text-xs text-purple-400 mt-1">Total: {serviceCounts.total}</div>
            </div>
            <div onClick={() => navigate('/vms')} className="bg-red-50 p-4 rounded-lg cursor-pointer hover:bg-red-100 transition">
              <div className="text-2xl font-bold text-red-700">{vmCounts.stopped}</div>
              <div className="text-sm text-red-600 font-medium">Stopped VMs</div>
            </div>
            <div onClick={() => navigate('/alerts')} className="bg-yellow-50 p-4 rounded-lg cursor-pointer hover:bg-yellow-100 transition">
              <div className="text-2xl font-bold text-yellow-700">{alerts.length}</div>
              <div className="text-sm text-yellow-600 font-medium">Active Alerts</div>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
            ⚡ Quick Actions
          </h2>
          <div className="grid grid-cols-1 gap-3">
            <button
              onClick={() => navigate('/vms')}
              className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 hover:bg-gray-50 transition text-left"
            >
              <span className="text-xl">🖥️</span>
              <div>
                <div className="font-medium text-gray-900">Manage VMs</div>
                <div className="text-xs text-gray-500">Access Proxmox consoles & power</div>
              </div>
            </button>

            <button
              onClick={() => navigate('/credentials')}
              className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 hover:bg-gray-50 transition text-left"
            >
              <span className="text-xl">🔐</span>
              <div>
                <div className="font-medium text-gray-900">Credentials Vault</div>
                <div className="text-xs text-gray-500">Update API keys & secrets</div>
              </div>
            </button>

            <button
              onClick={() => navigate('/prompts')}
              className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 hover:bg-gray-50 transition text-left"
            >
              <span className="text-xl">✨</span>
              <div>
                <div className="font-medium text-gray-900">Prompt Generator</div>
                <div className="text-xs text-gray-500">Create AI prompts for coding</div>
              </div>
            </button>
          </div>
        </div>
      </div>

      {/* Bottom Row: Active Alerts & Activity (Placeholder) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Active Alerts List */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold text-gray-800">🚨 Active Alerts</h2>
            <button onClick={() => navigate('/alerts')} className="text-sm text-blue-600 hover:underline">View All</button>
          </div>

          {alerts.length === 0 ? (
            <div className="text-center py-8 text-gray-400 bg-gray-50 rounded-lg border border-dashed border-gray-200">
              ✅ No active alerts. Systems normal.
            </div>
          ) : (
            <div className="space-y-3">
              {alerts.slice(0, 5).map(alert => (
                <div key={alert.id} className={`p-4 rounded-lg border ${getSeverityColor(alert.severity)}`}>
                  <div className="flex justify-between items-start">
                    <div className="font-semibold">{alert.title}</div>
                    <span className="text-xs opacity-75">{new Date(alert.created_at).toLocaleTimeString()}</span>
                  </div>
                  <div className="text-sm mt-1 opacity-90">{alert.message}</div>
                </div>
              ))}
              {alerts.length > 5 && (
                <div className="text-center text-sm text-gray-500 pt-2">
                  + {alerts.length - 5} more alerts
                </div>
              )}
            </div>
          )}
        </div>

        {/* Recent Activity (Placeholder / Future Feature) */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 opacity-75">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">📊 Recent Activity</h2>
          <div className="text-center py-12 text-gray-400 bg-gray-50 rounded-lg border border-dashed border-gray-200">
            (Comparison charts & audit logs coming in v2.0)
          </div>
        </div>
      </div>

    </div>
  );
};

export default Dashboard;
