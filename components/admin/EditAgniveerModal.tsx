import React, { useState, useEffect } from 'react';
import { API_BASE_URL } from '../../config';
import { formatDate } from '../utils';
import { X, Save, User as UserIcon } from 'lucide-react';

interface EditAgniveerModalProps {
    isOpen: boolean;
    onClose: () => void;
    agniveer: any;
    onSuccess: () => void;
}

const EditAgniveerModal: React.FC<EditAgniveerModalProps> = ({ isOpen, onClose, agniveer, onSuccess }) => {
    const [formData, setFormData] = useState<any>(null);

    useEffect(() => {
        if (agniveer) {
            const formatted = { ...agniveer };
            if (formatted.dob) formatted.dob = formatDate(formatted.dob);
            if (formatted.reporting_date) formatted.reporting_date = formatDate(formatted.reporting_date);
            setFormData(formatted);
        }
    }, [agniveer]);

    if (!isOpen || !formData) return null;

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSave = async () => {
        const payload: any = { ...formData };
        const dateFields = ['dob', 'reporting_date'];
        dateFields.forEach(f => {
            if (payload[f] && /^\d{2}-\d{2}-\d{4}$/.test(payload[f])) {
                const [d, m, y] = payload[f].split('-');
                payload[f] = `${y}-${m}-${d}`;
            } else if (payload[f] && payload[f].includes('T')) {
                payload[f] = payload[f].split('T')[0];
            }
        });

        // Sanitization
        Object.keys(payload).forEach(key => { if (payload[key] === '') payload[key] = null; });

        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`${API_BASE_URL}/api/admin/agniveers/${formData.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify(payload)
            });

            if (res.ok) {
                onSuccess();
                onClose();
            } else {
                const err = await res.json();
                alert(`Update Failed: ${err.detail}`);
            }
        } catch (e) { alert("Network Error"); }
    };

    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
            <div className="bg-stone-900 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto flex flex-col border border-stone-700 ring-1 ring-white/10">
                <div className="p-6 border-b border-stone-800 flex justify-between items-center bg-stone-950/50 sticky top-0 backdrop-blur-md z-10">
                    <div className="flex items-center space-x-3">
                        <div className="bg-teal-900/30 p-2 rounded-full">
                            <UserIcon className="w-5 h-5 text-teal-500" />
                        </div>
                        <h3 className="text-xl font-bold text-stone-200">Edit Agniveer Profile</h3>
                    </div>
                    <button onClick={onClose} className="text-stone-500 hover:text-stone-300 transition-colors p-2 hover:bg-stone-800 rounded-full">
                        <X className="w-6 h-6" />
                    </button>
                </div>

                <div className="p-8 grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Personal Details */}
                    <div className="space-y-4">
                        <h4 className="font-bold text-teal-500 border-b border-teal-500/30 pb-2 mb-4 uppercase text-xs tracking-wider">Personal Details</h4>
                        <div><label className="text-[10px] font-bold text-stone-500 uppercase pl-1">Service ID</label><input name="service_id" value={formData.service_id || ''} onChange={handleChange} className="w-full p-2.5 bg-stone-950 border border-stone-800 rounded-lg text-stone-300 outline-none focus:border-teal-500/50 transition-all focus:bg-stone-900" /></div>
                        <div><label className="text-[10px] font-bold text-stone-500 uppercase pl-1">Name</label><input name="name" value={formData.name || ''} onChange={handleChange} className="w-full p-2.5 bg-stone-950 border border-stone-800 rounded-lg text-stone-300 outline-none focus:border-teal-500/50 transition-all focus:bg-stone-900" /></div>
                        <div><label className="text-[10px] font-bold text-stone-500 uppercase pl-1">DOB (DD-MM-YYYY)</label><input type="text" name="dob" placeholder="DD-MM-YYYY" value={formData.dob || ''} onChange={handleChange} className="w-full p-2.5 bg-stone-950 border border-stone-800 rounded-lg text-stone-300 outline-none focus:border-teal-500/50 transition-all focus:bg-stone-900" /></div>
                        <div><label className="text-[10px] font-bold text-stone-500 uppercase pl-1">Reporting Date (DD-MM-YYYY)</label><input type="text" name="reporting_date" placeholder="DD-MM-YYYY" value={formData.reporting_date || ''} onChange={handleChange} className="w-full p-2.5 bg-stone-950 border border-stone-800 rounded-lg text-stone-300 outline-none focus:border-teal-500/50 transition-all focus:bg-stone-900" /></div>
                        <div><label className="text-[10px] font-bold text-stone-500 uppercase pl-1">Qualification</label><input name="higher_qualification" value={formData.higher_qualification || ''} onChange={handleChange} className="w-full p-2.5 bg-stone-950 border border-stone-800 rounded-lg text-stone-300 outline-none focus:border-teal-500/50 transition-all focus:bg-stone-900" /></div>
                        <div className="md:col-span-2 grid grid-cols-2 gap-4">
                            <div><label className="text-[10px] font-bold text-stone-500 uppercase pl-1">Email</label><input name="email" value={formData.email || ''} onChange={handleChange} className="w-full p-2.5 bg-stone-950 border border-stone-800 rounded-lg text-stone-300 outline-none focus:border-teal-500/50 transition-all focus:bg-stone-900" /></div>
                            <div><label className="text-[10px] font-bold text-stone-500 uppercase pl-1">Phone (Self)</label><input name="phone" value={formData.phone || ''} onChange={handleChange} className="w-full p-2.5 bg-stone-950 border border-stone-800 rounded-lg text-stone-300 outline-none focus:border-teal-500/50 transition-all focus:bg-stone-900" /></div>
                        </div>
                        <div className="md:col-span-2"><label className="text-[10px] font-bold text-stone-500 uppercase pl-1">Photo URL</label><input name="photo_url" value={formData.photo_url || ''} onChange={handleChange} className="w-full p-2.5 bg-stone-950 border border-stone-800 rounded-lg text-stone-300 outline-none focus:border-teal-500/50 transition-all focus:bg-stone-900" /></div>
                    </div>

                    {/* Service Details */}
                    <div className="space-y-4">
                        <h4 className="font-bold text-blue-500 border-b border-blue-500/30 pb-2 mb-4 uppercase text-xs tracking-wider">Service Details</h4>
                        <div><label className="text-[10px] font-bold text-stone-500 uppercase pl-1">Batch No</label><input name="batch_no" value={formData.batch_no || ''} onChange={handleChange} className="w-full p-2.5 bg-stone-950 border border-stone-800 rounded-lg text-stone-300 outline-none focus:border-blue-500/50 transition-all focus:bg-stone-900" /></div>
                        <div><label className="text-[10px] font-bold text-stone-500 uppercase pl-1">Company</label><input name="company" value={formData.company || ''} onChange={handleChange} className="w-full p-2.5 bg-stone-950 border border-stone-800 rounded-lg text-stone-300 outline-none focus:border-blue-500/50 transition-all focus:bg-stone-900" /></div>
                        <div><label className="text-[10px] font-bold text-stone-500 uppercase pl-1">Unit</label><input name="unit" value={formData.unit || ''} onChange={handleChange} className="w-full p-2.5 bg-stone-950 border border-stone-800 rounded-lg text-stone-300 outline-none focus:border-blue-500/50 transition-all focus:bg-stone-900" /></div>
                        <div><label className="text-[10px] font-bold text-stone-500 uppercase pl-1">Rank</label><input name="rank" value={formData.rank || ''} onChange={handleChange} className="w-full p-2.5 bg-stone-950 border border-stone-800 rounded-lg text-stone-300 outline-none focus:border-blue-500/50 transition-all focus:bg-stone-900" /></div>
                        <div className="bg-stone-950 p-4 rounded-xl border border-stone-800">
                            <div className="grid grid-cols-2 gap-4">
                                <div><label className="text-[10px] font-bold text-stone-500 uppercase pl-1">Bank Name</label><input name="bank_name" value={formData.bank_name || ''} onChange={handleChange} className="w-full p-2 bg-stone-900 border border-stone-800 rounded text-stone-300 outline-none focus:border-blue-500/30" /></div>
                                <div><label className="text-[10px] font-bold text-stone-500 uppercase pl-1">Account No</label><input name="account_no" value={formData.account_no || ''} onChange={handleChange} className="w-full p-2 bg-stone-900 border border-stone-800 rounded text-stone-300 outline-none focus:border-blue-500/30" /></div>
                                <div className="col-span-2"><label className="text-[10px] font-bold text-stone-500 uppercase pl-1">IFSC Code</label><input name="ifsc_code" value={formData.ifsc_code || ''} onChange={handleChange} className="w-full p-2 bg-stone-900 border border-stone-800 rounded text-stone-300 outline-none focus:border-blue-500/30" /></div>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="p-6 bg-stone-950/50 border-t border-stone-800 flex justify-end space-x-4">
                    <button onClick={onClose} className="px-6 py-2.5 rounded-xl font-bold text-stone-400 hover:text-stone-200 hover:bg-stone-800 transition-all text-sm">Cancel</button>
                    <button onClick={handleSave} className="flex items-center space-x-2 px-8 py-2.5 rounded-xl font-bold bg-gradient-to-r from-teal-700 to-teal-600 text-white hover:from-teal-600 hover:to-teal-500 shadow-lg transition-all text-sm">
                        <Save className="w-4 h-4" />
                        <span>Save Changes</span>
                    </button>
                </div>
            </div>
        </div>
    );
};
export default EditAgniveerModal;
