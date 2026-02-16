import React, { useState } from 'react';
import api from '../lib/api';

interface AddDatabaseModalProps {
  projectId: string;
  onClose: () => void;
  onDatabaseAdded: () => void;
}

const AddDatabaseModal: React.FC<AddDatabaseModalProps> = ({ projectId, onClose, onDatabaseAdded }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    type: 'mysql',
    host: '',
    port: 3306,
    username: '',
    password: '',
    database: '',
    ssl: false,
    description: '',
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;

    if (type === 'checkbox') {
      setFormData({
        ...formData,
        [name]: (e.target as HTMLInputElement).checked,
      });
    } else {
      setFormData({
        ...formData,
        [name]: name === 'port' ? parseInt(value) : value,
      });
    }
  };

  const handleTypeChange = (type: string) => {
    // Auto-fill port based on type
    const port = type === 'mysql' ? 3306 : 5432;
    setFormData({
      ...formData,
      type: type as 'mysql' | 'postgresql',
      port,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Validate
    if (!formData.name || !formData.host || !formData.username || !formData.password || !formData.database) {
      setError('Bitte füllen Sie alle erforderlichen Felder aus');
      return;
    }

    if (formData.port < 1 || formData.port > 65535) {
      setError('Port muss zwischen 1 und 65535 liegen');
      return;
    }

    try {
      setLoading(true);
      const response = await api.post(`/databases/projects/${projectId}/databases`, formData);

      if (response.data.success) {
        onDatabaseAdded();
      } else {
        setError(response.data.message || 'Fehler beim Erstellen der Datenbank');
      }
    } catch (error: any) {
      console.error('Failed to add database:', error);
      setError(error.response?.data?.message || 'Fehler beim Erstellen der Datenbank');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm">
      <div className="bg-white rounded-[2.5rem] p-10 max-w-2xl w-full shadow-2xl border border-white/20 max-h-[90vh] overflow-y-auto">
        <h2 className="text-2xl font-bold text-gray-900 mb-8">🗄️ Datenbank hinzufügen</h2>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Error Message */}
          {error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm font-bold">
              {error}
            </div>
          )}

          {/* Name */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="name"
              required
              placeholder="z.B. Production DB"
              className="w-full px-5 py-3.5 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-4 focus:ring-blue-100 outline-none transition-all"
              value={formData.name}
              onChange={handleChange}
            />
          </div>

          {/* Database Type */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-3">
              Datenbanktyp <span className="text-red-500">*</span>
            </label>
            <div className="flex gap-4">
              {['mysql', 'postgresql'].map((type) => (
                <label key={type} className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="radio"
                    name="type"
                    value={type}
                    checked={formData.type === type}
                    onChange={() => handleTypeChange(type)}
                    className="w-5 h-5"
                  />
                  <span className="font-bold text-gray-700">
                    {type === 'mysql' ? '🐬 MySQL' : '🐘 PostgreSQL'}
                  </span>
                </label>
              ))}
            </div>
          </div>

          {/* Connection Details Grid */}
          <div className="grid grid-cols-2 gap-4">
            {/* Host */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Host <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="host"
                required
                placeholder="localhost oder IP"
                className="w-full px-5 py-3.5 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-4 focus:ring-blue-100 outline-none transition-all"
                value={formData.host}
                onChange={handleChange}
              />
            </div>

            {/* Port */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Port <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                name="port"
                required
                min="1"
                max="65535"
                className="w-full px-5 py-3.5 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-4 focus:ring-blue-100 outline-none transition-all"
                value={formData.port}
                onChange={handleChange}
              />
            </div>
          </div>

          {/* Username & Password Grid */}
          <div className="grid grid-cols-2 gap-4">
            {/* Username */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Benutzername <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="username"
                required
                placeholder="Benutzername"
                className="w-full px-5 py-3.5 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-4 focus:ring-blue-100 outline-none transition-all"
                value={formData.username}
                onChange={handleChange}
              />
            </div>

            {/* Password */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Passwort <span className="text-red-500">*</span>
              </label>
              <input
                type="password"
                name="password"
                required
                placeholder="Passwort"
                className="w-full px-5 py-3.5 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-4 focus:ring-blue-100 outline-none transition-all"
                value={formData.password}
                onChange={handleChange}
              />
            </div>
          </div>

          {/* Database Name */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Datenbankname <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="database"
              required
              placeholder="Datenbankname"
              className="w-full px-5 py-3.5 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-4 focus:ring-blue-100 outline-none transition-all"
              value={formData.database}
              onChange={handleChange}
            />
          </div>

          {/* SSL Checkbox */}
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              name="ssl"
              checked={formData.ssl}
              onChange={handleChange}
              className="w-5 h-5"
            />
            <span className="font-bold text-gray-700">SSL/TLS verwenden</span>
          </label>

          {/* Description */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Beschreibung</label>
            <textarea
              name="description"
              placeholder="z.B. Produktionsdatenbank für Bestände"
              className="w-full px-5 py-3.5 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-4 focus:ring-blue-100 outline-none resize-none"
              rows={3}
              value={formData.description}
              onChange={handleChange}
            />
          </div>

          {/* Action Buttons */}
          <div className="flex gap-4 pt-4 border-t border-gray-100">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-4 font-bold text-gray-500 hover:text-gray-700 transition-colors"
            >
              Abbrechen
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 py-4 bg-blue-600 text-white rounded-2xl font-bold shadow-lg shadow-blue-200 hover:bg-blue-700 transition-all disabled:opacity-50"
            >
              {loading ? '⏳ Wird erstellt...' : '✅ Datenbank hinzufügen'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddDatabaseModal;
