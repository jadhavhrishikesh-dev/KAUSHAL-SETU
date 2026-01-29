import React, { useState } from 'react';
import { useAgniveer } from './context';
import { API_BASE_URL } from '../../config';

interface LeaveModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const LeaveModal: React.FC<LeaveModalProps> = ({ isOpen, onClose }) => {
    const { user, refreshLeaves, t, leaves, lang } = useAgniveer();
    const [leaveForm, setLeaveForm] = useState({ type: 'CASUAL', start_date: '', end_date: '', reason: '' });

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

    const submitLeave = async (e: React.FormEvent) => {
        e.preventDefault();
        const duration = calculateDays(leaveForm.start_date, leaveForm.end_date);
        if (duration > 30) { alert("Maximum leave duration cannot exceed 30 days."); return; }
        if (duration > daysRemaining) { alert(`Insufficient leave balance. You only have ${daysRemaining} days remaining.`); return; }

        try {
            const res = await fetch(`${API_BASE_URL}/api/leave/apply`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    agniveer_id: user.agniveer_id,
                    leave_type: leaveForm.type,
                    start_date: leaveForm.start_date,
                    end_date: leaveForm.end_date,
                    reason: leaveForm.reason
                })
            });
            if (res.ok) {
                alert(lang === 'en' ? "Leave Applied!" : "छुट्टी लागू की गई!");
                onClose();
                refreshLeaves();
            } else {
                const errData = await res.json();
                alert(`Failed to apply leave: ${errData.detail || 'Unknown error'}`);
            }
        } catch (e) { console.error(e); alert("Failed to apply leave: Network Error"); }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-md animate-in zoom-in-95">
                <h3 className="text-lg font-bold mb-4">{t.applyForLeave}</h3>
                <form onSubmit={submitLeave} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="text-xs font-bold text-stone-500 block mb-1">{t.startDate}</label>
                            <input
                                type="date"
                                required
                                min={new Date().toISOString().split('T')[0]}
                                className="w-full p-2 border rounded-lg bg-stone-50"
                                onChange={e => setLeaveForm({ ...leaveForm, start_date: e.target.value })}
                            />
                        </div>
                        <div>
                            <label className="text-xs font-bold text-stone-500 block mb-1">{t.endDate}</label>
                            <input
                                type="date"
                                required
                                min={leaveForm.start_date}
                                max={leaveForm.start_date ? new Date(new Date(leaveForm.start_date).getTime() + (daysRemaining - 1) * 24 * 60 * 60 * 1000).toISOString().split('T')[0] : undefined}
                                className="w-full p-2 border rounded-lg bg-stone-50"
                                onChange={e => setLeaveForm({ ...leaveForm, end_date: e.target.value })}
                            />
                        </div>
                    </div>
                    <div>
                        <label className="text-xs font-bold text-stone-500 block mb-1">{t.reason}</label>
                        <textarea required className="w-full p-2 border rounded-lg bg-stone-50" rows={3} onChange={e => setLeaveForm({ ...leaveForm, reason: e.target.value })}></textarea>
                    </div>
                    <div className="flex gap-2 pt-2">
                        <button type="button" onClick={onClose} className="flex-1 py-2 font-bold text-stone-600 bg-stone-100 rounded-lg">{t.cancel}</button>
                        <button type="submit" className="flex-1 py-2 font-bold text-white bg-teal-600 rounded-lg hover:bg-teal-700">{t.submitApp}</button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default LeaveModal;
