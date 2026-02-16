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
        if (!bytes || bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i))?.toFixed(2) || '0.00') + ' ' + sizes[i];
    };

    if (!user || user.role !== 'admin') {
        return (
            <div className="p-6 bg-terminal-bg min-h-screen">
                <div className="card-terminal border-l-4 border-terminal-danger">
                    <p className="font-mono text-terminal-danger">[ DENIED ] only admins can manage backups</p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6 p-6 bg-terminal-bg min-h-screen">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold text-terminal-primary text-glow section-header">SYSTEM BACKUPS</h1>
                    <p className="text-terminal-muted font-mono text-sm mt-2">manage database backups</p>
                </div>
                <button
                    onClick={handleCreateBackup}
                    disabled={creating}
                    className="btn-terminal"
                >
                    {creating ? '[ CREATING... ]' : '[ CREATE BACKUP ]'}
                </button>
            </div>

            {error && (
                <div className="card-terminal border-l-4 border-terminal-danger">
                    <div className="flex justify-between items-start">
                        <div className="flex-1">
                            <p className="text-sm font-mono text-terminal-danger">{error}</p>
                        </div>
                        <button className="ml-4 text-terminal-muted hover:text-terminal-primary" onClick={() => setError(null)}>[X]</button>
                    </div>
                </div>
            )}

            {success && (
                <div className="card-terminal border-l-4 border-terminal-primary">
                    <div className="flex justify-between items-start">
                        <div className="flex-1">
                            <p className="text-sm font-mono text-terminal-primary">{success}</p>
                        </div>
                        <button className="ml-4 text-terminal-muted hover:text-terminal-primary" onClick={() => setSuccess(null)}>[X]</button>
                    </div>
                </div>
            )}

            <div className="card-terminal overflow-x-auto">
                <table className="table-terminal w-full">
                    <thead>
                        <tr>
                            <th scope="col">FILENAME</th>
                            <th scope="col">SIZE</th>
                            <th scope="col">CREATED</th>
                            <th scope="col" className="text-right">ACTIONS</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr>
                                <td colSpan={4} className="text-center py-4 font-mono text-terminal-muted">[ loading... ]</td>
                            </tr>
                        ) : backups.length === 0 ? (
                            <tr>
                                <td colSpan={4} className="text-center py-4 font-mono text-terminal-muted">[ no backups found ]</td>
                            </tr>
                        ) : (
                            backups.map((backup) => (
                                <tr key={backup.filename} className="hover:bg-terminal-surface/30">
                                    <td className="font-mono text-terminal-primary">{backup.filename}</td>
                                    <td className="font-mono text-terminal-secondary">{formatSize(backup.size)}</td>
                                    <td className="font-mono text-terminal-muted text-sm">{format(new Date(backup.created_at), 'yyyy-MM-dd HH:mm')}</td>
                                    <td className="text-right space-x-2">
                                        <button
                                            onClick={() => handleDownloadBackup(backup.filename)}
                                            className="text-terminal-primary hover:text-terminal-accent transition"
                                            title="Download"
                                        >
                                            [ D ]
                                        </button>
                                        <button
                                            onClick={() => handleDeleteBackup(backup.filename)}
                                            className="text-terminal-danger hover:text-terminal-warning transition"
                                            title="Delete"
                                        >
                                            [ X ]
                                        </button>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default Backups;
