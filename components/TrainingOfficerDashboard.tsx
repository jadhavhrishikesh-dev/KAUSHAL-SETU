import React, { useState, useEffect } from 'react';
import { User } from '../types';
import { API_BASE_URL } from '../config';
import { CalendarDays, ClipboardList, BarChart3, Plus, CheckCircle2 } from 'lucide-react';
import { ScheduledTest } from './training/types';
import TrainingStats from './training/TrainingStats';
import TestScheduler from './training/TestScheduler';
import ResultEntry from './training/ResultEntry';
import PerformanceAnalytics from './training/PerformanceAnalytics';
import CreateTestModal from './training/CreateTestModal';

const TrainingOfficerDashboard: React.FC<{ user: User }> = ({ user }) => {
    const [activeTab, setActiveTab] = useState<'schedule' | 'results' | 'performance'>('schedule');
    const [tests, setTests] = useState<ScheduledTest[]>([]);
    const [loading, setLoading] = useState(true);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [selectedTest, setSelectedTest] = useState<ScheduledTest | null>(null);
    const [successMessage, setSuccessMessage] = useState('');

    const token = localStorage.getItem('token');

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
        } catch (e) { console.error(e); } finally { setLoading(false); }
    };

    useEffect(() => {
        fetchTests();
    }, []);

    const handleEnterResults = (test: ScheduledTest) => {
        setSelectedTest(test);
        setActiveTab('results');
    };

    const handleTestCreated = () => {
        setSuccessMessage('Test scheduled successfully!');
        fetchTests();
        setTimeout(() => setSuccessMessage(''), 3000);
    };

    const handleDeleteTest = async (testId: number) => {
        if (!confirm('Are you sure you want to delete this test? This action cannot be undone.')) return;

        try {
            const res = await fetch(`${API_BASE_URL}/api/tests/${testId}`, {
                method: 'DELETE',
                headers: { Authorization: `Bearer ${token}` }
            });
            if (res.ok) {
                setSuccessMessage('Test deleted successfully');
                fetchTests();
                setTimeout(() => setSuccessMessage(''), 3000);
            } else {
                alert('Failed to delete test');
            }
        } catch (e) {
            console.error(e);
            alert('Error deleting test');
        }
    };

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

            {successMessage && (
                <div className="mb-6 p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-400 flex items-center gap-3 shadow-lg shadow-emerald-900/20 backdrop-blur-md animate-in fade-in slide-in-from-top-2">
                    <CheckCircle2 size={24} className="drop-shadow-[0_0_8px_rgba(52,211,153,0.5)]" />
                    <span className="font-bold tracking-wide">{successMessage}</span>
                </div>
            )}

            <TrainingStats tests={tests} />

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
                    <div className="absolute inset-0 bg-white/5 opacity-20"></div>
                    <span className="relative flex items-center gap-2 drop-shadow-sm">
                        <Plus size={20} />
                        SCHEDULE NEW TEST
                    </span>
                </button>
            </div>

            {/* Tab Content (Using hidden class for persistence) */}
            <div className="bg-stone-900/40 backdrop-blur-xl border border-white/5 rounded-3xl p-8 shadow-2xl relative overflow-hidden min-h-[500px]">
                <div className="absolute top-0 right-0 w-96 h-96 bg-amber-500/5 rounded-full blur-3xl -z-10 translate-x-1/2 -translate-y-1/2"></div>

                <div className={activeTab === 'schedule' ? 'block' : 'hidden'}>
                    <TestScheduler
                        tests={tests}
                        loading={loading}
                        onEnterResults={handleEnterResults}
                        toggleCreateModal={() => setShowCreateModal(true)}
                        onDeleteTest={handleDeleteTest}
                    />
                </div>

                <div className={activeTab === 'results' ? 'block' : 'hidden'}>
                    <ResultEntry
                        tests={tests}
                        selectedTest={selectedTest}
                        setSelectedTest={setSelectedTest}
                    />
                </div>

                <div className={activeTab === 'performance' ? 'block' : 'hidden'}>
                    <PerformanceAnalytics />
                </div>
            </div>

            <CreateTestModal
                isOpen={showCreateModal}
                onClose={() => setShowCreateModal(false)}
                onSuccess={handleTestCreated}
            />
        </div>
    );
};

export default TrainingOfficerDashboard;
