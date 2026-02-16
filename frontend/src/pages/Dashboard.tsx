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
      case 'critical': return 'border-terminal-danger text-terminal-danger';
      case 'warning': return 'border-terminal-warning text-terminal-warning';
      default: return 'border-terminal-primary text-terminal-primary';
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
        <div className="text-xl text-terminal-primary text-glow font-mono">[ loading... ]</div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-terminal-primary text-glow section-header">WELCOME {user?.username?.toUpperCase()}</h1>
          <p className="text-terminal-muted font-mono mt-2">infrastructure status overview</p>
        </div>
        <div className="text-sm text-terminal-muted font-mono">
          [ LAST UPDATED: {new Date().toLocaleTimeString()} ]
        </div>
      </div>

      {/* Top Row: System Health & Infrastructure Summary */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* System Health Card */}
        <div className="card-terminal">
          <h2 className="text-lg font-semibold text-terminal-primary mb-4 flex items-center gap-2 section-header">SYSTEM HEALTH</h2>
          <div className="space-y-4 font-mono text-sm">
            {stats && (
              <>
                {/* CPU */}
                <div>
                  <div className="flex justify-between mb-1 text-terminal-secondary">
                    <span>CPU USAGE</span>
                    <span className={`${(stats.cpu.usage || 0) > 80 ? 'text-terminal-danger' : 'text-terminal-primary'}`}>{(stats.cpu.usage || 0).toFixed(1)}%</span>
                  </div>
                  <div className="w-full bg-terminal-border h-2">
                    <div
                      className={`h-2 transition-all duration-500 ${(stats.cpu.usage || 0) > 80 ? 'bg-terminal-danger' : 'bg-terminal-primary'}`}
                      style={{ width: `${(stats.cpu.usage || 0)}%` }}
                    ></div>
                  </div>
                </div>

                {/* RAM */}
                <div>
                  <div className="flex justify-between mb-1 text-terminal-secondary">
                    <span>MEMORY</span>
                    <span className={`${(stats.memory.usage || 0) > 90 ? 'text-terminal-danger' : 'text-terminal-primary'}`}>
                      {formatBytes(stats.memory.used)} / {formatBytes(stats.memory.total)}
                    </span>
                  </div>
                  <div className="w-full bg-terminal-border h-2">
                    <div
                      className={`h-2 transition-all duration-500 ${(stats.memory.usage || 0) > 90 ? 'bg-terminal-danger' : 'bg-terminal-accent'}`}
                      style={{ width: `${(stats.memory.usage || 0)}%` }}
                    ></div>
                  </div>
                </div>

                {/* Disk */}
                <div>
                  <div className="flex justify-between mb-1 text-terminal-secondary">
                    <span>DISK SPACE</span>
                    <span className={`${(stats.disk.usage || 0) > 90 ? 'text-terminal-danger' : 'text-terminal-primary'}`}>
                      {formatBytes(stats.disk.used)} / {formatBytes(stats.disk.total)}
                    </span>
                  </div>
                  <div className="w-full bg-terminal-border h-2">
                    <div
                      className={`h-2 transition-all duration-500 ${(stats.disk.usage || 0) > 90 ? 'bg-terminal-danger' : 'bg-terminal-primary'}`}
                      style={{ width: `${(stats.disk.usage || 0)}%` }}
                    ></div>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Infrastructure Summary */}
        <div className="card-terminal">
          <h2 className="text-lg font-semibold text-terminal-primary mb-4 flex items-center gap-2 section-header">INFRASTRUCTURE</h2>
          <div className="grid grid-cols-2 gap-4 font-mono text-sm">
            <div onClick={() => navigate('/vms')} className="border border-terminal-border p-4 cursor-pointer hover:bg-terminal-surface transition">
              <div className="text-2xl font-bold text-terminal-primary">{vmCounts.running}</div>
              <div className="text-terminal-secondary font-medium">RUNNING VMS</div>
              <div className="text-terminal-muted mt-1">TOTAL: {vmCounts.total}</div>
            </div>
            <div onClick={() => navigate('/vms')} className="border border-terminal-border p-4 cursor-pointer hover:bg-terminal-surface transition">
              <div className="text-2xl font-bold text-terminal-primary">{serviceCounts.healthy}</div>
              <div className="text-terminal-secondary font-medium">HEALTHY SVC</div>
              <div className="text-terminal-muted mt-1">TOTAL: {serviceCounts.total}</div>
            </div>
            <div onClick={() => navigate('/vms')} className="border border-terminal-border p-4 cursor-pointer hover:bg-terminal-surface transition">
              <div className="text-2xl font-bold text-terminal-danger">{vmCounts.stopped}</div>
              <div className="text-terminal-secondary font-medium">STOPPED VMS</div>
            </div>
            <div onClick={() => navigate('/alerts')} className="border border-terminal-border p-4 cursor-pointer hover:bg-terminal-surface transition">
              <div className={`text-2xl font-bold ${alerts.length > 0 ? 'text-terminal-warning' : 'text-terminal-primary'}`}>{alerts.length}</div>
              <div className="text-terminal-secondary font-medium">ACTIVE ALERTS</div>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="card-terminal">
          <h2 className="text-lg font-semibold text-terminal-primary mb-4 flex items-center gap-2 section-header">QUICK ACCESS</h2>
          <div className="grid grid-cols-1 gap-3 font-mono text-sm">
            <button
              onClick={() => navigate('/vms')}
              className="flex items-center gap-3 p-3 border border-terminal-border hover:bg-terminal-surface transition text-left"
            >
              <span className="text-xl">🖥️</span>
              <div>
                <div className="font-medium text-terminal-primary">MANAGE VMS</div>
                <div className="text-xs text-terminal-muted">proxmox consoles</div>
              </div>
            </button>

            <button
              onClick={() => navigate('/credentials')}
              className="flex items-center gap-3 p-3 border border-terminal-border hover:bg-terminal-surface transition text-left"
            >
              <span className="text-xl">🔐</span>
              <div>
                <div className="font-medium text-terminal-primary">CREDENTIALS VAULT</div>
                <div className="text-xs text-terminal-muted">api keys & secrets</div>
              </div>
            </button>

            <button
              onClick={() => navigate('/prompts')}
              className="flex items-center gap-3 p-3 border border-terminal-border hover:bg-terminal-surface transition text-left"
            >
              <span className="text-xl">✨</span>
              <div>
                <div className="font-medium text-terminal-primary">PROMPT GENERATOR</div>
                <div className="text-xs text-terminal-muted">ai prompt generation</div>
              </div>
            </button>
          </div>
        </div>
      </div>

      {/* Bottom Row: Active Alerts & Activity (Placeholder) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Active Alerts List */}
        <div className="card-terminal">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold text-terminal-primary section-header">ACTIVE ALERTS</h2>
            <button onClick={() => navigate('/alerts')} className="text-sm text-terminal-primary hover:text-terminal-accent transition font-mono">[VIEW ALL]</button>
          </div>

          {alerts.length === 0 ? (
            <div className="text-center py-8 text-terminal-primary border border-dashed border-terminal-border font-mono">
              [ OK ] systems normal
            </div>
          ) : (
            <div className="space-y-3 font-mono text-sm">
              {alerts.slice(0, 5).map(alert => (
                <div key={alert.id} className={`p-3 border ${getSeverityColor(alert.severity)}`}>
                  <div className="flex justify-between items-start">
                    <div className="font-semibold">[{alert.severity.toUpperCase()}] {alert.title}</div>
                    <span className="text-xs opacity-75">{new Date(alert.created_at).toLocaleTimeString()}</span>
                  </div>
                  <div className="text-xs mt-1 opacity-90">{alert.message}</div>
                </div>
              ))}
              {alerts.length > 5 && (
                <div className="text-center text-sm text-terminal-muted pt-2 font-mono">
                  [ +{alerts.length - 5} MORE ]
                </div>
              )}
            </div>
          )}
        </div>

        {/* Recent Activity (Placeholder / Future Feature) */}
        <div className="card-terminal opacity-75">
          <h2 className="text-lg font-semibold text-terminal-primary mb-4 section-header">ACTIVITY LOG</h2>
          <div className="text-center py-12 text-terminal-muted border border-dashed border-terminal-border font-mono text-sm">
            [ v2.0 ] audit logs & charts
          </div>
        </div>
      </div>

    </div>
  );
};

export default Dashboard;
