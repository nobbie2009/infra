import React, { useState, useEffect } from 'react';
import api from '../lib/api';

interface Alert {
    id: string;
    type: string;
    severity: 'info' | 'warning' | 'critical';
    title: string;
    message: string;
    status: 'active' | 'acknowledged' | 'resolved';
    created_at: string;
    source: string;
}

const Alerts: React.FC = () => {
    const [alerts, setAlerts] = useState<Alert[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadAlerts();
        const interval = setInterval(loadAlerts, 10000); // Poll every 10s
        return () => clearInterval(interval);
    }, []);

    const loadAlerts = async () => {
        try {
            const response = await api.get('/admin/alerts');
            if (response.data.success) {
                setAlerts(response.data.data);
            }
        } catch (error) {
            console.error('Failed to load alerts:', error);
        } finally {
            setLoading(false);
        }
    };

    const acknowledgeAlert = async (id: string) => {
        try {
            await api.post(`/admin/alerts/${id}/ack`);
            loadAlerts(); // Refresh list
        } catch (error) {
            console.error('Failed to ack alert:', error);
        }
    };

    const getSeverityColor = (s: string) => {
        switch (s) {
            case 'critical': return 'border-terminal-danger text-terminal-danger';
            case 'warning': return 'border-terminal-warning text-terminal-warning';
            default: return 'border-terminal-primary text-terminal-primary';
        }
    };

    if (loading && alerts.length === 0) {
        return <div className="p-8 text-center text-terminal-muted font-mono">[ loading alerts... ]</div>;
    }

    return (
        <div className="p-6 max-w-7xl mx-auto bg-terminal-bg min-h-screen">
            <h1 className="text-3xl font-black text-terminal-primary text-glow section-header mb-8">SYSTEM ALERTS [ {alerts.length} ]</h1>

            <div className="space-y-4">
                {alerts.length === 0 ? (
                    <div className="text-center py-16 card-terminal border-dashed">
                        <div className="text-5xl mb-4">[ OK ]</div>
                        <h3 className="text-lg font-bold text-terminal-primary">ALLES RUHIG</h3>
                        <p className="text-terminal-muted font-mono text-sm mt-2">keine aktiven warnungen im system</p>
                    </div>
                ) : (
                    alerts.map(alert => (
                        <div key={alert.id} className={`p-4 border-l-4 ${getSeverityColor(alert.severity)} card-terminal hover:shadow-terminal-glow transition-all flex justify-between items-start gap-4`}>
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-3 mb-2 flex-wrap">
                                    <span className={`px-2 py-0.5 text-xs uppercase font-bold tracking-wider border ${getSeverityColor(alert.severity)}`}>
                                        [ {alert.severity.toUpperCase()} ]
                                    </span>
                                    <span className="text-xs font-mono text-terminal-muted">{new Date(alert.created_at).toLocaleString()}</span>
                                    {alert.status === 'acknowledged' && (
                                        <span className="text-xs border border-terminal-accent text-terminal-accent px-2 py-0.5 font-mono">[ SEEN ]</span>
                                    )}
                                </div>
                                <h3 className="font-bold text-terminal-primary mb-2">{alert.title}</h3>
                                <p className="text-sm leading-relaxed font-mono text-terminal-secondary bg-terminal-surface/50 p-2 border border-terminal-border">
                                    {alert.message}
                                </p>
                                <div className="mt-2 text-xs font-mono text-terminal-muted">src: {alert.source}</div>
                            </div>

                            {alert.status === 'active' && (
                                <button
                                    onClick={() => acknowledgeAlert(alert.id)}
                                    className="btn-terminal text-xs whitespace-nowrap"
                                >
                                    ACK
                                </button>
                            )}
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};

export default Alerts;
