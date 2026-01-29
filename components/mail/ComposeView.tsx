import React, { useState, useEffect } from 'react';
import { useMail } from './context';
import { User, UserRole } from '../../types';
import { API_BASE_URL } from '../../config';

// Define UserRole explicitly if not imported correctly or if enum issues arise
// Importing from types should be fine.

const ComposeView: React.FC = () => {
    const { user, composeData, setComposeData, setActiveTab, fetchStats } = useMail();
    const [targetType, setTargetType] = useState<'individual' | 'batch' | 'company'>(composeData.targetType || 'individual');
    const [targetValue, setTargetValue] = useState(composeData.targetValue || '');
    const [subject, setSubject] = useState(composeData.subject || '');
    const [body, setBody] = useState(composeData.body || '');
    const [priority, setPriority] = useState('Normal');
    const [searchResults, setSearchResults] = useState<User[]>([]);
    const [selectedUser, setSelectedUser] = useState<User | null>(composeData.selectedUser || null);
    const [broadcastLists, setBroadcastLists] = useState<{ batches: string[], companies: string[] }>({ batches: [], companies: [] });

    useEffect(() => {
        if (user.role !== UserRole.AGNIVEER) fetchBroadcastLists();
        // Determine targetType from composeData if logic allowed (omitted for simplicity, defaults to individual)
    }, []);

    const fetchBroadcastLists = async () => {
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`${API_BASE_URL}/api/admin/broadcast-lists`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (res.ok) setBroadcastLists(await res.json());
        } catch (err) { console.error(err); }
    };

    const handleSearch = async (query: string) => {
        if (query.length < 2) { setSearchResults([]); return; }
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`${API_BASE_URL}/api/users/search?q=${query}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (res.ok) setSearchResults(await res.json());
        } catch (err) { console.error(err); }
    };

    const handleSend = async () => {
        if (!subject || !body) return alert("Subject and Body required");
        let payload: any = { subject, body, priority };

        if (user.role === UserRole.AGNIVEER) {
            if (targetValue === 'Battalion Commander') payload.target_role = 'co';
            else if (targetValue === 'Company Commander') payload.target_role = 'coy_cdr';
            else return alert("Please select a valid commander.");
        }

        if (targetType === 'individual') {
            if (selectedUser) payload.recipient_ids = [selectedUser.user_id];
            else if (targetValue && !selectedUser) return alert("Please select a recipient from search.");
        }
        if (targetType === 'batch') payload.target_batch = targetValue;
        if (targetType === 'company') payload.target_company = targetValue;

        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`${API_BASE_URL}/api/mail/send`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify(payload)
            });
            if (res.ok) {
                alert("Sent!");
                setActiveTab('inbox');
                fetchStats();
            } else alert("Failed to send");
        } catch (err) { console.error(err); }
    };

    const saveDraft = async () => {
        try {
            const token = localStorage.getItem('token');
            await fetch(`${API_BASE_URL}/api/mail/drafts`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify({ subject, body, target_type: targetType, target_value: targetValue })
            });
            alert('Draft saved!');
        } catch (err) { console.error(err); }
    };

    return (
        <div className="h-full flex flex-col p-8 overflow-y-auto bg-white">
            <h2 className="text-xl font-bold mb-6 text-gray-800">New Message</h2>
            <div className="space-y-4 max-w-3xl">
                {user.role === UserRole.AGNIVEER ? (
                    <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">To</label>
                        <select className="w-full border border-gray-300 p-2 rounded-lg" onChange={(e) => { setTargetType('individual'); setTargetValue(e.target.value); }}>
                            <option value="">Select Commander...</option>
                            <option value="Battalion Commander">Battalion Commander</option>
                            <option value="Company Commander">Company Commander</option>
                        </select>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Type</label>
                            <select className="w-full border border-gray-300 p-2 rounded-lg" value={targetType} onChange={(e) => { setTargetType(e.target.value as any); setTargetValue(''); }}>
                                <option value="individual">Individual</option>
                                <option value="batch">Broadcast Batch</option>
                                <option value="company">Broadcast Company</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Target</label>
                            {targetType === 'individual' ? (
                                <div className="relative">
                                    <input
                                        type="text" placeholder="Search Name..."
                                        className="w-full border border-gray-300 p-2 rounded-lg"
                                        value={selectedUser ? `${selectedUser.name || selectedUser.username}` : targetValue}
                                        onChange={(e) => { setTargetValue(e.target.value); setSelectedUser(null); handleSearch(e.target.value); }}
                                    />
                                    {searchResults.length > 0 && !selectedUser && (
                                        <div className="absolute z-50 w-full bg-white border rounded-lg shadow-xl max-h-60 overflow-y-auto mt-1">
                                            {searchResults.map(u => (
                                                <div key={u.user_id} className="p-3 hover:bg-teal-50 cursor-pointer border-b" onClick={() => { setSelectedUser(u); setSearchResults([]); setTargetValue(''); }}>
                                                    <div className="font-semibold">{u.name || u.username}</div>
                                                    <div className="text-xs text-gray-500">{u.role}</div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <select className="w-full border border-gray-300 p-2 rounded-lg" value={targetValue} onChange={(e) => setTargetValue(e.target.value)}>
                                    <option value="">Select Option...</option>
                                    {targetType === 'batch' && broadcastLists.batches.map(b => <option key={b} value={b}>{b}</option>)}
                                    {targetType === 'company' && broadcastLists.companies.map(c => <option key={c} value={c}>{c}</option>)}
                                </select>
                            )}
                        </div>
                    </div>
                )}
                <input className="w-full border border-gray-300 p-2 rounded-lg font-medium" placeholder="Subject" value={subject} onChange={(e) => setSubject(e.target.value)} />
                <textarea className="w-full border border-gray-300 p-4 rounded-lg h-64 resize-none" placeholder="Message..." value={body} onChange={(e) => setBody(e.target.value)} />
                <div className="flex justify-end space-x-3 pt-4">
                    <button onClick={() => setActiveTab('inbox')} className="px-6 py-2 text-gray-500 font-medium hover:bg-gray-100 rounded-lg">Discard</button>
                    <button onClick={saveDraft} className="px-6 py-2 text-teal-600 font-medium hover:bg-teal-50 rounded-lg border border-teal-600">Save Draft</button>
                    <button onClick={handleSend} className="bg-teal-600 text-white px-8 py-2 rounded-lg font-bold hover:bg-teal-700">Send</button>
                </div>
            </div>
        </div>
    );
};

export default ComposeView;
