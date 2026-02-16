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
    <div className="p-6 bg-terminal-bg min-h-screen">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-terminal-primary font-mono text-glow section-header">🔐 CREDENTIALS VAULT</h1>
          <p className="text-terminal-secondary mt-2 font-mono">[ SECURE CREDENTIAL STORAGE SYSTEM ]</p>
        </div>

        {/* Add Button */}
        <button
          onClick={() => setShowForm(!showForm)}
          className="btn-terminal mb-6"
        >
          [ + ADD CREDENTIAL ]
        </button>

        {/* Form */}
        {showForm && (
          <div className="card-terminal mb-6">
            <h2 className="text-xl font-bold mb-4 text-terminal-primary font-mono">[ NEW CREDENTIAL ]</h2>
            <form onSubmit={handleAddCredential} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-terminal-secondary font-medium mb-2 font-mono">[ NAME ]</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, name: e.target.value })}
                    className="input-terminal"
                    placeholder="e.g., My Proxmox"
                    required
                  />
                </div>

                <div>
                  <label className="block text-terminal-secondary font-medium mb-2 font-mono">[ TYPE ]</label>
                  <select
                    value={formData.type}
                    onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setFormData({ ...formData, type: e.target.value })}
                    className="input-terminal"
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
                    <label className="block text-terminal-secondary font-medium mb-2 font-mono">[ PROXMOX ENDPOINT ]</label>
                    <input
                      type="url"
                      value={formData.endpoint}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, endpoint: e.target.value })}
                      className="input-terminal"
                      placeholder="https://proxmox.local:8006/api2/json"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-terminal-secondary font-medium mb-2 font-mono">[ API TOKEN ]</label>
                    <input
                      type="password"
                      value={formData.token}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, token: e.target.value })}
                      className="input-terminal"
                      placeholder="user@pam!token=secret"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-terminal-secondary font-medium mb-2 font-mono">[ NODE (OPTIONAL) ]</label>
                    <input
                      type="text"
                      value={formData.node}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, node: e.target.value })}
                      className="input-terminal"
                      placeholder="pve"
                    />
                  </div>
                </>
              )}

              {formData.type === 'github' && (
                <div>
                  <label className="block text-terminal-secondary font-medium mb-2 font-mono">[ GITHUB PAT ]</label>
                  <input
                    type="password"
                    value={formData.token}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, token: e.target.value })}
                    className="input-terminal"
                    placeholder="ghp_xxxxxxxxxxxx"
                    required
                  />
                  <p className="text-xs text-terminal-muted mt-1 font-mono">
                    # Settings {'>>'} Developer settings {'>>'} Personal access tokens
                  </p>
                </div>
              )}

              <div>
                <label className="block text-terminal-secondary font-medium mb-2 font-mono">[ DESCRIPTION (OPTIONAL) ]</label>
                <textarea
                  value={formData.description}
                  onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setFormData({ ...formData, description: e.target.value })}
                  className="input-terminal"
                  placeholder="Notes about this credential"
                  rows={2}
                />
              </div>

              <div className="flex gap-2">
                <button
                  type="submit"
                  className="btn-terminal"
                >
                  [ SAVE ]
                </button>
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="btn-terminal"
                >
                  [ CANCEL ]
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Credentials List */}
        <div className="card-terminal overflow-hidden">
          {loading ? (
            <div className="p-8 text-center text-terminal-muted font-mono">[ LOADING CREDENTIALS... ]</div>
          ) : credentials.length === 0 ? (
            <div className="p-8 text-center text-terminal-muted font-mono">[ NO CREDENTIALS FOUND ]</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="table-terminal">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Type</th>
                    <th>Created</th>
                    <th>Last Used</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {credentials.map((cred: Credential) => (
                    <tr key={cred.id}>
                      <td className="font-medium">{cred.name}</td>
                      <td>
                        <span className="px-2 py-1 bg-terminal-border text-terminal-primary rounded text-sm font-mono border border-terminal-primary">
                          [ {cred.type.toUpperCase()} ]
                        </span>
                      </td>
                      <td className="text-terminal-secondary">
                        {new Date(cred.created_at).toLocaleDateString()}
                      </td>
                      <td className="text-terminal-secondary">
                        {cred.last_used ? new Date(cred.last_used).toLocaleString() : '—'}
                      </td>
                      <td className="text-right space-x-2">
                        {(cred.type === 'proxmox' || cred.type === 'github') && (
                          <button
                            onClick={() => handleTestConnection(cred.id)}
                            disabled={testingId === cred.id}
                            className="btn-terminal text-xs"
                          >
                            {testingId === cred.id ? '[ TESTING ]' : '[ TEST ]'}
                          </button>
                        )}
                        <button
                          onClick={() => handleDeleteCredential(cred.id)}
                          className="btn-terminal text-xs border-terminal-danger text-terminal-danger hover:bg-terminal-danger hover:text-terminal-bg"
                        >
                          [ DELETE ]
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
