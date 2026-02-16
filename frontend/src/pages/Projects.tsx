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
        <div className="p-6 max-w-7xl mx-auto">
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 leading-tight">Projekte</h1>
                    <p className="text-gray-500 mt-1">Verwalte deine Entwicklungs-Infrastruktur und GitHub-Integrationen.</p>
                </div>
                <button
                    onClick={() => setShowModal(true)}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-xl font-medium transition-all shadow-lg shadow-blue-200 flex items-center gap-2"
                >
                    <span className="text-xl">+</span> Neues Projekt
                </button>
            </div>

            {loading ? (
                <div className="flex justify-center items-center h-64">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                </div>
            ) : projects.length === 0 ? (
                <div className="bg-white rounded-3xl p-12 text-center shadow-xl border border-gray-100">
                    <div className="text-6? text-gray-200 mb-4">📂</div>
                    <h2 className="text-xl font-semibold text-gray-900">Keine Projekte gefunden</h2>
                    <p className="text-gray-500 mt-2 mb-6">Erstelle dein erstes Projekt, um mit der Verwaltung zu beginnen.</p>
                    <button
                        onClick={() => setShowModal(true)}
                        className="text-blue-600 font-medium hover:underline"
                    >
                        Jetzt Projekt anlegen
                    </button>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {projects.map((project) => (
                        <div
                            key={project.id}
                            className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 hover:shadow-xl transition-all group relative overflow-hidden"
                        >
                            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                                <span className="text-6? font-bold">#</span>
                            </div>

                            <div className="flex gap-2 mb-4 flex-wrap">
                                <button
                                    onClick={() => navigate(`/projects/${project.id}`)}
                                    className="flex-1 min-w-[120px] px-3 py-2 rounded-lg bg-gray-100 text-gray-700 font-bold text-sm hover:bg-gray-200 transition-colors"
                                    title="Projektübersicht öffnen"
                                >
                                    📂 Übersicht
                                </button>
                                <button
                                    onClick={() => handleSync(project.id)}
                                    disabled={syncingId === project.id}
                                    className={`flex-1 min-w-[140px] px-3 py-2 rounded-lg bg-gray-100 text-gray-700 font-bold text-sm hover:bg-gray-200 transition-colors ${syncingId === project.id ? 'animate-spin' : ''}`}
                                    title="Von GitHub synchronisieren"
                                >
                                    {syncingId === project.id ? '⏳ Sync...' : '🔄 Aktualisieren'}
                                </button>
                                <button
                                    onClick={() => {
                                        navigate(`/projects/${project.id}`);
                                        // Store state to open databases tab
                                        sessionStorage.setItem('openDatabasesTab', 'true');
                                    }}
                                    className="flex-1 min-w-[120px] px-3 py-2 rounded-lg bg-blue-600 text-white font-bold text-sm hover:bg-blue-700 transition-colors"
                                    title="Direkt zur Datenbank"
                                >
                                    🗄️ DB
                                </button>
                            </div>

                            <h3 className="text-xl font-bold text-gray-900 mb-2 group-hover:text-blue-600 transition-colors">
                                {project.name}
                            </h3>

                            <p className="text-gray-500 text-sm line-clamp-2 mb-4 min-h-[40px]">
                                {project.description || 'Keine Beschreibung verfügbar.'}
                            </p>

                            {project.github_repo && (
                                <div className="flex items-center gap-2 text-xs font-medium text-gray-600 bg-gray-50 px-3 py-1.5 rounded-lg w-fit mb-4">
                                    <span className="text-lg">🐙</span>
                                    {project.github_repo}
                                </div>
                            )}

                            <div className="flex flex-wrap gap-2 mb-6">
                                {(project.tech_stack || []).map((tech) => (
                                    <span
                                        key={tech}
                                        className="px-2.5 py-1 bg-gray-100 text-gray-600 text-[10px] font-bold uppercase tracking-wider rounded-md"
                                    >
                                        {tech}
                                    </span>
                                ))}
                            </div>

                            <div className="flex items-center justify-between pt-4 border-t border-gray-50 text-xs">
                                <div className="flex gap-4 text-gray-400">
                                    <span className="flex items-center gap-1">
                                        ⭐ {project.metadata?.stars || 0}
                                    </span>
                                    <span className="flex items-center gap-1">
                                        🍴 {project.metadata?.forks || 0}
                                    </span>
                                </div>
                                <span className="text-gray-400 italic">
                                    Sync: {project.last_sync ? new Date(project.last_sync).toLocaleDateString() : 'Nie'}
                                </span>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Create Modal */}
            {showModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white rounded-[2.5rem] p-10 max-w-lg w-full shadow-2xl animate-in zoom-in-95 duration-200 border border-white/20">
                        <div className="flex justify-between items-center mb-8">
                            <h2 className="text-2xl font-bold text-gray-900">Neues Projekt</h2>
                            <button
                                onClick={() => setShowModal(false)}
                                className="text-gray-400 hover:text-gray-600 text-3xl leading-none"
                            >
                                &times;
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-6">
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-2">Projektname</label>
                                <input
                                    type="text"
                                    required
                                    placeholder="z.B. InfraManager Dashboard"
                                    className="w-full px-5 py-3.5 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-4 focus:ring-blue-100 focus:border-blue-500 transition-all outline-none"
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-2">Beschreibung</label>
                                <textarea
                                    placeholder="Kurze Projektbeschreibung..."
                                    className="w-full px-5 py-3.5 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-4 focus:ring-blue-100 focus:border-blue-500 transition-all outline-none resize-none"
                                    rows={3}
                                    value={formData.description}
                                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-2 flex justify-between">
                                    GitHub Repository
                                    <span className="text-gray-400 font-normal">Optional</span>
                                </label>
                                <div className="relative">
                                    <span className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-400">🐙</span>
                                    <input
                                        type="text"
                                        placeholder="owner/repo"
                                        className="w-full pl-12 pr-5 py-3.5 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-4 focus:ring-blue-100 focus:border-blue-500 transition-all outline-none"
                                        value={formData.github_repo}
                                        onChange={(e) => setFormData({ ...formData, github_repo: e.target.value })}
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-2">Tech Stack</label>
                                <input
                                    type="text"
                                    placeholder="React, NestJS, PostgreSQL (kommagetrennt)"
                                    className="w-full px-5 py-3.5 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-4 focus:ring-blue-100 focus:border-blue-500 transition-all outline-none"
                                    value={formData.tech_stack}
                                    onChange={(e) => setFormData({ ...formData, tech_stack: e.target.value })}
                                />
                            </div>

                            <div className="pt-4 flex gap-4">
                                <button
                                    type="button"
                                    onClick={() => setShowModal(false)}
                                    className="flex-1 py-4 px-6 border border-gray-100 rounded-2xl text-gray-600 font-bold hover:bg-gray-50 transition-all"
                                >
                                    Abbrechen
                                </button>
                                <button
                                    type="submit"
                                    className="flex-1 py-4 px-6 bg-blue-600 text-white rounded-2xl font-bold shadow-lg shadow-blue-200 hover:bg-blue-700 hover:-translate-y-0.5 transition-all active:translate-y-0"
                                >
                                    Projekt erstellen
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
