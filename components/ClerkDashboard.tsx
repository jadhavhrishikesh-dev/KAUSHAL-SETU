import React, { useState, useEffect } from 'react';
import { User } from '../types';
import { API_BASE_URL } from '../config';
import { formatDate } from './utils';

const ClerkDashboard: React.FC<{ user: User }> = ({ user }) => {
    const [agniveers, setAgniveers] = useState<any[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [filterBatch, setFilterBatch] = useState('');
    const [stats, setStats] = useState<{ total_agniveers: number, by_batch: Record<string, any> }>({ total_agniveers: 0, by_batch: {} });

    // V2 State
    const [activeTab, setActiveTab] = useState<'roster' | 'medical' | 'leave'>('roster');
    const [selectedAgniveer, setSelectedAgniveer] = useState<any | null>(null); // Replaces editingAgniveer
    const [medicalRecords, setMedicalRecords] = useState<any[]>([]);
    const [leaveRecords, setLeaveRecords] = useState<any[]>([]);

    // Modal States
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [isMedicalModalOpen, setIsMedicalModalOpen] = useState(false);
    const [isLeaveModalOpen, setIsLeaveModalOpen] = useState(false);

    // Form Data
    const [medicalForm, setMedicalForm] = useState({ diagnosis: '', hospital_name: '', admission_date: '', discharge_date: '', category: 'SHAPE 1', remarks: '' });
    const [leaveForm, setLeaveForm] = useState({ leave_type: 'CASUAL', start_date: '', end_date: '', reason: '' });


    useEffect(() => {
        fetchStats();
    }, []);

    useEffect(() => {
        fetchAgniveers();
    }, [searchQuery, filterBatch]);

    useEffect(() => {
        if (selectedAgniveer) {
            if (activeTab === 'medical') fetchMedicalRecords(selectedAgniveer.id);
            if (activeTab === 'leave') fetchLeaveRecords(selectedAgniveer.id);
        }
    }, [selectedAgniveer, activeTab]);

    const fetchStats = async () => {
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`${API_BASE_URL}/api/admin/stats`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) setStats(await res.json());
        } catch (e) { console.error(e); }
    };

    const fetchAgniveers = async () => {
        let url = `${API_BASE_URL}/api/admin/agniveers?`;
        if (searchQuery) url += `q=${searchQuery}&`;
        if (filterBatch) url += `batch=${filterBatch}`;

        try {
            const token = localStorage.getItem('token');
            const res = await fetch(url, { headers: { 'Authorization': `Bearer ${token}` } });
            if (res.ok) setAgniveers(await res.json());
        } catch (e) { console.error(e); }
    };

    const fetchMedicalRecords = async (id: number) => {
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`${API_BASE_URL}/api/medical/${id}`, { headers: { 'Authorization': `Bearer ${token}` } });
            if (res.ok) setMedicalRecords(await res.json());
        } catch (e) { console.error(e); }
    };

    const fetchLeaveRecords = async (id: number) => {
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`${API_BASE_URL}/api/leave/${id}`, { headers: { 'Authorization': `Bearer ${token}` } });
            if (res.ok) setLeaveRecords(await res.json());
        } catch (e) { console.error(e); }
    };

    const handleAddMedical = async () => {
        if (!selectedAgniveer) return;
        try {
            const token = localStorage.getItem('token');
            const payload = { ...medicalForm, agniveer_id: selectedAgniveer.id };
            // Ensure dates are not empty strings if optional
            if (!payload.discharge_date) delete (payload as any).discharge_date;

            const res = await fetch(`${API_BASE_URL}/api/medical/add`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify(payload)
            });
            if (res.ok) {
                alert("Medical Record Added");
                setIsMedicalModalOpen(false);
                fetchMedicalRecords(selectedAgniveer.id);
                setMedicalForm({ diagnosis: '', hospital_name: '', admission_date: '', discharge_date: '', category: 'SHAPE 1', remarks: '' });
            } else {
                const err = await res.json();
                alert(`Failed: ${err.detail || 'Unknown Error'}`);
            }
        } catch (e) { console.error(e); }
    };

    const handleAddLeave = async () => {
        if (!selectedAgniveer) return;
        try {
            const token = localStorage.getItem('token');
            const payload = { ...leaveForm, agniveer_id: selectedAgniveer.id };
            const res = await fetch(`${API_BASE_URL}/api/leave/apply`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify(payload)
            });
            if (res.ok) {
                alert("Leave Recorded");
                setIsLeaveModalOpen(false);
                fetchLeaveRecords(selectedAgniveer.id);
                setLeaveForm({ leave_type: 'CASUAL', start_date: '', end_date: '', reason: '' });
            } else {
                alert("Failed to record leave");
            }
        } catch (e) { console.error(e); }
    };

    const openEditModal = (agniveer: any) => {
        const formatted = { ...agniveer };
        // Pre-format dates for display handled by input value parsing if needed, but we keep raw for edit?
        // Actually, existing logic relied on formatDate utility which returned DD-MM-YYYY.
        // We removed local formatDate. Let's rely on standard 'YYYY-MM-DD' for input fields if possible, or keep using formatDate from utils for DISPLAY only.
        // For inputs type="date", we need YYYY-MM-DD.
        // The backend sends ISO.
        if (formatted.dob) formatted.dob = formatted.dob.split('T')[0];
        if (formatted.reporting_date) formatted.reporting_date = formatted.reporting_date.split('T')[0];

        setSelectedAgniveer(formatted);
        setIsEditModalOpen(true);
    };

    const handleEditChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        if (!selectedAgniveer) return;
        setSelectedAgniveer({ ...selectedAgniveer, [e.target.name]: e.target.value });
    };

    const handleSaveEdit = async () => {
        if (!selectedAgniveer) return;

        // Payload Prep
        const payload: any = { ...selectedAgniveer };
        const dateFields = ['dob', 'reporting_date'];

        // Existing logic handled 'DD-MM-YYYY' conversion, but if we use type="date" inputs, we get 'YYYY-MM-DD' directly.
        // Let's assume we stick to standardized inputs.

        Object.keys(payload).forEach(key => {
            if (payload[key] === '') payload[key] = null;
        });

        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`${API_BASE_URL}/api/admin/agniveers/${selectedAgniveer.id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(payload)
            });

            if (res.ok) {
                setIsEditModalOpen(false);
                setSelectedAgniveer(null);
                fetchAgniveers();
                alert("Updated Successfully");
            } else {
                const err = await res.json();
                alert(`Update Failed: ${err.detail}`);
            }
        } catch (e) { alert("Network Error"); }
    };

    return (
        <div className="space-y-6">
            <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-stone-800">{user.company} Clerk Office</h1>
                    <p className="text-stone-500">Data Management & Record Keeping (V2)</p>
                </div>
            </header>

            {/* Navigation Tabs */}
            <div className="flex border-b border-stone-200 space-x-6">
                <button onClick={() => setActiveTab('roster')} className={`pb-2 font-bold text-sm ${activeTab === 'roster' ? 'border-b-2 border-teal-600 text-teal-700' : 'text-gray-500'}`}>Company Roster</button>
                <button onClick={() => { setActiveTab('medical'); setSelectedAgniveer(null); }} className={`pb-2 font-bold text-sm ${activeTab === 'medical' ? 'border-b-2 border-teal-600 text-teal-700' : 'text-gray-500'}`}>Medical Management</button>
                <button onClick={() => { setActiveTab('leave'); setSelectedAgniveer(null); }} className={`pb-2 font-bold text-sm ${activeTab === 'leave' ? 'border-b-2 border-teal-600 text-teal-700' : 'text-gray-500'}`}>Leave Ledger</button>
            </div>

            {/* Stats Overview */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white p-6 rounded-xl shadow-sm border border-stone-100 flex items-center justify-between">
                    <div>
                        <h3 className="text-stone-500 font-bold text-sm uppercase">Total Agniveers</h3>
                        <p className="text-4xl font-black text-teal-700 mt-2">{stats.total_agniveers || 0}</p>
                    </div>
                </div>
                <div className="bg-white p-6 rounded-xl shadow-sm border border-stone-100">
                    <h3 className="text-stone-500 font-bold text-sm uppercase mb-2">Batch Breakdown</h3>
                    <div className="flex flex-wrap gap-2">
                        {Object.entries(stats.by_batch).map(([batch, count]) => (
                            <div key={batch} className="bg-stone-50 px-3 py-1 rounded border border-stone-200 text-xs shadow-sm">
                                <span className="font-bold text-stone-600">{batch}:</span> <span className="text-teal-700 font-bold ml-1">{count as number}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Management View */}
            <div className="bg-white rounded-xl shadow border border-stone-200 overflow-hidden">
                <div className="p-4 border-b border-stone-200 bg-stone-50 flex justify-between items-center">
                    <h2 className="font-bold text-stone-700">
                        {activeTab === 'roster' ? `Company Roster (${agniveers.length})` :
                            selectedAgniveer ? `${selectedAgniveer.name} - ${activeTab === 'medical' ? 'Medical History' : 'Leave Ledger'}` :
                                `Select Agniveer for ${activeTab === 'medical' ? 'Medical' : 'Leave'} Records`}
                    </h2>
                    {!selectedAgniveer && (
                        <div className="flex items-center">
                            <input
                                type="text"
                                placeholder="Search Name / Service ID..."
                                className="border border-stone-300 rounded-lg px-4 py-2 text-sm outline-none focus:border-teal-500"
                                value={searchQuery}
                                onChange={e => setSearchQuery(e.target.value)}
                            />
                            <select
                                value={filterBatch}
                                onChange={(e) => setFilterBatch(e.target.value)}
                                className="ml-4 p-2 text-sm border border-stone-300 rounded-lg outline-none"
                            >
                                <option value="">All Batches</option>
                                {Object.keys(stats.by_batch).map(b => (
                                    <option key={b} value={b}>{b}</option>
                                ))}
                            </select>
                        </div>
                    )}
                </div>

                {/* Roster View */}
                {activeTab === 'roster' && (
                    <table className="w-full text-sm text-left">
                        <thead className="bg-white text-stone-500 font-bold uppercase text-xs border-b border-stone-200">
                            <tr>
                                <th className="p-3">Service ID</th>
                                <th className="p-3">Name</th>
                                <th className="p-3">Batch</th>
                                <th className="p-3 text-right">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-stone-100 font-mono text-xs">
                            {agniveers.map((a: any) => (
                                <tr key={a.id} className="hover:bg-stone-50">
                                    <td className="p-3 font-bold text-teal-700">{a.service_id}</td>
                                    <td className="p-3 text-stone-800">{a.name}</td>
                                    <td className="p-3 text-stone-600">{a.batch_no}</td>
                                    <td className="p-3 text-right">
                                        <button onClick={() => openEditModal(a)} className="text-blue-600 hover:text-blue-800 font-bold">Edit Profile</button>
                                    </td>
                                </tr>
                            ))}
                            {agniveers.length === 0 && <tr><td colSpan={4} className="p-8 text-center text-stone-400">No Agniveers found.</td></tr>}
                        </tbody>
                    </table>
                )}

                {/* Medical & Leave Master View: List Selection */}
                {(activeTab === 'medical' || activeTab === 'leave') && !selectedAgniveer && (
                    <table className="w-full text-sm text-left">
                        <thead className="bg-white text-stone-500 font-bold uppercase text-xs border-b border-stone-200">
                            <tr>
                                <th className="p-3">Service ID</th>
                                <th className="p-3">Name</th>
                                <th className="p-3">Unit/Coy</th>
                                <th className="p-3 text-right">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-stone-100 font-mono text-xs">
                            {agniveers.map((a: any) => (
                                <tr key={a.id} className="hover:bg-stone-50">
                                    <td className="p-3 font-bold text-teal-700">{a.service_id}</td>
                                    <td className="p-3 text-stone-800">{a.name}</td>
                                    <td className="p-3 text-stone-600">{a.unit} / {a.company}</td>
                                    <td className="p-3 text-right">
                                        <button onClick={() => setSelectedAgniveer(a)} className="bg-stone-100 text-stone-600 hover:bg-stone-200 px-3 py-1 rounded-md font-bold">
                                            Select
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}

                {/* Detail Views for Medical/Leave */}
                {selectedAgniveer && (activeTab === 'medical' || activeTab === 'leave') && (
                    <div className="p-6 bg-white">
                        <div className="flex justify-between items-center mb-6">
                            <div className="flex space-x-2">
                                <button onClick={() => setSelectedAgniveer(null)} className="px-4 py-2 text-stone-500 hover:bg-stone-100 rounded-md font-bold">← Back</button>
                                <button
                                    onClick={() => activeTab === 'medical' ? setIsMedicalModalOpen(true) : setIsLeaveModalOpen(true)}
                                    className="px-4 py-2 bg-teal-700 text-white rounded-md font-bold hover:bg-teal-800"
                                >
                                    + Add {activeTab === 'medical' ? 'Medical' : 'Leave'} Record
                                </button>
                            </div>
                        </div>

                        {activeTab === 'medical' ? (
                            <table className="w-full text-sm text-left border rounded-lg">
                                <thead className="bg-stone-50 text-stone-500 font-bold uppercase text-xs">
                                    <tr>
                                        <th className="p-3">Admission</th>
                                        <th className="p-3">Diagnosis</th>
                                        <th className="p-3">Hospital</th>
                                        <th className="p-3">Category</th>
                                        <th className="p-3">Remarks</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-stone-100">
                                    {medicalRecords.length === 0 && <tr><td colSpan={5} className="p-4 text-center text-stone-400">No records found.</td></tr>}
                                    {medicalRecords.map((m: any) => (
                                        <tr key={m.id}>
                                            <td className="p-3">{formatDate(m.admission_date)}</td>
                                            <td className="p-3 font-medium">{m.diagnosis}</td>
                                            <td className="p-3">{m.hospital_name}</td>
                                            <td className="p-3"><span className={`px-2 py-1 rounded text-xs font-bold ${m.category === 'SHAPE 1' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>{m.category}</span></td>
                                            <td className="p-3 text-stone-500">{m.remarks || '-'}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        ) : (
                            <table className="w-full text-sm text-left border rounded-lg">
                                <thead className="bg-stone-50 text-stone-500 font-bold uppercase text-xs">
                                    <tr>
                                        <th className="p-3">Start Date</th>
                                        <th className="p-3">End Date</th>
                                        <th className="p-3">Type</th>
                                        <th className="p-3">Days</th>
                                        <th className="p-3">Reason</th>
                                        <th className="p-3">Status</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-stone-100">
                                    {leaveRecords.length === 0 && <tr><td colSpan={6} className="p-4 text-center text-stone-400">No records found.</td></tr>}
                                    {leaveRecords.map((l: any) => (
                                        <tr key={l.id}>
                                            <td className="p-3">{formatDate(l.start_date)}</td>
                                            <td className="p-3">{formatDate(l.end_date)}</td>
                                            <td className="p-3 font-bold">{l.leave_type}</td>
                                            <td className="p-3">{Math.round((new Date(l.end_date).getTime() - new Date(l.start_date).getTime()) / (1000 * 3600 * 24))}d</td>
                                            <td className="p-3 text-stone-500">{l.reason}</td>
                                            <td className="p-3"><span className="bg-yellow-100 text-yellow-800 px-2 py-1 rounded text-xs font-bold">{l.status}</span></td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </div>
                )}
            </div>

            {/* Medical Modal */}
            {isMedicalModalOpen && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-xl p-6 w-full max-w-lg">
                        <h3 className="text-xl font-bold mb-4">Add Medical Record</h3>
                        <div className="space-y-3">
                            <input value={medicalForm.diagnosis} onChange={e => setMedicalForm({ ...medicalForm, diagnosis: e.target.value })} placeholder="Diagnosis" className="w-full p-2 border rounded" />
                            <input value={medicalForm.hospital_name} onChange={e => setMedicalForm({ ...medicalForm, hospital_name: e.target.value })} placeholder="Hospital Name" className="w-full p-2 border rounded" />
                            <div className="grid grid-cols-2 gap-2">
                                <input type="date" value={medicalForm.admission_date} onChange={e => setMedicalForm({ ...medicalForm, admission_date: e.target.value })} className="w-full p-2 border rounded" title="Admission Date" />
                                <input type="date" value={medicalForm.discharge_date} onChange={e => setMedicalForm({ ...medicalForm, discharge_date: e.target.value })} className="w-full p-2 border rounded" title="Discharge Date (Optional)" />
                            </div>
                            <select value={medicalForm.category} onChange={e => setMedicalForm({ ...medicalForm, category: e.target.value })} className="w-full p-2 border rounded">
                                <option>SHAPE 1</option><option>SHAPE 2</option><option>SHAPE 3</option><option>SHAPE 4</option><option>SHAPE 5</option>
                            </select>
                            <textarea value={medicalForm.remarks} onChange={e => setMedicalForm({ ...medicalForm, remarks: e.target.value })} placeholder="Remarks" className="w-full p-2 border rounded" />
                        </div>
                        <div className="flex justify-end gap-2 mt-4">
                            <button onClick={() => setIsMedicalModalOpen(false)} className="px-4 py-2 text-stone-500">Cancel</button>
                            <button onClick={handleAddMedical} className="px-4 py-2 bg-teal-700 text-white rounded font-bold">Save</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Leave Modal */}
            {isLeaveModalOpen && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-xl p-6 w-full max-w-lg">
                        <h3 className="text-xl font-bold mb-4">Record Leave Entry</h3>
                        <div className="space-y-3">
                            <select value={leaveForm.leave_type} onChange={e => setLeaveForm({ ...leaveForm, leave_type: e.target.value })} className="w-full p-2 border rounded">
                                <option value="CASUAL">Casual Leave</option>
                                <option value="ANNUAL">Annual Leave</option>
                                <option value="MEDICAL">Medical Leave</option>
                                <option value="SPECIAL">Special Leave</option>
                            </select>
                            <div className="grid grid-cols-2 gap-2">
                                <input type="date" value={leaveForm.start_date} onChange={e => setLeaveForm({ ...leaveForm, start_date: e.target.value })} className="w-full p-2 border rounded" required />
                                <input type="date" value={leaveForm.end_date} onChange={e => setLeaveForm({ ...leaveForm, end_date: e.target.value })} className="w-full p-2 border rounded" required />
                            </div>
                            <textarea value={leaveForm.reason} onChange={e => setLeaveForm({ ...leaveForm, reason: e.target.value })} placeholder="Reason / Remarks" className="w-full p-2 border rounded" />
                        </div>
                        <div className="flex justify-end gap-2 mt-4">
                            <button onClick={() => setIsLeaveModalOpen(false)} className="px-4 py-2 text-stone-500">Cancel</button>
                            <button onClick={handleAddLeave} className="px-4 py-2 bg-teal-700 text-white rounded font-bold">Save</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Edit Modal (Reused Logic) */}
            {isEditModalOpen && selectedAgniveer && activeTab === 'roster' && (
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
                            <div><label className="text-xs font-bold text-stone-500 uppercase">Service ID</label><input name="service_id" value={selectedAgniveer.service_id || ''} onChange={handleEditChange} className="w-full p-2 border rounded" /></div>
                            <div><label className="text-xs font-bold text-stone-500 uppercase">Name</label><input name="name" value={selectedAgniveer.name || ''} onChange={handleEditChange} className="w-full p-2 border rounded" /></div>
                            <div><label className="text-xs font-bold text-stone-500 uppercase">DOB (iso date)</label><input type="date" name="dob" value={selectedAgniveer.dob || ''} onChange={handleEditChange} className="w-full p-2 border rounded" /></div>
                            <div><label className="text-xs font-bold text-stone-500 uppercase">Reporting Date (iso date)</label><input type="date" name="reporting_date" value={selectedAgniveer.reporting_date || ''} onChange={handleEditChange} className="w-full p-2 border rounded" /></div>

                            {/* Service Fields */}
                            <div><label className="text-xs font-bold text-stone-500 uppercase">Rank</label><input name="rank" value={selectedAgniveer.rank || ''} onChange={handleEditChange} className="w-full p-2 border rounded" /></div>
                            <div><label className="text-xs font-bold text-stone-500 uppercase">Unit</label><input name="unit" value={selectedAgniveer.unit || ''} onChange={handleEditChange} className="w-full p-2 border rounded" /></div>

                            {/* Contact & NOK */}
                            <div><label className="text-xs font-bold text-stone-500 uppercase">Email</label><input name="email" value={selectedAgniveer.email || ''} onChange={handleEditChange} className="w-full p-2 border rounded" /></div>
                            <div><label className="text-xs font-bold text-stone-500 uppercase">Phone</label><input name="phone" value={selectedAgniveer.phone || ''} onChange={handleEditChange} className="w-full p-2 border rounded" /></div>
                            <div><label className="text-xs font-bold text-stone-500 uppercase">NOK Name</label><input name="nok_name" value={selectedAgniveer.nok_name || ''} onChange={handleEditChange} className="w-full p-2 border rounded" /></div>
                            <div><label className="text-xs font-bold text-stone-500 uppercase">NOK Phone</label><input name="nok_phone" value={selectedAgniveer.nok_phone || ''} onChange={handleEditChange} className="w-full p-2 border rounded" /></div>

                            {/* Full Banking & IDs could be added here similar to Admin Dashboard */}
                            <div className="md:col-span-2"><label className="text-xs font-bold text-stone-500 uppercase">Address</label><textarea name="hometown_address" value={selectedAgniveer.hometown_address || ''} onChange={handleEditChange as any} className="w-full p-2 border rounded" /></div>
                        </div>
                        <div className="p-6 bg-stone-50 border-t border-stone-200 flex justify-end space-x-4">
                            <button onClick={() => setIsEditModalOpen(false)} className="px-6 py-2 rounded-lg font-bold text-stone-500 hover:bg-stone-200">Cancel</button>
                            <button onClick={handleSaveEdit} className="px-6 py-2 rounded-lg font-bold bg-teal-700 text-white hover:bg-teal-800 shadow-md">Save Changes</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ClerkDashboard;
