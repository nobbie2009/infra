import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../lib/api';
import DatabasesTab from '../components/DatabasesTab';

interface ProjectVM {
    id: string;
    vmid: number;
    name: string;
    node: string;
    status: string;
}

interface Project {
    id: string;
    name: string;
    description: string;
    github_repo: string;
    tech_stack: string[];
    status: 'active' | 'archived';
    last_sync: string;
    readme_content: string;
    metadata?: {
        stars?: number;
        forks?: number;
        open_issues?: number;
        language?: string;
    };
    vms: ProjectVM[];
}

const ProjectDetail: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const [project, setProject] = useState<Project | null>(null);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'overview' | 'databases'>('overview');
    const [showEditModal, setShowEditModal] = useState(false);
    const [editData, setEditData] = useState({
        name: '',
        description: '',
        github_repo: '',
        tech_stack: ''
    });
    const [showLinkVMModal, setShowLinkVMModal] = useState(false);
    const [availableVMs, setAvailableVMs] = useState<ProjectVM[]>([]);
    const [selectedVMId, setSelectedVMId] = useState('');

    useEffect(() => {
        if (id) {
            loadProject();
            // Check if we should open the databases tab
            if (sessionStorage.getItem('openDatabasesTab')) {
                setActiveTab('databases');
                sessionStorage.removeItem('openDatabasesTab');
            }
        }
    }, [id]);

    const loadProject = async () => {
        try {
            setLoading(true);
            const response = await api.get(`/projects/${id}`);
            if (response.data.success) {
                setProject(response.data.data);
                setEditData({
                    name: response.data.data.name,
                    description: response.data.data.description || '',
                    github_repo: response.data.data.github_repo || '',
                    tech_stack: (response.data.data.tech_stack || []).join(', ')
                });
            }
        } catch (error) {
            console.error('Failed to load project details:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleUpdate = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const data = {
                ...editData,
                tech_stack: editData.tech_stack.split(',').map((s: string) => s.trim()).filter((s: string) => s !== '')
            };
            const response = await api.put(`/projects/${id}`, data);
            if (response.data.success) {
                setShowEditModal(false);
                loadProject();
            }
        } catch (error) {
            console.error('Failed to update project:', error);
        }
    };

    const handleDelete = async () => {
        if (!window.confirm('Projekt wirklich löschen? Alle zugehörigen Features gehen verloren!')) return;
        try {
            const response = await api.delete(`/projects/${id}`);
            if (response.data.success) {
                navigate('/projects');
            }
        } catch (error) {
            console.error('Failed to delete project:', error);
        }
    };

    const loadAvailableVMs = async () => {
        try {
            console.log("Loading available VMs...");
            const response = await api.get('/infrastructure/ip-allocations');
            if (response.data.success) {
                // Filter out VMs already linked
                const linkedIds = project?.vms.map((v: ProjectVM) => v.id) || [];
                const filtered = response.data.data.allocations.filter((v: ProjectVM) => !linkedIds.includes(v.id));
                setAvailableVMs(filtered);
                setShowLinkVMModal(true);
            } else {
                alert('Fehler beim Laden der VMs: ' + (response.data.message || 'Unbekannter Fehler'));
            }
        } catch (error: any) {
            console.error('Failed to load VMs:', error);
            alert('Netzwerkfehler beim Laden der VMs: ' + (error.message || String(error)));
        }
    };

    const handleLinkVM = async () => {
        if (!selectedVMId) return;
        try {
            const response = await api.post(`/projects/${id}/vms`, { vmId: selectedVMId });
            if (response.data.success) {
                setShowLinkVMModal(false);
                setSelectedVMId('');
                loadProject();
            }
        } catch (error) {
            console.error('Failed to link VM:', error);
        }
    };

    const handleUnlinkVM = async (vmId: string) => {
        if (!window.confirm('VM-Zuordnung aufheben?')) return;
        try {
            const response = await api.delete(`/projects/${id}/vms/${vmId}`);
            if (response.data.success) {
                loadProject();
            }
        } catch (error) {
            console.error('Failed to unlink VM:', error);
        }
    };

    if (loading) {
        return (
            <div className="flex justify-center items-center h-[calc(100vh-64px)] bg-terminal-bg">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-terminal-primary"></div>
            </div>
        );
    }

    if (!project) {
        return (
            <div className="p-6 text-center bg-terminal-bg min-h-screen">
                <h2 className="text-xl font-bold text-terminal-primary font-mono">[ PROJEKT NICHT GEFUNDEN ]</h2>
                <button onClick={() => navigate('/projects')} className="text-terminal-secondary mt-4 underline font-mono">Zurück zur Übersicht</button>
            </div>
        );
    }

    return (
        <div className="max-w-7xl mx-auto p-6">
            {/* Header */}
            <div className="mb-8 flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                    <button
                        onClick={() => navigate('/projects')}
                        className="text-gray-400 hover:text-gray-600 mb-4 flex items-center gap-2 transition-colors"
                    >
                        ← Zurück
                    </button>
                    <h1 className="text-4xl font-extrabold text-gray-900 leading-none">{project.name}</h1>
                    <div className="flex items-center gap-4 mt-4">
                        {project.github_repo && (
                            <a
                                href={`https://github.com/${project.github_repo}`}
                                target="_blank"
                                rel="noreferrer"
                                className="flex items-center gap-2 text-sm text-gray-600 hover:text-black transition-colors bg-white px-3 py-1.5 rounded-full border border-gray-100 shadow-sm"
                            >
                                <span>🐙</span> {project.github_repo}
                            </a>
                        )}
                        <span className={`px-3 py-1.5 rounded-full text-xs font-bold uppercase tracking-widest ${project.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                            {project.status}
                        </span>
                    </div>
                </div>

                <div className="flex gap-3">
                    <button
                        onClick={() => navigate(`/projects/${id}/kanban`)}
                        className="px-6 py-2.5 bg-white border border-gray-200 rounded-xl font-bold text-gray-700 hover:bg-gray-50 transition-all shadow-sm flex items-center gap-2"
                    >
                        📋 Kanban
                    </button>
                    <button
                        onClick={() => setActiveTab('databases')}
                        className={`px-6 py-2.5 rounded-xl font-bold transition-all shadow-sm flex items-center gap-2 ${
                            activeTab === 'databases'
                                ? 'bg-blue-600 text-white'
                                : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-50'
                        }`}
                    >
                        🗄️ Datenbanken
                    </button>
                    <button
                        onClick={() => setShowEditModal(true)}
                        className="px-6 py-2.5 bg-white border border-gray-200 rounded-xl font-bold text-gray-700 hover:bg-gray-50 transition-all shadow-sm"
                    >
                        Bearbeiten
                    </button>
                    <button
                        onClick={handleDelete}
                        className="px-4 py-2.5 bg-red-50 text-red-600 rounded-xl font-bold hover:bg-red-100 transition-all"
                        title="Projekt löschen"
                    >
                        🗑️
                    </button>
                    <button className="px-6 py-2.5 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-all shadow-lg shadow-blue-200">
                        Deploy
                    </button>
                </div>
            </div>

            {activeTab === 'overview' ? (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Main Content */}
                <div className="lg:col-span-2 space-y-8">
                    {/* Description Card */}
                    <div className="bg-white rounded-[2rem] p-8 shadow-sm border border-gray-100">
                        <h2 className="text-lg font-bold text-gray-900 mb-4">Beschreibung</h2>
                        <p className="text-gray-600 leading-relaxed text-lg">
                            {project.description || 'Keine Beschreibung für dieses Projekt hinterlegt.'}
                        </p>
                    </div>

                    {/* README Section */}
                    <div className="bg-white rounded-[2rem] p-8 shadow-sm border border-gray-100">
                        <h2 className="text-lg font-bold text-gray-900 mb-6 flex items-center gap-3">
                            📖 README.md
                            <span className="text-xs font-normal text-gray-400 font-mono tracking-tighter">(Sync: {new Date(project.last_sync).toLocaleString()})</span>
                        </h2>
                        <div className="prose prose-blue max-w-none bg-gray-50 p-6 rounded-2xl border border-gray-100 min-h-[300px]">
                            {project.readme_content ? (
                                <div className="whitespace-pre-wrap font-sans text-gray-800">
                                    {project.readme_content}
                                </div>
                            ) : (
                                <div className="flex flex-col items-center justify-center py-20 text-gray-400">
                                    <span className="text-4xl mb-4">📄</span>
                                    <p>Keine README-Inhalte gefunden.</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Sidebar */}
                <div className="space-y-8">
                    {/* Tech Stack Card */}
                    <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-[2rem] p-8 text-white shadow-xl">
                        <h2 className="text-lg font-bold mb-6">Tech Stack</h2>
                        <div className="flex flex-wrap gap-2">
                            {project.tech_stack?.length > 0 ? (
                                project.tech_stack.map((tech: string) => (
                                    <span key={tech} className="px-3 py-1.5 bg-white/10 rounded-xl text-sm font-medium border border-white/5 backdrop-blur-md">
                                        {tech}
                                    </span>
                                ))
                            ) : (
                                <p className="text-gray-400 text-sm">Keine Tech-Stack Daten.</p>
                            )}
                        </div>
                    </div>

                    {/* Stats/Metadata Card */}
                    <div className="bg-white rounded-[2rem] p-8 shadow-sm border border-gray-100">
                        <h2 className="text-lg font-bold text-gray-900 mb-6">GitHub Stats</h2>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="p-4 bg-gray-50 rounded-2xl">
                                <p className="text-xs text-gray-500 mb-1 uppercase tracking-wider font-bold">Stars</p>
                                <p className="text-2xl font-black text-gray-900">{project.metadata?.stars || 0}</p>
                            </div>
                            <div className="p-4 bg-gray-50 rounded-2xl">
                                <p className="text-xs text-gray-500 mb-1 uppercase tracking-wider font-bold">Forks</p>
                                <p className="text-2xl font-black text-gray-900">{project.metadata?.forks || 0}</p>
                            </div>
                            <div className="p-4 bg-gray-50 rounded-2xl">
                                <p className="text-xs text-gray-500 mb-1 uppercase tracking-wider font-bold">Issues</p>
                                <p className="text-2xl font-black text-gray-900">{project.metadata?.open_issues || 0}</p>
                            </div>
                            <div className="p-4 bg-gray-50 rounded-2xl">
                                <p className="text-xs text-gray-500 mb-1 uppercase tracking-wider font-bold">Language</p>
                                <p className="text-sm font-bold text-gray-900 truncate">{project.metadata?.language || 'N/A'}</p>
                            </div>
                        </div>
                    </div>

                    {/* Allocated VMs Card */}
                    <div className="bg-white rounded-[2rem] p-8 shadow-sm border border-gray-100">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-lg font-bold text-gray-900">Zugeordnete VMs</h2>
                            <button
                                onClick={loadAvailableVMs}
                                className="text-blue-600 text-sm font-bold hover:underline"
                            >
                                + Link
                            </button>
                        </div>
                        <div className="space-y-3">
                            {project.vms?.length > 0 ? (
                                project.vms.map((vm: ProjectVM) => (
                                    <div key={vm.id} className="flex items-center justify-between p-3 hover:bg-gray-50 rounded-2xl transition-colors border border-transparent hover:border-gray-100 group/vm">
                                        <div className="flex items-center gap-3 cursor-pointer" onClick={() => navigate(`/vms/${vm.id}`)}>
                                            <span className="text-xl">🖥️</span>
                                            <div>
                                                <p className="font-bold text-gray-900 text-sm">{vm.name}</p>
                                                <p className="text-[10px] text-gray-400">VMID: {vm.vmid} | Node: {vm.node}</p>
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => handleUnlinkVM(vm.id)}
                                            className="opacity-0 group-hover/vm:opacity-100 p-2 text-gray-300 hover:text-red-500 transition-all"
                                            title="Zuordnung entfernen"
                                        >
                                            ✕
                                        </button>
                                    </div>
                                ))
                            ) : (
                                <div className="text-center py-6 text-gray-400 bg-gray-50 rounded-2xl border border-dashed border-gray-200">
                                    <p className="text-xs">Keine VMs zugeordnet.</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
            ) : (
            <DatabasesTab projectId={id!} />
            )}

            {/* Link VM Modal */}
            {showLinkVMModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm">
                    <div className="bg-white rounded-[2.5rem] p-10 max-w-lg w-full shadow-2xl border border-white/20">
                        <h2 className="text-2xl font-bold text-gray-900 mb-8">VM zuordnen</h2>
                        <div className="space-y-6">
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-2">Verfügbare VMs</label>
                                <select
                                    className="w-full px-5 py-3.5 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-4 focus:ring-blue-100 outline-none"
                                    value={selectedVMId}
                                    onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setSelectedVMId(e.target.value)}
                                >
                                    <option value="">VM auswählen...</option>
                                    {availableVMs.map((vm: ProjectVM) => (
                                        <option key={vm.id} value={vm.id}>
                                            {vm.name} ({vm.node})
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div className="flex gap-4 pt-4">
                                <button
                                    onClick={() => setShowLinkVMModal(false)}
                                    className="flex-1 py-4 font-bold text-gray-500 hover:text-gray-700"
                                >
                                    Abbrechen
                                </button>
                                <button
                                    onClick={handleLinkVM}
                                    disabled={!selectedVMId}
                                    className="flex-1 py-4 bg-blue-600 text-white rounded-2xl font-bold shadow-lg shadow-blue-200 hover:bg-blue-700 disabled:opacity-50"
                                >
                                    Verknüpfen
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Edit Modal */}
            {showEditModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm">
                    <div className="bg-white rounded-[2.5rem] p-10 max-w-lg w-full shadow-2xl border border-white/20">
                        <h2 className="text-2xl font-bold text-gray-900 mb-8">Projekt bearbeiten</h2>
                        <form onSubmit={handleUpdate} className="space-y-6">
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-2">Projektname</label>
                                <input
                                    type="text"
                                    required
                                    className="w-full px-5 py-3.5 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-4 focus:ring-blue-100 outline-none transition-all"
                                    value={editData.name}
                                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEditData({ ...editData, name: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-2">Beschreibung</label>
                                <textarea
                                    className="w-full px-5 py-3.5 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-4 focus:ring-blue-100 outline-none resize-none"
                                    rows={3}
                                    value={editData.description}
                                    onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setEditData({ ...editData, description: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-2 font-black uppercase tracking-widest text-xs text-gray-400">GitHub Repo</label>
                                <input
                                    type="text"
                                    className="w-full px-5 py-3.5 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-4 focus:ring-blue-100 outline-none transition-all"
                                    placeholder="owner/repo"
                                    value={editData.github_repo}
                                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEditData({ ...editData, github_repo: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-2">Tech Stack</label>
                                <input
                                    type="text"
                                    className="w-full px-5 py-3.5 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-4 focus:ring-blue-100 outline-none transition-all"
                                    placeholder="z.B. React, Node.js"
                                    value={editData.tech_stack}
                                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEditData({ ...editData, tech_stack: e.target.value })}
                                />
                            </div>
                            <div className="flex gap-4 pt-4">
                                <button
                                    type="button"
                                    onClick={() => setShowEditModal(false)}
                                    className="flex-1 py-4 font-bold text-gray-500 hover:text-gray-700"
                                >
                                    Abbrechen
                                </button>
                                <button
                                    type="submit"
                                    className="flex-1 py-4 bg-blue-600 text-white rounded-2xl font-bold shadow-lg shadow-blue-200 hover:bg-blue-700"
                                >
                                    Speichern
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ProjectDetail;
