import React, { useState, useEffect } from 'react';
import { API_BASE_URL } from '../../config';
import { CheckCircle2, Plus, XCircle } from 'lucide-react';

interface CreateTestModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

const TARGET_TYPES = ['ALL', 'BATCH', 'COMPANY'];

const CreateTestModal: React.FC<CreateTestModalProps> = ({ isOpen, onClose, onSuccess }) => {
    const [newTest, setNewTest] = useState({
        name: '',
        test_type: '',
        description: '',
        scheduled_date: '',
        location: '',
        target_type: 'ALL',
        target_value: '',
        instructor: '',
        max_marks: 100,
        passing_marks: 50
    });

    const [availableTestTypes, setAvailableTestTypes] = useState<string[]>([]);
    const [isTestTypeDropdownOpen, setIsTestTypeDropdownOpen] = useState(false);
    const [batches, setBatches] = useState<string[]>([]);
    const [companies, setCompanies] = useState<string[]>([]);

    const token = localStorage.getItem('token');

    const fetchBatchesCompanies = async () => {
        try {
            const res = await fetch(`${API_BASE_URL}/api/broadcast-lists`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                setBatches(data.batches || []);
                setCompanies(data.companies || []);
            }
        } catch (e) { console.error(e); }
    };

    const fetchTestTypes = async () => {
        try {
            const res = await fetch(`${API_BASE_URL}/api/tests/types`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                setAvailableTestTypes(Array.from(new Set(['CUSTOM', ...data])));
            }
        } catch (e) {
            console.error(e);
            setAvailableTestTypes(['CUSTOM']);
        }
    };

    useEffect(() => {
        if (isOpen) {
            fetchBatchesCompanies();
            fetchTestTypes();
        }
    }, [isOpen]);

    const [error, setError] = useState('');
    const [submitting, setSubmitting] = useState(false);

    const handleCreateTest = async () => {
        setError('');
        setSubmitting(true);
        try {
            const res = await fetch(`${API_BASE_URL}/api/tests`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({
                    ...newTest,
                    scheduled_date: new Date(newTest.scheduled_date).toISOString(),
                    target_value: newTest.target_type === 'ALL' ? null : newTest.target_value
                })
            });

            if (res.ok) {
                setNewTest({
                    name: '', test_type: 'PFT', description: '', scheduled_date: '', location: '',
                    target_type: 'ALL', target_value: '', instructor: '', max_marks: 100, passing_marks: 50
                });
                onSuccess();
                onClose();
            } else {
                const errData = await res.json();
                setError(errData.detail || 'Failed to schedule test');
            }
        } catch (e) {
            console.error(e);
            setError('Network error occurred');
        } finally {
            setSubmitting(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
            <div className="bg-stone-900 border border-stone-700 rounded-2xl w-full max-w-lg shadow-2xl max-h-[90vh] overflow-y-auto">
                <div className="p-6 border-b border-white/10 flex justify-between items-center bg-stone-900/50 sticky top-0 backdrop-blur-md z-10">
                    <h3 className="text-xl font-bold text-white flex items-center gap-2">
                        <Plus className="text-amber-500" /> Schedule New Test
                    </h3>
                    <button onClick={onClose} className="text-stone-500 hover:text-white transition-colors">
                        <XCircle size={24} />
                    </button>
                </div>
                <div className="p-8 space-y-6">
                    {error && (
                        <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-500 text-sm font-bold flex items-center gap-2">
                            <XCircle size={16} /> {error}
                        </div>
                    )}
                    <div>
                        <label className="block text-stone-400 text-xs font-bold uppercase tracking-wider mb-2">Test Name <span className="text-red-500">*</span></label>
                        <input
                            type="text"
                            value={newTest.name}
                            onChange={e => setNewTest({ ...newTest, name: e.target.value })}
                            className="w-full px-4 py-3 bg-stone-950 border border-stone-800 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500 transition-all placeholder:text-stone-700"
                            placeholder="e.g., Annual PFT 2026"
                        />
                    </div>
                    <div className="grid grid-cols-2 gap-6">
                        <div>
                            <label className="block text-stone-400 text-xs font-bold uppercase tracking-wider mb-2">Test Type <span className="text-red-500">*</span></label>
                            <div className="relative">
                                <input
                                    type="text"
                                    value={newTest.test_type}
                                    onChange={e => {
                                        setNewTest({ ...newTest, test_type: e.target.value });
                                        setIsTestTypeDropdownOpen(true);
                                    }}
                                    onFocus={() => setIsTestTypeDropdownOpen(true)}
                                    placeholder="Select or type..."
                                    className="w-full px-4 py-3 bg-stone-950 border border-stone-800 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500 transition-all placeholder:text-stone-700"
                                />
                                {isTestTypeDropdownOpen && (
                                    <>
                                        <div className="fixed inset-0 z-10" onClick={() => setIsTestTypeDropdownOpen(false)}></div>
                                        <div className="absolute top-full left-0 w-full mt-1 bg-stone-900 border border-stone-700 rounded-xl max-h-48 overflow-y-auto z-20 shadow-xl">
                                            {availableTestTypes.filter(t => t.toLowerCase().includes(newTest.test_type.toLowerCase())).map(t => (
                                                <button
                                                    key={t}
                                                    onClick={() => {
                                                        setNewTest({ ...newTest, test_type: t });
                                                        setIsTestTypeDropdownOpen(false);
                                                    }}
                                                    className="w-full text-left px-4 py-2 hover:bg-stone-800 text-stone-300 hover:text-white transition-colors flex items-center justify-between group"
                                                >
                                                    <span>{t}</span>
                                                    {t === newTest.test_type && <CheckCircle2 size={14} className="text-emerald-500" />}
                                                </button>
                                            ))}
                                            {newTest.test_type && !availableTestTypes.some(t => t.toLowerCase() === newTest.test_type.toLowerCase()) && (
                                                <button
                                                    onClick={() => setIsTestTypeDropdownOpen(false)}
                                                    className="w-full text-left px-4 py-2 text-stone-500 text-xs border-t border-white/5 italic flex items-center gap-2 hover:bg-stone-800 transition-colors"
                                                >
                                                    <Plus size={12} className="text-amber-500" />
                                                    Creating new type: <span className="text-amber-500 font-bold">"{newTest.test_type}"</span>
                                                </button>
                                            )}
                                        </div>
                                    </>
                                )}
                                <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-stone-500">▼</div>
                            </div>
                        </div>
                        <div>
                            <label className="block text-stone-400 text-xs font-bold uppercase tracking-wider mb-2">Date & Time <span className="text-red-500">*</span></label>
                            <input
                                type="datetime-local"
                                value={newTest.scheduled_date}
                                onChange={e => setNewTest({ ...newTest, scheduled_date: e.target.value })}
                                className="w-full px-4 py-3 bg-stone-950 border border-stone-800 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500 transition-all custom-calendar-icon"
                            />
                        </div>
                    </div>
                    <div>
                        <label className="block text-stone-400 text-xs font-bold uppercase tracking-wider mb-2">Location</label>
                        <input
                            type="text"
                            value={newTest.location}
                            onChange={e => setNewTest({ ...newTest, location: e.target.value })}
                            className="w-full px-4 py-3 bg-stone-950 border border-stone-800 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500 transition-all placeholder:text-stone-700"
                            placeholder="e.g., Parade Ground (Optional)"
                        />
                    </div>

                    <div className="p-4 bg-stone-950/50 rounded-xl border border-stone-800/50">
                        <label className="block text-stone-400 text-xs font-bold uppercase tracking-wider mb-3">Assign To <span className="text-red-500">*</span></label>
                        <div className="flex gap-2 mb-4">
                            {TARGET_TYPES.map(t => (
                                <button
                                    key={t}
                                    onClick={() => setNewTest({ ...newTest, target_type: t, target_value: '' })}
                                    className={`flex-1 py-2 rounded-lg font-bold text-xs transition-all ${newTest.target_type === t
                                        ? 'bg-amber-500 text-stone-950 shadow-lg shadow-amber-500/20'
                                        : 'bg-stone-800 text-stone-500 hover:bg-stone-700'
                                        }`}
                                >
                                    {t === 'ALL' ? 'ALL' : t}
                                </button>
                            ))}
                        </div>

                        {newTest.target_type !== 'ALL' && (
                            <div className="animate-in fade-in slide-in-from-top-2">
                                <select
                                    value={newTest.target_value}
                                    onChange={e => setNewTest({ ...newTest, target_value: e.target.value })}
                                    className="w-full px-4 py-3 bg-stone-900 border border-stone-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-amber-500/50"
                                >
                                    <option value="">Select {newTest.target_type === 'BATCH' ? 'Batch' : 'Company'}</option>
                                    {newTest.target_type === 'BATCH'
                                        ? batches.map(b => <option key={b} value={b}>{b}</option>)
                                        : companies.map(c => <option key={c} value={c}>{c}</option>)
                                    }
                                </select>
                            </div>
                        )}
                    </div>

                    <div className="grid grid-cols-2 gap-6">
                        <div>
                            <label className="block text-stone-400 text-xs font-bold uppercase tracking-wider mb-2">Max Marks</label>
                            <input
                                type="number"
                                value={newTest.max_marks}
                                onChange={e => setNewTest({ ...newTest, max_marks: parseFloat(e.target.value) })}
                                className="w-full px-4 py-3 bg-stone-950 border border-stone-800 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500 transition-all text-center font-mono"
                            />
                        </div>
                        <div>
                            <label className="block text-stone-400 text-xs font-bold uppercase tracking-wider mb-2">Passing Marks</label>
                            <input
                                type="number"
                                value={newTest.passing_marks}
                                onChange={e => setNewTest({ ...newTest, passing_marks: parseFloat(e.target.value) })}
                                className="w-full px-4 py-3 bg-stone-950 border border-stone-800 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500 transition-all text-center font-mono"
                            />
                        </div>
                    </div>
                    <div>
                        <label className="block text-stone-400 text-xs font-bold uppercase tracking-wider mb-2">Instructor</label>
                        <input
                            type="text"
                            value={newTest.instructor}
                            onChange={e => setNewTest({ ...newTest, instructor: e.target.value })}
                            className="w-full px-4 py-3 bg-stone-950 border border-stone-800 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500 transition-all placeholder:text-stone-700"
                            placeholder="Name of conducting officer"
                        />
                    </div>
                </div>
                <div className="p-6 border-t border-white/10 flex justify-end gap-3 bg-stone-900/50 sticky bottom-0 backdrop-blur-md">
                    <button onClick={onClose} className="px-6 py-3 rounded-xl bg-stone-800 text-stone-400 font-bold hover:bg-stone-700 transition-colors">Cancel</button>
                    <button
                        onClick={handleCreateTest}
                        disabled={!newTest.name || !newTest.scheduled_date || !newTest.test_type || submitting}
                        className="px-8 py-3 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 text-white font-bold shadow-lg shadow-amber-500/20 hover:scale-105 transition-transform disabled:opacity-50 disabled:hover:scale-100 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                        {submitting ? 'Scheduling...' : 'Schedule Test'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default CreateTestModal;
