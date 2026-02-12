import React, { useState, useEffect } from 'react';
import api from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { format } from 'date-fns';

interface BackupFile {
    filename: string;
    size: number;
    created_at: string;
}

const Backups: React.FC = () => {
    const { user } = useAuth();
    const [backups, setBackups] = useState<BackupFile[]>([]);
    const [loading, setLoading] = useState(true);
    const [creating, setCreating] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);

    useEffect(() => {
        fetchBackups();
    }, []);

    const fetchBackups = async () => {
        try {
            setLoading(true);
            const response = await api.get('/admin/backups');
            setBackups(response.data.data);
            setError(null);
        } catch (err: any) {
            setError(err.response?.data?.message || 'Failed to fetch backups');
        } finally {
            setLoading(false);
        }
    };

    const handleCreateBackup = async () => {
        if (!window.confirm('Are you sure you want to create a new backup?')) return;

        try {
            setCreating(true);
            setSuccess(null);
            setError(null);

            await api.post('/admin/backups');

            setSuccess('Backup created successfully');
            await fetchBackups();
        } catch (err: any) {
            setError(err.response?.data?.message || 'Failed to create backup');
        } finally {
            setCreating(false);
        }
    };

    const handleDeleteBackup = async (filename: string) => {
        if (!window.confirm(`Are you sure you want to delete ${filename}?`)) return;

        try {
            await api.delete(`/admin/backups/${filename}`);
            setSuccess(`Backup ${filename} deleted successfully`);
            setBackups(backups.filter(b => b.filename !== filename));
        } catch (err: any) {
            setError(err.response?.data?.message || 'Failed to delete backup');
        }
    };

    const handleDownloadBackup = async (filename: string) => {
        try {
            // Create a temporary link to download the file
            // We need to use the full URL and include the auth token if your backend requires it for downloads
            // Since we are using axios for API calls, responding with a file stream is tricky for direct browser download
            // A common pattern is to get a signed URL or just use window.open if cookies are used (which we use localstorage token)

            // Better approach with token:
            const response = await api.get(`/admin/backups/${filename}/download`, {
                responseType: 'blob',
            });

            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', filename);
            document.body.appendChild(link);
            link.click();
            link.remove();

        } catch (err: any) {
            setError('Failed to download backup');
        }
    };

    const formatSize = (bytes: number) => {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    if (!user || user.role !== 'admin') {
        return (
            <div className="p-6">
                <div className="bg-red-50 text-red-700 p-4 rounded-lg">
                    Access denied. Only admins can manage backups.
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">System Backups</h1>
                    <p className="text-gray-500">Manage database backups.</p>
                </div>
                <button
                    onClick={handleCreateBackup}
                    disabled={creating}
                    className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-2"
                >
                    {creating ? (
                        <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                    ) : (
                        '💾 Create Backup'
                    )}
                </button>
            </div>

            {error && (
                <div className="bg-red-50 border-l-4 border-red-500 p-4">
                    <div className="flex">
                        <div className="flex-shrink-0">⚠️</div>
                        <div className="ml-3">
                            <p className="text-sm text-red-700">{error}</p>
                        </div>
                        <button className="ml-auto" onClick={() => setError(null)}>✖</button>
                    </div>
                </div>
            )}

            {success && (
                <div className="bg-green-50 border-l-4 border-green-500 p-4">
                    <div className="flex">
                        <div className="flex-shrink-0">✅</div>
                        <div className="ml-3">
                            <p className="text-sm text-green-700">{success}</p>
                        </div>
                        <button className="ml-auto" onClick={() => setSuccess(null)}>✖</button>
                    </div>
                </div>
            )}

            <div className="bg-white shadow rounded-lg overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Filename
                                </th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Size
                                </th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Created At
                                </th>
                                <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Actions
                                </th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {loading ? (
                                <tr>
                                    <td colSpan={4} className="px-6 py-4 text-center text-gray-500">
                                        Loading backups...
                                    </td>
                                </tr>
                            ) : backups.length === 0 ? (
                                <tr>
                                    <td colSpan={4} className="px-6 py-4 text-center text-gray-500">
                                        No backups found.
                                    </td>
                                </tr>
                            ) : (
                                backups.map((backup) => (
                                    <tr key={backup.filename} className="hover:bg-gray-50">
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                            {backup.filename}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                            {formatSize(backup.size)}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                            {format(new Date(backup.created_at), 'yyyy-MM-dd HH:mm:ss')}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                            <button
                                                onClick={() => handleDownloadBackup(backup.filename)}
                                                className="text-indigo-600 hover:text-indigo-900 mr-4"
                                                title="Download"
                                            >
                                                ⬇️
                                            </button>
                                            <button
                                                onClick={() => handleDeleteBackup(backup.filename)}
                                                className="text-red-600 hover:text-red-900"
                                                title="Delete"
                                            >
                                                🗑️
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default Backups;
