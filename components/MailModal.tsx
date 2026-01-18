
import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { User, UserRole, InboxItem, EmailDetail } from '../types';
import { API_BASE_URL, WS_BASE_URL } from '../config';
import { formatDate, formatDateTime } from './utils';

interface MailModalProps {
    isOpen: boolean;
    onClose: () => void;
    user: User;
}

// Helpers
const getInitials = (name: string) => {
    return name ? name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() : '?';
};

const getAvatarColor = (name: string) => {
    const colors = ['bg-red-500', 'bg-blue-500', 'bg-green-500', 'bg-yellow-500', 'bg-purple-500', 'bg-pink-500', 'bg-indigo-500', 'bg-teal-500'];
    let hash = 0;
    for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
    return colors[Math.abs(hash) % colors.length];
};

const formatRelativeTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = Math.floor((now.getTime() - date.getTime()) / 1000); // seconds

    if (diff < 60) return 'Just now';
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
    return formatDate(dateString);
};

const MailModal: React.FC<MailModalProps> = ({ isOpen, onClose, user }) => {
    const [activeTab, setActiveTab] = useState<'inbox' | 'compose' | 'drafts'>('inbox');
    const [folder, setFolder] = useState<'inbox' | 'sent' | 'trash'>('inbox');
    const [inbox, setInbox] = useState<InboxItem[]>([]);
    const [selectedEmail, setSelectedEmail] = useState<EmailDetail | null>(null);
    const [loading, setLoading] = useState(false);
    const [stats, setStats] = useState({ inbox_unread: 0, inbox_total: 0, sent_total: 0, trash_total: 0 });
    const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());

    // Phase 11: New State
    const [searchQuery, setSearchQuery] = useState('');
    const [skip, setSkip] = useState(0);
    const [hasMore, setHasMore] = useState(true);
    const [drafts, setDrafts] = useState<any[]>([]);
    const LIMIT = 20;

    // Compose State
    const [subject, setSubject] = useState('');
    const [body, setBody] = useState('');
    const [priority, setPriority] = useState('Normal');

    // Recipient Logic
    const [targetType, setTargetType] = useState<'individual' | 'batch' | 'company'>('individual');
    const [targetValue, setTargetValue] = useState(''); // Stores Batch Name, Company Name, or manual input
    const [searchResults, setSearchResults] = useState<User[]>([]);
    const [selectedUser, setSelectedUser] = useState<User | null>(null);
    const [broadcastLists, setBroadcastLists] = useState<{ batches: string[], companies: string[] }>({ batches: [], companies: [] });

    useEffect(() => {
        if (isOpen) {
            if (activeTab === 'inbox') {
                fetchInbox();
                fetchStats();
            }
            if (activeTab === 'compose' && user.role !== UserRole.AGNIVEER) fetchBroadcastLists();
        }
    }, [isOpen, activeTab, folder]);

    // WebSocket for real-time notifications
    // Connects to /ws/mail/{user_id} to receive 'new_mail' events.
    useEffect(() => {
        if (!isOpen || !user.user_id) return;

        const ws = new WebSocket(`${WS_BASE_URL}/ws/mail/${user.user_id}`);

        ws.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                if (data.type === 'new_mail') {
                    // Refresh inbox and stats on new mail
                    // 'true' reset flag clears current list and re-fetches from page 0
                    fetchInbox(true);
                    fetchStats();
                }
            } catch {
                // Ignore heartbeat/ping responses or malformed JSON
            }
        };

        ws.onerror = (err) => console.error('WebSocket error:', err);

        // Heartbeat every 30s to keep connection alive (prevents timeouts)
        // Nginx/proxies often drop idle connections after 60s.
        const heartbeat = setInterval(() => {
            if (ws.readyState === WebSocket.OPEN) ws.send('ping');
        }, 30000);

        return () => {
            clearInterval(heartbeat);
            ws.close();
        };
    }, [isOpen, user.user_id]);

    const fetchStats = async () => {
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`${API_BASE_URL}/api/mail/stats`, {
                headers: { Authorization: `Bearer ${token}` },
                cache: 'no-store'
            });
            if (res.ok) setStats(await res.json());
        } catch (err) { console.error(err); }
    };

    const fetchBroadcastLists = async () => {
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`${API_BASE_URL}/api/admin/broadcast-lists`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (res.ok) {
                setBroadcastLists(await res.json());
            }
        } catch (err) {
            console.error(err);
        }
    };

    const fetchInbox = async (reset: boolean = true) => {
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            // Determine endpoint based on folder
            let endpoint = `${API_BASE_URL}/api/mail/inbox`;
            if (folder === 'sent') endpoint = `${API_BASE_URL}/api/mail/sent`;
            if (folder === 'trash') endpoint = `${API_BASE_URL}/api/mail/trash`;

            // Add search and pagination params
            const params = new URLSearchParams();
            // If reset (e.g., search or new tab), start from 0. Else use current skip for "Load More".
            params.append('skip', reset ? '0' : skip.toString());
            params.append('limit', LIMIT.toString());
            if (searchQuery && folder === 'inbox') params.append('search', searchQuery);

            const res = await fetch(`${endpoint}?${params.toString()}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                if (reset) {
                    // Hard reset: Replace list
                    setInbox(data);
                    setSkip(LIMIT);
                } else {
                    // Append: Infinite scroll behavior
                    setInbox(prev => [...prev, ...data]);
                    setSkip(prev => prev + LIMIT);
                }
                // Check if we received a full page. If less, we've reached the end.
                setHasMore(data.length === LIMIT);
                setSelectedIds(new Set()); // Clear selection on refresh
            }
        } catch (err) {
            console.error("Failed to fetch inbox", err);
        } finally {
            setLoading(false);
        }
    };

    const loadMore = () => {
        if (hasMore && !loading) fetchInbox(false);
    };

    const handleStar = async (id: number, e: React.MouseEvent) => {
        e.stopPropagation();
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`${API_BASE_URL}/api/mail/${id}/star`, {
                method: 'POST',
                headers: { Authorization: `Bearer ${token}` }
            });
            if (res.ok) {
                const { is_starred } = await res.json();
                setInbox(prev => prev.map(m => m.id === id ? { ...m, is_starred } : m));
            }
        } catch (err) { console.error(err); }
    };

    const fetchDrafts = async () => {
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`${API_BASE_URL}/api/mail/drafts`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (res.ok) setDrafts(await res.json());
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
            fetchDrafts();
        } catch (err) { console.error(err); }
    };

    const loadDraft = (draft: any) => {
        setSubject(draft.subject);
        setBody(draft.body);
        setTargetType(draft.target_type);
        setTargetValue(draft.target_value);
        setActiveTab('compose');
    };

    const handleForward = () => {
        if (!selectedEmail) return;
        setSubject(`Fwd: ${selectedEmail.subject}`);
        setBody(`\n\n---------- Forwarded message ----------\nFrom: ${selectedEmail.sender_name}\nDate: ${formatDateTime(selectedEmail.timestamp)}\nSubject: ${selectedEmail.subject}\n\n${selectedEmail.body}`);
        setActiveTab('compose');
        setSelectedUser(null);
        setTargetValue('');
    };


    const handleSearch = async (query: string) => {
        if (query.length < 2) {
            setSearchResults([]);
            return;
        }
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`${API_BASE_URL}/api/users/search?q=${query}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                setSearchResults(data);
            }
        } catch (err) {
            console.error(err);
        }
    };

    const readEmail = async (id: number) => {
        try {
            const token = localStorage.getItem('token');
            let url = `${API_BASE_URL}/api/mail/${id}`;
            if (folder === 'sent') url = `${API_BASE_URL}/api/mail/sent/${id}`;

            const res = await fetch(url, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                setSelectedEmail(data);
                // Update read status locally
                setInbox(prev => prev.map(m => m.id === id ? { ...m, is_read: true } : m));
            }
        } catch (err) {
            console.error(err);
        }
    };

    const handleSend = async () => {
        if (!subject || !body) return alert("Subject and Body required");

        let payload: any = { subject, body, priority };

        if (user.role === UserRole.AGNIVEER) {
            // Agniveer logic: Use Role Routing
            if (targetValue === 'Battalion Commander') {
                payload.target_role = 'co';
            } else if (targetValue === 'Company Commander') {
                payload.target_role = 'coy_cdr';
            } else {
                return alert("Please select a valid commander.");
            }
        }

        if (targetType === 'individual') {
            if (selectedUser) {
                payload.recipient_ids = [selectedUser.user_id];
            } else if (targetValue) {
                // Fallback if they manually typed an ID (legacy support or admin override)
                // For now, let's enforce selection for clarity, or try parsing int?
                // Let's rely on selection.
                if (!selectedUser) return alert("Please select a recipient from search.");
            }
        }
        if (targetType === 'batch') payload.target_batch = targetValue;
        if (targetType === 'company') payload.target_company = targetValue;

        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`${API_BASE_URL}/api/mail/send`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify(payload)
            });
            if (res.ok) {
                alert("Sent!");
                setSubject(''); setBody(''); setActiveTab('inbox');
                setSelectedUser(null);
                setTargetValue('');
                fetchStats();
            } else {
                alert("Failed to send");
            }
        } catch (err) {
            console.error(err);
        }
    };

    const handleDelete = async (id: number) => {
        if (!confirm("Delete this message?")) return;
        try {
            const token = localStorage.getItem('token');
            let url = `${API_BASE_URL}/api/mail/${id}`;
            if (folder === 'trash') {
                // Permanent Delete
                url = `${API_BASE_URL}/api/mail/trash/${id}`;
            }

            const res = await fetch(url, {
                method: 'DELETE',
                headers: { Authorization: `Bearer ${token}` }
            });
            if (res.ok) {
                setInbox(prev => prev.filter(m => m.id !== id));
                if (selectedEmail?.id === id) setSelectedEmail(null);
                fetchStats();
            }
        } catch (err) {
            console.error(err);
        }
    };

    const handleRestore = async (id: number) => {
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`${API_BASE_URL}/api/mail/restore/${id}`, {
                method: 'POST',
                headers: { Authorization: `Bearer ${token}` }
            });
            if (res.ok) {
                setInbox(prev => prev.filter(m => m.id !== id));
                if (selectedEmail?.id === id) setSelectedEmail(null);
                fetchStats();
            }
        } catch (err) {
            console.error(err);
        }
    };

    const handleBulkDelete = async () => {
        if (!confirm(`Delete ${selectedIds.size} messages?`)) return;
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`${API_BASE_URL}/api/mail/bulk-delete`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({ ids: Array.from(selectedIds), folder })
            });
            if (res.ok) {
                setInbox(prev => prev.filter(m => !selectedIds.has(m.id)));
                if (selectedEmail && selectedIds.has(selectedEmail.id)) setSelectedEmail(null);
                setSelectedIds(new Set());
                fetchStats();
            }
        } catch (err) { console.error(err); }
    };

    const handleReplyClick = (msg: EmailDetail) => {
        setActiveTab('compose');
        setTargetType('individual');
        // Pre-fill
        setSubject(`Re: ${msg.subject}`);
        setBody(`\n\nOn ${formatDateTime(msg.timestamp)}, ${msg.sender_name} wrote:\n> ${msg.body.replace(/\n/g, '\n> ')}`);

        // IMPORTANT: We need target user logic.
        // If we have sender_id, we can set it directly if we support ID setting.
        // Frontend currently searches by name.
        // Simplest V1: Alert user or try to set selectedUser if we can fetch them.
        // Actually, let's fetch the user to populate the search box properly.
        fetchUserForReply(msg.sender_id);
    };

    const fetchUserForReply = async (userId: number) => {
        // Mocking: We don't have get_user_by_id exposed publicly easily without search.
        // But search by ID works in our search endpoint!
        // So let's search by ID (if username matches Service ID).
        // Actually, let's just use the ID in payload if we allowed manual override.
        // For now, let's set the targetValue to the Sender Name and let user confirm?
        // Better: We added sender_id to InboxItem. We can just set `selectedUser` state manually with minimal info if types match.
        // Issue: `selectedUser` needs full object.
        // Workaround: Use the Search endpoint with `sender_name` or `service_id` if known.
        // Let's try searching by Name.
        // const res = await fetch(...)
        // For now, just pre-fill subject/body and let user select Recipient to be safe? 
        // No, Gmail-like means pre-filled TO.
        // Let's implement fully:
        // We can just set `selectedUser` to { user_id: userId, ... } as a partial cast if needed, 
        // provided handleSend uses `user_id`.
        setSelectedUser({ id: String(userId), user_id: userId, name: 'Sender', role: UserRole.OFFICER, username: 'Sender' } as any);
        setTargetValue("REPLYING TO SENDER..."); // Visual indicator
    };

    if (!isOpen) return null;

    return createPortal(
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9999]">
            <div className="bg-white w-full max-w-6xl h-[85vh] rounded-xl shadow-2xl flex overflow-hidden">

                {/* Col 1: Navigation (200px) */}
                <div className="w-48 bg-gray-50 p-4 border-r border-gray-200 flex flex-col">
                    <button
                        onClick={() => { setActiveTab('compose'); setSelectedEmail(null); }}
                        className="w-full bg-teal-600 text-white py-3 rounded-lg font-semibold shadow hover:bg-teal-700 transition mb-6 flex items-center justify-center space-x-2"
                    >
                        <span>✏️ Compose</span>
                    </button>

                    <nav className="space-y-1 flex-1">
                        <button
                            onClick={() => { setActiveTab('inbox'); setFolder('inbox'); setSearchQuery(''); }}
                            className={`w-full text-left px-3 py-2 rounded-md text-sm font-medium flex justify-between items-center ${activeTab === 'inbox' && folder === 'inbox' ? 'bg-teal-50 text-teal-700' : 'text-gray-600 hover:bg-gray-100'}`}
                        >
                            <span>📨 Inbox</span>
                            <span className="bg-gray-200 text-gray-700 text-xs px-2 py-0.5 rounded-full">{stats.inbox_unread}/{stats.inbox_total}</span>
                        </button>
                        <button
                            onClick={() => { setActiveTab('inbox'); setFolder('sent'); }}
                            className={`w-full text-left px-3 py-2 rounded-md text-sm font-medium flex justify-between items-center ${activeTab === 'inbox' && folder === 'sent' ? 'bg-teal-50 text-teal-700' : 'text-gray-600 hover:bg-gray-100'}`}
                        >
                            <span>📤 Sent</span>
                            <span className="text-xs text-gray-400">{stats.sent_total}</span>
                        </button>
                        <button
                            onClick={() => { setActiveTab('inbox'); setFolder('trash'); }}
                            className={`w-full text-left px-3 py-2 rounded-md text-sm font-medium flex justify-between items-center ${activeTab === 'inbox' && folder === 'trash' ? 'bg-teal-50 text-teal-700' : 'text-gray-600 hover:bg-gray-100'}`}
                        >
                            <span>🗑️ Trash</span>
                            <span className="text-xs text-gray-400">{stats.trash_total}</span>
                        </button>
                        <button
                            onClick={() => { setActiveTab('drafts'); fetchDrafts(); }}
                            className={`w-full text-left px-3 py-2 rounded-md text-sm font-medium flex justify-between items-center ${activeTab === 'drafts' ? 'bg-teal-50 text-teal-700' : 'text-gray-600 hover:bg-gray-100'}`}
                        >
                            <span>📝 Drafts</span>
                            <span className="text-xs text-gray-400">{drafts.length}</span>
                        </button>
                    </nav>
                </div>

                {/* Col 2: Message List (350px) - Only visible if Inbox tab */}
                <div className="w-80 border-r border-gray-200 flex flex-col bg-white">
                    <div className="p-4 border-b border-gray-100 flex items-center space-x-2">
                        {inbox.length > 0 && (
                            <input
                                type="checkbox"
                                className="w-4 h-4 text-teal-600 rounded focus:ring-teal-500 border-gray-300"
                                checked={selectedIds.size === inbox.length && inbox.length > 0}
                                onChange={(e) => {
                                    if (e.target.checked) setSelectedIds(new Set(inbox.map(m => m.id)));
                                    else setSelectedIds(new Set());
                                }}
                            />
                        )}
                        {selectedIds.size > 0 ? (
                            <button onClick={handleBulkDelete} className="text-red-600 text-sm font-bold hover:bg-red-50 px-2 py-1 rounded">
                                Delete ({selectedIds.size})
                            </button>
                        ) : (
                            <input
                                placeholder="Search mail..."
                                className="w-full bg-gray-100 border-none rounded-lg px-3 py-2 text-sm focus:ring-1 focus:ring-teal-500"
                                value={searchQuery}
                                onChange={(e) => {
                                    setSearchQuery(e.target.value);
                                    // Debounced search trigger: Wait 500ms after last keystroke before fetching.
                                    // This prevents flooding the API with requests while typing.
                                    clearTimeout((window as any).searchTimeout);
                                    (window as any).searchTimeout = setTimeout(() => {
                                        fetchInbox(true); // Reset list with new search results
                                    }, 500);
                                }}
                            />
                        )}
                    </div>
                    <div className="flex-1 overflow-y-auto">
                        {loading && <p className="p-4 text-center text-gray-400 text-sm">Loading...</p>}
                        {!loading && inbox.length === 0 && <p className="p-8 text-center text-gray-400 text-sm">No messages found</p>}
                        {inbox.map(msg => (
                            <div
                                key={msg.id}
                                onClick={() => {
                                    readEmail(msg.id);
                                    setActiveTab('inbox'); // Switch back to inbox view implied
                                }}
                                className={`p-4 border-b border-gray-50 cursor-pointer hover:bg-gray-50 transition ${selectedEmail?.id === msg.id ? 'bg-teal-50 border-l-4 border-l-teal-500' : ''} ${!msg.is_read ? 'bg-white' : 'bg-gray-50/50'}`}
                            >
                                <div className="flex items-start justify-between mb-1">
                                    <div className="flex items-center space-x-2 overflow-hidden flex-1">
                                        <div onClick={(e) => e.stopPropagation()}>
                                            <input
                                                type="checkbox"
                                                className="w-4 h-4 text-teal-600 rounded focus:ring-teal-500 border-gray-300 mr-2"
                                                checked={selectedIds.has(msg.id)}
                                                onChange={(e) => {
                                                    const newSet = new Set(selectedIds);
                                                    if (e.target.checked) newSet.add(msg.id);
                                                    else newSet.delete(msg.id);
                                                    setSelectedIds(newSet);
                                                }}
                                            />
                                        </div>
                                        <div className={`w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center text-xs font-bold text-white ${getAvatarColor(msg.sender_name)}`}>
                                            {getInitials(msg.sender_name)}
                                        </div>
                                        <span className={`text-sm truncate ${!msg.is_read ? 'font-bold text-gray-900' : 'text-gray-700'}`}>
                                            {msg.sender_name}
                                        </span>
                                    </div>
                                    <div className="flex items-center space-x-1">
                                        {/* Star Button */}
                                        <button
                                            onClick={(e) => handleStar(msg.id, e)}
                                            className={`text-lg hover:scale-110 transition ${msg.is_starred ? 'text-yellow-400' : 'text-gray-300 hover:text-yellow-300'}`}
                                        >
                                            {msg.is_starred ? '★' : '☆'}
                                        </button>
                                        <span className="text-[10px] text-gray-400 flex-shrink-0 whitespace-nowrap ml-2">
                                            {formatRelativeTime(msg.timestamp)}
                                        </span>
                                    </div>
                                </div>
                                <div className={`text-sm truncate mb-1 ${!msg.is_read ? 'font-semibold text-gray-800' : 'text-gray-600'}`}>
                                    {msg.subject}
                                </div>
                                <div className="text-xs text-gray-400 truncate">
                                    {/* No snippets available in list from backend yet, using sender role */}
                                    {msg.sender_role}
                                </div>
                            </div>
                        ))}
                        {/* Load More Button */}
                        {hasMore && !loading && (
                            <button
                                onClick={loadMore}
                                className="w-full py-3 text-sm text-teal-600 hover:bg-teal-50 font-medium"
                            >
                                Load More...
                            </button>
                        )}
                    </div>
                </div>

                {/* Col 3: Reading Pane / Compose (Flex-1) */}
                <div className="flex-1 bg-gray-50 flex flex-col overflow-hidden relative">
                    <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 z-10 p-1 rounded-full hover:bg-gray-200">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>

                    {activeTab === 'drafts' ? (
                        <div className="h-full flex flex-col p-8 overflow-y-auto bg-white">
                            <h2 className="text-xl font-bold mb-6 text-gray-800">📝 Drafts</h2>
                            {drafts.length === 0 ? (
                                <p className="text-center text-gray-400 mt-10">No drafts saved</p>
                            ) : (
                                <div className="space-y-3">
                                    {drafts.map(draft => (
                                        <div
                                            key={draft.id}
                                            onClick={() => loadDraft(draft)}
                                            className="p-4 bg-gray-50 rounded-lg hover:bg-teal-50 cursor-pointer border border-gray-100 transition"
                                        >
                                            <h3 className="font-semibold text-gray-800">{draft.subject || '(No Subject)'}</h3>
                                            <p className="text-sm text-gray-500 truncate">{draft.body || '(No Content)'}</p>
                                            <p className="text-xs text-gray-400 mt-1">Updated: {formatDateTime(draft.updated_at)}</p>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    ) : activeTab === 'compose' ? (
                        <div className="h-full flex flex-col p-8 overflow-y-auto bg-white">
                            <h2 className="text-xl font-bold mb-6 text-gray-800">New Message</h2>
                            <div className="space-y-4 max-w-3xl">
                                {/* Recipient Logic (Same as before) */}
                                {user.role === UserRole.AGNIVEER ? (
                                    <div>
                                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">To</label>
                                        <select
                                            className="w-full border border-gray-300 p-2 rounded-lg text-gray-900 bg-white focus:ring-2 focus:ring-teal-500 outline-none transition"
                                            onChange={(e) => {
                                                setTargetType('individual');
                                                setTargetValue(e.target.value);
                                            }}
                                        >
                                            <option value="">Select Commander...</option>
                                            <option value="Battalion Commander">Battalion Commander</option>
                                            <option value="Company Commander">Company Commander</option>
                                        </select>
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Type</label>
                                            <select
                                                className="w-full border border-gray-300 p-2 rounded-lg text-gray-900 bg-white focus:ring-2 focus:ring-teal-500 outline-none"
                                                value={targetType}
                                                onChange={(e) => {
                                                    setTargetType(e.target.value as any);
                                                    setTargetValue('');
                                                }}
                                            >
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
                                                        type="text"
                                                        placeholder="Search Name or ID..."
                                                        className="w-full border border-gray-300 p-2 rounded-lg text-gray-900 bg-white focus:ring-2 focus:ring-teal-500 outline-none"
                                                        value={selectedUser ? `${selectedUser.full_name || selectedUser.username} (${selectedUser.username})` : targetValue}
                                                        onChange={(e) => {
                                                            setTargetValue(e.target.value);
                                                            setSelectedUser(null);
                                                            handleSearch(e.target.value);
                                                        }}
                                                    />
                                                    {searchResults.length > 0 && !selectedUser && (
                                                        <div className="absolute z-50 w-full bg-white border rounded-lg shadow-xl max-h-60 overflow-y-auto mt-1">
                                                            {searchResults.map(u => (
                                                                <div
                                                                    key={u.user_id}
                                                                    className="p-3 hover:bg-teal-50 cursor-pointer border-b last:border-0"
                                                                    onClick={() => {
                                                                        setSelectedUser(u);
                                                                        setSearchResults([]);
                                                                        setTargetValue('');
                                                                    }}
                                                                >
                                                                    <div className="font-semibold text-gray-900">{u.full_name || u.username}</div>
                                                                    <div className="text-xs text-gray-500">{u.role} | {u.username}</div>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>
                                            ) : (
                                                <select
                                                    className="w-full border border-gray-300 p-2 rounded-lg text-gray-900 bg-white focus:ring-2 focus:ring-teal-500"
                                                    value={targetValue}
                                                    onChange={(e) => setTargetValue(e.target.value)}
                                                >
                                                    <option value="">Select Option...</option>
                                                    {targetType === 'batch' && broadcastLists.batches.map(b => (
                                                        <option key={b} value={b}>{b}</option>
                                                    ))}
                                                    {targetType === 'company' && broadcastLists.companies.map(c => (
                                                        <option key={c} value={c}>{c}</option>
                                                    ))}
                                                </select>
                                            )}
                                        </div>
                                    </div>
                                )}

                                <input
                                    className="w-full border border-gray-300 p-2 rounded-lg text-gray-900 bg-white focus:ring-2 focus:ring-teal-500 outline-none font-medium"
                                    placeholder="Subject"
                                    value={subject}
                                    onChange={(e) => setSubject(e.target.value)}
                                />

                                <textarea
                                    className="w-full border border-gray-300 p-4 rounded-lg h-64 text-gray-900 bg-white focus:ring-2 focus:ring-teal-500 outline-none resize-none"
                                    placeholder="Write your message here..."
                                    value={body}
                                    onChange={(e) => setBody(e.target.value)}
                                />

                                <div className="flex justify-end space-x-3 pt-4">
                                    <button onClick={() => setActiveTab('inbox')} className="px-6 py-2 text-gray-500 font-medium hover:bg-gray-100 rounded-lg transition">Discard</button>
                                    <button onClick={saveDraft} className="px-6 py-2 text-teal-600 font-medium hover:bg-teal-50 rounded-lg transition border border-teal-600">Save Draft</button>
                                    <button onClick={handleSend} className="bg-teal-600 text-white px-8 py-2 rounded-lg font-bold shadow hover:bg-teal-700 transition transform active:scale-95">Send</button>
                                </div>
                            </div>
                        </div>
                    ) : (
                        // Reading View
                        selectedEmail ? (
                            <div className="h-full flex flex-col bg-white">
                                {/* Header */}
                                <div className="p-6 border-b border-gray-100">
                                    <div className="flex justify-between items-start mb-4">
                                        <h1 className="text-2xl font-bold text-gray-900">{selectedEmail.subject}</h1>
                                        <div className="flex space-x-2">
                                            {/* Delete moved to bottom */}
                                        </div>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center space-x-3">
                                            <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold text-white ${getAvatarColor(selectedEmail.sender_name)}`}>
                                                {getInitials(selectedEmail.sender_name)}
                                            </div>
                                            <div>
                                                <p className="font-bold text-gray-900">{selectedEmail.sender_name}</p>
                                                <p className="text-xs text-gray-500">{selectedEmail.sender_role} • {formatDateTime(selectedEmail.timestamp)}</p>
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => handleReplyClick(selectedEmail)}
                                            className="flex items-center space-x-1 text-teal-600 hover:text-teal-800 font-medium text-sm px-3 py-1 rounded hover:bg-teal-50 transition"
                                        >
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" /></svg>
                                            <span>Reply</span>
                                        </button>
                                    </div>
                                </div>
                                {/* Body */}
                                <div className="flex-1 p-8 overflow-y-auto prose max-w-none text-gray-800">
                                    <div className="whitespace-pre-wrap leading-relaxed">{selectedEmail.body}</div>
                                </div>
                                {/* Footer */}
                                <div className="p-4 border-t border-gray-100 flex justify-end bg-gray-50">
                                    {folder === 'trash' ? (
                                        <div className="flex space-x-2">
                                            <button onClick={() => handleRestore(selectedEmail.id)} className="flex items-center space-x-2 text-teal-600 hover:text-teal-800 px-4 py-2 hover:bg-teal-50 rounded-lg transition font-medium text-sm">
                                                <span>Restore to Inbox</span>
                                            </button>
                                            <button onClick={() => handleDelete(selectedEmail.id)} className="flex items-center space-x-2 text-red-600 hover:text-red-800 px-4 py-2 hover:bg-red-50 rounded-lg transition font-medium text-sm">
                                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                                <span>Delete Forever</span>
                                            </button>
                                        </div>
                                    ) : (
                                        <div className="flex space-x-2">
                                            <button
                                                onClick={handleForward}
                                                className="flex items-center space-x-2 text-teal-600 hover:text-teal-800 px-4 py-2 hover:bg-teal-50 rounded-lg transition font-medium text-sm"
                                            >
                                                <span>➤ Forward</span>
                                            </button>
                                            <button onClick={() => handleDelete(selectedEmail.id)} className="flex items-center space-x-2 text-red-600 hover:text-red-800 px-4 py-2 hover:bg-red-50 rounded-lg transition font-medium text-sm">
                                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                                <span>Delete</span>
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ) : (
                            // Empty State
                            <div className="h-full flex flex-col items-center justify-center text-gray-300">
                                <svg className="w-24 h-24 mb-4 text-gray-100" fill="currentColor" viewBox="0 0 20 20"><path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z" /><path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z" /></svg>
                                <p className="text-lg font-medium">Select a message to read</p>
                            </div>
                        )
                    )}
                </div>
            </div>
        </div>,
        document.body
    );
};

export default MailModal;
