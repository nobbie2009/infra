import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../lib/api';

const PromptGenerator: React.FC = () => {
    const { contextType, contextId } = useParams<{ contextType: string; contextId: string }>();
    const navigate = useNavigate();

    const [loading, setLoading] = useState(true);
    const [prompt, setPrompt] = useState('');
    const [contextData, setContextData] = useState<any>(null);
    const [error, setError] = useState<string | null>(null);
    const [copied, setCopied] = useState(false);

    useEffect(() => {
        generatePrompt();
    }, [contextType, contextId]);

    const generatePrompt = async () => {
        try {
            setLoading(true);
            setError(null);

            // Map frontend route params to API expected types
            const type = contextType === 'feature' ? 'feature' : 'infrastructure';

            const response = await api.post('/prompts/generate', {
                type,
                contextId
            });

            if (response.data.success) {
                setPrompt(response.data.data.prompt);
                setContextData(response.data.data.context);
            } else {
                setError(response.data.message || 'Failed to generate prompt');
            }
        } catch (err: any) {
            console.error('Prompt generation failed:', err);
            setError(err.response?.data?.message || 'Network error occurred');
        } finally {
            setLoading(false);
        }
    };

    const copyToClipboard = () => {
        navigator.clipboard.writeText(prompt);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    if (loading) {
        return (
            <div className="flex flex-col justify-center items-center h-[calc(100vh-64px)]">
                <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-600 mb-6"></div>
                <p className="text-gray-500 font-medium animate-pulse">Analysiere Kontext & generiere Prompt...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="p-8 max-w-2xl mx-auto text-center">
                <div className="bg-red-50 text-red-600 p-6 rounded-3xl border border-red-100 shadow-sm">
                    <h2 className="text-xl font-bold mb-2">Fehler bei der Generierung</h2>
                    <p>{error}</p>
                    <button
                        onClick={() => navigate(-1)}
                        className="mt-6 px-6 py-2 bg-white border border-red-200 text-red-700 rounded-xl font-bold hover:bg-red-50 transition-colors"
                    >
                        Zurück
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-6xl mx-auto p-6 h-[calc(100vh-64px)] flex flex-col">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <button onClick={() => navigate(-1)} className="text-gray-400 hover:text-gray-600 text-sm mb-1 font-medium">← Zurück</button>
                    <h1 className="text-3xl font-black text-gray-900 leading-tight">Prompt Generator 🤖</h1>
                    <p className="text-gray-500">Kontext-basierter Prompt für AI-Assistenten</p>
                </div>
                <div className="flex gap-3">
                    <button
                        onClick={generatePrompt}
                        className="px-4 py-2 bg-gray-100 text-gray-600 rounded-xl font-bold hover:bg-gray-200 transition-colors"
                    >
                        🔄 Regenerieren
                    </button>
                    <button
                        onClick={copyToClipboard}
                        className={`px-6 py-2 rounded-xl font-bold text-white shadow-lg transition-all transform active:scale-95 flex items-center gap-2 ${copied ? 'bg-green-500 shadow-green-200' : 'bg-blue-600 shadow-blue-200 hover:bg-blue-700'
                            }`}
                    >
                        {copied ? '✅ Kopiert!' : '📋 In Zwischenablage kopieren'}
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 flex-1 min-h-0">
                {/* Prompt Preview */}
                <div className="lg:col-span-2 flex flex-col min-h-0 bg-white rounded-[2rem] shadow-xl border border-gray-100 overflow-hidden">
                    <div className="px-6 py-4 bg-gray-50 border-b border-gray-100 flex justify-between items-center">
                        <span className="font-bold text-gray-500 text-sm uppercase tracking-wider">Generated Output</span>
                        <span className="text-xs text-gray-400 font-mono">{prompt.length} chars</span>
                    </div>
                    <div className="flex-1 overflow-auto p-6 bg-gray-50/30">
                        <pre className="whitespace-pre-wrap font-mono text-sm text-gray-700 leading-relaxed max-w-none">
                            {prompt}
                        </pre>
                    </div>
                </div>

                {/* Info / Metadata Sidebar */}
                <div className="space-y-6 overflow-auto">
                    <div className="bg-white rounded-[2rem] p-6 shadow-sm border border-gray-100">
                        <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                            📊 Analysierter Kontext
                        </h3>

                        {contextData && contextData.feature && (
                            <div className="mb-6">
                                <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Feature</p>
                                <p className="font-bold text-gray-800">{contextData.feature.name}</p>
                                <span className={`inline-block mt-1 px-2 py-0.5 rounded-md text-[10px] font-black uppercase ${contextData.feature.priority === 'critical' ? 'bg-red-100 text-red-600' : 'bg-blue-100 text-blue-600'
                                    }`}>
                                    {contextData.feature.priority}
                                </span>
                            </div>
                        )}

                        {contextData && contextData.project && (
                            <div className="mb-6">
                                <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Projekt</p>
                                <p className="font-bold text-gray-800">{contextData.project.name}</p>
                                <p className="text-xs text-gray-500 mt-1 line-clamp-2">{contextData.project.techStack?.join(', ')}</p>
                            </div>
                        )}

                        {contextData && contextData.infrastructure && (
                            <div>
                                <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Infrastruktur</p>
                                <div className="space-y-2">
                                    {contextData.infrastructure.map((vm: any, idx: number) => (
                                        <div key={idx} className="bg-gray-50 p-2 rounded-lg border border-gray-100">
                                            <div className="flex justify-between items-center">
                                                <span className="text-xs font-bold text-gray-700">{vm.name}</span>
                                                <span className="text-[10px] text-gray-400 font-mono">{vm.ip}</span>
                                            </div>
                                        </div>
                                    ))}
                                    {contextData.infrastructure.length === 0 && (
                                        <p className="text-xs text-gray-400 italic">Keine VMs verknüpft</p>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="bg-gradient-to-br from-indigo-600 to-purple-600 rounded-[2rem] p-6 text-white shadow-lg">
                        <h3 className="font-bold mb-2">💡 Pro-Tipp</h3>
                        <p className="text-sm opacity-90 leading-relaxed">
                            Kopiere diesen Prompt und füge ihn direkt in ChatGPT oder Claude ein. Er enthält alle notwendigen technischen Details, damit der AI-Agent sofort mit der Implementierung beginnen kann.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PromptGenerator;
