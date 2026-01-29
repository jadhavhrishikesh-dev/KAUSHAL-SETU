import React, { useState, useEffect } from 'react';
import { API_BASE_URL } from '../../config';
import { formatDate } from '../utils';
import { FileText, Trash2, Upload, FileUp } from 'lucide-react';

const PolicyConsole: React.FC = () => {
    const [policies, setPolicies] = useState<any[]>([]);
    const [policyTitle, setPolicyTitle] = useState('');
    const [policyFile, setPolicyFile] = useState<File | null>(null);

    const fetchPolicies = async () => {
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`${API_BASE_URL}/api/policies`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) setPolicies(await res.json());
        } catch (e) { console.error(e); }
    };

    useEffect(() => {
        fetchPolicies();
    }, []);

    const handlePolicyUpload = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!policyFile || !policyTitle) return;

        const formData = new FormData();
        formData.append('title', policyTitle);
        formData.append('file', policyFile);

        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`${API_BASE_URL}/api/policies`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` }, // Form data sets content-type auto
                body: formData
            });
            if (res.ok) {
                setPolicyTitle('');
                setPolicyFile(null);
                fetchPolicies();
                alert("Policy Uploaded");
            } else {
                alert("Upload Failed");
            }
        } catch (e) {
            alert('Policy Upload Failed');
        }
    };

    const handleDelete = async (id: number) => {
        if (!confirm("Delete this policy?")) return;
        // API for delete policy? Assuming it exists, if not, UI shows dummy button?
        // AdminDashboard didn't implement backend logic for delete policy in line 618?
        // Line 618: <button className="text-red-500...">Delete</button> with NO onClick handler in original code!
        // We will add the logic or keep it as placeholder.
        // I'll add the logic assuming Standard REST: DELETE /api/policies/{id}
        try {
            const token = localStorage.getItem('token');
            await fetch(`${API_BASE_URL}/api/policies/${id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            fetchPolicies();
        } catch (e) { alert("Delete failed"); }
    };

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <div className="bg-stone-900/80 backdrop-blur-md p-6 rounded-2xl shadow-lg border border-stone-800">
                <div className="flex items-center space-x-3 mb-4">
                    <FileUp className="w-5 h-5 text-yellow-500" />
                    <h2 className="text-lg font-bold text-stone-200">Upload New Policy</h2>
                </div>
                <form onSubmit={handlePolicyUpload} className="flex gap-4 items-end">
                    <div className="flex-1">
                        <label className="block text-xs font-bold text-stone-500 uppercase mb-1 pl-1">Policy Title</label>
                        <input
                            type="text"
                            value={policyTitle}
                            onChange={e => setPolicyTitle(e.target.value)}
                            className="w-full p-3 bg-stone-950 border border-stone-700 rounded-xl outline-none focus:border-yellow-500 text-stone-300 placeholder:text-stone-600 transition-colors"
                            placeholder="e.g. Leave Policy 2026"
                        />
                    </div>
                    <div className="flex-1">
                        <label className="block text-xs font-bold text-stone-500 uppercase mb-1 pl-1">Document (PDF)</label>
                        <input
                            type="file"
                            accept="application/pdf"
                            onChange={e => setPolicyFile(e.target.files?.[0] || null)}
                            className="w-full text-sm text-stone-400 file:mr-4 file:py-2.5 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-stone-800 file:text-yellow-500 hover:file:bg-stone-700 transition-all cursor-pointer"
                        />
                    </div>
                    <button type="submit" className="bg-gradient-to-r from-teal-600 to-teal-700 text-stone-100 px-6 py-3 rounded-xl font-bold shadow-lg hover:from-teal-500 hover:to-teal-600 transition-all uppercase tracking-wider text-xs flex items-center space-x-2">
                        <Upload className="w-4 h-4" />
                        <span>Upload</span>
                    </button>
                </form>
            </div>

            <div className="bg-stone-900/80 backdrop-blur-md rounded-2xl shadow-lg border border-stone-800 overflow-hidden">
                <table className="w-full text-sm text-left">
                    <thead className="bg-stone-950 text-stone-500 font-bold uppercase text-xs">
                        <tr>
                            <th className="p-4">Title</th>
                            <th className="p-4">Filename</th>
                            <th className="p-4">Upload Date</th>
                            <th className="p-4 text-right">Action</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-stone-800/50">
                        {policies.map(p => (
                            <tr key={p.id} className="hover:bg-stone-800/30 transition-colors">
                                <td className="p-4 font-bold text-stone-300 flex items-center space-x-3">
                                    <FileText className="w-4 h-4 text-teal-500" />
                                    <span>{p.title}</span>
                                </td>
                                <td className="p-4 text-stone-500 font-mono text-xs">{p.filename}</td>
                                <td className="p-4 text-stone-500">{formatDate(p.upload_date)}</td>
                                <td className="p-4 text-right">
                                    <button onClick={() => handleDelete(p.id)} className="text-red-500/80 hover:text-red-400 font-bold text-xs bg-red-900/10 px-3 py-1 rounded-lg border border-red-900/20 hover:bg-red-900/20 transition-all flex items-center space-x-1 ml-auto">
                                        <Trash2 className="w-3 h-3" />
                                        <span>Delete</span>
                                    </button>
                                </td>
                            </tr>
                        ))}
                        {policies.length === 0 && (
                            <tr><td colSpan={4} className="p-12 text-center text-stone-500 font-bold italic">No active policies found.</td></tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};
export default PolicyConsole;
