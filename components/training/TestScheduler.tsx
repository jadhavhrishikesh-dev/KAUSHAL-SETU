import React from 'react';
import { CalendarDays, Users, Target, Trash2 } from 'lucide-react';
import { ScheduledTest } from './types';

interface TestSchedulerProps {
    tests: ScheduledTest[];
    loading: boolean;
    onEnterResults: (test: ScheduledTest) => void;
    toggleCreateModal: () => void;
    onDeleteTest: (id: number) => void;
}

const TestScheduler: React.FC<TestSchedulerProps> = ({ tests, loading, onEnterResults, toggleCreateModal, onDeleteTest }) => {
    return (
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
                    <button onClick={toggleCreateModal} className="mt-4 text-amber-400 hover:text-amber-300 font-bold">
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
                                            onClick={() => onEnterResults(t)}
                                            className="text-stone-400 hover:text-white font-bold text-sm bg-stone-800 hover:bg-stone-700 px-4 py-2 rounded-lg transition-all border border-stone-700 hover:border-stone-600 shadow-sm"
                                        >
                                            Enter Results
                                        </button>
                                        <button
                                            onClick={(e) => { e.stopPropagation(); onDeleteTest(t.id); }}
                                            className="ml-2 text-stone-500 hover:text-red-500 p-2 rounded-lg hover:bg-red-500/10 transition-colors"
                                            title="Delete Test"
                                        >
                                            <Trash2 size={18} />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
};

export default TestScheduler;
