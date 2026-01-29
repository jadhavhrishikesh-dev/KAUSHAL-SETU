import React, { useState } from 'react';
import { User } from '../../types';
import { API_BASE_URL } from '../../config';
import { formatDate } from '../utils';

interface CompanyAgniveersProps {
    user: User;
    agniveers: any[];
    onRefresh: () => void;
}

const CompanyAgniveers: React.FC<CompanyAgniveersProps> = ({ user, agniveers, onRefresh }) => {
    const [searchQuery, setSearchQuery] = useState('');
    const [editingAgniveer, setEditingAgniveer] = useState<any | null>(null);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);

    // Assessment Modal State
    const [isAssessmentModalOpen, setIsAssessmentModalOpen] = useState(false);
    const [assessmentAgniveer, setAssessmentAgniveer] = useState<any | null>(null);
    const [assessmentType, setAssessmentType] = useState<'BEHAVIORAL' | 'ACHIEVEMENT'>('BEHAVIORAL');

    const [behavForm, setBehavForm] = useState({
        quarter: 'Q1', initiative: '', dedication: '', team_spirit: '', courage: '', motivation: '', adaptability: '', communication: ''
    });
    const [achieveForm, setAchieveForm] = useState({
        title: '', type: 'SPORTS', points: '', validity_months: '24'
    });

    // Filtering
    const filteredAgniveers = agniveers.filter(a =>
        a.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (a.service_id && a.service_id.toLowerCase().includes(searchQuery.toLowerCase()))
    );

    const openEditModal = (agniveer: any) => {
        const formatted = { ...agniveer };
        // Pre-format dates for display
        if (formatted.dob) formatted.dob = formatDate(formatted.dob);
        if (formatted.reporting_date) formatted.reporting_date = formatDate(formatted.reporting_date);
        setEditingAgniveer(formatted);
        setIsEditModalOpen(true);
    };

    const handleEditChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        if (!editingAgniveer) return;
        setEditingAgniveer({ ...editingAgniveer, [e.target.name]: e.target.value });
    };

    const handleSaveEdit = async () => {
        if (!editingAgniveer) return;

        // Payload Prep
        const payload: any = { ...editingAgniveer };
        const dateFields = ['dob', 'reporting_date'];

        dateFields.forEach(f => {
            if (payload[f] && /^\d{2}-\d{2}-\d{4}$/.test(payload[f])) {
                const [d, m, y] = payload[f].split('-');
                payload[f] = `${y}-${m}-${d}`;
            } else if (payload[f] && payload[f].includes('T')) {
                payload[f] = payload[f].split('T')[0];
            }
        });

        Object.keys(payload).forEach(key => {
            if (payload[key] === '') payload[key] = null;
        });

        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`${API_BASE_URL}/api/admin/agniveers/${editingAgniveer.id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(payload)
            });

            if (res.ok) {
                setIsEditModalOpen(false);
                setEditingAgniveer(null);
                onRefresh();
                alert("Updated Successfully");
            } else {
                const err = await res.json();
                alert(`Update Failed: ${err.detail}`);
            }
        } catch (e) { alert("Network Error"); }
    };

    const openAssessmentModal = (agniveer: any) => {
        setAssessmentAgniveer(agniveer);
        // Reset forms
        setBehavForm({ quarter: 'Q1', initiative: '', dedication: '', team_spirit: '', courage: '', motivation: '', adaptability: '', communication: '' });
        setAchieveForm({ title: '', type: 'SPORTS', points: '', validity_months: '24' });
        setIsAssessmentModalOpen(true);
    };

    const handleAssessmentSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!assessmentAgniveer) return;

        let url = '';
        let body = {};

        if (assessmentType === 'BEHAVIORAL') {
            url = `${API_BASE_URL}/api/assessments/behavioral`;
            body = {
                agniveer_id: assessmentAgniveer.id,
                assessment_date: new Date().toISOString(),
                quarter: behavForm.quarter,
                initiative: parseFloat(behavForm.initiative),
                dedication: parseFloat(behavForm.dedication),
                team_spirit: parseFloat(behavForm.team_spirit),
                courage: parseFloat(behavForm.courage),
                motivation: parseFloat(behavForm.motivation),
                adaptability: parseFloat(behavForm.adaptability),
                communication: parseFloat(behavForm.communication),
            };
        } else {
            url = `${API_BASE_URL}/api/achievements`;
            body = {
                agniveer_id: assessmentAgniveer.id,
                title: achieveForm.title,
                type: achieveForm.type,
                points: parseFloat(achieveForm.points),
                date_earned: new Date().toISOString(),
                validity_months: parseInt(achieveForm.validity_months)
            };
        }

        try {
            const token = localStorage.getItem('token');
            const res = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify(body)
            });

            if (res.ok) {
                alert("Assessment Saved! Recalculating RRI...");
                // Trigger RRI Recalculation
                await fetch(`${API_BASE_URL}/api/rri/calculate/${assessmentAgniveer.id}`, { method: 'POST' });
                setIsAssessmentModalOpen(false);
            } else {
                const err = await res.json();
                alert(`Failed: ${err.detail}`);
            }
        } catch (e) { console.error(e); alert("Network Error"); }
    };

    return (
        <>
            <div className="bg-white rounded-xl shadow border border-stone-200 overflow-hidden">
                <div className="p-4 border-b border-stone-200 bg-stone-50 flex justify-between items-center">
                    <h2 className="font-bold text-stone-700">Company Roster</h2>
                    <input
                        type="text"
                        placeholder="Search Name / service ID..."
                        className="border border-stone-300 rounded-lg px-4 py-2 text-sm outline-none focus:border-teal-500"
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                    />
                </div>
                <table className="w-full text-sm text-left">
                    <thead className="bg-white text-stone-500 font-bold uppercase text-xs border-b border-stone-200">
                        <tr>
                            <th className="p-3">Service ID</th>
                            <th className="p-3">Name</th>
                            <th className="p-3">Rank</th>
                            <th className="p-3">Batch</th>
                            <th className="p-3 text-right">Action</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-stone-100 font-mono text-xs">
                        {filteredAgniveers.map((a: any) => (
                            <tr key={a.id} className="hover:bg-stone-50">
                                <td className="p-3 font-bold text-teal-700">{a.service_id}</td>
                                <td className="p-3 text-stone-800">{a.name}</td>
                                <td className="p-3 text-stone-600">{a.rank || '-'}</td>
                                <td className="p-3 text-stone-600">{a.batch_no}</td>
                                <td className="p-3 text-right">
                                    <button onClick={() => openEditModal(a)} className="text-blue-600 hover:text-blue-800 font-bold mr-3">Edit</button>
                                    <button onClick={() => openAssessmentModal(a)} className="text-teal-600 hover:text-teal-800 font-bold">Assess</button>
                                </td>
                            </tr>
                        ))}
                        {filteredAgniveers.length === 0 && <tr><td colSpan={5} className="p-8 text-center text-stone-400">No Agniveers found.</td></tr>}
                    </tbody>
                </table>
            </div>

            {/* Edit Modal */}
            {isEditModalOpen && editingAgniveer && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto flex flex-col">
                        <div className="p-6 border-b border-stone-200 flex justify-between items-center bg-stone-50">
                            <h3 className="text-xl font-bold text-stone-800">Edit Agniveer Profile</h3>
                            <button onClick={() => setIsEditModalOpen(false)} className="text-stone-400 hover:text-stone-600">
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                            </button>
                        </div>
                        <div className="p-8 grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* Basic Fields */}
                            <div><label className="text-xs font-bold text-stone-500 uppercase">Service ID</label><input name="service_id" value={editingAgniveer.service_id || ''} onChange={handleEditChange} className="w-full p-2 border rounded" /></div>
                            <div><label className="text-xs font-bold text-stone-500 uppercase">Name</label><input name="name" value={editingAgniveer.name || ''} onChange={handleEditChange} className="w-full p-2 border rounded" /></div>
                            <div><label className="text-xs font-bold text-stone-500 uppercase">DOB (DD-MM-YYYY)</label><input name="dob" value={editingAgniveer.dob || ''} onChange={handleEditChange} className="w-full p-2 border rounded" placeholder="DD-MM-YYYY" /></div>
                            <div><label className="text-xs font-bold text-stone-500 uppercase">Reporting Date</label><input name="reporting_date" value={editingAgniveer.reporting_date || ''} onChange={handleEditChange} className="w-full p-2 border rounded" placeholder="DD-MM-YYYY" /></div>

                            {/* Service Fields */}
                            <div><label className="text-xs font-bold text-stone-500 uppercase">Rank</label><input name="rank" value={editingAgniveer.rank || ''} onChange={handleEditChange} className="w-full p-2 border rounded" /></div>
                            <div><label className="text-xs font-bold text-stone-500 uppercase">Unit</label><input name="unit" value={editingAgniveer.unit || ''} onChange={handleEditChange} className="w-full p-2 border rounded" /></div>

                            {/* Contact & NOK */}
                            <div><label className="text-xs font-bold text-stone-500 uppercase">Email</label><input name="email" value={editingAgniveer.email || ''} onChange={handleEditChange} className="w-full p-2 border rounded" /></div>
                            <div><label className="text-xs font-bold text-stone-500 uppercase">Phone</label><input name="phone" value={editingAgniveer.phone || ''} onChange={handleEditChange} className="w-full p-2 border rounded" /></div>
                            <div><label className="text-xs font-bold text-stone-500 uppercase">NOK Name</label><input name="nok_name" value={editingAgniveer.nok_name || ''} onChange={handleEditChange} className="w-full p-2 border rounded" /></div>
                            <div><label className="text-xs font-bold text-stone-500 uppercase">NOK Phone</label><input name="nok_phone" value={editingAgniveer.nok_phone || ''} onChange={handleEditChange} className="w-full p-2 border rounded" /></div>

                            <div className="md:col-span-2"><label className="text-xs font-bold text-stone-500 uppercase">Address</label><textarea name="hometown_address" value={editingAgniveer.hometown_address || ''} onChange={handleEditChange as any} className="w-full p-2 border rounded" /></div>
                        </div>
                        <div className="p-6 bg-stone-50 border-t border-stone-200 flex justify-end space-x-4">
                            <button onClick={() => setIsEditModalOpen(false)} className="px-6 py-2 rounded-lg font-bold text-stone-500 hover:bg-stone-200">Cancel</button>
                            <button onClick={handleSaveEdit} className="px-6 py-2 rounded-lg font-bold bg-teal-700 text-white hover:bg-teal-800 shadow-md">Save Changes</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Assessment Modal */}
            {isAssessmentModalOpen && assessmentAgniveer && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto flex flex-col">
                        <div className="p-6 border-b border-stone-200 flex justify-between items-center bg-stone-50">
                            <h3 className="text-xl font-bold text-stone-800">Add Assessment: {assessmentAgniveer.name}</h3>
                            <button onClick={() => setIsAssessmentModalOpen(false)} className="text-stone-400 hover:text-stone-600">
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                            </button>
                        </div>

                        <div className="p-6 bg-stone-100 flex justify-center space-x-4">
                            <button onClick={() => setAssessmentType('BEHAVIORAL')} className={`px-4 py-2 rounded-lg font-bold text-xs uppercase ${assessmentType === 'BEHAVIORAL' ? 'bg-teal-600 text-white' : 'bg-white text-stone-500 shadow-sm'}`}>Behavioral</button>
                            <button onClick={() => setAssessmentType('ACHIEVEMENT')} className={`px-4 py-2 rounded-lg font-bold text-xs uppercase ${assessmentType === 'ACHIEVEMENT' ? 'bg-teal-600 text-white' : 'bg-white text-stone-500 shadow-sm'}`}>Achievement</button>
                        </div>

                        <form onSubmit={handleAssessmentSubmit} className="p-8">
                            {assessmentType === 'BEHAVIORAL' && (
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                    <div>
                                        <label className="block text-xs font-bold text-stone-500 mb-1">Quarter</label>
                                        <select className="w-full p-2 border rounded" value={behavForm.quarter} onChange={e => setBehavForm({ ...behavForm, quarter: e.target.value })}>
                                            <option>Q1</option><option>Q2</option><option>Q3</option><option>Q4</option>
                                        </select>
                                    </div>
                                    {['Initiative', 'Dedication', 'Team Spirit', 'Courage', 'Motivation', 'Adaptability', 'Communication'].map(field => {
                                        const key = field.toLowerCase().replace(' ', '_') as keyof typeof behavForm;
                                        if (key === 'quarter') return null;
                                        return (
                                            <div key={key}>
                                                <label className="block text-xs font-bold text-stone-500 mb-1">{field} (1-10)</label>
                                                <input required type="number" min="1" max="10" step="0.1" className="w-full p-2 border rounded" value={behavForm[key]} onChange={(e) => setBehavForm({ ...behavForm, [key]: e.target.value })} />
                                            </div>
                                        );
                                    })}
                                </div>
                            )}

                            {assessmentType === 'ACHIEVEMENT' && (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="md:col-span-2">
                                        <label className="block text-xs font-bold text-stone-500 mb-1">Title</label>
                                        <input required className="w-full p-2 border rounded" value={achieveForm.title} onChange={e => setAchieveForm({ ...achieveForm, title: e.target.value })} placeholder="e.g. Best Driver" />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-stone-500 mb-1">Type</label>
                                        <select className="w-full p-2 border rounded" value={achieveForm.type} onChange={e => setAchieveForm({ ...achieveForm, type: e.target.value })}>
                                            <option value="SPORTS">Sports</option>
                                            <option value="TECHNICAL">Technical</option>
                                            <option value="LEADERSHIP">Leadership</option>
                                            <option value="BRAVERY">Bravery</option>
                                            <option value="INNOVATION">Innovation</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-stone-500 mb-1">Points</label>
                                        <input required type="number" className="w-full p-2 border rounded" value={achieveForm.points} onChange={e => setAchieveForm({ ...achieveForm, points: e.target.value })} />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-stone-500 mb-1">Validity (Months)</label>
                                        <input required type="number" className="w-full p-2 border rounded" value={achieveForm.validity_months} onChange={e => setAchieveForm({ ...achieveForm, validity_months: e.target.value })} />
                                    </div>
                                </div>
                            )}

                            <div className="mt-8 flex justify-end space-x-4">
                                <button type="button" onClick={() => setIsAssessmentModalOpen(false)} className="px-6 py-2 rounded-lg font-bold text-stone-500 hover:bg-stone-200">Cancel</button>
                                <button type="submit" className="px-6 py-2 rounded-lg font-bold bg-teal-700 text-white hover:bg-teal-800 shadow-md">Submit Entry</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </>
    );
};
export default CompanyAgniveers;
