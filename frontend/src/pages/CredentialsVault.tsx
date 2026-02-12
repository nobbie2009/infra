import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../lib/api';

interface Credential {
  id: string;
  name: string;
  type: string;
  description?: string;
  created_at: string;
  last_used?: string;
}

const CredentialsVault: React.FC = () => {
  const { user } = useAuth();
  const [credentials, setCredentials] = useState<Credential[]>([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    type: 'proxmox',
    endpoint: '',
    token: '',
    node: 'pve',
    description: '',
  });
  const [testingId, setTestingId] = useState<string | null>(null);

  useEffect(() => {
    loadCredentials();
  }, []);

  const loadCredentials = async () => {
    setLoading(true);
    try {
      const response = await api.get('/credentials');
      if (response.data.success) {
        setCredentials(response.data.data || []);
      }
    } catch (error) {
      console.error('Failed to load credentials:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddCredential = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const credentialData = {
        endpoint: formData.endpoint,
        token: formData.token,
        node: formData.node,
      };

      const response = await api.post('/credentials', {
        name: formData.name,
        type: formData.type,
        value: JSON.stringify(credentialData),
        description: formData.description,
      });

      if (response.data.success) {
        setFormData({
          name: '',
          type: 'proxmox',
          endpoint: '',
          token: '',
          node: 'pve',
          description: '',
        });
        setShowForm(false);
        await loadCredentials();
      }
    } catch (error) {
      alert('Failed to add credential');
    }
  };

  const handleTestConnection = async (credentialId: string) => {
    setTestingId(credentialId);
    try {
      const response = await api.post(`/credentials/${credentialId}/test`);

      if (response.data.success) {
        alert('✅ ' + response.data.message);
        await loadCredentials();
      }
    } catch (error: any) {
      alert('❌ ' + (error.response?.data?.message || 'Connection failed'));
    } finally {
      setTestingId(null);
    }
  };

  const handleDeleteCredential = async (credentialId: string) => {
    if (!window.confirm('Are you sure?')) return;

    try {
      await api.delete(`/credentials/${credentialId}`);
      await loadCredentials();
    } catch (error) {
      alert('Failed to delete credential');
    }
  };

  return (
    <div className="p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900">🔐 Credentials Vault</h1>
          <p className="text-gray-600 mt-2">Securely store and manage your API credentials</p>
        </div>

        {/* Add Button */}
        <button
          onClick={() => setShowForm(!showForm)}
          className="mb-6 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
        >
          + Add Credential
        </button>

        {/* Form */}
        {showForm && (
          <div className="bg-white rounded-lg shadow mb-6 p-6">
            <h2 className="text-xl font-bold mb-4">Add New Credential</h2>
            <form onSubmit={handleAddCredential} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-gray-700 font-medium mb-2">Name</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-600"
                    placeholder="e.g., My Proxmox"
                    required
                  />
                </div>

                <div>
                  <label className="block text-gray-700 font-medium mb-2">Type</label>
                  <select
                    value={formData.type}
                    onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setFormData({ ...formData, type: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                  >
                    <option value="proxmox">Proxmox</option>
                    <option value="github">GitHub</option>
                    <option value="ssh">SSH</option>
                    <option value="api_key">API Key</option>
                  </select>
                </div>
              </div>

              {formData.type === 'proxmox' && (
                <>
                  <div>
                    <label className="block text-gray-700 font-medium mb-2">Proxmox Endpoint</label>
                    <input
                      type="url"
                      value={formData.endpoint}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, endpoint: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                      placeholder="https://proxmox.local:8006/api2/json"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-gray-700 font-medium mb-2">API Token</label>
                    <input
                      type="password"
                      value={formData.token}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, token: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                      placeholder="user@pam!token=secret"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-gray-700 font-medium mb-2">Node (optional)</label>
                    <input
                      type="text"
                      value={formData.node}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, node: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                      placeholder="pve"
                    />
                  </div>
                </>
              )}

              {formData.type === 'github' && (
                <div>
                  <label className="block text-gray-700 font-medium mb-2">GitHub Personal Access Token (PAT)</label>
                  <input
                    type="password"
                    value={formData.token}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, token: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-600"
                    placeholder="ghp_xxxxxxxxxxxx"
                    required
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Needed for private repositories. Create one in Settings {'>'} Developer settings {'>'} Personal access tokens.
                  </p>
                </div>
              )}

              <div>
                <label className="block text-gray-700 font-medium mb-2">Description (optional)</label>
                <textarea
                  value={formData.description}
                  onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-600"
                  placeholder="Notes about this credential"
                  rows={2}
                />
              </div>

              <div className="flex gap-2">
                <button
                  type="submit"
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition"
                >
                  Save Credential
                </button>
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Credentials List */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          {loading ? (
            <div className="p-8 text-center text-gray-500">Loading credentials...</div>
          ) : credentials.length === 0 ? (
            <div className="p-8 text-center text-gray-500">No credentials yet</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-100 border-b">
                  <tr>
                    <th className="px-6 py-3 text-left font-semibold">Name</th>
                    <th className="px-6 py-3 text-left font-semibold">Type</th>
                    <th className="px-6 py-3 text-left font-semibold">Created</th>
                    <th className="px-6 py-3 text-left font-semibold">Last Used</th>
                    <th className="px-6 py-3 text-right font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {credentials.map((cred: Credential) => (
                    <tr key={cred.id} className="border-b hover:bg-gray-50">
                      <td className="px-6 py-4 font-medium">{cred.name}</td>
                      <td className="px-6 py-4">
                        <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-sm">
                          {cred.type}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        {new Date(cred.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        {cred.last_used ? new Date(cred.last_used).toLocaleString() : '—'}
                      </td>
                      <td className="px-6 py-4 text-right space-x-2">
                        {(cred.type === 'proxmox' || cred.type === 'github') && (
                          <button
                            onClick={() => handleTestConnection(cred.id)}
                            disabled={testingId === cred.id}
                            className="px-3 py-1 bg-green-500 text-white rounded text-sm hover:bg-green-600 disabled:opacity-50"
                          >
                            {testingId === cred.id ? '⏳ Testing...' : '✓ Test'}
                          </button>
                        )}
                        <button
                          onClick={() => handleDeleteCredential(cred.id)}
                          className="px-3 py-1 bg-red-500 text-white rounded text-sm hover:bg-red-600"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CredentialsVault;
