import React from 'react';
import { Zap, Clock, ChevronRight, Shield, BookOpen, Calendar } from 'lucide-react';
import { useAgniveer } from './context';

interface ActionSectionProps {
    openLeaveModal: () => void;
    openGrievanceModal: () => void;
}

const ActionSection: React.FC<ActionSectionProps> = ({ openLeaveModal, openGrievanceModal }) => {
    const { t, profile } = useAgniveer();

    return (
        <div className="col-span-1 space-y-6">
            {/* Quick Actions Widget */}
            <div className="bg-white rounded-2xl shadow-md border border-stone-200 overflow-hidden">
                <div className="p-4 bg-stone-50 border-b border-stone-100 flex justify-between items-center">
                    <h3 className="font-bold text-stone-800 flex items-center gap-2"><Zap className="text-orange-500" size={16} /> {t.quickActions}</h3>
                </div>
                <div className="p-3 space-y-2">
                    <button onClick={openLeaveModal} className="w-full flex items-center justify-between p-3 bg-white hover:bg-stone-50 border border-stone-100 rounded-xl transition-colors group">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-green-100 text-green-600 rounded-full"><Clock size={14} /></div>
                            <span className="text-sm font-bold text-stone-700">{t.applyForLeave}</span>
                        </div>
                        <ChevronRight size={14} className="text-stone-400 group-hover:text-stone-600" />
                    </button>
                    <button onClick={openGrievanceModal} className="w-full flex items-center justify-between p-3 bg-white hover:bg-stone-50 border border-stone-100 rounded-xl transition-colors group">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-red-100 text-red-600 rounded-full"><Shield size={14} /></div>
                            <span className="text-sm font-bold text-stone-700">{t.fileGrievance}</span>
                        </div>
                        <ChevronRight size={14} className="text-stone-400 group-hover:text-stone-600" />
                    </button>
                    <button className="w-full flex items-center justify-between p-3 bg-white hover:bg-stone-50 border border-stone-100 rounded-xl transition-colors group">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-purple-100 text-purple-600 rounded-full"><BookOpen size={14} /></div>
                            <span className="text-sm font-bold text-stone-700">{t.requestCourse}</span>
                        </div>
                        <ChevronRight size={14} className="text-stone-400 group-hover:text-stone-600" />
                    </button>
                </div>
            </div>

            {/* Upcoming Events */}
            <div className="bg-white rounded-2xl shadow-md border border-stone-200 p-5">
                <h3 className="font-bold text-stone-700 flex items-center gap-2 mb-4"><Calendar size={16} className="text-blue-600" /> {t.trainingSchedule}</h3>
                <div className="space-y-3">
                    {profile?.upcoming_tests && profile.upcoming_tests.length > 0 ? (
                        profile.upcoming_tests.map((test, i) => {
                            const date = new Date(test.scheduled_date);
                            return (
                                <div key={i} className="flex gap-3 items-center">
                                    <div className="w-12 text-center bg-blue-50 text-blue-700 rounded-lg py-1.5">
                                        <span className="block text-xs font-bold">{date.getDate()}</span>
                                        <span className="block text-[10px] uppercase">{date.toLocaleString('default', { month: 'short' })}</span>
                                    </div>
                                    <div>
                                        <p className="text-sm font-bold text-stone-700">{test.name}</p>
                                        <span className="text-[10px] font-bold text-stone-400 bg-stone-100 px-1.5 rounded">{test.test_type}</span>
                                    </div>
                                </div>
                            );
                        })
                    ) : (
                        <div className="text-stone-400 text-sm text-center py-2">No upcoming training scheduled.</div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ActionSection;
