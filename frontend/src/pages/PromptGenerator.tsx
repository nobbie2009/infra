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
            <div className="flex flex-col justify-center items-center h-[calc(100vh-64px)] bg-terminal-bg">
                <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-terminal-primary mb-6"></div>
                <p className="text-terminal-secondary font-medium animate-pulse font-mono">[ ANALYZING CONTEXT & GENERATING PROMPT ]</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="p-8 max-w-2xl mx-auto text-center bg-terminal-bg min-h-screen">
                <div className="card-terminal border-terminal-danger">
                    <h2 className="text-xl font-bold mb-2 text-terminal-danger font-mono">[ ERROR ]</h2>
                    <p className="text-terminal-secondary font-mono">{error}</p>
                    <button
                        onClick={() => navigate(-1)}
                        className="btn-terminal mt-6"
                    >
                        [ ZURÜCK ]
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-6xl mx-auto p-6 h-[calc(100vh-64px)] flex flex-col bg-terminal-bg">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <button onClick={() => navigate(-1)} className="text-terminal-muted hover:text-terminal-secondary text-sm mb-1 font-medium font-mono">← ZURÜCK</button>
                    <h1 className="text-3xl font-black text-terminal-primary leading-tight font-mono text-glow">PROMPT GENERATOR 🤖</h1>
                    <p className="text-terminal-secondary font-mono">[ CONTEXT-BASED PROMPT GENERATION ]</p>
                </div>
                <div className="flex gap-3">
                    <button
                        onClick={generatePrompt}
                        className="btn-terminal"
                    >
                        🔄 [ REGENERATE ]
                    </button>
                    <button
                        onClick={copyToClipboard}
                        className={`btn-terminal transition-all transform active:scale-95 flex items-center gap-2 ${copied ? 'border-terminal-primary bg-terminal-primary text-terminal-bg' : 'border-terminal-primary'
                            }`}
                    >
                        {copied ? '✅ [ COPIED ]' : '📋 [ COPY TO CLIPBOARD ]'}
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 flex-1 min-h-0">
                {/* Prompt Preview */}
                <div className="lg:col-span-2 flex flex-col min-h-0 card-terminal shadow-terminal-glow-strong overflow-hidden">
                    <div className="px-6 py-4 bg-terminal-surface border-b border-terminal-border flex justify-between items-center">
                        <span className="font-bold text-terminal-primary text-sm uppercase tracking-wider font-mono">[ GENERATED OUTPUT ]</span>
                        <span className="text-xs text-terminal-muted font-mono">[ {prompt.length} CHARS ]</span>
                    </div>
                    <div className="flex-1 overflow-auto p-6 bg-terminal-surface">
                        <pre className="whitespace-pre-wrap font-mono text-sm text-terminal-secondary leading-relaxed max-w-none">
                            {prompt}
                        </pre>
                    </div>
                </div>

                {/* Info / Metadata Sidebar */}
                <div className="space-y-6 overflow-auto">
                    <div className="card-terminal">
                        <h3 className="font-bold text-terminal-primary mb-4 flex items-center gap-2 font-mono section-header">
                            📊 KONTEXT
                        </h3>

                        {contextData && contextData.feature && (
                            <div className="mb-6">
                                <p className="text-xs font-bold text-terminal-muted uppercase tracking-wider mb-1 font-mono">[ FEATURE ]</p>
                                <p className="font-bold text-terminal-primary font-mono">{contextData.feature.name}</p>
                                <span className={`inline-block mt-1 px-2 py-0.5 text-[10px] font-black uppercase border font-mono ${contextData.feature.priority === 'critical' ? 'border-terminal-danger text-terminal-danger bg-terminal-surface' : 'border-terminal-primary text-terminal-primary bg-terminal-surface'
                                    }`}>
                                    [ {contextData.feature.priority.toUpperCase()} ]
                                </span>
                            </div>
                        )}

                        {contextData && contextData.project && (
                            <div className="mb-6">
                                <p className="text-xs font-bold text-terminal-muted uppercase tracking-wider mb-1 font-mono">[ PROJECT ]</p>
                                <p className="font-bold text-terminal-primary font-mono">{contextData.project.name}</p>
                                <p className="text-xs text-terminal-secondary mt-1 line-clamp-2 font-mono">{contextData.project.techStack?.join(', ')}</p>
                            </div>
                        )}

                        {contextData && contextData.infrastructure && (
                            <div>
                                <p className="text-xs font-bold text-terminal-muted uppercase tracking-wider mb-2 font-mono">[ INFRASTRUCTURE ]</p>
                                <div className="space-y-2">
                                    {contextData.infrastructure.map((vm: any, idx: number) => (
                                        <div key={idx} className="bg-terminal-surface p-2 border border-terminal-border">
                                            <div className="flex justify-between items-center">
                                                <span className="text-xs font-bold text-terminal-primary font-mono">{vm.name}</span>
                                                <span className="text-[10px] text-terminal-muted font-mono">{vm.ip}</span>
                                            </div>
                                        </div>
                                    ))}
                                    {contextData.infrastructure.length === 0 && (
                                        <p className="text-xs text-terminal-muted italic font-mono">[ NO VMS LINKED ]</p>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="card-terminal bg-terminal-surface shadow-terminal-glow border-terminal-accent">
                        <h3 className="font-bold text-terminal-accent mb-2 font-mono">💡 [ PRO TIP ]</h3>
                        <p className="text-sm text-terminal-secondary leading-relaxed font-mono">
                            Copy this prompt and paste it into ChatGPT or Claude. Contains all technical details for immediate implementation.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PromptGenerator;
