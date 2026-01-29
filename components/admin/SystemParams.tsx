import React, { useState, useEffect } from 'react';
import { API_BASE_URL } from '../../config';
import { Users, Layers, Building2 } from 'lucide-react';

const SystemParams: React.FC = () => {
    const [stats, setStats] = useState({ total_agniveers: 0, by_batch: {}, by_company: {} });

    useEffect(() => {
        const fetchStats = async () => {
            try {
                const token = localStorage.getItem('token');
                const res = await fetch(`${API_BASE_URL}/api/admin/stats`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                if (res.ok) setStats(await res.json());
            } catch (e) { console.error(e); }
        };
        fetchStats();
    }, []);

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <h2 className="text-2xl font-bold text-stone-200">System Parameters</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-stone-900/50 backdrop-blur-md p-6 rounded-2xl shadow-lg border border-stone-800 relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                        <Users className="w-24 h-24 text-teal-400" />
                    </div>
                    <h3 className="text-stone-500 font-bold text-xs uppercase tracking-widest">Total Agniveers</h3>
                    <p className="text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-teal-400 to-teal-200 mt-2">{stats.total_agniveers}</p>
                </div>
                <div className="bg-stone-900/50 backdrop-blur-md p-6 rounded-2xl shadow-lg border border-stone-800 relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                        <Layers className="w-24 h-24 text-purple-400" />
                    </div>
                    <h3 className="text-stone-500 font-bold text-xs uppercase tracking-widest">Batches</h3>
                    <p className="text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-purple-200 mt-2">{Object.keys(stats.by_batch || {}).length}</p>
                    <div className="mt-4 text-xs text-stone-400 flex flex-wrap gap-2">
                        {Object.entries(stats.by_batch as any).map(([k, v]) => <span key={k} className="bg-stone-800 px-2 py-1 rounded border border-stone-700">{k}: <b className="text-purple-300">{v as number}</b></span>)}
                    </div>
                </div>
                <div className="bg-stone-900/50 backdrop-blur-md p-6 rounded-2xl shadow-lg border border-stone-800 relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                        <Building2 className="w-24 h-24 text-blue-400" />
                    </div>
                    <h3 className="text-stone-500 font-bold text-xs uppercase tracking-widest">Companies</h3>
                    <p className="text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-blue-200 mt-2">{Object.keys(stats.by_company || {}).length}</p>
                    <div className="mt-4 text-xs text-stone-400 flex flex-wrap gap-2">
                        {Object.entries(stats.by_company as any).map(([k, v]) => <span key={k} className="bg-stone-800 px-2 py-1 rounded border border-stone-700">{k}: <b className="text-blue-300">{v as number}</b></span>)}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SystemParams;
