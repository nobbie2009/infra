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
    <div className="p-6 bg-terminal-bg min-h-screen">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
          <div>
            <h1 className="text-3xl font-bold text-terminal-primary text-glow section-header">VM INVENTORY</h1>
            <p className="text-terminal-muted mt-2 font-mono text-sm">manage virtual machines, ips, and tags</p>
          </div>
          <div className="flex gap-3">
            <button onClick={loadAllocations} disabled={loading} className="btn-terminal">
              REFRESH
            </button>
            <button onClick={handleRefreshIPs} disabled={refreshingIPs} className="btn-terminal border-terminal-accent text-terminal-accent">
              {refreshingIPs ? 'UPDATING...' : 'UPDATE IPS'}
            </button>
            <button onClick={handleSync} disabled={syncing} className="btn-terminal">
              {syncing ? 'SYNCING...' : 'SYNC PROXMOX'}
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="card-terminal mb-6 flex flex-col md:flex-row gap-4 items-center">
          <div className="relative flex-1">
            <span className="absolute left-3 top-2.5 text-terminal-muted">{'>_'}</span>
            <input
              type="text"
              placeholder="search by name or ip"
              className="input-terminal pl-8"
              value={filterText}
              onChange={(e) => setFilterText(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-2 overflow-x-auto max-w-full">
            <span className="text-xs font-mono text-terminal-secondary whitespace-nowrap">[ TAGS ]</span>
            {allTags.map(tag => (
              <button
                key={tag}
                onClick={() => setSelectedTags(prev =>
                  prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
                )}
                className={`px-3 py-1 text-xs font-mono border transition ${selectedTags.includes(tag)
                    ? 'border-terminal-primary text-terminal-primary bg-terminal-bg'
                    : 'border-terminal-border text-terminal-muted hover:text-terminal-secondary'
                  }`}
              >
                {tag}
              </button>
            ))}
            {allTags.length === 0 && <span className="text-xs text-terminal-muted font-mono">no tags</span>}
          </div>
        </div>

        {/* Table */}
        <div className="card-terminal overflow-hidden">
          <div className="overflow-x-auto">
            <table className="table-terminal">
              <thead>
                <tr>
                  <th onClick={() => requestSort('status')} className="cursor-pointer w-24">STATUS</th>
                  <th onClick={() => requestSort('name')} className="cursor-pointer">NAME / NODE</th>
                  <th className="w-48">IP ADDRESS</th>
                  <th className="cursor-pointer w-48">TAGS</th>
                  <th className="cursor-pointer">DESCRIPTION</th>
                  <th className="text-right w-40">ACTIONS</th>
                </tr>
              </thead>
              <tbody>
                {filteredAllocations.map(vm => (
                  <tr key={vm.id}>
                    <td>
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold border ${getStatusColor(vm.status)}`}>
                        ● {vm.status.toUpperCase()}
                      </span>
                    </td>
                    <td>
                      <div className="text-sm font-medium">{vm.name}</div>
                      <div className="text-xs text-terminal-muted">{vm.node} (ID: {vm.vmid})</div>
                    </td>
                    <td>
                      {vm.ipv4 ? (
                        <div
                          className="text-sm bg-terminal-surface px-2 py-1 inline-block font-mono cursor-pointer hover:text-terminal-accent transition"
                          title="Click to copy"
                          onClick={() => navigator.clipboard.writeText(vm.ipv4 || '')}
                        >
                          {vm.ipv4}
                        </div>
                      ) : <span className="text-xs text-terminal-muted">-</span>}
                      {vm.ipv6 && <div className="text-xs text-terminal-muted mt-1 truncate max-w-[150px] font-mono" title={vm.ipv6}>{vm.ipv6}</div>}
                    </td>

                    {/* Tags (Editable) */}
                    <td>
                      {editingId === vm.id ? (
                        <input
                          type="text"
                          className="input-terminal text-sm"
                          value={editForm.tags}
                          onChange={e => setEditForm({ ...editForm, tags: e.target.value })}
                          placeholder="comma, separated"
                        />
                      ) : (
                        <div className="flex flex-wrap gap-1">
                          {(vm.tags || []).length > 0 ? (
                            vm.tags.map((tag, idx) => (
                              <span key={idx} className="px-2 py-0.5 text-xs border border-terminal-accent text-terminal-accent bg-terminal-bg">
                                [{tag}]
                              </span>
                            ))
                          ) : (
                            <span className="text-xs text-terminal-muted font-mono">no tags</span>
                          )}
                        </div>
                      )}
                    </td>

                    {/* Description (Editable) */}
                    <td>
                      {editingId === vm.id ? (
                        <div className="flex flex-col gap-2">
                          <input
                            type="text"
                            className="input-terminal text-sm"
                            value={editForm.description}
                            onChange={e => setEditForm({ ...editForm, description: e.target.value })}
                            placeholder="Enter description..."
                          />
                          <div className="flex gap-2 justify-end">
                            <button onClick={() => setEditingId(null)} className="text-xs text-terminal-muted hover:text-terminal-secondary font-mono">CANCEL</button>
                            <button onClick={() => saveEdit(vm.id)} className="text-xs border border-terminal-primary text-terminal-primary px-2 py-1 hover:bg-terminal-primary hover:text-terminal-bg transition">SAVE</button>
                          </div>
                        </div>
                      ) : (
                        <div
                          className="text-sm text-terminal-secondary cursor-pointer hover:text-terminal-primary transition"
                          onClick={() => startEditing(vm)}
                          title="Click to edit"
                        >
                          {vm.description || <span className="font-mono text-terminal-muted">add description...</span>}
                        </div>
                      )}
                    </td>

                    {/* Actions */}
                    <td className="text-right">
                      <div className="flex justify-end gap-2 font-mono text-sm">
                        <button
                          onClick={() => handleVMAction(vm.vmid, vm.node, 'start')}
                          disabled={vm.status === 'running' || !!operatingVM}
                          className="text-terminal-primary hover:text-terminal-accent disabled:opacity-30 transition"
                          title="Start"
                        >
                          [►]
                        </button>
                        <button
                          onClick={() => handleVMAction(vm.vmid, vm.node, 'restart')}
                          disabled={vm.status === 'stopped' || !!operatingVM}
                          className="text-terminal-accent hover:text-terminal-primary disabled:opacity-30 transition"
                          title="Restart"
                        >
                          [↻]
                        </button>
                        <button
                          onClick={() => handleVMAction(vm.vmid, vm.node, 'stop')}
                          disabled={vm.status === 'stopped' || !!operatingVM}
                          className="text-terminal-danger hover:text-terminal-warning disabled:opacity-30 transition"
                          title="Stop"
                        >
                          [■]
                        </button>
                        {/* Edit Button (Explicit) */}
                        {editingId !== vm.id && (
                          <button
                            onClick={() => startEditing(vm)}
                            className="text-terminal-muted hover:text-terminal-primary transition"
                            title="Edit Details"
                          >
                            [E]
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
            <div className="p-8 text-center text-terminal-muted font-mono">
              [ NO VMS FOUND MATCHING YOUR FILTERS ]
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default VMDashboard;
