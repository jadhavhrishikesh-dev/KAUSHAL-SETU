import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, UserRole, InboxItem, EmailDetail } from '../../types';
import { API_BASE_URL, WS_BASE_URL } from '../../config';

interface MailStats {
    inbox_unread: number;
    inbox_total: number;
    sent_total: number;
    trash_total: number;
}

interface MailContextType {
    user: User;
    activeTab: 'inbox' | 'compose' | 'drafts';
    setActiveTab: (tab: 'inbox' | 'compose' | 'drafts') => void;
    folder: 'inbox' | 'sent' | 'trash';
    setFolder: (folder: 'inbox' | 'sent' | 'trash') => void;
    inbox: InboxItem[];
    loading: boolean;
    stats: MailStats;
    selectedEmail: EmailDetail | null;
    setSelectedEmail: (email: EmailDetail | null) => void;
    searchQuery: string;
    setSearchQuery: (query: string) => void;
    hasMore: boolean;
    selectedIds: Set<number>;
    setSelectedIds: (ids: Set<number>) => void;
    drafts: any[];

    // Actions
    fetchInbox: (reset?: boolean) => Promise<void>;
    loadMore: () => void;
    fetchStats: () => Promise<void>;
    fetchDrafts: () => Promise<void>;
    readEmail: (id: number) => Promise<void>;
    handleStar: (id: number, e: React.MouseEvent) => Promise<void>;
    handleDelete: (id: number) => Promise<void>;
    handleBulkDelete: () => Promise<void>;
    handleRestore: (id: number) => Promise<void>;

    // Draft/Compose helpers
    composeDraft: (draft: any) => void;
    setComposeData: (data: { subject: string; body: string; targetValue?: string; selectedUser?: User | null; targetType?: 'individual' | 'batch' | 'company' }) => void;
    composeData: { subject: string; body: string; targetValue: string; selectedUser: User | null; targetType: 'individual' | 'batch' | 'company' };
}

const MailContext = createContext<MailContextType | undefined>(undefined);

export const useMail = () => {
    const context = useContext(MailContext);
    if (!context) throw new Error("useMail must be used within MailProvider");
    return context;
};

export const MailProvider: React.FC<{ user: User; children: React.ReactNode }> = ({ user, children }) => {
    const [activeTab, setActiveTab] = useState<'inbox' | 'compose' | 'drafts'>('inbox');
    const [folder, setFolder] = useState<'inbox' | 'sent' | 'trash'>('inbox');
    const [inbox, setInbox] = useState<InboxItem[]>([]);
    const [selectedEmail, setSelectedEmail] = useState<EmailDetail | null>(null);
    const [loading, setLoading] = useState(false);
    const [stats, setStats] = useState<MailStats>({ inbox_unread: 0, inbox_total: 0, sent_total: 0, trash_total: 0 });
    const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
    const [searchQuery, setSearchQuery] = useState('');
    const [skip, setSkip] = useState(0);
    const [hasMore, setHasMore] = useState(true);
    const [drafts, setDrafts] = useState<any[]>([]);
    const LIMIT = 20;

    // Compose State shared for pre-filling
    const [composeData, setComposeData] = useState<{ subject: string; body: string; targetValue: string; selectedUser: User | null; targetType: 'individual' | 'batch' | 'company' }>({
        subject: '', body: '', targetValue: '', selectedUser: null, targetType: 'individual'
    });

    useEffect(() => {
        if (activeTab === 'inbox') {
            const timer = setTimeout(() => {
                fetchInbox(true);
                fetchStats();
            }, 100);
            return () => clearTimeout(timer);
        }
    }, [activeTab, folder, searchQuery]);

    // WebSocket logic
    useEffect(() => {
        if (!user.user_id) return;
        const ws = new WebSocket(`${WS_BASE_URL}/ws/mail/${user.user_id}`);
        ws.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                if (data.type === 'new_mail') {
                    fetchInbox(true);
                    fetchStats();
                }
            } catch { }
        };
        const heartbeat = setInterval(() => { if (ws.readyState === WebSocket.OPEN) ws.send('ping'); }, 30000);
        return () => { clearInterval(heartbeat); ws.close(); };
    }, [user.user_id]);

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

    const fetchInbox = async (reset: boolean = true) => {
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            let endpoint = `${API_BASE_URL}/api/mail/inbox`;
            if (folder === 'sent') endpoint = `${API_BASE_URL}/api/mail/sent`;
            if (folder === 'trash') endpoint = `${API_BASE_URL}/api/mail/trash`;

            const params = new URLSearchParams();
            params.append('skip', reset ? '0' : skip.toString());
            params.append('limit', LIMIT.toString());
            if (searchQuery && folder === 'inbox') params.append('search', searchQuery);

            const res = await fetch(`${endpoint}?${params.toString()}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                if (reset) {
                    setInbox(data);
                    setSkip(LIMIT);
                } else {
                    setInbox(prev => [...prev, ...data]);
                    setSkip(prev => prev + LIMIT);
                }
                setHasMore(data.length === LIMIT);
                setSelectedIds(new Set());
            }
        } catch (err) { console.error(err); } finally { setLoading(false); }
    };

    const loadMore = () => { if (hasMore && !loading) fetchInbox(false); };

    const fetchDrafts = async () => {
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`${API_BASE_URL}/api/mail/drafts`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (res.ok) setDrafts(await res.json());
        } catch (err) { console.error(err); }
    };

    const readEmail = async (id: number) => {
        try {
            const token = localStorage.getItem('token');
            let url = `${API_BASE_URL}/api/mail/${id}`;
            if (folder === 'sent') url = `${API_BASE_URL}/api/mail/sent/${id}`;

            const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
            if (res.ok) {
                const data = await res.json();
                setSelectedEmail(data);
                setInbox(prev => prev.map(m => m.id === id ? { ...m, is_read: true } : m));
            }
        } catch (err) { console.error(err); }
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

    const handleDelete = async (id: number) => {
        if (!confirm("Delete this message?")) return;
        try {
            const token = localStorage.getItem('token');
            let url = `${API_BASE_URL}/api/mail/${id}`;
            if (folder === 'trash') url = `${API_BASE_URL}/api/mail/trash/${id}`;

            const res = await fetch(url, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
            if (res.ok) {
                setInbox(prev => prev.filter(m => m.id !== id));
                if (selectedEmail?.id === id) setSelectedEmail(null);
                fetchStats();
            }
        } catch (err) { console.error(err); }
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
        } catch (err) { console.error(err); }
    };

    const handleBulkDelete = async () => {
        if (!confirm(`Delete ${selectedIds.size} messages?`)) return;
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`${API_BASE_URL}/api/mail/bulk-delete`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
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

    const composeDraft = (draft: any) => {
        setComposeData({
            subject: draft.subject,
            body: draft.body,
            targetValue: draft.target_value,
            targetType: draft.target_type || 'individual',
            selectedUser: null
        });
        setActiveTab('compose');
    };

    return (
        <MailContext.Provider value={{
            user, activeTab, setActiveTab, folder, setFolder, inbox, loading, stats,
            selectedEmail, setSelectedEmail, searchQuery, setSearchQuery, hasMore,
            selectedIds, setSelectedIds, drafts, fetchInbox, loadMore, fetchStats,
            fetchDrafts, readEmail, handleStar, handleDelete, handleBulkDelete, handleRestore,
            composeDraft, composeData, setComposeData
        }}>
            {children}
        </MailContext.Provider>
    );
};
