import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../lib/api';
import { useNavigate } from 'react-router-dom';

interface Project {
    id: string;
    name: string;
    description: string;
    github_repo: string;
    tech_stack: string[];
    status: 'active' | 'archived';
    last_sync: string;
    updated_at: string;
    metadata?: {
        stars?: number;
        forks?: number;
        language?: string;
        open_issues?: number;
    };
}

const Projects: React.FC = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [projects, setProjects] = useState<Project[]>([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [syncingId, setSyncingId] = useState<string | null>(null);

    const [formData, setFormData] = useState({
        name: '',
        description: '',
        github_repo: '',
        tech_stack: ''
    });

    useEffect(() => {
        loadProjects();
    }, []);

    const loadProjects = async () => {
        try {
            setLoading(true);
            const response = await api.get('/projects');
            if (response.data.success) {
                setProjects(response.data.data);
            }
        } catch (error) {
            console.error('Failed to load projects:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const data = {
                ...formData,
                tech_stack: formData.tech_stack.split(',').map(s => s.trim()).filter(s => s !== '')
            };
            const response = await api.post('/projects', data);
            if (response.data.success) {
                setShowModal(false);
                setFormData({ name: '', description: '', github_repo: '', tech_stack: '' });
                loadProjects();
            }
        } catch (error) {
            console.error('Failed to create project:', error);
        }
    };

    const handleSync = async (id: string) => {
        try {
            setSyncingId(id);
            const response = await api.post(`/projects/${id}/sync`);
            if (response.data.success) {
                loadProjects();
            }
        } catch (error) {
            console.error('Sync failed:', error);
        } finally {
            setSyncingId(null);
        }
    };

    return (
        <div className="p-6 max-w-7xl mx-auto bg-terminal-bg min-h-screen">
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-terminal-primary text-glow section-header">PROJEKTE</h1>
                    <p className="text-terminal-muted mt-2 font-mono text-sm">verwalte entwicklungs-infrastruktur und github-integrationen</p>
                </div>
                <button
                    onClick={() => setShowModal(true)}
                    className="btn-terminal"
                >
                    [ + NEUES PROJEKT ]
                </button>
            </div>

            {loading ? (
                <div className="flex justify-center items-center h-64">
                    <div className="text-terminal-primary font-mono text-glow">[ LOADING... ]</div>
                </div>
            ) : projects.length === 0 ? (
                <div className="card-terminal p-12 text-center">
                    <div className="text-5xl mb-4">[ EMPTY ]</div>
                    <h2 className="text-lg font-mono text-terminal-primary">KEINE PROJEKTE GEFUNDEN</h2>
                    <p className="text-terminal-muted mt-3 mb-6 font-mono text-sm">erstelle dein erstes projekt, um mit der verwaltung zu beginnen</p>
                    <button
                        onClick={() => setShowModal(true)}
                        className="btn-terminal"
                    >
                        JETZT PROJEKT ANLEGEN
                    </button>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {projects.map((project) => (
                        <div
                            key={project.id}
                            className="card-terminal relative overflow-hidden hover:shadow-terminal-glow-strong transition-all group"
                        >
                            <div className="absolute top-0 right-0 p-4 opacity-20 group-hover:opacity-40 transition-opacity text-terminal-accent">
                                <span className="text-4xl font-bold">#</span>
                            </div>

                            <div className="flex gap-2 mb-4 flex-wrap">
                                <button
                                    onClick={() => navigate(`/projects/${project.id}`)}
                                    className="flex-1 min-w-[80px] px-2 py-1.5 border border-terminal-border text-terminal-secondary font-bold text-xs hover:border-terminal-primary hover:text-terminal-primary transition-all"
                                    title="Projektübersicht öffnen"
                                >
                                    [ OVERVIEW ]
                                </button>
                                <button
                                    onClick={() => handleSync(project.id)}
                                    disabled={syncingId === project.id}
                                    className={`flex-1 min-w-[100px] px-2 py-1.5 border border-terminal-border text-terminal-secondary font-bold text-xs hover:border-terminal-primary hover:text-terminal-primary transition-all ${syncingId === project.id ? 'animate-blink' : ''}`}
                                    title="Von GitHub synchronisieren"
                                >
                                    {syncingId === project.id ? '[ SYNC... ]' : '[ SYNC ]'}
                                </button>
                                <button
                                    onClick={() => {
                                        navigate(`/projects/${project.id}`);
                                        sessionStorage.setItem('openDatabasesTab', 'true');
                                    }}
                                    className="flex-1 min-w-[80px] px-2 py-1.5 border border-terminal-accent text-terminal-accent font-bold text-xs hover:bg-terminal-accent hover:text-terminal-bg transition-all"
                                    title="Direkt zur Datenbank"
                                >
                                    [ DB ]
                                </button>
                            </div>

                            <h3 className="text-lg font-bold text-terminal-primary mb-2 group-hover:text-terminal-accent transition-colors">
                                {project.name}
                            </h3>

                            <p className="text-terminal-muted text-xs line-clamp-2 mb-4 min-h-[32px] font-mono">
                                {project.description || 'keine beschreibung verfuegbar'}
                            </p>

                            {project.github_repo && (
                                <div className="flex items-center gap-2 text-xs font-mono text-terminal-secondary border border-terminal-border px-2 py-1 w-fit mb-4">
                                    [ GH ] {project.github_repo}
                                </div>
                            )}

                            <div className="flex flex-wrap gap-2 mb-6">
                                {(project.tech_stack || []).map((tech) => (
                                    <span
                                        key={tech}
                                        className="px-2 py-1 border border-terminal-accent text-terminal-accent text-xs font-bold uppercase tracking-wider"
                                    >
                                        {tech}
                                    </span>
                                ))}
                            </div>

                            <div className="flex items-center justify-between pt-4 border-t border-terminal-border text-xs font-mono">
                                <div className="flex gap-3 text-terminal-muted">
                                    <span>
                                        [ * {project.metadata?.stars || 0} ]
                                    </span>
                                    <span>
                                        [ F {project.metadata?.forks || 0} ]
                                    </span>
                                </div>
                                <span className="text-terminal-muted">
                                    {project.last_sync ? new Date(project.last_sync).toLocaleDateString() : 'NEVER'}
                                </span>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Create Modal */}
            {showModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-terminal-bg/80 backdrop-blur-sm">
                    <div className="card-terminal shadow-terminal-glow-strong max-w-lg w-full">
                        <div className="flex justify-between items-center mb-6 pb-4 border-b border-terminal-border">
                            <h2 className="text-lg font-bold text-terminal-primary section-header">NEUES PROJEKT</h2>
                            <button
                                onClick={() => setShowModal(false)}
                                className="text-terminal-muted hover:text-terminal-primary font-mono text-xl"
                            >
                                [ X ]
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-5">
                            <div>
                                <label className="block text-xs font-semibold text-terminal-secondary mb-2 uppercase">Projektname</label>
                                <input
                                    type="text"
                                    required
                                    placeholder="z.B. inframanager dashboard"
                                    className="input-terminal"
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-terminal-secondary mb-2 uppercase">Beschreibung</label>
                                <textarea
                                    placeholder="kurze projektbeschreibung..."
                                    className="input-terminal resize-none"
                                    rows={3}
                                    value={formData.description}
                                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-terminal-secondary mb-2 flex justify-between uppercase">
                                    GitHub Repository
                                    <span className="text-terminal-muted font-normal">[optional]</span>
                                </label>
                                <div className="relative">
                                    <span className="absolute left-3 top-2.5 text-terminal-muted">[gh]</span>
                                    <input
                                        type="text"
                                        placeholder="owner/repo"
                                        className="input-terminal pl-12"
                                        value={formData.github_repo}
                                        onChange={(e) => setFormData({ ...formData, github_repo: e.target.value })}
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-terminal-secondary mb-2 uppercase">Tech Stack</label>
                                <input
                                    type="text"
                                    placeholder="react, nestjs, postgresql (kommagetrennt)"
                                    className="input-terminal"
                                    value={formData.tech_stack}
                                    onChange={(e) => setFormData({ ...formData, tech_stack: e.target.value })}
                                />
                            </div>

                            <div className="pt-4 flex gap-3 border-t border-terminal-border">
                                <button
                                    type="button"
                                    onClick={() => setShowModal(false)}
                                    className="flex-1 py-2.5 px-4 border border-terminal-border text-terminal-secondary font-mono text-sm hover:border-terminal-primary hover:text-terminal-primary transition-all"
                                >
                                    [ ABBRECHEN ]
                                </button>
                                <button
                                    type="submit"
                                    className="flex-1 py-2.5 px-4 border border-terminal-accent text-terminal-bg bg-terminal-accent font-mono text-sm hover:shadow-terminal-glow transition-all"
                                >
                                    [ ERSTELLEN ]
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Projects;
