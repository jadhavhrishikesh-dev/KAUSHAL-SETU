import React from 'react';
import { CalendarDays, Clock, CheckCircle2, AlertTriangle, BarChart3 } from 'lucide-react';
import { ScheduledTest } from './types';

const TrainingStats: React.FC<{ tests: ScheduledTest[] }> = ({ tests }) => {
    const totalTests = tests.length;
    const upcomingTests = tests.filter(t => t.status === 'SCHEDULED').length;
    const completedTests = tests.filter(t => t.status === 'COMPLETED').length;
    const pendingResults = tests.reduce((acc, t) => {
        if (t.status === 'SCHEDULED') return acc + 1; // Simplification based on original logic
        return acc;
    }, 0);

    return (
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
    );
};

export default TrainingStats;
