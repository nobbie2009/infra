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
        <div className="space-y-6 bg-terminal-bg min-h-screen p-6">
            <h1 className="text-2xl font-bold text-terminal-primary font-mono text-glow section-header">REPORTS & ANALYTICS</h1>
            <p className="text-terminal-secondary font-mono">[ SYSTEM REPORTS AND ANALYTICS GENERATION ]</p>

            {error && (
                <div className="card-terminal border-terminal-danger">
                    <p className="text-terminal-danger font-mono">[ ERROR ] {error}</p>
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {/* Infrastructure Report Card */}
                <div className="card-terminal shadow-terminal-glow hover:shadow-terminal-glow-strong transition-all">
                    <div className="flex items-center justify-between mb-4">
                        <div className="w-12 h-12 bg-terminal-border text-terminal-primary flex items-center justify-center text-2xl border border-terminal-primary">
                            📊
                        </div>
                        <span className="bg-terminal-border text-terminal-primary text-xs px-2 py-1 border border-terminal-primary font-mono">[ PDF ]</span>
                    </div>
                    <h3 className="text-lg font-bold text-terminal-primary mb-2 font-mono">INFRASTRUCTURE SUMMARY</h3>
                    <p className="text-sm text-terminal-secondary mb-4 font-mono">
                        Comprehensive report including system health, Proxmox nodes status, VM list, and active alerts.
                    </p>
                    <button
                        onClick={handleGenerateReport}
                        disabled={generating}
                        className="w-full btn-terminal flex justify-center items-center gap-2"
                    >
                        {generating ? '[ GENERATING ]' : '[ DOWNLOAD REPORT ]'}
                    </button>
                </div>

                {/* Placeholder for future reports */}
                <div className="card-terminal border-dashed flex flex-col items-center justify-center text-center opacity-75 border-terminal-border">
                    <div className="w-12 h-12 bg-terminal-border text-terminal-muted flex items-center justify-center text-2xl mb-4 border border-terminal-border">
                        📈
                    </div>
                    <h3 className="text-lg font-bold text-terminal-muted mb-2 font-mono">PROJECT ANALYTICS</h3>
                    <p className="text-sm text-terminal-muted mb-4 font-mono">
                        Project resource usage and trends.
                    </p>
                    <button disabled className="btn-terminal disabled opacity-50 cursor-not-allowed text-sm">
                        [ COMING SOON ]
                    </button>
                </div>
            </div>
        </div>
    );
};

export default Reports;
