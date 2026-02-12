import React, { useState } from 'react';
import api from '../lib/api';

const Reports: React.FC = () => {
    const [generating, setGenerating] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleGenerateReport = async () => {
        try {
            setGenerating(true);
            setError(null);

            const response = await api.get('/reports/infrastructure/summary', {
                responseType: 'blob',
            });

            // Create download link
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', 'infrastructure-report.pdf');
            document.body.appendChild(link);
            link.click();
            link.remove();
        } catch (err: any) {
            console.error(err);
            setError('Failed to generate report. Please try again.');
        } finally {
            setGenerating(false);
        }
    };

    return (
        <div className="space-y-6">
            <h1 className="text-2xl font-bold text-gray-900">Reports & Analytics</h1>
            <p className="text-gray-500">Generate system reports and analytics.</p>

            {error && (
                <div className="bg-red-50 border-l-4 border-red-500 p-4">
                    <p className="text-red-700">{error}</p>
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {/* Infrastructure Report Card */}
                <div className="bg-white p-6 shadow rounded-lg border border-gray-200 hover:border-indigo-500 transition-colors">
                    <div className="flex items-center justify-between mb-4">
                        <div className="w-12 h-12 bg-indigo-100 rounded-lg flex items-center justify-center text-2xl">
                            📊
                        </div>
                        <span className="bg-indigo-100 text-indigo-800 text-xs px-2 py-1 rounded-full">PDF</span>
                    </div>
                    <h3 className="text-lg font-bold text-gray-900 mb-2">Infrastructure Summary</h3>
                    <p className="text-sm text-gray-500 mb-4">
                        Comprehensive report including system health, Proxmox nodes status, VM list, and active alerts.
                    </p>
                    <button
                        onClick={handleGenerateReport}
                        disabled={generating}
                        className="w-full bg-indigo-600 text-white py-2 px-4 rounded-lg hover:bg-indigo-700 disabled:opacity-50 flex justify-center items-center gap-2"
                    >
                        {generating ? 'Generating...' : 'Download Report'}
                    </button>
                </div>

                {/* Placeholder for future reports */}
                <div className="bg-gray-50 p-6 shadow-sm rounded-lg border border-gray-200 border-dashed flex flex-col items-center justify-center text-center opacity-75">
                    <div className="w-12 h-12 bg-gray-200 rounded-lg flex items-center justify-center text-2xl mb-4 grayscale">
                        📈
                    </div>
                    <h3 className="text-lg font-bold text-gray-500 mb-2">Project Analytics</h3>
                    <p className="text-sm text-gray-400 mb-4">
                        Project resource usage and trends.
                    </p>
                    <button disabled className="bg-gray-200 text-gray-400 py-2 px-4 rounded-lg cursor-not-allowed text-sm">
                        Coming Soon
                    </button>
                </div>
            </div>
        </div>
    );
};

export default Reports;
