import React, { useState } from 'react';
import api from '../lib/api';
import QueryEditorModal from './QueryEditorModal';

interface ProjectDatabase {
  id: string;
  name: string;
  description?: string;
  type: 'mysql' | 'postgresql';
  status: 'active' | 'inactive';
  last_tested?: string;
  created_at: string;
}

interface DatabaseCardProps {
  database: ProjectDatabase;
  projectId: string;
  onDeleted: (dbId: string) => void;
}

const DatabaseCard: React.FC<DatabaseCardProps> = ({ database, projectId, onDeleted }) => {
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<boolean | null>(null);
  const [showQueryEditor, setShowQueryEditor] = useState(false);

  const icon = database.type === 'mysql' ? '🐬' : '🐘';

  const handleTestConnection = async () => {
    try {
      setTesting(true);
      const response = await api.post(`/databases/${database.id}/test`);
      setTestResult(response.data.success);
      setTimeout(() => setTestResult(null), 3000);
    } catch (error) {
      console.error('Failed to test connection:', error);
      setTestResult(false);
    } finally {
      setTesting(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('Diese Datenbank wirklich löschen?')) return;
    try {
      const response = await api.delete(`/databases/${database.id}`);
      if (response.data.success) {
        onDeleted(database.id);
      }
    } catch (error) {
      console.error('Failed to delete database:', error);
      alert('Fehler beim Löschen der Datenbank');
    }
  };

  return (
    <>
      <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm hover:shadow-md transition-all">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-start gap-3 flex-1">
            <span className="text-3xl mt-1">{icon}</span>
            <div className="flex-1">
              <h3 className="font-bold text-lg text-gray-900">{database.name}</h3>
              <p className="text-sm text-gray-500">
                {database.type === 'mysql' ? 'MySQL' : 'PostgreSQL'}
              </p>
            </div>
          </div>
          <span
            className={`px-3 py-1 rounded-full text-xs font-bold ${
              database.status === 'active'
                ? 'bg-green-100 text-green-700'
                : 'bg-gray-100 text-gray-600'
            }`}
          >
            {database.status === 'active' ? '🟢 Aktiv' : '🔴 Inaktiv'}
          </span>
        </div>

        {/* Description */}
        {database.description && (
          <p className="text-sm text-gray-600 mb-4 line-clamp-2">{database.description}</p>
        )}

        {/* Last Tested */}
        {database.last_tested && (
          <p className="text-xs text-gray-400 mb-4">
            Getestet: {new Date(database.last_tested).toLocaleDateString('de-DE')}
          </p>
        )}

        {/* Test Result Indicator */}
        {testResult !== null && (
          <div
            className={`mb-4 p-2 rounded-lg text-sm font-bold text-center ${
              testResult
                ? 'bg-green-50 text-green-700'
                : 'bg-red-50 text-red-700'
            }`}
          >
            {testResult ? '✅ Verbindung erfolgreich' : '❌ Verbindung fehlgeschlagen'}
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-2">
          <button
            onClick={handleTestConnection}
            disabled={testing}
            className="flex-1 px-3 py-2.5 bg-blue-50 text-blue-600 rounded-lg font-bold text-sm hover:bg-blue-100 transition-all disabled:opacity-50"
            title="Verbindung testen"
          >
            {testing ? '⏳ Testen...' : '🧪 Test'}
          </button>
          <button
            onClick={() => setShowQueryEditor(true)}
            className="flex-1 px-3 py-2.5 bg-green-50 text-green-600 rounded-lg font-bold text-sm hover:bg-green-100 transition-all"
            title="Query Editor öffnen"
          >
            📝 Query
          </button>
          <button
            onClick={handleDelete}
            className="px-3 py-2.5 bg-red-50 text-red-600 rounded-lg font-bold text-sm hover:bg-red-100 transition-all"
            title="Datenbank löschen"
          >
            🗑️
          </button>
        </div>
      </div>

      {/* Query Editor Modal */}
      {showQueryEditor && (
        <QueryEditorModal
          database={database}
          onClose={() => setShowQueryEditor(false)}
        />
      )}
    </>
  );
};

export default DatabaseCard;
