import React, { useState, useEffect } from 'react';
import api from '../lib/api';
import DatabaseCard from './DatabaseCard';
import AddDatabaseModal from './AddDatabaseModal';

interface ProjectDatabase {
  id: string;
  name: string;
  description?: string;
  type: 'mysql' | 'postgresql';
  status: 'active' | 'inactive';
  last_tested?: string;
  created_at: string;
}

interface DatabasesTabProps {
  projectId: string;
}

const DatabasesTab: React.FC<DatabasesTabProps> = ({ projectId }) => {
  const [databases, setDatabases] = useState<ProjectDatabase[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);

  useEffect(() => {
    loadDatabases();
  }, [projectId]);

  const loadDatabases = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/databases/projects/${projectId}/databases`);
      if (response.data.success) {
        setDatabases(response.data.databases || []);
      }
    } catch (error) {
      console.error('Failed to load databases:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDatabaseAdded = () => {
    setShowAddModal(false);
    loadDatabases();
  };

  const handleDatabaseDeleted = (dbId: string) => {
    setDatabases(databases.filter((db) => db.id !== dbId));
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h2 className="text-3xl font-bold text-gray-900">Datenbanken</h2>
        <button
          onClick={() => setShowAddModal(true)}
          className="px-6 py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-all shadow-lg shadow-blue-200 flex items-center gap-2"
        >
          ➕ Datenbank hinzufügen
        </button>
      </div>

      {/* Database Cards Grid */}
      {databases.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {databases.map((database) => (
            <DatabaseCard
              key={database.id}
              database={database}
              projectId={projectId}
              onDeleted={handleDatabaseDeleted}
            />
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-2xl p-12 border border-gray-100 text-center">
          <div className="text-6xl mb-4">🗄️</div>
          <h3 className="text-xl font-bold text-gray-900 mb-2">Keine Datenbanken konfiguriert</h3>
          <p className="text-gray-600 mb-6">Füge eine Datenbank hinzu, um Daten zu verwalten und Abfragen auszuführen.</p>
          <button
            onClick={() => setShowAddModal(true)}
            className="inline-block px-6 py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-all"
          >
            Erste Datenbank hinzufügen
          </button>
        </div>
      )}

      {/* Add Database Modal */}
      {showAddModal && (
        <AddDatabaseModal
          projectId={projectId}
          onClose={() => setShowAddModal(false)}
          onDatabaseAdded={handleDatabaseAdded}
        />
      )}
    </div>
  );
};

export default DatabasesTab;
