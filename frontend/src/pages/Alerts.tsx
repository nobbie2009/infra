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
            case 'critical': return 'bg-red-50 text-red-700 border-red-200';
            case 'warning': return 'bg-yellow-50 text-yellow-700 border-yellow-200';
            default: return 'bg-blue-50 text-blue-700 border-blue-200';
        }
    };

    if (loading && alerts.length === 0) {
        return <div className="p-8 text-center text-gray-500">Lade Alerts...</div>;
    }

    return (
        <div className="p-6 max-w-7xl mx-auto">
            <h1 className="text-3xl font-black text-gray-900 mb-6 flex items-center gap-3">
                🔔 System Alerts
                <span className="bg-gray-100 text-gray-600 px-3 py-1 text-sm rounded-full">{alerts.length}</span>
            </h1>

            <div className="space-y-4">
                {alerts.length === 0 ? (
                    <div className="text-center py-20 bg-gray-50 rounded-3xl border border-dashed border-gray-200">
                        <div className="text-6xl mb-4">✅</div>
                        <h3 className="text-xl font-bold text-gray-700">Alles ruhig!</h3>
                        <p className="text-gray-500">Keine aktiven Warnungen im System.</p>
                    </div>
                ) : (
                    alerts.map(alert => (
                        <div key={alert.id} className={`p-6 rounded-2xl border ${getSeverityColor(alert.severity)} shadow-sm transition-all hover:shadow-md flex justify-between items-start gap-4`}>
                            <div className="flex-1">
                                <div className="flex items-center gap-3 mb-1">
                                    <span className={`px-2 py-0.5 rounded text-[10px] uppercase font-black tracking-wider border ${getSeverityColor(alert.severity)}`}>
                                        {alert.severity}
                                    </span>
                                    <span className="text-xs font-mono text-gray-500">{new Date(alert.created_at).toLocaleString()}</span>
                                    {alert.status === 'acknowledged' && (
                                        <span className="text-xs bg-gray-200 text-gray-600 px-2 py-0.5 rounded-full font-bold">👀 Gesehen</span>
                                    )}
                                </div>
                                <h3 className="font-bold text-lg mb-2">{alert.title}</h3>
                                <p className="text-sm opacity-90 leading-relaxed font-mono bg-white/50 p-3 rounded-lg border border-black/5">
                                    {alert.message}
                                </p>
                                <div className="mt-2 text-xs font-bold opacity-60">Source: {alert.source}</div>
                            </div>

                            {alert.status === 'active' && (
                                <button
                                    onClick={() => acknowledgeAlert(alert.id)}
                                    className="px-4 py-2 bg-white/80 hover:bg-white text-sm font-bold rounded-xl border border-black/10 shadow-sm transition-all active:scale-95"
                                >
                                    Bestätigen
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
