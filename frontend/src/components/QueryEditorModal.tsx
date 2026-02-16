import React, { useState, useEffect } from 'react';
import api from '../lib/api';

interface ProjectDatabase {
  id: string;
  name: string;
  type: 'mysql' | 'postgresql';
}

interface QueryResult {
  rows: any[];
  rowCount: number;
  executionTime: number;
}

interface TableInfo {
  name: string;
  type: 'table' | 'view';
}

interface ColumnInfo {
  name: string;
  type: string;
  nullable: boolean;
  isPrimaryKey: boolean;
  isIndex: boolean;
  defaultValue?: string;
}

interface TableSchema {
  tableName: string;
  columns: ColumnInfo[];
}

interface QueryEditorModalProps {
  database: ProjectDatabase;
  onClose: () => void;
}

const QueryEditorModal: React.FC<QueryEditorModalProps> = ({ database, onClose }) => {
  const [activeTab, setActiveTab] = useState<'query' | 'tables'>('query');
  const [query, setQuery] = useState('SELECT * FROM ');
  const [executing, setExecuting] = useState(false);
  const [result, setResult] = useState<QueryResult | null>(null);
  const [error, setError] = useState('');
  const [tables, setTables] = useState<TableInfo[]>([]);
  const [selectedTable, setSelectedTable] = useState<string | null>(null);
  const [tableSchema, setTableSchema] = useState<TableSchema | null>(null);
  const [loadingTables, setLoadingTables] = useState(false);
  const [loadingSchema, setLoadingSchema] = useState(false);

  useEffect(() => {
    loadTables();
  }, [database.id]);

  const loadTables = async () => {
    try {
      setLoadingTables(true);
      const response = await api.get(`/databases/${database.id}/tables`);
      if (response.data.success) {
        setTables(response.data.tables || []);
      }
    } catch (error) {
      console.error('Failed to load tables:', error);
    } finally {
      setLoadingTables(false);
    }
  };

  const handleTableSelect = async (tableName: string) => {
    setSelectedTable(tableName);
    try {
      setLoadingSchema(true);
      const response = await api.get(`/databases/${database.id}/tables/${tableName}`);
      if (response.data.success) {
        setTableSchema(response.data.schema);
      }
    } catch (error) {
      console.error('Failed to load table schema:', error);
    } finally {
      setLoadingSchema(false);
    }
  };

  const handleExecuteQuery = async () => {
    if (!query.trim()) {
      setError('Bitte geben Sie eine Abfrage ein');
      return;
    }

    try {
      setExecuting(true);
      setError('');
      const response = await api.post(`/databases/${database.id}/query`, { query });

      if (response.data.success) {
        setResult(response.data.data);
      } else {
        setError(response.data.message || 'Fehler bei der Abfrageverarbeitung');
      }
    } catch (error: any) {
      console.error('Failed to execute query:', error);
      setError(error.response?.data?.message || 'Fehler bei der Abfrageverarbeitung');
    } finally {
      setExecuting(false);
    }
  };

  const handleClearQuery = () => {
    setQuery('SELECT * FROM ');
    setResult(null);
    setError('');
  };

  const handleExportCSV = () => {
    if (!result || result.rows.length === 0) {
      alert('Keine Daten zum Exportieren');
      return;
    }

    // Create CSV
    const headers = Object.keys(result.rows[0] || {});
    const csvContent = [
      headers.join(','),
      ...result.rows.map((row) =>
        headers.map((header) => {
          const value = row[header];
          // Escape quotes and wrap in quotes if contains comma
          if (typeof value === 'string' && value.includes(',')) {
            return `"${value.replace(/"/g, '""')}"`;
          }
          return value;
        }).join(',')
      ),
    ].join('\n');

    // Download
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `query_result_${new Date().getTime()}.csv`;
    a.click();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm">
      <div className="bg-white rounded-[2rem] w-full max-w-6xl h-[90vh] shadow-2xl border border-white/20 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b border-gray-100">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">📝 Query Editor</h2>
            <p className="text-sm text-gray-500 mt-1">{database.name} ({database.type})</p>
          </div>
          <button
            onClick={onClose}
            className="text-2xl text-gray-400 hover:text-gray-600 transition-colors font-bold"
          >
            ✕
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 px-6 pt-4 border-b border-gray-100">
          <button
            onClick={() => setActiveTab('query')}
            className={`px-6 py-3 font-bold rounded-t-lg transition-all ${
              activeTab === 'query'
                ? 'bg-blue-600 text-white'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            🔍 Abfrage
          </button>
          <button
            onClick={() => setActiveTab('tables')}
            className={`px-6 py-3 font-bold rounded-t-lg transition-all ${
              activeTab === 'tables'
                ? 'bg-blue-600 text-white'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            📊 Tabellen
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-6 space-y-6">
          {activeTab === 'query' ? (
            <>
              {/* Query Input */}
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-gray-700">SQL-Abfrage</label>
                <textarea
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  className="w-full h-32 px-5 py-3 bg-gray-50 border border-gray-100 rounded-xl font-mono text-sm focus:ring-4 focus:ring-blue-100 outline-none resize-none"
                  placeholder="SELECT * FROM ..."
                  spellCheck={false}
                />
                <p className="text-xs text-gray-500">
                  ⚠️ Nur SELECT-Abfragen erlaubt. Max. 1000 Zeilen. Timeout: 10s
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3">
                <button
                  onClick={handleExecuteQuery}
                  disabled={executing}
                  className="px-6 py-2.5 bg-green-600 text-white rounded-lg font-bold hover:bg-green-700 transition-all disabled:opacity-50 flex items-center gap-2"
                >
                  {executing ? '⏳' : '▶️'} {executing ? 'Wird ausgeführt...' : 'Ausführen'}
                </button>
                <button
                  onClick={handleClearQuery}
                  className="px-6 py-2.5 bg-gray-200 text-gray-700 rounded-lg font-bold hover:bg-gray-300 transition-all"
                >
                  🔄 Zurücksetzen
                </button>
                {result && result.rows.length > 0 && (
                  <button
                    onClick={handleExportCSV}
                    className="px-6 py-2.5 bg-blue-100 text-blue-600 rounded-lg font-bold hover:bg-blue-200 transition-all ml-auto"
                  >
                    ⬇️ CSV exportieren
                  </button>
                )}
              </div>

              {/* Error Display */}
              {error && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                  <p className="font-bold text-red-700">Fehler:</p>
                  <p className="text-red-600 text-sm mt-1">{error}</p>
                </div>
              )}

              {/* Results */}
              {result && (
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <p className="font-bold text-gray-900">
                      Ergebnisse: <span className="text-blue-600">{result.rowCount} Zeilen</span> in{' '}
                      <span className="text-blue-600">{result.executionTime}ms</span>
                    </p>
                  </div>

                  {result.rows.length > 0 ? (
                    <div className="overflow-x-auto border border-gray-200 rounded-lg max-h-96">
                      <table className="w-full text-sm">
                        <thead className="bg-gray-50 border-b border-gray-200 sticky top-0">
                          <tr>
                            {Object.keys(result.rows[0] || {}).map((key) => (
                              <th key={key} className="px-4 py-2 text-left font-bold text-gray-700">
                                {key}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {result.rows.map((row, idx) => (
                            <tr key={idx} className="border-b border-gray-100 hover:bg-gray-50">
                              {Object.values(row).map((value, colIdx) => (
                                <td key={colIdx} className="px-4 py-2 text-gray-700 whitespace-pre-wrap break-words">
                                  {value !== null && value !== undefined ? String(value) : '∅'}
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="p-6 text-center text-gray-500">Keine Ergebnisse</div>
                  )}
                </div>
              )}
            </>
          ) : (
            <>
              {/* Tables Browser */}
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Tabellen</label>
                  {loadingTables ? (
                    <div className="text-center text-gray-500">⏳ Laden...</div>
                  ) : tables.length > 0 ? (
                    <div className="space-y-2 max-h-48 overflow-y-auto border border-gray-200 rounded-lg p-2">
                      {tables.map((table) => (
                        <button
                          key={table.name}
                          onClick={() => handleTableSelect(table.name)}
                          className={`w-full text-left px-3 py-2 rounded-lg transition-all font-bold text-sm ${
                            selectedTable === table.name
                              ? 'bg-blue-100 text-blue-700'
                              : 'bg-gray-50 text-gray-700 hover:bg-gray-100'
                          }`}
                        >
                          {table.type === 'table' ? '📋' : '👁️'} {table.name}
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center text-gray-500 py-6">Keine Tabellen gefunden</div>
                  )}
                </div>

                {/* Table Schema */}
                {selectedTable && (
                  <div className="space-y-2">
                    <label className="block text-sm font-semibold text-gray-700">
                      Schema: {selectedTable}
                    </label>
                    {loadingSchema ? (
                      <div className="text-center text-gray-500">⏳ Laden...</div>
                    ) : tableSchema ? (
                      <div className="border border-gray-200 rounded-lg overflow-auto max-h-96">
                        <table className="w-full text-sm">
                          <thead className="bg-gray-50 border-b border-gray-200">
                            <tr>
                              <th className="px-4 py-2 text-left font-bold">Spalte</th>
                              <th className="px-4 py-2 text-left font-bold">Typ</th>
                              <th className="px-4 py-2 text-left font-bold">Nullable</th>
                              <th className="px-4 py-2 text-left font-bold">Schlüssel</th>
                            </tr>
                          </thead>
                          <tbody>
                            {tableSchema.columns.map((col) => (
                              <tr key={col.name} className="border-b border-gray-100 hover:bg-gray-50">
                                <td className="px-4 py-2 font-mono text-gray-700">
                                  {col.isPrimaryKey && '🔑 '}{col.name}
                                </td>
                                <td className="px-4 py-2 text-gray-600">{col.type}</td>
                                <td className="px-4 py-2">
                                  <span className={`text-xs font-bold ${col.nullable ? 'text-yellow-600' : 'text-green-600'}`}>
                                    {col.nullable ? 'JA' : 'NEIN'}
                                  </span>
                                </td>
                                <td className="px-4 py-2">
                                  {col.isPrimaryKey && '🔑 PRIMARY'}
                                  {col.isIndex && !col.isPrimaryKey && '📑 INDEX'}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <div className="text-center text-gray-500 py-6">Schema konnte nicht geladen werden</div>
                    )}
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-gray-100 p-4 bg-gray-50 flex justify-end">
          <button
            onClick={onClose}
            className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg font-bold hover:bg-gray-300 transition-all"
          >
            Schließen
          </button>
        </div>
      </div>
    </div>
  );
};

export default QueryEditorModal;
