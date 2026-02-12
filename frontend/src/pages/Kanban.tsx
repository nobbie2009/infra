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
        <div className="h-[calc(100vh-64px)] overflow-hidden flex flex-col bg-gray-50/50">
            <div className="px-8 py-6 flex justify-between items-center bg-white border-b border-gray-100 shadow-sm">
                <div>
                    <button onClick={() => navigate(`/projects/${projectId}`)} className="text-gray-400 hover:text-gray-600 text-sm mb-1">← Projekt Details</button>
                    <h1 className="text-2xl font-black text-gray-900 flex items-center gap-3">
                        <span className="bg-blue-600 text-white px-3 py-1 rounded-lg text-sm">KANBAN</span>
                        {projectName}
                    </h1>
                </div>
                <button
                    onClick={() => setShowModal(true)}
                    className="bg-gray-900 text-white px-6 py-2.5 rounded-xl font-bold hover:bg-black transition-all shadow-lg active:scale-95"
                >
                    + Feature hinzufügen
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
                                        <h2 className="font-bold text-gray-600 uppercase tracking-widest text-xs">{col.title}</h2>
                                        <span className="bg-gray-200 text-gray-500 px-2 py-0.5 rounded-full text-[10px] font-black">
                                            {features.filter(f => f.status === col.id).length}
                                        </span>
                                    </div>
                                </div>

                                <Droppable droppableId={col.id}>
                                    {(provided, snapshot) => (
                                        <div
                                            {...provided.droppableProps}
                                            ref={provided.innerRef}
                                            className={`flex-1 rounded-[2rem] p-4 transition-all border-2 border-transparent ${snapshot.isDraggingOver ? 'bg-blue-100/50 border-blue-200' : 'bg-gray-100/30'}`}
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
                                                                    className={`bg-white p-5 rounded-2xl shadow-sm border border-gray-100 hover:shadow-xl hover:-translate-y-1 transition-all group ${snapshot.isDragging ? 'rotate-2 scale-105 shadow-2xl !bg-white' : ''}`}
                                                                >
                                                                    <div className="flex justify-between items-start mb-3">
                                                                        <span className={`px-2 py-0.5 rounded-md text-[8px] font-black uppercase tracking-wider ${getPriorityColor(feature.priority)}`}>
                                                                            {feature.priority}
                                                                        </span>
                                                                        <div className="flex items-center gap-2">
                                                                            {feature.effort && (
                                                                                <span className="text-[10px] text-gray-400 font-bold">⏱️ {feature.effort}h</span>
                                                                            )}
                                                                            <button
                                                                                onClick={(e) => {
                                                                                    e.stopPropagation();
                                                                                    if (window.confirm('Feature löschen?')) {
                                                                                        api.delete(`/features/${feature.id}`).then(() => loadData());
                                                                                    }
                                                                                }}
                                                                                className="text-gray-300 hover:text-red-500 transition-colors"
                                                                            >
                                                                                <span className="text-xs">🗑️</span>
                                                                            </button>
                                                                        </div>
                                                                    </div>
                                                                    <h3 className="font-bold text-gray-900 group-hover:text-blue-600 transition-colors leading-snug">
                                                                        {feature.name}
                                                                    </h3>
                                                                    <p className="text-xs text-gray-500 mt-2 line-clamp-2 leading-relaxed">
                                                                        {feature.description}
                                                                    </p>
                                                                    {(feature as any).assignee && (
                                                                        <div className="mt-4 flex justify-end">
                                                                            <div className="w-6 h-6 rounded-full bg-blue-600 text-[10px] flex items-center justify-center text-white font-bold ring-2 ring-white" title={(feature as any).assignee.username}>
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
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white rounded-[2.5rem] p-10 max-w-lg w-full shadow-2xl border border-white/20">
                        <h2 className="text-2xl font-black text-gray-900 mb-8">Neues Feature</h2>
                        <form onSubmit={handleAddFeature} className="space-y-6">
                            <div>
                                <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">Titel</label>
                                <input
                                    type="text"
                                    required
                                    className="w-full px-5 py-4 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-4 focus:ring-blue-100 outline-none transition-all font-bold"
                                    value={newFeature.name}
                                    onChange={(e) => setNewFeature({ ...newFeature, name: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">Beschreibung</label>
                                <textarea
                                    className="w-full px-5 py-4 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-4 focus:ring-blue-100 outline-none transition-all resize-none"
                                    rows={3}
                                    value={newFeature.description}
                                    onChange={(e) => setNewFeature({ ...newFeature, description: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">Priorität</label>
                                <select
                                    className="w-full px-5 py-4 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-4 focus:ring-blue-100 outline-none transition-all font-bold appearance-none"
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
                                    className="flex-1 py-4 font-bold text-gray-500 hover:text-gray-700 transition-colors"
                                >
                                    Abbrechen
                                </button>
                                <button
                                    type="submit"
                                    className="flex-1 py-4 bg-blue-600 text-white rounded-2xl font-black shadow-lg shadow-blue-200 hover:bg-blue-700 transition-all active:scale-95"
                                >
                                    Feature anlegen
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
