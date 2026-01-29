import React, { useState, useEffect } from 'react';
import { API_BASE_URL } from '../../config';
import { UserPlus, Shield, Key, Trash2, RefreshCw } from 'lucide-react';

const UserConsole: React.FC = () => {
    const [adminUsers, setAdminUsers] = useState<any[]>([]);
    const [newUser, setNewUser] = useState({
        username: '', password: '', full_name: '', rank: '', role: 'co', assigned_company: ''
    });

    const fetchAdminUsers = async () => {
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`${API_BASE_URL}/api/admin/users`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) setAdminUsers(await res.json());
        } catch (e) { console.error(e); }
    };

    useEffect(() => {
        fetchAdminUsers();
    }, []);

    const handleCreateUser = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newUser.username || !newUser.password || !newUser.role) {
            alert("Please fill all required fields");
            return;
        }

        const payload = { ...newUser };
        if (!['coy_cdr', 'coy_clk'].includes(payload.role)) payload.assigned_company = null;

        try {
            const res = await fetch(`${API_BASE_URL}/api/admin/users`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (res.ok) {
                setNewUser({ username: '', password: '', full_name: '', rank: '', role: 'co', assigned_company: '' });
                fetchAdminUsers();
                alert("User created successfully!");
            } else {
                const err = await res.json();
                alert(`Failed: ${err.detail}`);
            }
        } catch (e) { console.error(e); }
    };

    const handleDeleteUser = async (id: number) => {
        if (!confirm("Delete this user?")) return;
        try {
            const token = localStorage.getItem('token');
            await fetch(`${API_BASE_URL}/api/admin/users/${id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            fetchAdminUsers();
        } catch (e) { console.error(e); }
    };

    const handleResetPassword = async (id: number) => {
        const newPass = prompt("Enter new password for this user:");
        if (!newPass) return;
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`${API_BASE_URL}/api/admin/users/${id}/password`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ new_password: newPass })
            });

            if (res.ok) alert("Password updated successfully!");
            else alert("Failed to update password.");
        } catch (e) { console.error(e); }
    };

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            {/* Creation Form */}
            <div className="bg-stone-900/80 backdrop-blur-md p-6 rounded-2xl shadow-lg border border-stone-800">
                <div className="flex items-center space-x-3 mb-4 text-stone-200 border-b border-stone-800 pb-2">
                    <UserPlus className="w-5 h-5 text-yellow-500" />
                    <h2 className="text-lg font-bold">Create New Officer / Commander</h2>
                </div>
                <form onSubmit={handleCreateUser} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <div>
                        <label className="block text-xs font-bold text-stone-500 uppercase mb-1 pl-1">Rank</label>
                        <input value={newUser.rank} onChange={e => setNewUser({ ...newUser, rank: e.target.value })} className="w-full p-2.5 bg-stone-950 border border-stone-700 rounded-lg outline-none focus:border-yellow-500 text-stone-300 placeholder:text-stone-700 transition-colors" placeholder="e.g. Major" />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-stone-500 uppercase mb-1 pl-1">Full Name</label>
                        <input value={newUser.full_name} onChange={e => setNewUser({ ...newUser, full_name: e.target.value })} className="w-full p-2.5 bg-stone-950 border border-stone-700 rounded-lg outline-none focus:border-yellow-500 text-stone-300 placeholder:text-stone-700 transition-colors" placeholder="Name" />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-stone-500 uppercase mb-1 pl-1">Role / Appointment</label>
                        <select value={newUser.role} onChange={e => setNewUser({ ...newUser, role: e.target.value })} className="w-full p-2.5 bg-stone-950 border border-stone-700 rounded-lg outline-none focus:border-yellow-500 text-stone-300">
                            <option value="co">Battalion Commander (CO)</option>
                            <option value="trg_officer">Training Officer</option>
                            <option value="coy_cdr">Company Commander</option>
                            <option value="coy_clk">Company Clerk</option>
                        </select>
                    </div>

                    {/* Dynamic Field: Assigned Company */}
                    {['coy_cdr', 'coy_clk'].includes(newUser.role) && (
                        <div className="bg-blue-900/20 p-3 rounded-lg border border-blue-900/40">
                            <label className="block text-xs font-bold text-blue-400 uppercase mb-1">Assigned Company</label>
                            <select value={newUser.assigned_company} onChange={e => setNewUser({ ...newUser, assigned_company: e.target.value })} className="w-full p-2 bg-stone-900 border border-blue-800/50 rounded-lg text-stone-300 outline-none focus:border-blue-500">
                                <option value="">-- Select Company --</option>
                                {['Alpha', 'Bravo', 'Charlie', 'Delta', 'Support', 'Headquarter'].map(c => (
                                    <option key={c} value={c}>{c}</option>
                                ))}
                            </select>
                        </div>
                    )}

                    <div>
                        <label className="block text-xs font-bold text-stone-500 uppercase mb-1 pl-1">Login Username</label>
                        <input value={newUser.username} onChange={e => setNewUser({ ...newUser, username: e.target.value })} className="w-full p-2.5 bg-stone-950 border border-stone-700 rounded-lg outline-none focus:border-yellow-500 text-stone-300 placeholder:text-stone-700 transition-colors" placeholder="Service ID" required />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-stone-500 uppercase mb-1 pl-1">Login Password</label>
                        <input type="password" value={newUser.password} onChange={e => setNewUser({ ...newUser, password: e.target.value })} className="w-full p-2.5 bg-stone-950 border border-stone-700 rounded-lg outline-none focus:border-yellow-500 text-stone-300 placeholder:text-stone-700 transition-colors" placeholder="******" required />
                    </div>

                    <div className="md:col-span-2 lg:col-span-3 flex justify-end mt-2">
                        <button type="submit" className="bg-gradient-to-r from-yellow-600 to-yellow-700 text-stone-900 px-8 py-2.5 rounded-lg font-bold shadow-lg hover:from-yellow-500 hover:to-yellow-600 transition-all uppercase tracking-wider text-sm flex items-center space-x-2">
                            <UserPlus className="w-4 h-4" /> <span>Create User</span>
                        </button>
                    </div>
                </form>
            </div>

            {/* User List */}
            <div className="bg-stone-900/80 backdrop-blur-md rounded-2xl shadow-lg border border-stone-800 overflow-hidden">
                <div className="p-4 bg-stone-950 border-b border-stone-800 font-bold text-stone-400 uppercase text-xs tracking-wider flex items-center space-x-2">
                    <Shield className="w-4 h-4" /> <span>Authorized Users</span>
                </div>
                <table className="w-full text-sm text-left">
                    <thead className="bg-stone-950 text-stone-500 font-bold uppercase text-xs border-b border-stone-800">
                        <tr>
                            <th className="p-4">Rank/Name</th>
                            <th className="p-4">Role</th>
                            <th className="p-4">Scope</th>
                            <th className="p-4">Username</th>
                            <th className="p-4 text-right">Action</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-stone-800/50">
                        {adminUsers.filter((u: any) => u.role !== 'agniveer').map((u: any) => (
                            <tr key={u.user_id} className="hover:bg-stone-800/30 transition-colors">
                                <td className="p-4 font-bold text-stone-300">
                                    <span className="text-stone-500 text-xs mr-2">{u.rank}</span>{u.full_name || 'N/A'}
                                </td>
                                <td className="p-4">
                                    <span className={`px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider border ${u.role === 'co' ? 'bg-purple-900/20 text-purple-400 border-purple-900/40' :
                                        u.role === 'coy_cdr' ? 'bg-blue-900/20 text-blue-400 border-blue-900/40' :
                                            u.role === 'coy_clk' ? 'bg-yellow-900/20 text-yellow-400 border-yellow-900/40' :
                                                u.role === 'trg_officer' ? 'bg-green-900/20 text-green-400 border-green-900/40' : 'bg-stone-800 text-stone-400 border-stone-700'
                                        }`}>
                                        {u.role.replace('_', ' ')}
                                    </span>
                                </td>
                                <td className="p-4 text-xs font-mono">
                                    {['coy_cdr', 'coy_clk'].includes(u.role) ? (
                                        <span className="text-blue-400 font-bold">ONLY {u.assigned_company}</span>
                                    ) : <span className="text-stone-600">GLOBAL ACCESS</span>}
                                </td>
                                <td className="p-4 text-stone-500">{u.username}</td>
                                <td className="p-4 text-right">
                                    {u.username !== 'admin' && (
                                        <div className="flex items-center justify-end space-x-2">
                                            <button onClick={() => handleResetPassword(u.user_id)} className="text-blue-400 hover:text-blue-300 bg-blue-900/10 p-1.5 rounded-lg border border-blue-900/20">
                                                <Key className="w-3 h-3" />
                                            </button>
                                            <button onClick={() => handleDeleteUser(u.user_id)} className="text-red-400 hover:text-red-300 bg-red-900/10 p-1.5 rounded-lg border border-red-900/20">
                                                <Trash2 className="w-3 h-3" />
                                            </button>
                                        </div>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};
export default UserConsole;
