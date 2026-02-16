import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { DragDropContext, Droppable, Draggable, DropResult } from 'react-beautiful-dnd';
import api from '../lib/api';
import { useAuth } from '../context/AuthContext';

interface Feature {
    id: string;
    name: string;
    description: string;
    status: string;
    priority: 'low' | 'medium' | 'high' | 'critical';
    effort?: number;
}

const COLUMNS = [
    { id: 'planned', title: 'Geplant', icon: '📝', color: 'bg-gray-50' },
    { id: 'analysis', title: 'Analyse', icon: '🔍', color: 'bg-blue-50' },
    { id: 'ready', title: 'Ready', icon: '✅', color: 'bg-indigo-50' },
    { id: 'dev', title: 'Entwicklung', icon: '💻', color: 'bg-yellow-50' },
    { id: 'testing', title: 'Testing', icon: '🧪', color: 'bg-purple-50' },
    { id: 'deployed', title: 'Deployed', icon: '🚀', color: 'bg-green-50' },
];

const Kanban: React.FC = () => {
    const { id: projectId } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { user } = useAuth();

    const [features, setFeatures] = useState<Feature[]>([]);
    const [loading, setLoading] = useState(true);
    const [projectName, setProjectName] = useState('');
    const [showModal, setShowModal] = useState(false);
    const [newFeature, setNewFeature] = useState({ name: '', description: '', priority: 'medium' as any });
    const [editingFeature, setEditingFeature] = useState<Feature | null>(null);
    const [showEditModal, setShowEditModal] = useState(false);

    useEffect(() => {
        if (projectId) {
            loadData();
        }
    }, [projectId]);

    const loadData = async () => {
        try {
            setLoading(true);
            const [featRes, projRes] = await Promise.all([
                api.get(`/features/project/${projectId}`),
                api.get(`/projects/${projectId}`)
            ]);

            if (featRes.data.success) setFeatures(featRes.data.data);
            if (projRes.data.success) setProjectName(projRes.data.data.name);
        } catch (error) {
            console.error('Failed to load Kanban data:', error);
        } finally {
            setLoading(false);
        }
    };

    const onDragEnd = async (result: DropResult) => {
        const { destination, source, draggableId } = result;

        if (!destination) return;
        if (destination.droppableId === source.droppableId && destination.index === source.index) return;

        // Optimistic update
        const updatedFeatures = features.map(f =>
            f.id === draggableId ? { ...f, status: destination.droppableId } : f
        );
        setFeatures(updatedFeatures);

        try {
            await api.patch(`/features/${draggableId}/status`, { status: destination.droppableId });
        } catch (error) {
            console.error('Failed to update status:', error);
            loadData(); // Revert on failure
        }
    };

    const handleAddFeature = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const response = await api.post('/features', {
                ...newFeature,
                projectId,
                status: 'planned'
            });
            if (response.data.success) {
                setShowModal(false);
                setNewFeature({ name: '', description: '', priority: 'medium' });
                loadData();
            }
        } catch (error) {
            console.error('Failed to add feature:', error);
        }
    };

    const handleEditFeature = (feature: Feature) => {
        setEditingFeature(feature);
        setShowEditModal(true);
    };

    const handleSaveEdit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingFeature) return;

        try {
            const response = await api.put(`/features/${editingFeature.id}`, {
                name: editingFeature.name,
                description: editingFeature.description,
                priority: editingFeature.priority,
                effort: editingFeature.effort,
            });
            if (response.data.success) {
                setShowEditModal(false);
                setEditingFeature(null);
                loadData();
            }
        } catch (error) {
            console.error('Failed to update feature:', error);
        }
    };

    const getPriorityColor = (p: string) => {
        switch (p) {
            case 'critical': return 'bg-red-500 text-white';
            case 'high': return 'bg-orange-400 text-white';
            case 'medium': return 'bg-blue-400 text-white';
            default: return 'bg-gray-400 text-white';
        }
    };

    if (loading && features.length === 0) {
        return (
            <div className="flex justify-center items-center h-[calc(100vh-64px)]">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    return (
        <div className="h-[calc(100vh-64px)] overflow-hidden flex flex-col bg-terminal-bg">
            <div className="px-8 py-6 flex justify-between items-center bg-terminal-surface border-b border-terminal-border shadow-terminal-glow">
                <div>
                    <button onClick={() => navigate(`/projects/${projectId}`)} className="text-terminal-muted hover:text-terminal-secondary text-sm mb-1 font-mono">← PROJEKT DETAILS</button>
                    <h1 className="text-2xl font-black text-terminal-primary flex items-center gap-3 font-mono text-glow">
                        <span className="bg-terminal-primary text-terminal-bg px-3 py-1 text-sm">[ KANBAN ]</span>
                        {projectName}
                    </h1>
                </div>
                <button
                    onClick={() => setShowModal(true)}
                    className="btn-terminal"
                >
                    [ + FEATURE HINZUFÜGEN ]
                </button>
            </div>

            <div className="flex-1 p-8 overflow-x-auto">
                <DragDropContext onDragEnd={onDragEnd}>
                    <div className="flex gap-6 h-full min-w-max pb-4">
                        {COLUMNS.map((col) => (
                            <div key={col.id} className="w-80 flex flex-col h-full group">
                                <div className="flex items-center justify-between mb-4 px-2">
                                    <div className="flex items-center gap-3">
                                        <span className="text-xl">{col.icon}</span>
                                        <h2 className="font-bold text-terminal-primary uppercase tracking-widest text-xs font-mono">[ {col.title} ]</h2>
                                        <span className="bg-terminal-border text-terminal-primary px-2 py-0.5 border border-terminal-primary text-[10px] font-black font-mono">
                                            {features.filter(f => f.status === col.id).length}
                                        </span>
                                    </div>
                                </div>

                                <Droppable droppableId={col.id}>
                                    {(provided, snapshot) => (
                                        <div
                                            {...provided.droppableProps}
                                            ref={provided.innerRef}
                                            className={`flex-1 p-4 transition-all border-2 ${snapshot.isDraggingOver ? 'bg-terminal-surface border-terminal-primary' : 'bg-terminal-surface/50 border-terminal-border'}`}
                                        >
                                            <div className="space-y-4">
                                                {features
                                                    .filter((f) => f.status === col.id)
                                                    .map((feature, index) => (
                                                        <Draggable key={feature.id} draggableId={feature.id} index={index}>
                                                            {(provided, snapshot) => (
                                                                <div
                                                                    ref={provided.innerRef}
                                                                    {...provided.draggableProps}
                                                                    {...provided.dragHandleProps}
                                                                    className={`bg-terminal-surface p-5 border border-terminal-border hover:shadow-terminal-glow hover:-translate-y-1 transition-all group ${snapshot.isDragging ? 'rotate-2 scale-105 shadow-terminal-glow-strong !bg-terminal-surface' : ''}`}
                                                                >
                                                                    <div className="flex justify-between items-start mb-3">
                                                                        <span className={`px-2 py-0.5 text-[8px] font-black uppercase tracking-wider font-mono border ${getPriorityColor(feature.priority)}`}>
                                                                            [ {feature.priority.toUpperCase()} ]
                                                                        </span>
                                                                        <div className="flex items-center gap-2">
                                                                            {feature.effort && (
                                                                                <span className="text-[10px] text-terminal-muted font-bold font-mono">⏱️ {feature.effort}h</span>
                                                                            )}
                                                                            <button
                                                                                onClick={(e) => {
                                                                                    e.stopPropagation();
                                                                                    handleEditFeature(feature);
                                                                                }}
                                                                                className="text-terminal-muted hover:text-terminal-primary transition-colors"
                                                                                title="Feature bearbeiten"
                                                                            >
                                                                                <span className="text-xs">✏️</span>
                                                                            </button>
                                                                            <button
                                                                                onClick={(e) => {
                                                                                    e.stopPropagation();
                                                                                    navigate(`/prompts/generate/feature/${feature.id}`);
                                                                                }}
                                                                                className="text-terminal-muted hover:text-terminal-accent transition-colors"
                                                                                title="AI Prompt generieren"
                                                                            >
                                                                                <span className="text-xs">🤖</span>
                                                                            </button>
                                                                            <button
                                                                                onClick={(e) => {
                                                                                    e.stopPropagation();
                                                                                    if (window.confirm('Feature löschen?')) {
                                                                                        api.delete(`/features/${feature.id}`).then(() => loadData());
                                                                                    }
                                                                                }}
                                                                                className="text-terminal-muted hover:text-terminal-danger transition-colors"
                                                                            >
                                                                                <span className="text-xs">🗑️</span>
                                                                            </button>
                                                                        </div>
                                                                    </div>
                                                                    <h3 className="font-bold text-terminal-primary group-hover:text-terminal-accent transition-colors leading-snug font-mono text-glow">
                                                                        {feature.name}
                                                                    </h3>
                                                                    <p className="text-xs text-terminal-secondary mt-2 line-clamp-2 leading-relaxed font-mono">
                                                                        {feature.description}
                                                                    </p>
                                                                    {(feature as any).assignee && (
                                                                        <div className="mt-4 flex justify-end">
                                                                            <div className="w-6 h-6 bg-terminal-primary text-terminal-bg text-[10px] flex items-center justify-center font-bold border border-terminal-primary" title={(feature as any).assignee.username}>
                                                                                {(feature as any).assignee.username.substring(0, 2).toUpperCase()}
                                                                            </div>
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            )}
                                                        </Draggable>
                                                    ))}
                                                {provided.placeholder}
                                            </div>
                                        </div>
                                    )}
                                </Droppable>
                            </div>
                        ))}
                    </div>
                </DragDropContext>
            </div>

            {/* Add Feature Modal */}
            {showModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-terminal-bg/80 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="card-terminal max-w-lg w-full shadow-terminal-glow-strong">
                        <h2 className="text-2xl font-black text-terminal-primary mb-8 font-mono section-header">NEUES FEATURE</h2>
                        <form onSubmit={handleAddFeature} className="space-y-6">
                            <div>
                                <label className="block text-xs font-black text-terminal-secondary uppercase tracking-widest mb-2 font-mono">[ TITEL ]</label>
                                <input
                                    type="text"
                                    required
                                    className="input-terminal"
                                    value={newFeature.name}
                                    onChange={(e) => setNewFeature({ ...newFeature, name: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-black text-terminal-secondary uppercase tracking-widest mb-2 font-mono">[ BESCHREIBUNG ]</label>
                                <textarea
                                    className="input-terminal resize-none"
                                    rows={3}
                                    value={newFeature.description}
                                    onChange={(e) => setNewFeature({ ...newFeature, description: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-black text-terminal-secondary uppercase tracking-widest mb-2 font-mono">[ PRIORITÄT ]</label>
                                <select
                                    className="input-terminal appearance-none"
                                    value={newFeature.priority}
                                    onChange={(e) => setNewFeature({ ...newFeature, priority: e.target.value as any })}
                                >
                                    <option value="low">Niedrig</option>
                                    <option value="medium">Mittel</option>
                                    <option value="high">Hoch</option>
                                    <option value="critical">Kritisch</option>
                                </select>
                            </div>
                            <div className="flex gap-4 pt-4">
                                <button
                                    type="button"
                                    onClick={() => setShowModal(false)}
                                    className="btn-terminal flex-1"
                                >
                                    [ ABBRECHEN ]
                                </button>
                                <button
                                    type="submit"
                                    className="btn-terminal flex-1"
                                >
                                    [ ANLEGEN ]
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Edit Feature Modal */}
            {showEditModal && editingFeature && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-terminal-bg/80 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="card-terminal max-w-lg w-full shadow-terminal-glow-strong">
                        <h2 className="text-2xl font-black text-terminal-primary mb-8 font-mono section-header">FEATURE BEARBEITEN</h2>
                        <form onSubmit={handleSaveEdit} className="space-y-6">
                            <div>
                                <label className="block text-xs font-black text-terminal-secondary uppercase tracking-widest mb-2 font-mono">[ TITEL ]</label>
                                <input
                                    type="text"
                                    required
                                    className="input-terminal"
                                    value={editingFeature.name}
                                    onChange={(e) => setEditingFeature({ ...editingFeature, name: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-black text-terminal-secondary uppercase tracking-widest mb-2 font-mono">[ BESCHREIBUNG ]</label>
                                <textarea
                                    className="input-terminal resize-none"
                                    rows={3}
                                    value={editingFeature.description}
                                    onChange={(e) => setEditingFeature({ ...editingFeature, description: e.target.value })}
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-black text-terminal-secondary uppercase tracking-widest mb-2 font-mono">[ PRIORITÄT ]</label>
                                    <select
                                        className="input-terminal appearance-none"
                                        value={editingFeature.priority}
                                        onChange={(e) => setEditingFeature({ ...editingFeature, priority: e.target.value as any })}
                                    >
                                        <option value="low">Niedrig</option>
                                        <option value="medium">Mittel</option>
                                        <option value="high">Hoch</option>
                                        <option value="critical">Kritisch</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-black text-terminal-secondary uppercase tracking-widest mb-2 font-mono">[ AUFWAND (H) ]</label>
                                    <input
                                        type="number"
                                        min="0"
                                        step="0.5"
                                        className="input-terminal"
                                        value={editingFeature.effort || ''}
                                        onChange={(e) => setEditingFeature({ ...editingFeature, effort: e.target.value ? parseFloat(e.target.value) : undefined })}
                                    />
                                </div>
                            </div>
                            <div className="flex gap-4 pt-4">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setShowEditModal(false);
                                        setEditingFeature(null);
                                    }}
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

export default Kanban;
