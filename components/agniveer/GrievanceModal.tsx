import React, { useState } from 'react';
import { Shield } from 'lucide-react';
import { useAgniveer } from './context';
import { API_BASE_URL } from '../../config';

interface GrievanceModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const GrievanceModal: React.FC<GrievanceModalProps> = ({ isOpen, onClose }) => {
    const { user, refreshGrievances, t, lang } = useAgniveer();
    const [grievanceForm, setGrievanceForm] = useState({ type: 'ADMIN', addressed_to: 'CO', description: '' });

    const submitGrievance = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const payload = { ...grievanceForm, agniveer_id: user.agniveer_id };
            const res = await fetch(`${API_BASE_URL}/api/grievance/submit`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            if (res.ok) {
                alert(lang === 'en' ? "Grievance Submitted!" : "शिकायत जमा की गई!");
                onClose();
                refreshGrievances();
            } else {
                const errData = await res.json();
                alert(`Failed to submit grievance: ${errData.detail || 'Unknown error'}`);
            }
        } catch (e) { console.error(e); alert("Failed to submit grievance: Network Error"); }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-md animate-in zoom-in-95">
                <h3 className="text-lg font-bold mb-4 flex items-center gap-2"><Shield className="text-red-600" size={20} /> {t.fileGrievance}</h3>
                <div className="bg-yellow-50 p-3 rounded-lg mb-4 text-xs text-yellow-800 border-l-4 border-yellow-400">
                    {lang === 'en' ? "Grievances are taken seriously. Refrain from false reporting." : "शिकायतें गंभीरता से ली जाती हैं। झूठी रिपोर्टिंग से बचें।"}
                </div>
                <form onSubmit={submitGrievance} className="space-y-4">
                    <div>
                        <label className="text-xs font-bold text-stone-500 block mb-1">{t.addressedTo}</label>
                        <select className="w-full p-2 border rounded-lg bg-stone-50" onChange={e => setGrievanceForm({ ...grievanceForm, addressed_to: e.target.value })}>
                            <option value="CO">Commanding Officer (CO)</option>
                            <option value="COMMANDER">Company Commander</option>
                        </select>
                    </div>
                    <div>
                        <label className="text-xs font-bold text-stone-500 block mb-1">{t.category}</label>
                        <select className="w-full p-2 border rounded-lg bg-stone-50" onChange={e => setGrievanceForm({ ...grievanceForm, type: e.target.value })}>
                            <option value="ADMIN">Administrative / Pay</option>
                            <option value="MEDICAL">Medical / Health</option>
                            <option value="PERSONAL">Personal / Family</option>
                            <option value="OTHER">{t.other}</option>
                        </select>
                    </div>
                    <div>
                        <label className="text-xs font-bold text-stone-500 block mb-1">{t.desc}</label>
                        <textarea required className="w-full p-2 border rounded-lg bg-stone-50" rows={4} placeholder={t.descPlaceholder} onChange={e => setGrievanceForm({ ...grievanceForm, description: e.target.value })}></textarea>
                    </div>
                    <div className="flex gap-2 pt-2">
                        <button type="button" onClick={onClose} className="flex-1 py-2 font-bold text-stone-600 bg-stone-100 rounded-lg">{t.cancel}</button>
                        <button type="submit" className="flex-1 py-2 font-bold text-white bg-red-600 rounded-lg hover:bg-red-700">{t.submitGriev}</button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default GrievanceModal;
