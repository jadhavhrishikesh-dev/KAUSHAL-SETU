import React, { useState, useEffect } from 'react';
import { API_BASE_URL } from '../config';
import { Calendar, Plus, User, FileText, CheckCircle, XCircle, Clock, ChevronRight, Award, TrendingUp, MessageSquare, Target } from 'lucide-react';

interface CounsellingSession {
    id: number;
    agniveer_id: number;
    officer_id: number;
    scheduled_date: string;
    batch_group?: string;
    topic?: string;
    status: 'SCHEDULED' | 'COMPLETED' | 'CANCELLED' | 'NO_SHOW';
    notes?: string;
    action_items?: string;
    created_at: string;
    completed_at?: string;
    agniveer_name?: string;
    agniveer_service_id?: string;
}

interface PerformanceSheet {
    agniveer: {
        id: number;
        name: string;
        service_id: string;
        batch_no: string;
        company: string;
        rank: string;
        photo_url?: string;
    };
    rri?: {
        score: number;
        band: string;
        technical_component: number;
        behavioral_component: number;
        achievement_component: number;
    };
    technical_assessment?: {
        firing: number;
        weapon_handling: number;
        tactical: number;
        cognitive: number;
        date: string;
    };
    behavioral_assessments: any[];
    achievements: any[];
    past_counselling: any[];
}

interface Props {
    companyName: string;
    batches: string[];
    agniveers: { id: number; name: string; service_id: string }[];
}

const CounsellingModule: React.FC<Props> = ({ companyName, batches, agniveers }) => {
    const [sessions, setSessions] = useState<CounsellingSession[]>([]);
    const [loading, setLoading] = useState(true);
    const [showScheduleModal, setShowScheduleModal] = useState(false);
    const [selectedSession, setSelectedSession] = useState<CounsellingSession | null>(null);
    const [performanceSheet, setPerformanceSheet] = useState<PerformanceSheet | null>(null);
    const [sessionNotes, setSessionNotes] = useState('');
    const [actionItems, setActionItems] = useState('');
    const [successMessage, setSuccessMessage] = useState('');

    // Schedule form
    const [scheduleType, setScheduleType] = useState<'INDIVIDUAL' | 'BATCH'>('INDIVIDUAL');
    const [selectedAgniveer, setSelectedAgniveer] = useState<number | null>(null);
    const [selectedBatch, setSelectedBatch] = useState('');
    const [scheduledDate, setScheduledDate] = useState('');
    const [topic, setTopic] = useState('');

    const token = localStorage.getItem('token');

    const fetchSessions = async () => {
        setLoading(true);
        try {
            const res = await fetch(`${API_BASE_URL}/api/counselling/company/${companyName}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (res.ok) {
                setSessions(await res.json());
            }
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (companyName) fetchSessions();
    }, [companyName]);

    const handleSchedule = async () => {
        try {
            const body: any = {
                scheduled_date: new Date(scheduledDate).toISOString(),
                topic: topic || null
            };
            if (scheduleType === 'BATCH') {
                body.batch_name = selectedBatch;
            } else {
                body.agniveer_id = selectedAgniveer;
            }

            const res = await fetch(`${API_BASE_URL}/api/counselling`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify(body)
            });

            if (res.ok) {
                setSuccessMessage('Counselling session(s) scheduled!');
                setShowScheduleModal(false);
                setScheduledDate('');
                setTopic('');
                setSelectedAgniveer(null);
                setSelectedBatch('');
                fetchSessions();
                setTimeout(() => setSuccessMessage(''), 3000);
            }
        } catch (e) {
            console.error(e);
        }
    };

    const openSessionConduct = async (session: CounsellingSession) => {
        setSelectedSession(session);
        setSessionNotes(session.notes || '');
        setActionItems(session.action_items || '');

        // Fetch performance sheet
        try {
            const res = await fetch(`${API_BASE_URL}/api/counselling/${session.id}/performance-sheet`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (res.ok) {
                setPerformanceSheet(await res.json());
            }
        } catch (e) {
            console.error(e);
        }
    };

    const completeSession = async () => {
        if (!selectedSession) return;
        try {
            const res = await fetch(`${API_BASE_URL}/api/counselling/${selectedSession.id}/complete`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify({
                    notes: sessionNotes,
                    action_items: actionItems,
                    status: 'COMPLETED'
                })
            });

            if (res.ok) {
                setSuccessMessage('Session completed and notes saved!');
                setSelectedSession(null);
                setPerformanceSheet(null);
                fetchSessions();
                setTimeout(() => setSuccessMessage(''), 3000);
            }
        } catch (e) {
            console.error(e);
        }
    };

    const getBandColor = (band?: string) => {
        if (band === 'GREEN') return 'bg-emerald-500';
        if (band === 'AMBER') return 'bg-amber-500';
        if (band === 'RED') return 'bg-red-500';
        return 'bg-stone-500';
    };

    // If conducting a session, show the split view
    if (selectedSession && performanceSheet) {
        return (
            <div className="animate-in fade-in duration-300">
                {/* Header */}
                <div className="flex justify-between items-center mb-6">
                    <div className="flex items-center gap-4">
                        <button onClick={() => { setSelectedSession(null); setPerformanceSheet(null); }} className="text-stone-400 hover:text-white">
                            ← Back to Schedule
                        </button>
                        <h2 className="text-2xl font-bold text-white">Counselling Session</h2>
                    </div>
                    <div className="text-stone-400">
                        {new Date(selectedSession.scheduled_date).toLocaleDateString()}
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Left: Performance Sheet */}
                    <div className="bg-stone-900/60 border border-white/5 rounded-2xl p-6 space-y-6 max-h-[75vh] overflow-y-auto">
                        {/* Agniveer Info */}
                        <div className="flex items-center gap-4 pb-4 border-b border-white/10">
                            <div className="w-16 h-16 bg-stone-800 rounded-full flex items-center justify-center text-2xl font-bold text-amber-500">
                                {performanceSheet.agniveer.name.charAt(0)}
                            </div>
                            <div>
                                <h3 className="text-xl font-bold text-white">{performanceSheet.agniveer.name}</h3>
                                <p className="text-stone-400 font-mono">{performanceSheet.agniveer.service_id}</p>
                                <p className="text-stone-500 text-sm">{performanceSheet.agniveer.batch_no} • {performanceSheet.agniveer.company}</p>
                            </div>
                        </div>

                        {/* RRI Score */}
                        {performanceSheet.rri && (
                            <div className="flex items-center gap-4 p-4 bg-stone-800/50 rounded-xl">
                                <div className={`w-16 h-16 rounded-full ${getBandColor(performanceSheet.rri.band)} flex items-center justify-center text-white font-bold text-xl`}>
                                    {performanceSheet.rri.score.toFixed(0)}
                                </div>
                                <div>
                                    <p className="text-stone-400 text-sm">RRI Score</p>
                                    <p className={`font-bold ${performanceSheet.rri.band === 'GREEN' ? 'text-emerald-400' : performanceSheet.rri.band === 'AMBER' ? 'text-amber-400' : 'text-red-400'}`}>
                                        {performanceSheet.rri.band} Band
                                    </p>
                                </div>
                                <div className="ml-auto grid grid-cols-3 gap-3 text-center">
                                    <div>
                                        <p className="text-xs text-stone-500">Tech</p>
                                        <p className="text-white font-bold">{performanceSheet.rri.technical_component?.toFixed(0) || '-'}</p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-stone-500">Behav</p>
                                        <p className="text-white font-bold">{performanceSheet.rri.behavioral_component?.toFixed(0) || '-'}</p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-stone-500">Achieve</p>
                                        <p className="text-white font-bold">{performanceSheet.rri.achievement_component?.toFixed(0) || '-'}</p>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Technical Assessment */}
                        {performanceSheet.technical_assessment && (
                            <div>
                                <h4 className="text-sm font-bold text-stone-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                                    <Target size={14} /> Technical Assessment
                                </h4>
                                <div className="grid grid-cols-4 gap-3">
                                    {['firing', 'weapon_handling', 'tactical', 'cognitive'].map(key => (
                                        <div key={key} className="bg-stone-800/50 p-3 rounded-lg text-center">
                                            <p className="text-xs text-stone-500 capitalize">{key.replace('_', ' ')}</p>
                                            <p className="text-white font-bold text-lg">{(performanceSheet.technical_assessment as any)[key] || '-'}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Achievements */}
                        {performanceSheet.achievements.length > 0 && (
                            <div>
                                <h4 className="text-sm font-bold text-stone-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                                    <Award size={14} /> Achievements ({performanceSheet.achievements.length})
                                </h4>
                                <div className="space-y-2">
                                    {performanceSheet.achievements.slice(0, 5).map((a, i) => (
                                        <div key={i} className="flex justify-between items-center p-2 bg-stone-800/30 rounded-lg">
                                            <span className="text-white">{a.title}</span>
                                            <span className="text-amber-400 font-bold">+{a.points}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Past Counselling */}
                        {performanceSheet.past_counselling.length > 0 && (
                            <div>
                                <h4 className="text-sm font-bold text-stone-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                                    <MessageSquare size={14} /> Previous Counselling Notes
                                </h4>
                                <div className="space-y-3">
                                    {performanceSheet.past_counselling.map((s, i) => (
                                        <div key={i} className="p-3 bg-stone-800/30 rounded-lg border-l-2 border-amber-500/50">
                                            <p className="text-xs text-stone-500 mb-1">{new Date(s.date).toLocaleDateString()} — {s.topic}</p>
                                            <p className="text-stone-300 text-sm">{s.notes}</p>
                                            {s.action_items && <p className="text-amber-400 text-xs mt-2">→ {s.action_items}</p>}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Right: Session Log */}
                    <div className="bg-stone-900/60 border border-white/5 rounded-2xl p-6 flex flex-col">
                        <h4 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                            <FileText className="text-amber-500" /> Session Log
                        </h4>

                        <div className="mb-4">
                            <label className="block text-stone-400 text-xs font-bold uppercase tracking-wider mb-2">Topic</label>
                            <div className="px-4 py-3 bg-stone-800/50 rounded-xl text-white">{selectedSession.topic || 'General Counselling'}</div>
                        </div>

                        <div className="flex-1 mb-4">
                            <label className="block text-stone-400 text-xs font-bold uppercase tracking-wider mb-2">Session Notes *</label>
                            <textarea
                                value={sessionNotes}
                                onChange={e => setSessionNotes(e.target.value)}
                                className="w-full h-48 px-4 py-3 bg-stone-950 border border-stone-800 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-amber-500/50 resize-none placeholder:text-stone-700"
                                placeholder="Enter detailed notes from the counselling session..."
                            />
                        </div>

                        <div className="mb-6">
                            <label className="block text-stone-400 text-xs font-bold uppercase tracking-wider mb-2">Action Items / Follow-up</label>
                            <textarea
                                value={actionItems}
                                onChange={e => setActionItems(e.target.value)}
                                className="w-full h-24 px-4 py-3 bg-stone-950 border border-stone-800 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-amber-500/50 resize-none placeholder:text-stone-700"
                                placeholder="Any follow-up actions for this Agniveer..."
                            />
                        </div>

                        <div className="flex gap-3">
                            <button
                                onClick={() => { setSelectedSession(null); setPerformanceSheet(null); }}
                                className="flex-1 px-6 py-3 bg-stone-800 text-stone-300 rounded-xl hover:bg-stone-700 transition-colors font-bold"
                            >
                                Save Draft
                            </button>
                            <button
                                onClick={completeSession}
                                className="flex-1 px-6 py-3 bg-gradient-to-r from-emerald-600 to-emerald-500 text-white rounded-xl hover:from-emerald-500 hover:to-emerald-400 transition-all font-bold flex items-center justify-center gap-2"
                            >
                                <CheckCircle size={18} /> Complete Session
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // Default: Schedule View
    return (
        <div className="animate-in fade-in duration-300">
            {/* Header */}
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-white flex items-center gap-3">
                    <div className="w-1 h-8 bg-amber-500 rounded-full"></div>
                    Counselling Sessions
                </h2>
                <button
                    onClick={() => setShowScheduleModal(true)}
                    className="px-6 py-3 bg-gradient-to-r from-amber-600 to-amber-500 text-white rounded-xl hover:from-amber-500 hover:to-amber-400 transition-all font-bold flex items-center gap-2 shadow-lg shadow-amber-500/20"
                >
                    <Plus size={18} /> Schedule Session
                </button>
            </div>

            {/* Success Message */}
            {successMessage && (
                <div className="mb-4 p-4 bg-emerald-500/20 border border-emerald-500/30 rounded-xl text-emerald-400 font-bold animate-in slide-in-from-top">
                    {successMessage}
                </div>
            )}

            {/* Sessions List */}
            {loading ? (
                <div className="flex items-center justify-center py-20 text-stone-500">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-500"></div>
                </div>
            ) : sessions.length === 0 ? (
                <div className="text-center py-20 bg-stone-800/20 rounded-2xl border border-stone-800 border-dashed">
                    <Calendar className="mx-auto text-stone-600 mb-4" size={48} />
                    <p className="text-stone-400">No counselling sessions scheduled</p>
                    <button onClick={() => setShowScheduleModal(true)} className="mt-4 text-amber-400 hover:text-amber-300 font-bold">
                        + Schedule First Session
                    </button>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {sessions.map(s => (
                        <div
                            key={s.id}
                            onClick={() => s.status === 'SCHEDULED' && openSessionConduct(s)}
                            className={`p-5 bg-stone-900/60 border border-white/5 rounded-2xl ${s.status === 'SCHEDULED' ? 'cursor-pointer hover:border-amber-500/50 hover:-translate-y-1' : ''} transition-all duration-300`}
                        >
                            <div className="flex justify-between items-start mb-3">
                                <div>
                                    <p className="text-white font-bold">{s.agniveer_name}</p>
                                    <p className="text-stone-500 text-sm font-mono">{s.agniveer_service_id}</p>
                                </div>
                                <span className={`px-2 py-1 rounded-full text-xs font-bold ${s.status === 'SCHEDULED' ? 'bg-blue-500/20 text-blue-400' :
                                        s.status === 'COMPLETED' ? 'bg-emerald-500/20 text-emerald-400' :
                                            'bg-stone-500/20 text-stone-400'
                                    }`}>
                                    {s.status}
                                </span>
                            </div>
                            <div className="flex items-center gap-2 text-stone-400 text-sm mb-2">
                                <Clock size={14} />
                                {new Date(s.scheduled_date).toLocaleDateString()}
                            </div>
                            {s.topic && <p className="text-stone-500 text-sm truncate">{s.topic}</p>}
                            {s.batch_group && <p className="text-amber-500/70 text-xs mt-1">Batch: {s.batch_group}</p>}
                            {s.status === 'SCHEDULED' && (
                                <div className="mt-3 flex items-center gap-1 text-amber-400 text-sm font-bold">
                                    Conduct Session <ChevronRight size={16} />
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}

            {/* Schedule Modal */}
            {showScheduleModal && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-stone-900 border border-stone-700 rounded-2xl w-full max-w-md shadow-2xl">
                        <div className="p-6 border-b border-white/10 flex justify-between items-center">
                            <h3 className="text-xl font-bold text-white flex items-center gap-2">
                                <Calendar className="text-amber-500" /> Schedule Counselling
                            </h3>
                            <button onClick={() => setShowScheduleModal(false)} className="text-stone-500 hover:text-white">
                                <XCircle size={24} />
                            </button>
                        </div>
                        <div className="p-6 space-y-4">
                            {/* Type Toggle */}
                            <div className="flex gap-2">
                                <button
                                    onClick={() => setScheduleType('INDIVIDUAL')}
                                    className={`flex-1 py-2 rounded-lg font-bold text-sm transition-all ${scheduleType === 'INDIVIDUAL' ? 'bg-amber-500 text-white' : 'bg-stone-800 text-stone-400'}`}
                                >
                                    Individual
                                </button>
                                <button
                                    onClick={() => setScheduleType('BATCH')}
                                    className={`flex-1 py-2 rounded-lg font-bold text-sm transition-all ${scheduleType === 'BATCH' ? 'bg-amber-500 text-white' : 'bg-stone-800 text-stone-400'}`}
                                >
                                    Batch
                                </button>
                            </div>

                            {/* Agniveer / Batch Select */}
                            {scheduleType === 'INDIVIDUAL' ? (
                                <div>
                                    <label className="block text-stone-400 text-xs font-bold uppercase tracking-wider mb-2">Select Agniveer</label>
                                    <select
                                        value={selectedAgniveer || ''}
                                        onChange={e => setSelectedAgniveer(parseInt(e.target.value))}
                                        className="w-full px-4 py-3 bg-stone-950 border border-stone-800 rounded-xl text-white"
                                    >
                                        <option value="">Choose Agniveer...</option>
                                        {agniveers.map(a => (
                                            <option key={a.id} value={a.id}>{a.name} ({a.service_id})</option>
                                        ))}
                                    </select>
                                </div>
                            ) : (
                                <div>
                                    <label className="block text-stone-400 text-xs font-bold uppercase tracking-wider mb-2">Select Batch</label>
                                    <select
                                        value={selectedBatch}
                                        onChange={e => setSelectedBatch(e.target.value)}
                                        className="w-full px-4 py-3 bg-stone-950 border border-stone-800 rounded-xl text-white"
                                    >
                                        <option value="">Choose Batch...</option>
                                        {batches.map(b => (
                                            <option key={b} value={b}>{b}</option>
                                        ))}
                                    </select>
                                </div>
                            )}

                            {/* Date */}
                            <div>
                                <label className="block text-stone-400 text-xs font-bold uppercase tracking-wider mb-2">Date & Time</label>
                                <input
                                    type="datetime-local"
                                    value={scheduledDate}
                                    onChange={e => setScheduledDate(e.target.value)}
                                    className="w-full px-4 py-3 bg-stone-950 border border-stone-800 rounded-xl text-white"
                                />
                            </div>

                            {/* Topic */}
                            <div>
                                <label className="block text-stone-400 text-xs font-bold uppercase tracking-wider mb-2">Topic (Optional)</label>
                                <input
                                    type="text"
                                    value={topic}
                                    onChange={e => setTopic(e.target.value)}
                                    className="w-full px-4 py-3 bg-stone-950 border border-stone-800 rounded-xl text-white placeholder:text-stone-700"
                                    placeholder="e.g., Quarterly Review, Career Guidance"
                                />
                            </div>

                            <button
                                onClick={handleSchedule}
                                disabled={!scheduledDate || (scheduleType === 'INDIVIDUAL' ? !selectedAgniveer : !selectedBatch)}
                                className="w-full py-3 bg-gradient-to-r from-amber-600 to-amber-500 text-white rounded-xl font-bold disabled:opacity-50 disabled:cursor-not-allowed hover:from-amber-500 hover:to-amber-400 transition-all"
                            >
                                Schedule {scheduleType === 'BATCH' ? 'Batch Sessions' : 'Session'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default CounsellingModule;
