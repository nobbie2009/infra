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
        <div className="max-w-7xl mx-auto p-6 bg-terminal-bg min-h-screen">
            {/* Header */}
            <div className="mb-8 flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                    <button
                        onClick={() => navigate('/projects')}
                        className="text-terminal-muted hover:text-terminal-secondary mb-4 flex items-center gap-2 transition-colors font-mono"
                    >
                        ← ZURÜCK
                    </button>
                    <h1 className="text-4xl font-extrabold text-terminal-primary leading-none font-mono text-glow">{project.name}</h1>
                    <div className="flex items-center gap-4 mt-4">
                        {project.github_repo && (
                            <a
                                href={`https://github.com/${project.github_repo}`}
                                target="_blank"
                                rel="noreferrer"
                                className="flex items-center gap-2 text-sm text-terminal-secondary hover:text-terminal-primary transition-colors bg-terminal-surface px-3 py-1.5 border border-terminal-border shadow-terminal-glow font-mono"
                            >
                                <span>🐙</span> {project.github_repo}
                            </a>
                        )}
                        <span className={`px-3 py-1.5 text-xs font-bold uppercase tracking-widest border font-mono ${project.status === 'active' ? 'bg-terminal-primary text-terminal-bg border-terminal-primary' : 'bg-terminal-surface text-terminal-muted border-terminal-muted'}`}>
                            [ {project.status.toUpperCase()} ]
                        </span>
                    </div>
                </div>

                <div className="flex gap-3">
                    <button
                        onClick={() => navigate(`/projects/${id}/kanban`)}
                        className="btn-terminal flex items-center gap-2"
                    >
                        📋 [ KANBAN ]
                    </button>
                    <button
                        onClick={() => setActiveTab('databases')}
                        className={`px-6 py-2.5 font-bold transition-all flex items-center gap-2 font-mono border ${
                            activeTab === 'databases'
                                ? 'btn-terminal'
                                : 'btn-terminal'
                        }`}
                    >
                        🗄️ [ DATENBANKEN ]
                    </button>
                    <button
                        onClick={() => setShowEditModal(true)}
                        className="btn-terminal"
                    >
                        [ BEARBEITEN ]
                    </button>
                    <button
                        onClick={handleDelete}
                        className="btn-terminal border-terminal-danger text-terminal-danger hover:bg-terminal-danger hover:text-terminal-bg"
                        title="Projekt löschen"
                    >
                        [ LÖSCHEN ]
                    </button>
                    <button className="btn-terminal">
                        [ DEPLOY ]
                    </button>
                </div>
            </div>

            {activeTab === 'overview' ? (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Main Content */}
                <div className="lg:col-span-2 space-y-8">
                    {/* Description Card */}
                    <div className="card-terminal">
                        <h2 className="text-lg font-bold text-terminal-primary mb-4 font-mono section-header">BESCHREIBUNG</h2>
                        <p className="text-terminal-secondary leading-relaxed text-lg font-mono">
                            {project.description || '[ KEINE BESCHREIBUNG HINTERLEGT ]'}
                        </p>
                    </div>

                    {/* README Section */}
                    <div className="card-terminal">
                        <h2 className="text-lg font-bold text-terminal-primary mb-6 flex items-center gap-3 font-mono section-header">
                            📖 README.md
                            <span className="text-xs font-normal text-terminal-muted font-mono tracking-tighter">(Sync: {new Date(project.last_sync).toLocaleString()})</span>
                        </h2>
                        <div className="max-w-none bg-terminal-surface p-6 border border-terminal-border min-h-[300px]">
                            {project.readme_content ? (
                                <div className="whitespace-pre-wrap font-mono text-terminal-secondary text-sm">
                                    {project.readme_content}
                                </div>
                            ) : (
                                <div className="flex flex-col items-center justify-center py-20 text-terminal-muted">
                                    <span className="text-4xl mb-4">📄</span>
                                    <p className="font-mono">[ NO README CONTENT ]</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Sidebar */}
                <div className="space-y-8">
                    {/* Tech Stack Card */}
                    <div className="card-terminal bg-terminal-surface shadow-terminal-glow">
                        <h2 className="text-lg font-bold text-terminal-primary mb-6 font-mono section-header">TECH STACK</h2>
                        <div className="flex flex-wrap gap-2">
                            {project.tech_stack?.length > 0 ? (
                                project.tech_stack.map((tech: string) => (
                                    <span key={tech} className="px-3 py-1.5 bg-terminal-border text-terminal-primary text-sm font-medium border border-terminal-primary font-mono">
                                        [ {tech} ]
                                    </span>
                                ))
                            ) : (
                                <p className="text-terminal-muted text-sm font-mono">[ NO TECH STACK ]</p>
                            )}
                        </div>
                    </div>

                    {/* Stats/Metadata Card */}
                    <div className="card-terminal">
                        <h2 className="text-lg font-bold text-terminal-primary mb-6 font-mono section-header">GITHUB STATS</h2>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="p-4 bg-terminal-surface border border-terminal-border">
                                <p className="text-xs text-terminal-muted mb-1 uppercase tracking-wider font-bold font-mono">[ STARS ]</p>
                                <p className="text-2xl font-black text-terminal-primary font-mono">{project.metadata?.stars || 0}</p>
                            </div>
                            <div className="p-4 bg-terminal-surface border border-terminal-border">
                                <p className="text-xs text-terminal-muted mb-1 uppercase tracking-wider font-bold font-mono">[ FORKS ]</p>
                                <p className="text-2xl font-black text-terminal-primary font-mono">{project.metadata?.forks || 0}</p>
                            </div>
                            <div className="p-4 bg-terminal-surface border border-terminal-border">
                                <p className="text-xs text-terminal-muted mb-1 uppercase tracking-wider font-bold font-mono">[ ISSUES ]</p>
                                <p className="text-2xl font-black text-terminal-primary font-mono">{project.metadata?.open_issues || 0}</p>
                            </div>
                            <div className="p-4 bg-terminal-surface border border-terminal-border">
                                <p className="text-xs text-terminal-muted mb-1 uppercase tracking-wider font-bold font-mono">[ LANG ]</p>
                                <p className="text-sm font-bold text-terminal-primary truncate font-mono">{project.metadata?.language || 'N/A'}</p>
                            </div>
                        </div>
                    </div>

                    {/* Allocated VMs Card */}
                    <div className="card-terminal">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-lg font-bold text-terminal-primary font-mono section-header">VMS</h2>
                            <button
                                onClick={loadAvailableVMs}
                                className="text-terminal-primary text-sm font-bold hover:text-terminal-accent font-mono"
                            >
                                [ + LINK ]
                            </button>
                        </div>
                        <div className="space-y-3">
                            {project.vms?.length > 0 ? (
                                project.vms.map((vm: ProjectVM) => (
                                    <div key={vm.id} className="flex items-center justify-between p-3 hover:bg-terminal-surface transition-colors border border-terminal-border hover:border-terminal-primary group/vm">
                                        <div className="flex items-center gap-3 cursor-pointer" onClick={() => navigate(`/vms/${vm.id}`)}>
                                            <span className="text-xl">🖥️</span>
                                            <div>
                                                <p className="font-bold text-terminal-primary text-sm font-mono">{vm.name}</p>
                                                <p className="text-[10px] text-terminal-muted font-mono">ID:{vm.vmid} | Node:{vm.node}</p>
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => handleUnlinkVM(vm.id)}
                                            className="opacity-0 group-hover/vm:opacity-100 p-2 text-terminal-muted hover:text-terminal-danger transition-all font-bold"
                                            title="Zuordnung entfernen"
                                        >
                                            ✕
                                        </button>
                                    </div>
                                ))
                            ) : (
                                <div className="text-center py-6 text-terminal-muted bg-terminal-surface border border-dashed border-terminal-border">
                                    <p className="text-xs font-mono">[ NO VMS LINKED ]</p>
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
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-terminal-bg/80 backdrop-blur-sm">
                    <div className="card-terminal max-w-lg w-full shadow-terminal-glow-strong">
                        <h2 className="text-2xl font-bold text-terminal-primary mb-8 font-mono section-header">VM ZUORDNEN</h2>
                        <div className="space-y-6">
                            <div>
                                <label className="block text-sm font-semibold text-terminal-secondary mb-2 font-mono">[ VERFÜGBARE VMS ]</label>
                                <select
                                    className="input-terminal appearance-none"
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
                                    className="btn-terminal flex-1"
                                >
                                    [ ABBRECHEN ]
                                </button>
                                <button
                                    onClick={handleLinkVM}
                                    disabled={!selectedVMId}
                                    className="btn-terminal flex-1"
                                >
                                    [ VERKNÜPFEN ]
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Edit Modal */}
            {showEditModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-terminal-bg/80 backdrop-blur-sm">
                    <div className="card-terminal max-w-lg w-full shadow-terminal-glow-strong">
                        <h2 className="text-2xl font-bold text-terminal-primary mb-8 font-mono section-header">PROJEKT BEARBEITEN</h2>
                        <form onSubmit={handleUpdate} className="space-y-6">
                            <div>
                                <label className="block text-sm font-semibold text-terminal-secondary mb-2 font-mono">[ PROJEKTNAME ]</label>
                                <input
                                    type="text"
                                    required
                                    className="input-terminal"
                                    value={editData.name}
                                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEditData({ ...editData, name: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-terminal-secondary mb-2 font-mono">[ BESCHREIBUNG ]</label>
                                <textarea
                                    className="input-terminal resize-none"
                                    rows={3}
                                    value={editData.description}
                                    onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setEditData({ ...editData, description: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-terminal-secondary mb-2 font-mono uppercase text-xs">[ GITHUB REPO ]</label>
                                <input
                                    type="text"
                                    className="input-terminal"
                                    placeholder="owner/repo"
                                    value={editData.github_repo}
                                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEditData({ ...editData, github_repo: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-terminal-secondary mb-2 font-mono">[ TECH STACK ]</label>
                                <input
                                    type="text"
                                    className="input-terminal"
                                    placeholder="z.B. React, Node.js"
                                    value={editData.tech_stack}
                                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEditData({ ...editData, tech_stack: e.target.value })}
                                />
                            </div>
                            <div className="flex gap-4 pt-4">
                                <button
                                    type="button"
                                    onClick={() => setShowEditModal(false)}
                                    className="btn-terminal flex-1"
                                >
                                    [ ABBRECHEN ]
                                </button>
                                <button
                                    type="submit"
                                    className="btn-terminal flex-1"
                                >
                                    [ SPEICHERN ]
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
