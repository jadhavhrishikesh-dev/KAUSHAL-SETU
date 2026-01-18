import React, { useState, useEffect } from 'react';
import { User } from '../types';
import { API_BASE_URL } from '../config';
import { CalendarDays, ClipboardList, BarChart3, Plus, Users, Award, AlertTriangle, CheckCircle2, XCircle, Clock, Target } from 'lucide-react';

// Types
interface ScheduledTest {
    id: number;
    name: string;
    test_type: string;
    description?: string;
    scheduled_date: string;
    end_time?: string;
    location?: string;
    target_type: string;
    target_value?: string;
    instructor?: string;
    max_marks: number;
    passing_marks: number;
    created_at: string;
    status: string;
    results_count: number;
}

interface TestAgniveer {
    id: number;
    service_id: string;
    name: string;
    batch_no?: string;
    company?: string;
    score: number | null;
    is_absent: boolean;
    has_result: boolean;
}

const TEST_TYPES = ['PFT', 'FIRING', 'WEAPONS', 'TACTICAL', 'COGNITIVE', 'CLASSROOM', 'CUSTOM'];
const TARGET_TYPES = ['ALL', 'BATCH', 'COMPANY'];

const TrainingOfficerDashboard: React.FC<{ user: User }> = ({ user }) => {
    const [activeTab, setActiveTab] = useState<'schedule' | 'results' | 'performance'>('schedule');
    const [tests, setTests] = useState<ScheduledTest[]>([]);
    const [loading, setLoading] = useState(true);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [selectedTest, setSelectedTest] = useState<ScheduledTest | null>(null);
    const [testAgniveers, setTestAgniveers] = useState<TestAgniveer[]>([]);
    const [successMessage, setSuccessMessage] = useState('');

    // Create Test Form
    const [newTest, setNewTest] = useState({
        name: '',
        test_type: 'PFT',
        description: '',
        scheduled_date: '',
        location: '',
        target_type: 'ALL',
        target_value: '',
        instructor: '',
        max_marks: 100,
        passing_marks: 50
    });

    // Batches and Companies for dropdowns
    const [batches, setBatches] = useState<string[]>([]);
    const [companies, setCompanies] = useState<string[]>([]);

    const token = localStorage.getItem('token');

    // Fetch tests
    const fetchTests = async () => {
        setLoading(true);
        try {
            const res = await fetch(`${API_BASE_URL}/api/tests`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                setTests(data);
            }
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    // Fetch batches and companies
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
        } catch (e) {
            console.error(e);
        }
    };

    useEffect(() => {
        fetchTests();
        fetchBatchesCompanies();
    }, []);

    // Create test
    const handleCreateTest = async () => {
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
                setSuccessMessage('Test scheduled successfully!');
                setShowCreateModal(false);
                setNewTest({
                    name: '', test_type: 'PFT', description: '', scheduled_date: '', location: '',
                    target_type: 'ALL', target_value: '', instructor: '', max_marks: 100, passing_marks: 50
                });
                fetchTests();
                setTimeout(() => setSuccessMessage(''), 3000);
            }
        } catch (e) {
            console.error(e);
        }
    };

    // Fetch agniveers for a test
    const fetchTestAgniveers = async (test: ScheduledTest) => {
        setSelectedTest(test);
        try {
            const res = await fetch(`${API_BASE_URL}/api/tests/${test.id}/agniveers`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                setTestAgniveers(data);
            }
        } catch (e) {
            console.error(e);
        }
    };

    // Save result for an agniveer
    const saveResult = async (agniveerId: number, score: number | null, isAbsent: boolean) => {
        if (!selectedTest) return;
        try {
            const res = await fetch(`${API_BASE_URL}/api/tests/${selectedTest.id}/results`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({ agniveer_id: agniveerId, score, is_absent: isAbsent })
            });
            if (res.ok) {
                // Update local state
                setTestAgniveers(prev => prev.map(a =>
                    a.id === agniveerId ? { ...a, score, is_absent: isAbsent, has_result: true } : a
                ));
            }
        } catch (e) {
            console.error(e);
        }
    };

    // Stats
    const totalTests = tests.length;
    const upcomingTests = tests.filter(t => t.status === 'SCHEDULED').length;
    const completedTests = tests.filter(t => t.status === 'COMPLETED').length;
    const pendingResults = tests.reduce((acc, t) => {
        if (t.status === 'SCHEDULED') return acc + 1;
        return acc;
    }, 0);

    return (
        <div className="min-h-screen bg-gradient-to-br from-stone-950 via-stone-900 to-stone-950 p-6">
            {/* Header */}
            <div className="mb-8">
                <h1 className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-400 via-orange-400 to-yellow-500 drop-shadow-sm">
                    TRAINING COMMAND CENTER
                </h1>
                <p className="text-stone-400 mt-2 font-medium tracking-wide">
                    WELCOME, <span className="text-amber-400 font-bold uppercase">{user.full_name || 'TRAINING OFFICER'}</span>
                </p>
            </div>

            {/* Success Message */}
            {successMessage && (
                <div className="mb-6 p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-400 flex items-center gap-3 shadow-lg shadow-emerald-900/20 backdrop-blur-md animate-in fade-in slide-in-from-top-2">
                    <CheckCircle2 size={24} className="drop-shadow-[0_0_8px_rgba(52,211,153,0.5)]" />
                    <span className="font-bold tracking-wide">{successMessage}</span>
                </div>
            )}

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-10">
                {/* Total Tests */}
                <div className="relative group">
                    <div className="absolute inset-0 bg-gradient-to-r from-amber-500/20 to-orange-500/20 rounded-2xl blur-xl opacity-0 group-hover:opacity-100 transition-all duration-500"></div>
                    <div className="relative bg-stone-900/40 backdrop-blur-xl border border-white/5 rounded-2xl p-6 hover:border-amber-500/30 transition-all duration-300">
                        <div className="flex items-start justify-between">
                            <div>
                                <p className="text-stone-500 text-xs font-bold uppercase tracking-wider mb-1">Total Tests</p>
                                <p className="text-3xl font-black text-white group-hover:text-amber-400 transition-colors">{totalTests}</p>
                            </div>
                            <div className="p-3 bg-amber-500/10 rounded-xl border border-amber-500/20 group-hover:border-amber-500/50 group-hover:bg-amber-500/20 transition-all">
                                <CalendarDays className="text-amber-500" size={24} />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Upcoming */}
                <div className="relative group">
                    <div className="absolute inset-0 bg-gradient-to-r from-blue-500/20 to-cyan-500/20 rounded-2xl blur-xl opacity-0 group-hover:opacity-100 transition-all duration-500"></div>
                    <div className="relative bg-stone-900/40 backdrop-blur-xl border border-white/5 rounded-2xl p-6 hover:border-blue-500/30 transition-all duration-300">
                        <div className="flex items-start justify-between">
                            <div>
                                <p className="text-stone-500 text-xs font-bold uppercase tracking-wider mb-1">Upcoming</p>
                                <p className="text-3xl font-black text-white group-hover:text-blue-400 transition-colors">{upcomingTests}</p>
                            </div>
                            <div className="p-3 bg-blue-500/10 rounded-xl border border-blue-500/20 group-hover:border-blue-500/50 group-hover:bg-blue-500/20 transition-all">
                                <Clock className="text-blue-500" size={24} />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Completed */}
                <div className="relative group">
                    <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/20 to-teal-500/20 rounded-2xl blur-xl opacity-0 group-hover:opacity-100 transition-all duration-500"></div>
                    <div className="relative bg-stone-900/40 backdrop-blur-xl border border-white/5 rounded-2xl p-6 hover:border-emerald-500/30 transition-all duration-300">
                        <div className="flex items-start justify-between">
                            <div>
                                <p className="text-stone-500 text-xs font-bold uppercase tracking-wider mb-1">Completed</p>
                                <p className="text-3xl font-black text-white group-hover:text-emerald-400 transition-colors">{completedTests}</p>
                            </div>
                            <div className="p-3 bg-emerald-500/10 rounded-xl border border-emerald-500/20 group-hover:border-emerald-500/50 group-hover:bg-emerald-500/20 transition-all">
                                <CheckCircle2 className="text-emerald-500" size={24} />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Pending Results */}
                <div className="relative group">
                    <div className="absolute inset-0 bg-gradient-to-r from-orange-500/20 to-red-500/20 rounded-2xl blur-xl opacity-0 group-hover:opacity-100 transition-all duration-500"></div>
                    <div className="relative bg-stone-900/40 backdrop-blur-xl border border-white/5 rounded-2xl p-6 hover:border-orange-500/30 transition-all duration-300">
                        <div className="flex items-start justify-between">
                            <div>
                                <p className="text-stone-500 text-xs font-bold uppercase tracking-wider mb-1">Pending Entry</p>
                                <p className="text-3xl font-black text-white group-hover:text-orange-400 transition-colors">{pendingResults}</p>
                            </div>
                            <div className="p-3 bg-orange-500/10 rounded-xl border border-orange-500/20 group-hover:border-orange-500/50 group-hover:bg-orange-500/20 transition-all">
                                <AlertTriangle className="text-orange-500" size={24} />
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex flex-col sm:flex-row gap-4 mb-8 justify-between items-start sm:items-center">
                <div className="flex p-1 bg-stone-900/80 backdrop-blur-md border border-white/5 rounded-2xl gap-1 shadow-inner shadow-black/50">
                    {['schedule', 'results', 'performance'].map(tab => (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab as any)}
                            className={`px-6 py-3 rounded-xl font-bold text-sm transition-all duration-300 flex items-center gap-2 ${activeTab === tab
                                ? 'bg-gradient-to-b from-stone-700 to-stone-800 text-amber-400 shadow-[0_2px_10px_rgba(0,0,0,0.5)] border border-white/10'
                                : 'text-stone-500 hover:text-stone-300 hover:bg-white/5'
                                }`}
                        >
                            {tab === 'schedule' && <CalendarDays size={16} className={activeTab === tab ? "drop-shadow-[0_0_8px_rgba(251,191,36,0.5)]" : ""} />}
                            {tab === 'results' && <ClipboardList size={16} className={activeTab === tab ? "drop-shadow-[0_0_8px_rgba(251,191,36,0.5)]" : ""} />}
                            {tab === 'performance' && <BarChart3 size={16} className={activeTab === tab ? "drop-shadow-[0_0_8px_rgba(251,191,36,0.5)]" : ""} />}
                            {tab.charAt(0).toUpperCase() + tab.slice(1)}
                        </button>
                    ))}
                </div>

                <button
                    onClick={() => setShowCreateModal(true)}
                    className="group relative px-6 py-3 rounded-xl font-bold text-stone-950 transition-all duration-300 overflow-hidden"
                >
                    <div className="absolute inset-0 bg-gradient-to-r from-amber-400 to-yellow-500 group-hover:from-amber-300 group-hover:to-yellow-400 transition-all duration-300"></div>
                    <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20"></div>
                    <span className="relative flex items-center gap-2 drop-shadow-sm">
                        <Plus size={20} />
                        SCHEDULE NEW TEST
                    </span>
                </button>
            </div>

            {/* Tab Content */}
            <div className="bg-stone-900/40 backdrop-blur-xl border border-white/5 rounded-3xl p-8 shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-96 h-96 bg-amber-500/5 rounded-full blur-3xl -z-10 translate-x-1/2 -translate-y-1/2"></div>

                {activeTab === 'schedule' && (
                    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-2xl font-bold text-white flex items-center gap-3">
                                <div className="w-1 h-8 bg-amber-500 rounded-full"></div>
                                Scheduled Tests
                            </h2>
                            <div className="px-4 py-2 bg-stone-800/50 rounded-xl text-stone-400 text-sm font-medium border border-white/5">
                                Show: <span className="text-white ml-2">All Tests</span>
                            </div>
                        </div>

                        {loading ? (
                            <div className="flex flex-col items-center justify-center py-20 text-stone-500">
                                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-500 mb-4"></div>
                                <p>Loading schedule...</p>
                            </div>
                        ) : tests.length === 0 ? (
                            <div className="text-center py-20 bg-stone-800/20 rounded-2xl border border-stone-800 border-dashed">
                                <CalendarDays className="mx-auto text-stone-600 mb-4" size={48} />
                                <p className="text-stone-400 text-lg">No tests scheduled yet.</p>
                                <button onClick={() => setShowCreateModal(true)} className="mt-4 text-amber-400 hover:text-amber-300 font-bold">
                                    + Schedule First Test
                                </button>
                            </div>
                        ) : (
                            <div className="overflow-x-auto rounded-2xl border border-stone-800/50 shadow-inner bg-black/20">
                                <table className="w-full text-left">
                                    <thead className="bg-stone-900/80 text-stone-400 text-xs font-bold uppercase tracking-wider backdrop-blur-sm">
                                        <tr>
                                            <th className="p-5">Date</th>
                                            <th className="p-5">Test Name</th>
                                            <th className="p-5">Type</th>
                                            <th className="p-5">Assigned To</th>
                                            <th className="p-5">Status</th>
                                            <th className="p-5 text-right">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="text-stone-300 divide-y divide-stone-800/50">
                                        {tests.map(t => (
                                            <tr key={t.id} className="group hover:bg-stone-800/30 transition-colors duration-200">
                                                <td className="p-5 font-mono text-amber-400/80 group-hover:text-amber-400">
                                                    {new Date(t.scheduled_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                                                </td>
                                                <td className="p-5 font-bold text-white group-hover:text-amber-500 transition-colors">{t.name}</td>
                                                <td className="p-5">
                                                    <span className="px-3 py-1 bg-stone-800 border border-stone-700 rounded-lg text-xs font-bold text-stone-300 shadow-sm">
                                                        {t.test_type}
                                                    </span>
                                                </td>
                                                <td className="p-5 text-stone-400 group-hover:text-stone-300">
                                                    {t.target_type === 'ALL' ? (
                                                        <span className="flex items-center gap-2">
                                                            <Users size={14} /> All Agniveers
                                                        </span>
                                                    ) : (
                                                        <span className="flex items-center gap-2">
                                                            <Target size={14} /> {t.target_type}: {t.target_value}
                                                        </span>
                                                    )}
                                                </td>
                                                <td className="p-5">
                                                    <span className={`px-3 py-1 rounded-full text-xs font-bold border backdrop-blur-sm flex w-fit items-center gap-1.5 ${t.status === 'SCHEDULED' ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' :
                                                        t.status === 'COMPLETED' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                                                            'bg-stone-500/10 text-stone-400 border-stone-500/20'
                                                        }`}>
                                                        <div className={`w-1.5 h-1.5 rounded-full ${t.status === 'SCHEDULED' ? 'bg-blue-400 animate-pulse' :
                                                            t.status === 'COMPLETED' ? 'bg-emerald-400' :
                                                                'bg-stone-400'
                                                            }`}></div>
                                                        {t.status}
                                                    </span>
                                                </td>
                                                <td className="p-5 text-right">
                                                    <button
                                                        onClick={() => { setActiveTab('results'); fetchTestAgniveers(t); }}
                                                        className="text-stone-400 hover:text-white font-bold text-sm bg-stone-800 hover:bg-stone-700 px-4 py-2 rounded-lg transition-all border border-stone-700 hover:border-stone-600 shadow-sm"
                                                    >
                                                        Enter Results
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                )}

                {activeTab === 'results' && (
                    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-3">
                            <div className="w-1 h-8 bg-amber-500 rounded-full"></div>
                            Enter Results
                        </h2>
                        {!selectedTest ? (
                            <div className="text-stone-400">
                                <p className="mb-4">Select a test from below to enter results:</p>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    {tests.filter(t => t.status === 'SCHEDULED').map(t => (
                                        <button
                                            key={t.id}
                                            onClick={() => fetchTestAgniveers(t)}
                                            className="group relative p-6 bg-stone-900/60 border border-white/5 rounded-2xl text-left hover:border-amber-500/50 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-amber-500/5 overflow-hidden"
                                        >
                                            <div className="absolute inset-0 bg-gradient-to-br from-amber-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                                            <p className="font-bold text-white text-lg mb-1 group-hover:text-amber-400 transition-colors">{t.name}</p>
                                            <div className="flex justify-between items-center text-sm text-stone-500 group-hover:text-stone-400">
                                                <span>{t.test_type}</span>
                                                <span>{new Date(t.scheduled_date).toLocaleDateString()}</span>
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        ) : (
                            <div>
                                <div className="flex justify-between items-center mb-6 bg-stone-800/30 p-4 rounded-2xl border border-white/5">
                                    <div className="flex items-center gap-4">
                                        <div className="p-3 bg-amber-500/20 rounded-xl text-amber-500">
                                            <Award size={24} />
                                        </div>
                                        <div>
                                            <h3 className="text-xl font-bold text-white">{selectedTest.name}</h3>
                                            <p className="text-stone-400 text-sm font-mono mt-1">
                                                <span className="text-stone-500">MAX:</span> {selectedTest.max_marks} <span className="mx-2">|</span> <span className="text-stone-500">PASS:</span> {selectedTest.passing_marks}
                                            </p>
                                        </div>
                                    </div>
                                    <button onClick={() => setSelectedTest(null)} className="px-4 py-2 rounded-xl text-stone-400 hover:text-white hover:bg-stone-800 transition-all text-sm font-bold border border-transparent hover:border-stone-700">
                                        ← Select Different Test
                                    </button>
                                </div>

                                <div className="overflow-x-auto rounded-2xl border border-stone-800/50 shadow-inner bg-black/20">
                                    <table className="w-full text-left">
                                        <thead className="bg-stone-900/80 text-stone-400 text-xs font-bold uppercase tracking-wider backdrop-blur-sm">
                                            <tr>
                                                <th className="p-5 rounded-l-lg">Service ID</th>
                                                <th className="p-5">Name</th>
                                                <th className="p-5">Score</th>
                                                <th className="p-5">Status</th>
                                                <th className="p-5 rounded-r-lg">Action</th>
                                            </tr>
                                        </thead>
                                        <tbody className="text-stone-300 divide-y divide-stone-800/50">
                                            {testAgniveers.map(a => (
                                                <tr key={a.id} className="hover:bg-stone-800/30 transition-colors">
                                                    <td className="p-5 font-mono text-amber-400/80">{a.service_id}</td>
                                                    <td className="p-5 font-bold text-white">{a.name}</td>
                                                    <td className="p-5">
                                                        <div className="relative group/input">
                                                            <input
                                                                type="number"
                                                                value={a.score ?? ''}
                                                                onChange={(e) => {
                                                                    const val = e.target.value === '' ? null : parseFloat(e.target.value);
                                                                    setTestAgniveers(prev => prev.map(ag => ag.id === a.id ? { ...ag, score: val } : ag));
                                                                }}
                                                                className="w-24 px-3 py-2 bg-stone-950/50 border border-stone-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500 transition-all font-mono text-center disabled:opacity-50"
                                                                max={selectedTest.max_marks}
                                                                disabled={a.is_absent}
                                                                placeholder="--"
                                                            />
                                                        </div>
                                                    </td>
                                                    <td className="p-5">
                                                        {a.has_result ? (
                                                            a.is_absent ? (
                                                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-500/10 text-red-500 border border-red-500/20">
                                                                    Absent
                                                                </span>
                                                            ) : a.score !== null && a.score >= selectedTest.passing_marks ? (
                                                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                                                                    Pass
                                                                </span>
                                                            ) : (
                                                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-500/10 text-red-500 border border-red-500/20">
                                                                    Fail
                                                                </span>
                                                            )
                                                        ) : (
                                                            <span className="text-stone-600 text-xs font-medium">Pending Entry</span>
                                                        )}
                                                    </td>
                                                    <td className="p-5 flex gap-3">
                                                        <button
                                                            onClick={() => saveResult(a.id, a.score, false)}
                                                            className="p-2 bg-emerald-500/10 text-emerald-500 rounded-lg hover:bg-emerald-500/20 border border-emerald-500/20 transition-all ring-emerald-500/50 focus:ring-2"
                                                            title="Save Score"
                                                        >
                                                            <CheckCircle2 size={18} />
                                                        </button>
                                                        <button
                                                            onClick={() => saveResult(a.id, null, true)}
                                                            className={`p-2 rounded-lg border transition-all ${a.is_absent
                                                                ? 'bg-red-500/20 text-red-400 border-red-500/40'
                                                                : 'bg-stone-800 text-stone-500 border-stone-700 hover:text-red-400 hover:border-red-500/30'
                                                                }`}
                                                            title="Mark Absent"
                                                        >
                                                            <XCircle size={18} />
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {activeTab === 'performance' && (
                    <div className="text-center py-20 animate-in fade-in zoom-in duration-500">
                        <div className="w-24 h-24 bg-stone-800/50 rounded-full flex items-center justify-center mx-auto mb-6 border border-white/5 shadow-2xl">
                            <BarChart3 size={48} className="text-stone-600" />
                        </div>
                        <h3 className="text-2xl font-bold text-white mb-2">Performance Analytics</h3>
                        <p className="text-stone-500 max-w-md mx-auto">
                            Comprehensive charts and insights based on test results will be available here soon.
                        </p>
                    </div>
                )}
            </div>

            {/* Create Test Modal */}
            {showCreateModal && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
                    <div className="bg-stone-900 border border-stone-700 rounded-2xl w-full max-w-lg shadow-2xl max-h-[90vh] overflow-y-auto">
                        <div className="p-6 border-b border-white/10 flex justify-between items-center bg-stone-900/50 sticky top-0 backdrop-blur-md z-10">
                            <h3 className="text-xl font-bold text-white flex items-center gap-2">
                                <Plus className="text-amber-500" /> Schedule New Test
                            </h3>
                            <button onClick={() => setShowCreateModal(false)} className="text-stone-500 hover:text-white transition-colors">
                                <XCircle size={24} />
                            </button>
                        </div>
                        <div className="p-8 space-y-6">
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
                                        <select
                                            value={newTest.test_type}
                                            onChange={e => setNewTest({ ...newTest, test_type: e.target.value })}
                                            className="w-full px-4 py-3 bg-stone-950 border border-stone-800 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500 appearance-none transition-all"
                                        >
                                            {TEST_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                                        </select>
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
                            <button
                                onClick={() => setShowCreateModal(false)}
                                className="px-6 py-3 rounded-xl bg-stone-800 text-stone-400 font-bold hover:bg-stone-700 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleCreateTest}
                                disabled={!newTest.name || !newTest.scheduled_date}
                                className="px-8 py-3 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 text-white font-bold shadow-lg shadow-amber-500/20 hover:scale-105 transition-transform disabled:opacity-50 disabled:hover:scale-100"
                            >
                                Schedule Test
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default TrainingOfficerDashboard;
