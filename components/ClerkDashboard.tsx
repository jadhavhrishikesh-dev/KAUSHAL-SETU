
import React, { useState, useEffect } from 'react';
import { User } from '../types';

const ClerkDashboard: React.FC<{ user: User }> = ({ user }) => {
    const [agniveers, setAgniveers] = useState<any[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [filterBatch, setFilterBatch] = useState('');
    const [stats, setStats] = useState<{ total_agniveers: number, by_batch: Record<string, any> }>({ total_agniveers: 0, by_batch: {} });
    const [editingAgniveer, setEditingAgniveer] = useState<any | null>(null);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);

    // Date formatted helper
    const formatDate = (dateString: string | null) => {
        if (!dateString) return '';
        const d = new Date(dateString);
        if (isNaN(d.getTime())) return dateString;
        return `${d.getDate().toString().padStart(2, '0')}-${(d.getMonth() + 1).toString().padStart(2, '0')}-${d.getFullYear()}`;
    };

    useEffect(() => {
        fetchStats();
    }, []);

    useEffect(() => {
        fetchAgniveers();
    }, [searchQuery, filterBatch]);

    const fetchStats = async () => {
        try {
            const token = localStorage.getItem('token');
            const res = await fetch('http://localhost:8000/api/admin/stats', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) setStats(await res.json());
        } catch (e) { console.error(e); }
    };

    const fetchAgniveers = async () => {
        // Auto-filter by backend's role access (only returns company agniveers)
        let url = 'http://localhost:8000/api/admin/agniveers?';
        if (searchQuery) url += `q=${searchQuery}&`;
        if (filterBatch) url += `batch=${filterBatch}`;

        try {
            const token = localStorage.getItem('token');
            const res = await fetch(url, { headers: { 'Authorization': `Bearer ${token}` } });
            if (res.ok) setAgniveers(await res.json());
        } catch (e) { console.error(e); }
    };

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
            const res = await fetch(`http://localhost:8000/api/admin/agniveers/${editingAgniveer.id}`, {
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
                    <p className="text-stone-500">Data Management & Record Keeping</p>
                </div>
            </header>

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
                    <h2 className="font-bold text-stone-700">Company Roster ({agniveers.length})</h2>
                    <input
                        type="text"
                        placeholder="Search Name / service ID..."
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
                        {agniveers.length === 0 && <tr><td colSpan={5} className="p-8 text-center text-stone-400">No Agniveers found.</td></tr>}
                    </tbody>
                </table>
            </div>

            {/* Edit Modal (Reused Logic) */}
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

                            {/* Full Banking & IDs could be added here similar to Admin Dashboard */}
                            <div className="md:col-span-2"><label className="text-xs font-bold text-stone-500 uppercase">Address</label><textarea name="hometown_address" value={editingAgniveer.hometown_address || ''} onChange={handleEditChange as any} className="w-full p-2 border rounded" /></div>
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
