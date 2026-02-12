import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../lib/api';

interface VM {
  vmid: number;
  name: string;
  status: 'running' | 'stopped' | 'paused';
  node: string;
  maxcpu: number;
  maxmem: number;
  mem: number;
  cpu: number;
  uptime: number;
}

interface Service {
  id: string;
  name: string;
  type: string;
  port: number;
  health_status: string;
}

interface IPAllocation {
  vmid: number;
  name: string;
  node: string;
  ipv4: string | null;
  ipv6: string | null;
  hostname: string | null;
  status: string;
  services: Service[];
}

const VMDashboard: React.FC = () => {
  const { user } = useAuth();
  const [allocations, setAllocations] = useState<IPAllocation[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [operatingVM, setOperatingVM] = useState<string | null>(null);

  useEffect(() => {
    loadAllocations();
    const interval = setInterval(loadAllocations, 10000); // Refresh every 10s
    return () => clearInterval(interval);
  }, []);

  const loadAllocations = async () => {
    try {
      const response = await api.get('/infrastructure/ip-allocations');
      if (response.data.success) {
        setAllocations(response.data.data.allocations || []);
      }
    } catch (error) {
      console.error('Failed to load allocations:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSync = async () => {
    setSyncing(true);
    try {
      const response = await api.post('/infrastructure/sync-vms');
      if (response.data.success) {
        await loadAllocations();
      }
    } catch (error) {
      console.error('Failed to sync VMs:', error);
      alert('Failed to sync with Proxmox. Make sure your credentials are set and valid.');
    } finally {
      setSyncing(false);
    }
  };

  const handleVMAction = async (vmid: number, node: string, action: 'start' | 'stop' | 'restart') => {
    setOperatingVM(`${vmid}-${action}`);
    try {
      await api.post(`/infrastructure/vms/${vmid}/${action}?node=${node}`);
      // Reload after a short delay to allow Proxmox to process
      setTimeout(() => loadAllocations(), 2000);
    } catch (error) {
      alert(`Failed to ${action} VM`);
    } finally {
      setOperatingVM(null);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'running':
        return 'bg-green-100 text-green-800';
      case 'stopped':
        return 'bg-red-100 text-red-800';
      case 'paused':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getHealthColor = (status: string) => {
    switch (status) {
      case 'healthy':
        return 'text-green-600';
      case 'unhealthy':
        return 'text-red-600';
      default:
        return 'text-gray-600';
    }
  };

  return (
    <div className="p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-4xl font-bold text-gray-900">🖥️ VM Dashboard</h1>
              <p className="text-gray-600 mt-2">Monitor and control your virtual machines</p>
            </div>
            <div className="flex gap-4">
              <button
                onClick={loadAllocations}
                disabled={loading}
                className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 flex items-center gap-2"
              >
                🔄 {loading ? 'Loading...' : 'Refresh'}
              </button>
              <button
                onClick={handleSync}
                disabled={syncing}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
              >
                {syncing ? '⏳ Syncing...' : '📡 Sync with Proxmox'}
              </button>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-3xl font-bold text-blue-600">
              {allocations.filter((a: IPAllocation) => a.status === 'running').length}
            </div>
            <div className="text-gray-600">Running VMs</div>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-3xl font-bold text-red-600">
              {allocations.filter((a: IPAllocation) => a.status === 'stopped').length}
            </div>
            <div className="text-gray-600">Stopped VMs</div>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-3xl font-bold text-purple-600">{allocations.length}</div>
            <div className="text-gray-600">Total VMs</div>
          </div>
        </div>

        {/* VMs List */}
        {loading ? (
          <div className="text-center py-12 text-gray-500 flex flex-col items-center gap-4">
            <div className="animate-spin text-4xl">🔄</div>
            <div>Loading VM data...</div>
          </div>
        ) : allocations.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-12 text-center">
            <div className="text-6xl mb-4">🔍</div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">No VMs found in database</h2>
            <p className="text-gray-600 mb-6">
              It looks like your VMs haven't been synchronized from Proxmox yet.
            </p>
            <button
              onClick={handleSync}
              disabled={syncing}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-bold"
            >
              {syncing ? 'Syncing...' : '📡 Sync Now'}
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {allocations.map((alloc: IPAllocation) => (
              <div key={`${alloc.node}-${alloc.vmid}`} className="bg-white rounded-lg shadow overflow-hidden hover:shadow-lg transition">
                {/* VM Header */}
                <div className="bg-gradient-to-r from-blue-500 to-purple-600 text-white p-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="text-xl font-bold">{alloc.name}</h3>
                      <p className="text-blue-100">Node: {alloc.node} | VMID: {alloc.vmid}</p>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(alloc.status)}`}>
                      {alloc.status.toUpperCase()}
                    </span>
                  </div>
                </div>

                {/* VM Details */}
                <div className="p-4 space-y-3 border-b">
                  {alloc.ipv4 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">IPv4:</span>
                      <code className="bg-gray-100 px-2 py-1 rounded">{alloc.ipv4}</code>
                    </div>
                  )}
                  {alloc.ipv6 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">IPv6:</span>
                      <code className="bg-gray-100 px-2 py-1 rounded text-xs">{alloc.ipv6}</code>
                    </div>
                  )}
                  {alloc.hostname && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Hostname:</span>
                      <span className="font-mono">{alloc.hostname}</span>
                    </div>
                  )}
                </div>

                {/* Services */}
                {alloc.services.length > 0 && (
                  <div className="p-4 border-b">
                    <h4 className="font-semibold text-sm mb-2">Services ({alloc.services.length})</h4>
                    <div className="space-y-1">
                      {alloc.services.map((service: Service) => (
                        <div key={service.id} className="flex justify-between text-xs text-gray-600">
                          <span>
                            {service.name} ({service.type})
                          </span>
                          <span className={`font-medium ${getHealthColor(service.health_status)}`}>
                            ● {service.health_status}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Actions */}
                <div className="p-4 flex gap-2 bg-gray-50">
                  <button
                    onClick={() => handleVMAction(alloc.vmid, alloc.node, 'start')}
                    disabled={operatingVM?.startsWith(`${alloc.vmid}-start`) || alloc.status === 'running'}
                    className="flex-1 px-3 py-2 bg-green-500 text-white rounded text-sm hover:bg-green-600 disabled:opacity-50 font-medium"
                  >
                    {operatingVM?.startsWith(`${alloc.vmid}-start`) ? '⏳' : '▶️'} Start
                  </button>
                  <button
                    onClick={() => handleVMAction(alloc.vmid, alloc.node, 'stop')}
                    disabled={operatingVM?.startsWith(`${alloc.vmid}-stop`) || alloc.status === 'stopped'}
                    className="flex-1 px-3 py-2 bg-red-500 text-white rounded text-sm hover:bg-red-600 disabled:opacity-50 font-medium"
                  >
                    {operatingVM?.startsWith(`${alloc.vmid}-stop`) ? '⏳' : '⏹️'} Stop
                  </button>
                  <button
                    onClick={() => handleVMAction(alloc.vmid, alloc.node, 'restart')}
                    disabled={operatingVM?.startsWith(`${alloc.vmid}-restart`) || alloc.status === 'stopped'}
                    className="flex-1 px-3 py-2 bg-blue-500 text-white rounded text-sm hover:bg-blue-600 disabled:opacity-50 font-medium"
                  >
                    {operatingVM?.startsWith(`${alloc.vmid}-restart`) ? '⏳' : '🔄'} Restart
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default VMDashboard;
