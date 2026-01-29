import React, { useState, useEffect } from 'react';
import { API_BASE_URL } from '../../config';
import EditAgniveerModal from './EditAgniveerModal';
import { Search, Filter, Edit2, Trash2, Database } from 'lucide-react';

const AgniveerDirectory: React.FC = () => {
    const [agniveers, setAgniveers] = useState<any[]>([]);
    const [stats, setStats] = useState({ by_batch: {}, by_company: {} });
    const [filterBatch, setFilterBatch] = useState('');
    const [filterCompany, setFilterCompany] = useState('');
    const [searchQuery, setSearchQuery] = useState('');

    // Modal State
    const [editingAgniveer, setEditingAgniveer] = useState<any | null>(null);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);

    const fetchAgniveers = async () => {
        let url = `${API_BASE_URL}/api/admin/agniveers?`;
        if (filterBatch) url += `batch=${filterBatch}&`;
        if (filterCompany) url += `company=${filterCompany}&`;
        if (searchQuery) url += `q=${searchQuery}`;

        try {
            const token = localStorage.getItem('token');
            const res = await fetch(url, { headers: { 'Authorization': `Bearer ${token}` } });
            if (res.ok) setAgniveers(await res.json());
        } catch (e) { console.error(e); }
    };

    const fetchStats = async () => {
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`${API_BASE_URL}/api/admin/stats`, { headers: { 'Authorization': `Bearer ${token}` } });
            if (res.ok) setStats(await res.json());
        } catch (e) { console.error(e); }
    };

    useEffect(() => {
        fetchStats();
    }, []);

    useEffect(() => {
        const timer = setTimeout(() => {
            fetchAgniveers();
        }, 300);
        return () => clearTimeout(timer);
    }, [filterBatch, filterCompany, searchQuery]);

    const handleDelete = async (id: number) => {
        if (!confirm("Are you sure you want to delete this Agniveer? This action cannot be undone.")) return;
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`${API_BASE_URL}/api/admin/agniveers/${id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (res.ok) {
                fetchAgniveers();
            } else {
                alert('Failed to delete Agniveer');
            }
        } catch (e) { console.error(e); }
    };

    const openEditModal = (agniveer: any) => {
        setEditingAgniveer(agniveer);
        setIsEditModalOpen(true);
    };

    return (
        <div className="bg-stone-900/80 backdrop-blur-md rounded-2xl shadow-2xl border border-stone-800 overflow-hidden flex flex-col h-full animate-in fade-in duration-500">
            <div className="p-4 border-b border-stone-800 bg-stone-900/50 flex items-center space-x-4">
                <div className="flex items-center space-x-3 text-stone-200 mr-4">
                    <Database className="w-5 h-5 text-teal-500" />
                    <h2 className="font-bold">Data Management</h2>
                </div>

                <div className="flex-1 relative group">
                    <span className="absolute left-3 top-2.5 text-stone-500 group-focus-within:text-yellow-500 transition-colors">
                        <Search className="w-4 h-4" />
                    </span>
                    <input
                        type="text"
                        placeholder="Search by Name or Service ID..."
                        className="w-full pl-9 pr-4 py-2 text-sm bg-stone-950 border border-stone-700 rounded-lg outline-none focus:border-yellow-500 focus:ring-1 focus:ring-yellow-500 text-stone-300 transition-all placeholder:text-stone-600"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>

                <div className="relative">
                    <Filter className="w-4 h-4 absolute left-3 top-3 text-stone-500 pointer-events-none" />
                    <select
                        value={filterBatch}
                        onChange={(e) => setFilterBatch(e.target.value)}
                        className="pl-9 p-2 text-sm bg-stone-950 border border-stone-700 rounded-lg outline-none focus:border-yellow-500 text-stone-300 appearance-none pr-8 cursor-pointer hover:bg-stone-900"
                    >
                        <option value="">All Batches</option>
                        {Object.keys(stats.by_batch).map(b => (
                            <option key={b} value={b}>{b}</option>
                        ))}
                    </select>
                </div>

                <div className="relative">
                    <Filter className="w-4 h-4 absolute left-3 top-3 text-stone-500 pointer-events-none" />
                    <select
                        value={filterCompany}
                        onChange={(e) => setFilterCompany(e.target.value)}
                        className="pl-9 p-2 text-sm bg-stone-950 border border-stone-700 rounded-lg outline-none focus:border-yellow-500 text-stone-300 appearance-none pr-8 cursor-pointer hover:bg-stone-900"
                    >
                        <option value="">All Companies</option>
                        {Object.keys(stats.by_company).map(c => (
                            <option key={c} value={c}>{c}</option>
                        ))}
                    </select>
                </div>
            </div>

            <div className="flex-1 overflow-auto">
                <table className="w-full text-sm text-left">
                    <thead className="bg-stone-950 text-stone-500 font-bold uppercase text-xs border-b border-stone-800 sticky top-0 shadow-lg z-10">
                        <tr>
                            <th className="p-4">Service ID</th>
                            <th className="p-4">Name</th>
                            <th className="p-4">Batch</th>
                            <th className="p-4">Company</th>
                            <th className="p-4">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-stone-800/50 font-mono text-xs">
                        {agniveers.map((a: any) => (
                            <tr key={a.id} className="hover:bg-stone-800/50 transition-colors">
                                <td className="p-4 font-bold text-yellow-500">{a.service_id}</td>
                                <td className="p-4 text-stone-300 font-sans font-semibold">{a.name}</td>
                                <td className="p-4 text-stone-500">{a.batch_no}</td>
                                <td className="p-4 text-stone-400">{a.company}</td>
                                <td className="p-4 flex items-center space-x-3">
                                    <button onClick={() => openEditModal(a)} className="text-blue-400 hover:text-blue-300 transition-colors bg-blue-900/10 p-2 rounded-lg border border-blue-900/20 hover:bg-blue-900/20">
                                        <Edit2 className="w-4 h-4" />
                                    </button>
                                    <button onClick={() => handleDelete(a.id)} className="text-red-500 hover:text-red-400 transition-colors bg-red-900/10 p-2 rounded-lg border border-red-900/20 hover:bg-red-900/20">
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </td>
                            </tr>
                        ))}
                        {agniveers.length === 0 && (
                            <tr><td colSpan={5} className="p-12 text-center text-stone-500 font-bold italic">No records found matching filters.</td></tr>
                        )}
                    </tbody>
                </table>
            </div>
            <div className="p-3 bg-stone-950 text-xs text-center text-stone-600 border-t border-stone-800">
                Showing {agniveers.length} records
            </div>

            <EditAgniveerModal
                isOpen={isEditModalOpen}
                onClose={() => setIsEditModalOpen(false)}
                agniveer={editingAgniveer}
                onSuccess={() => { fetchAgniveers(); }}
            />
        </div>
    );
};
export default AgniveerDirectory;
