import React, { useState, useEffect } from 'react';
import { API_BASE_URL } from '../../config';
import { formatDateTime } from '../utils';
import { ClipboardList, Download } from 'lucide-react';

const AuditLogViewer: React.FC = () => {
    const [auditLogs, setAuditLogs] = useState<any[]>([]);

    useEffect(() => {
        const fetchAuditLogs = async () => {
            try {
                const token = localStorage.getItem('token');
                const res = await fetch(`${API_BASE_URL}/api/admin/audit-logs`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                if (res.ok) setAuditLogs(await res.json());
            } catch (e) { console.error(e); }
        };
        fetchAuditLogs();
    }, []);

    return (
        <div className="bg-stone-900/80 backdrop-blur-md rounded-2xl shadow-lg border border-stone-800 overflow-hidden animate-in fade-in duration-500">
            <div className="p-4 border-b border-stone-800 bg-stone-900/50 flex justify-between items-center">
                <div className="flex items-center space-x-3">
                    <ClipboardList className="w-5 h-5 text-teal-500" />
                    <h2 className="font-bold text-stone-200">System Audit Logs</h2>
                </div>
                <button className="bg-stone-800 border border-stone-700 text-stone-400 px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-stone-700 hover:text-white transition-all flex items-center space-x-2">
                    <Download className="w-3 h-3" />
                    <span>Export Logs</span>
                </button>
            </div>
            <table className="w-full text-sm text-left">
                <thead className="bg-stone-950 text-stone-500 font-bold uppercase text-xs border-b border-stone-800">
                    <tr>
                        <th className="p-4">Timestamp</th>
                        <th className="p-4">User ID</th>
                        <th className="p-4">Action</th>
                        <th className="p-4">Details</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-stone-800/50 font-mono text-xs">
                    {auditLogs.map(log => (
                        <tr key={log.id} className="hover:bg-stone-800/30 transition-colors">
                            <td className="p-4 text-stone-500">{formatDateTime(log.timestamp)}</td>
                            <td className="p-4 text-teal-500 font-bold">USR-{log.user_id}</td>
                            <td className="p-4 font-bold text-stone-300">{log.action}</td>
                            <td className="p-4 text-stone-600">{log.details}</td>
                        </tr>
                    ))}
                    {auditLogs.length === 0 && <tr><td colSpan={4} className="p-8 text-center text-stone-500">No logs found.</td></tr>}
                </tbody>
            </table>
        </div>
    );
};

export default AuditLogViewer;
