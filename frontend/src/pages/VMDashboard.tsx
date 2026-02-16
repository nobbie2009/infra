import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../lib/api';

interface Service {
  id: string;
  name: string;
  type: string;
  port: number;
  health_status: string;
}

interface IPAllocation {
  id: string; // Database ID
  vmid: number;
  name: string;
  node: string;
  ipv4: string | null;
  ipv6: string | null;
  hostname: string | null;
  status: string;
  tags: string[];
  description: string;
  services: Service[];
}

const VMDashboard: React.FC = () => {
  // State
  const { user } = useAuth();
  const [allocations, setAllocations] = useState<IPAllocation[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [refreshingIPs, setRefreshingIPs] = useState(false);
  const [operatingVM, setOperatingVM] = useState<string | null>(null);

  // Filters & Sorting
  const [filterText, setFilterText] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [sortConfig, setSortConfig] = useState<{ key: keyof IPAllocation; direction: 'asc' | 'desc' } | null>(null);

  // Editing State
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<{ description: string; tags: string }>({ description: '', tags: '' });

  // Load Data
  useEffect(() => {
    loadAllocations();
    const interval = setInterval(loadAllocations, 10000); // 10s auto-refresh
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

  // Actions
  const handleSync = async () => {
    setSyncing(true);
    try {
      const response = await api.post('/infrastructure/sync-vms');
      if (response.data.success) await loadAllocations();
    } catch (error) {
      console.error('Failed to sync VMs:', error);
      alert('Failed to sync with Proxmox.');
    } finally {
      setSyncing(false);
    }
  };

  const handleRefreshIPs = async () => {
    setRefreshingIPs(true);
    try {
      const response = await api.post('/infrastructure/refresh-vm-ips');
      if (response.data.success) {
        await loadAllocations();
        alert(`✅ IP addresses updated for ${response.data.data.count} VMs`);
      }
    } catch (error) {
      console.error('Failed to refresh IPs:', error);
      alert('Failed to refresh IP addresses.');
    } finally {
      setRefreshingIPs(false);
    }
  };

  const handleVMAction = async (vmid: number, node: string, action: 'start' | 'stop' | 'restart') => {
    setOperatingVM(`${vmid}-${action}`);
    try {
      await api.post(`/infrastructure/vms/${vmid}/${action}?node=${node}`);
      setTimeout(() => loadAllocations(), 2000);
    } catch (error) {
      alert(`Failed to ${action} VM`);
    } finally {
      setOperatingVM(null);
    }
  };

  // Edit Handlers
  const startEditing = (vm: IPAllocation) => {
    setEditingId(vm.id);
    setEditForm({
      description: vm.description || '',
      tags: (vm.tags || []).join(', '),
    });
  };

  const saveEdit = async (vmId: string) => {
    try {
      const tagsArray = editForm.tags.split(',').map(t => t.trim()).filter(t => t);
      await api.put(`/infrastructure/vms/${vmId}`, {
        description: editForm.description,
        tags: tagsArray
      });
      setEditingId(null);
      await loadAllocations();
    } catch (error) {
      console.error('Failed to save VM details:', error);
      alert('Failed to save changes.');
    }
  };

  // Derived Data (Filtered & Sorted)
  const allTags = useMemo(() => {
    const tags = new Set<string>();
    allocations.forEach(vm => (vm.tags || []).forEach(t => tags.add(t)));
    return Array.from(tags).sort();
  }, [allocations]);

  const filteredAllocations = useMemo(() => {
    let result = [...allocations];

    if (filterText) {
      const lower = filterText.toLowerCase();
      result = result.filter(vm =>
        vm.name.toLowerCase().includes(lower) ||
        (vm.ipv4 || '').includes(lower) ||
        (vm.ipv6 || '').includes(lower)
      );
    }

    if (selectedTags.length > 0) {
      result = result.filter(vm =>
        selectedTags.every(tag => (vm.tags || []).includes(tag))
      );
    }

    if (sortConfig) {
      result.sort((a, b) => {
        const valA = a[sortConfig.key] || '';
        const valB = b[sortConfig.key] || '';
        if (valA < valB) return sortConfig.direction === 'asc' ? -1 : 1;
        if (valA > valB) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }

    return result;
  }, [allocations, filterText, selectedTags, sortConfig]);

  const requestSort = (key: keyof IPAllocation) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'running': return 'border-terminal-primary text-terminal-primary';
      case 'stopped': return 'border-terminal-danger text-terminal-danger';
      case 'paused': return 'border-terminal-warning text-terminal-warning';
      default: return 'border-terminal-muted text-terminal-muted';
    }
  };

  return (
    <div className="p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">🖥️ VM Inventory</h1>
            <p className="text-gray-500 mt-1">Manage virtual machines, IPs, and tags</p>
          </div>
          <div className="flex gap-3">
            <button onClick={loadAllocations} disabled={loading} className="btn-secondary flex items-center gap-2">
              🔄 Refresh
            </button>
            <button onClick={handleRefreshIPs} disabled={refreshingIPs} className="btn-primary bg-purple-600 hover:bg-purple-700 flex items-center gap-2">
              {refreshingIPs ? '⏳ Updating...' : '🔗 Update IPs'}
            </button>
            <button onClick={handleSync} disabled={syncing} className="btn-primary flex items-center gap-2">
              {syncing ? '⏳ Syncing...' : '📡 Sync Proxmox'}
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white p-4 rounded-lg shadow mb-6 flex flex-col md:flex-row gap-4 items-center">
          <div className="relative flex-1">
            <span className="absolute left-3 top-2.5 text-gray-400">🔍</span>
            <input
              type="text"
              placeholder="Search by Name or IP..."
              className="pl-10 w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
              value={filterText}
              onChange={(e) => setFilterText(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-2 overflow-x-auto max-w-full">
            <span className="text-sm font-medium text-gray-700 whitespace-nowrap">Tags:</span>
            {allTags.map(tag => (
              <button
                key={tag}
                onClick={() => setSelectedTags(prev =>
                  prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
                )}
                className={`px-3 py-1 rounded-full text-xs font-medium border transition ${selectedTags.includes(tag)
                    ? 'bg-blue-100 text-blue-800 border-blue-200'
                    : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                  }`}
              >
                {tag}
              </button>
            ))}
            {allTags.length === 0 && <span className="text-xs text-gray-400 italic">No tags found</span>}
          </div>
        </div>

        {/* Table */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th onClick={() => requestSort('status')} className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 w-24">Status</th>
                  <th onClick={() => requestSort('name')} className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100">Name / Node</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-48">IP Address</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer w-48">Tags</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer">Description</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider w-40">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredAllocations.map(vm => (
                  <tr key={vm.id} className="hover:bg-gray-50 transition">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(vm.status)}`}>
                        {vm.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{vm.name}</div>
                      <div className="text-xs text-gray-500">{vm.node} (ID: {vm.vmid})</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {vm.ipv4 ? (
                        <div
                          className="text-sm bg-gray-100 px-2 py-1 rounded inline-block font-mono cursor-pointer hover:bg-gray-200"
                          title="Click to copy"
                          onClick={() => navigator.clipboard.writeText(vm.ipv4 || '')}
                        >
                          {vm.ipv4}
                        </div>
                      ) : <span className="text-xs text-gray-400">-</span>}
                      {vm.ipv6 && <div className="text-xs text-gray-400 mt-1 truncate max-w-[150px]" title={vm.ipv6}>{vm.ipv6}</div>}
                    </td>

                    {/* Tags (Editable) */}
                    <td className="px-6 py-4">
                      {editingId === vm.id ? (
                        <input
                          type="text"
                          className="w-full text-sm border-gray-300 rounded focus:ring-blue-500 focus:border-blue-500"
                          value={editForm.tags}
                          onChange={e => setEditForm({ ...editForm, tags: e.target.value })}
                          placeholder="comma, separated"
                        />
                      ) : (
                        <div className="flex flex-wrap gap-1">
                          {(vm.tags || []).length > 0 ? (
                            vm.tags.map((tag, idx) => (
                              <span key={idx} className="px-2 py-0.5 rounded text-xs bg-blue-50 text-blue-700 border border-blue-100">
                                {tag}
                              </span>
                            ))
                          ) : (
                            <span className="text-xs text-gray-400 italic">No tags</span>
                          )}
                        </div>
                      )}
                    </td>

                    {/* Description (Editable) */}
                    <td className="px-6 py-4">
                      {editingId === vm.id ? (
                        <div className="flex flex-col gap-2">
                          <input
                            type="text"
                            className="w-full text-sm border-gray-300 rounded focus:ring-blue-500 focus:border-blue-500"
                            value={editForm.description}
                            onChange={e => setEditForm({ ...editForm, description: e.target.value })}
                            placeholder="Enter description..."
                          />
                          <div className="flex gap-2 justify-end">
                            <button onClick={() => setEditingId(null)} className="text-xs text-gray-500 hover:text-gray-700">Cancel</button>
                            <button onClick={() => saveEdit(vm.id)} className="text-xs bg-blue-600 text-white px-2 py-1 rounded hover:bg-blue-700">Save</button>
                          </div>
                        </div>
                      ) : (
                        <div
                          className="text-sm text-gray-500 cursor-pointer hover:text-gray-700"
                          onClick={() => startEditing(vm)}
                          title="Click to edit"
                        >
                          {vm.description || <span className="italic text-gray-300">Add description...</span>}
                        </div>
                      )}
                    </td>

                    {/* Actions */}
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => handleVMAction(vm.vmid, vm.node, 'start')}
                          disabled={vm.status === 'running' || !!operatingVM}
                          className="p-1 text-green-600 hover:text-green-900 disabled:opacity-30 tooltip"
                          title="Start"
                        >
                          ▶️
                        </button>
                        <button
                          onClick={() => handleVMAction(vm.vmid, vm.node, 'restart')}
                          disabled={vm.status === 'stopped' || !!operatingVM}
                          className="p-1 text-blue-600 hover:text-blue-900 disabled:opacity-30"
                          title="Restart"
                        >
                          🔄
                        </button>
                        <button
                          onClick={() => handleVMAction(vm.vmid, vm.node, 'stop')}
                          disabled={vm.status === 'stopped' || !!operatingVM}
                          className="p-1 text-red-600 hover:text-red-900 disabled:opacity-30"
                          title="Stop"
                        >
                          ⏹️
                        </button>
                        {/* Edit Button (Explicit) */}
                        {editingId !== vm.id && (
                          <button
                            onClick={() => startEditing(vm)}
                            className="p-1 text-gray-400 hover:text-gray-600"
                            title="Edit Details"
                          >
                            ✏️
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {filteredAllocations.length === 0 && (
            <div className="p-8 text-center text-gray-500">
              No VMs found matching your filters.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default VMDashboard;
