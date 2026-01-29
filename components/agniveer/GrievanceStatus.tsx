import React, { useState } from 'react';
import { Shield, CheckCircle } from 'lucide-react';
import { useAgniveer } from './context';
import { formatDate } from '../utils';

const GrievanceStatus: React.FC = () => {
    const { grievances, t } = useAgniveer();
    const [expandedGrievanceId, setExpandedGrievanceId] = useState<number | null>(null);

    return (
        <div className="bg-white rounded-2xl shadow-md border border-stone-200 p-5">
            <h3 className="font-bold text-stone-700 flex items-center gap-2 mb-4"><Shield size={16} className="text-red-600" /> {t.grievancePortal}</h3>
            {grievances.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-24 text-stone-400">
                    <CheckCircle size={24} className="mb-2 text-green-500/50" />
                    <p className="text-xs">No pending grievances.</p>
                </div>
            ) : (
                grievances.slice(0, 3).map(g => (
                    <div
                        key={g.id}
                        onClick={() => setExpandedGrievanceId(expandedGrievanceId === g.id ? null : g.id)}
                        className={`text-xs p-3 bg-stone-50 rounded-lg mb-2 cursor-pointer transition-all border ${expandedGrievanceId === g.id ? 'border-red-400 shadow-sm' : 'border-transparent hover:bg-stone-100'}`}
                    >
                        <div className="flex justify-between items-center mb-1">
                            <span className="font-bold text-stone-700">{formatDate(g.submitted_at)}</span>
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${g.status === 'RESOLVED' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                                {g.status}
                            </span>
                        </div>
                        <div className="flex justify-between items-center text-[10px] text-stone-500">
                            <span>To: <span className="font-bold">{g.addressed_to}</span></span>
                            <span>Type: <span className="font-bold">{g.type}</span></span>
                        </div>
                        {expandedGrievanceId === g.id && (
                            <div className="mt-3 pt-2 border-t border-stone-200 text-[10px] text-stone-600 animate-in slide-in-from-top-1">
                                <div className="mb-2">
                                    <span className="font-bold block mb-0.5">{t.desc}:</span>
                                    <p className="italic leading-relaxed bg-white p-2 rounded border border-stone-100">{g.description}</p>
                                </div>
                                {g.resolution_notes ? (
                                    <div className="bg-green-50 p-2 rounded border border-green-100">
                                        <span className="font-bold block mb-0.5 text-green-800">Reply from Commander:</span>
                                        <p className="text-green-700 leading-relaxed">{g.resolution_notes}</p>
                                    </div>
                                ) : (
                                    <p className="text-stone-400 italic text-center py-1">-- No reply yet --</p>
                                )}
                            </div>
                        )}
                    </div>
                ))
            )}
        </div>
    );
};

export default GrievanceStatus;
