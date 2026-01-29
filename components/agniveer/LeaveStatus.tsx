import React, { useState } from 'react';
import { Clock } from 'lucide-react';
import { useAgniveer } from './context';
import { formatDate } from '../utils';
import { API_BASE_URL } from '../../config';

const LeaveStatus: React.FC = () => {
    const { leaves, refreshLeaves, t, lang } = useAgniveer();
    const [expandedLeaveId, setExpandedLeaveId] = useState<number | null>(null);

    const calculateDays = (start: string, end: string) => {
        const s = new Date(start);
        const e = new Date(end);
        const diffTime = Math.abs(e.getTime() - s.getTime());
        return Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
    };

    const getUsedLeaves = () => {
        return leaves
            .filter(l => l.status === 'APPROVED' || l.status === 'PENDING')
            .reduce((acc, l) => acc + calculateDays(l.start_date, l.end_date), 0);
    };

    const daysUsed = getUsedLeaves();
    const daysRemaining = 30 - daysUsed;

    const cancelLeave = async (leaveId: number) => {
        if (!confirm(lang === 'en' ? "Are you sure you want to cancel this request?" : "क्या आप सुनिश्चित हैं कि आप इस अनुरोध को रद्द करना चाहते हैं?")) return;
        try {
            const res = await fetch(`${API_BASE_URL}/api/leave/cancel/${leaveId}`, { method: 'DELETE' });
            if (res.ok) {
                alert(lang === 'en' ? "Request Cancelled" : "अनुरोध रद्द किया गया");
                setExpandedLeaveId(null);
                refreshLeaves();
            } else {
                const err = await res.json();
                alert(`Error: ${err.detail}`);
            }
        } catch (e) { console.error(e); alert("Network Error"); }
    };

    return (
        <div className="bg-white rounded-2xl shadow-md border border-stone-200 p-5">
            <div className="flex justify-between items-center mb-4">
                <h3 className="font-bold text-stone-700 flex items-center gap-2"><Clock size={16} className="text-green-600" /> {t.leaveStatus}</h3>
            </div>
            <div className="flex gap-3 mb-4">
                <div className="flex-1 p-3 bg-green-50 rounded-xl text-center">
                    <span className="block text-2xl font-black text-green-700">30</span>
                    <span className="text-[10px] text-green-600 font-bold">{t.annual}</span>
                </div>
                <div className="flex-1 p-3 bg-stone-100 rounded-xl text-center">
                    <span className={`block text-2xl font-black ${daysRemaining < 5 ? 'text-red-500' : 'text-stone-700'}`}>{daysRemaining}</span>
                    <span className="text-[10px] text-stone-500 font-bold">{t.balance}</span>
                </div>
            </div>
            <p className="text-[10px] font-bold text-stone-400 uppercase mb-2">{t.recentRequests}</p>
            {leaves.length === 0 ? <p className="text-xs text-stone-400 italic">{t.noLeaves}</p> :
                leaves.slice(0, 3).map(l => (
                    <div
                        key={l.id}
                        onClick={() => setExpandedLeaveId(expandedLeaveId === l.id ? null : l.id)}
                        className={`text-xs p-3 bg-stone-50 rounded-lg mb-2 cursor-pointer transition-all border ${expandedLeaveId === l.id ? 'border-teal-500 shadow-sm' : 'border-transparent hover:bg-stone-100'}`}
                    >
                        <div className="flex justify-between items-center">
                            <div>
                                <span className="font-bold text-stone-700 block">{formatDate(l.start_date)} - {formatDate(l.end_date)}</span>
                            </div>
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${l.status === 'APPROVED' ? 'bg-green-100 text-green-700' : l.status === 'REJECTED' ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'}`}>
                                {l.status}
                            </span>
                        </div>
                        {expandedLeaveId === l.id && (
                            <div className="mt-3 pt-2 border-t border-stone-200 text-[10px] text-stone-500 animate-in slide-in-from-top-1">
                                <div className="flex justify-between mb-1">
                                    <span className="font-bold">Duration:</span>
                                    <span>{calculateDays(l.start_date, l.end_date)} {t.days}</span>
                                </div>
                                <div>
                                    <span className="font-bold block mb-0.5">{t.reason}:</span>
                                    <p className="italic leading-relaxed">{l.reason || "No reason provided"}</p>
                                </div>
                                {l.status === 'PENDING' && (
                                    <div className="mt-2 text-right">
                                        <button
                                            onClick={(e) => { e.stopPropagation(); cancelLeave(l.id); }}
                                            className="px-3 py-1 bg-red-50 text-red-600 font-bold rounded-md hover:bg-red-100 transition text-[10px]"
                                        >
                                            {t.cancel || "Cancel Request"}
                                        </button>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                ))
            }
        </div>
    );
};

export default LeaveStatus;
