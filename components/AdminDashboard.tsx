import React, { useState, useEffect } from 'react';
import { User } from '../types';
import { API_BASE_URL } from '../config';
import { formatDate, formatDateTime } from './utils';

interface AdminDashboardProps {
    user: User;
}

const AdminDashboard: React.FC<AdminDashboardProps> = ({ user }) => {
    const [activeTab, setActiveTab] = useState('overview');
    const [uploadStatus, setUploadStatus] = useState<string | null>(null);
    const [auditLogs, setAuditLogs] = useState<any[]>([]);
    const [policies, setPolicies] = useState<any[]>([]);

    // Stats
    const [stats, setStats] = useState({ total_agniveers: 0, by_batch: {}, by_company: {} });

    // Data Management
    const [agniveers, setAgniveers] = useState<any[]>([]);
    const [filterBatch, setFilterBatch] = useState('');
    const [filterCompany, setFilterCompany] = useState('');
    const [searchQuery, setSearchQuery] = useState('');

    // User Management State
    const [adminUsers, setAdminUsers] = useState<any[]>([]);
    const [newUser, setNewUser] = useState({
        username: '',
        password: '',
        full_name: '',
        rank: '',
        role: 'co', // default
        assigned_company: ''
    });

    // Edit Modal State
    const [editingAgniveer, setEditingAgniveer] = useState<any | null>(null);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);

    // Batch Upload State
    const [csvFile, setCsvFile] = useState<File | null>(null);

    // Policy Upload State
    const [policyTitle, setPolicyTitle] = useState('');
    const [policyFile, setPolicyFile] = useState<File | null>(null);



    useEffect(() => {
        fetchStats();
        if (activeTab === 'system') fetchAuditLogs();
        if (activeTab === 'policies') fetchPolicies();
        if (activeTab === 'policies') fetchPolicies();
        if (activeTab === 'data') fetchAgniveers();
        if (activeTab === 'users') fetchAdminUsers();
    }, [activeTab, filterBatch, filterCompany]);

    const fetchStats = async () => {
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`${API_BASE_URL}/api/admin/stats`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) setStats(await res.json());
        } catch (e) { console.error(e); }
    };

    const fetchAuditLogs = async () => {
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`${API_BASE_URL}/api/admin/audit-logs`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) setAuditLogs(await res.json());
        } catch (e) { console.error(e); }
    };

    const fetchPolicies = async () => {
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`${API_BASE_URL}/api/policies`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) setPolicies(await res.json());
        } catch (e) { console.error(e); }
    };

    const fetchAgniveers = async () => {
        let url = `${API_BASE_URL}/api/admin/agniveers?`;
        if (filterBatch) url += `batch=${filterBatch}&`;
        if (filterCompany) url += `company=${filterCompany}&`;
        if (searchQuery) url += `q=${searchQuery}`;

        try {
            const token = localStorage.getItem('token');
            const res = await fetch(url, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) setAgniveers(await res.json());
        } catch (e) { console.error(e); }
    };

    // Debounce search effect
    useEffect(() => {
        const timer = setTimeout(() => {
            if (activeTab === 'data') fetchAgniveers();
        }, 500);
        return () => clearTimeout(timer);
    }, [searchQuery]);

    const handleBulkUpload = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!csvFile) return;

        const formData = new FormData();
        formData.append('file', csvFile);

        try {
            setUploadStatus('Processing Batch...');
            const token = localStorage.getItem('token');
            const res = await fetch(`${API_BASE_URL}/api/admin/bulk-upload`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` },
                body: formData,
            });
            const data = await res.json();
            setUploadStatus(`Upload Complete. Processed: ${data.total_processed}, Success: ${data.successful}, Failed: ${data.failed}`);
            setCsvFile(null);
            fetchStats();
        } catch (err) {
            setUploadStatus('Upload Failed.');
        }
    };

    const handlePolicyUpload = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!policyFile || !policyTitle) return;

        const formData = new FormData();
        formData.append('title', policyTitle);
        formData.append('file', policyFile);

        try {
            const token = localStorage.getItem('token');
            await fetch(`${API_BASE_URL}/api/policies`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` },
                body: formData
            });
            setPolicyTitle('');
            setPolicyFile(null);
            fetchPolicies(); // refresh list
        } catch (e) {
            alert('Policy Upload Failed');
        }
    };

    const fetchAdminUsers = async () => {
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`${API_BASE_URL}/api/admin/users`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) setAdminUsers(await res.json());
        } catch (e) { console.error(e); }
    };

    const handleCreateUser = async (e: React.FormEvent) => {
        e.preventDefault();

        // Validation
        if (!newUser.username || !newUser.password || !newUser.role) {
            alert("Please fill all required fields");
            return;
        }

        const payload = { ...newUser };
        if (!['coy_cdr', 'coy_clk'].includes(payload.role)) payload.assigned_company = null; // Clear if not commander/clerk

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
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ new_password: newPass })
            });

            if (res.ok) {
                alert("Password updated successfully!");
            } else {
                alert("Failed to update password.");
            }
        } catch (e) { console.error(e); }
    };

    // --- Edit / Delete Handlers ---

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
                fetchStats();
            } else {
                alert('Failed to delete Agniveer');
            }
        } catch (e) { console.error(e); }
    };

    const handleEditChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        if (!editingAgniveer) return;
        setEditingAgniveer({ ...editingAgniveer, [e.target.name]: e.target.value });
    };



    // Converter: Display (DD-MM-YYYY) -> ISO (YYYY-MM-DD)
    // We update state directly with ISO if valid, else keep raw for typing?
    // Actually simplicity: Let's store raw input in a local temp state? 
    // Or just parse on blur? 
    // Approach: Custom handler for date fields.
    const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value;
        const name = e.target.name;
        // Allow user to type freely, but try to parse valid DD-MM-YYYY to ISO for storage?
        // But our state expects what? properties.
        // Let's assume we update the state with the RAW string if it doesn't match ISO, 
        // OR we just assume the user types correctly. 
        // Better: Store as IS0 in state, convert on render.
        // But typing requires intermediate state. 
        // Let's simple string replace logic:

        // If user types 15-08-2002 -> Convert to 2002-08-15
        if (/^\d{2}-\d{2}-\d{4}$/.test(val)) {
            const [d, m, y] = val.split('-');
            const iso = `${y}-${m}-${d}`;
            setEditingAgniveer({ ...editingAgniveer, [name]: iso });
        } else {
            // Keep strictly updating state so input doesn't freeze, 
            // BUT we need a way to differentiate "Invalid ISO but valid partial input".
            // This is tricky without separate state. 
            // HACK: Just set it. Backend might reject if unused or we fix on Submit.
            setEditingAgniveer({ ...editingAgniveer, [name]: val });
        }
    };

    // Better Approach for React Controlled Inputs with Transform:
    // We can't easily do two-way transform on one state variable without fighting cursor.
    // Let's use <input type="text"> and just let them type. 
    // On Submit, we ensure it's ISO.
    // BUT the backend expects ISO or Pydantic might parse string if compatible. 
    // Pydantic default doesn't like DD-MM-YYYY.

    // REVISED STRATEGY: 
    // 1. Inputs show/edit a "display" version. 
    // 2. We don't convert to ISO on every keystroke. 
    // 3. We convert to ISO only on handleSaveEdit.

    const handleSaveEdit = async () => {
        if (!editingAgniveer) return;

        // Prepare payload: Convert DD-MM-YYYY fields to YYYY-MM-DD
        // And Sanitize inputs (empty strings -> null) to satisfy Pydantic
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

        // Empty String Sanitization
        Object.keys(payload).forEach(key => {
            if (payload[key] === '') payload[key] = null;
        });

        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`${API_BASE_URL}/api/admin/agniveers/${editingAgniveer.id}`, {
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
            } else {
                const err = await res.json();
                console.error("Update Failed:", err);
                alert(`Failed to update Agniveer: ${JSON.stringify(err.detail || err)}`);
            }
        } catch (e) {
            console.error(e);
            alert("Network Error");
        }
    };

    // Helper to initialize edit state with DD-MM-YYYY format
    const openEditModal = (agniveer: any) => {
        // Clone and pre-format dates to DD-MM-YYYY for the text inputs
        const formatted = { ...agniveer };
        if (formatted.dob) formatted.dob = formatDate(formatted.dob);
        if (formatted.reporting_date) formatted.reporting_date = formatDate(formatted.reporting_date);

        setEditingAgniveer(formatted);
        setIsEditModalOpen(true);
    };

    // Render Functions
    // Render Functions
    const renderSidebarItem = (id: string, label: string, icon: any) => (
        <button
            onClick={() => setActiveTab(id)}
            className={`w-full text-left p-3 rounded-xl flex items-center space-x-3 transition-all duration-200 border border-transparent ${activeTab === id ? 'bg-gradient-to-r from-yellow-600 to-yellow-700 text-stone-900 shadow-lg font-bold' : 'text-stone-400 hover:bg-stone-800 hover:text-yellow-500 hover:border-stone-700'}`}
        >
            {icon}
            <span className="font-bold text-sm tracking-wide">{label}</span>
        </button>
    );

    return (
        <div className="flex h-[calc(100vh-80px)] bg-stone-950 rounded-2xl overflow-hidden border border-stone-800 shadow-2xl relative">
            {/* Background Gradients */}
            <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-0">
                <div className="absolute top-[-10%] left-[-10%] w-[30%] h-[30%] bg-teal-900/10 rounded-full blur-[100px]"></div>
                <div className="absolute bottom-[-10%] right-[-10%] w-[30%] h-[30%] bg-yellow-900/10 rounded-full blur-[100px]"></div>
            </div>

            {/* Sidebar */}
            <div className="w-72 bg-stone-900/90 backdrop-blur-md border-r border-stone-800 p-6 flex flex-col space-y-2 relative z-10">
                <div className="mb-8 px-2">
                    <h2 className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-yellow-200 to-yellow-500 uppercase tracking-tight">Admin Console</h2>
                    <p className="text-[10px] font-bold text-stone-500 uppercase tracking-widest mt-1">System Management v2.0</p>
                </div>

                <div className="space-y-2">
                    {renderSidebarItem('overview', 'Dashboard Overview', <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" /></svg>)}
                    {renderSidebarItem('data', 'Data Management', <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>)}
                    {renderSidebarItem('users', 'User Management', <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>)}
                    {renderSidebarItem('batch', 'Batch Upload (CSV)', <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>)}
                    {renderSidebarItem('policies', 'Policy Management', <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>)}
                    {renderSidebarItem('system', 'Audit Logs & Backup', <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>)}
                </div>
            </div>

            {/* Main Content Area */}
            <div className="flex-1 overflow-y-auto p-8 relative z-10 scrollbar-thin scrollbar-thumb-stone-700 scrollbar-track-stone-900">


                {/* Overview Tab */}
                {activeTab === 'overview' && (
                    <div className="space-y-6">
                        <h2 className="text-2xl font-bold text-stone-200">System Parameters</h2>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div className="bg-stone-900/50 backdrop-blur-md p-6 rounded-2xl shadow-lg border border-stone-800 relative overflow-hidden group">
                                <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                                    <svg className="w-24 h-24 text-teal-400" fill="currentColor" viewBox="0 0 20 20"><path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3zM6 8a2 2 0 11-4 0 2 2 0 014 0zM16 18v-3a5.972 5.972 0 00-.75-2.906A3.005 3.005 0 0119 15v3h-3zM4.75 12.094A5.973 5.973 0 004 15v3H1v-3a3 3 0 013.75-2.906z"></path></svg>
                                </div>
                                <h3 className="text-stone-500 font-bold text-xs uppercase tracking-widest">Total Agniveers</h3>
                                <p className="text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-teal-400 to-teal-200 mt-2">{stats.total_agniveers}</p>
                            </div>
                            <div className="bg-stone-900/50 backdrop-blur-md p-6 rounded-2xl shadow-lg border border-stone-800 relative overflow-hidden group">
                                <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                                    <svg className="w-24 h-24 text-purple-400" fill="currentColor" viewBox="0 0 20 20"><path d="M7 3a1 1 0 000 2h6a1 1 0 100-2H7zM4 7a1 1 0 011-1h10a1 1 0 110 2H5a1 1 0 01-1-1zM2 11a2 2 0 012-2h12a2 2 0 012 2v4a2 2 0 01-2 2H4a2 2 0 01-2-2v-4z" /></svg>
                                </div>
                                <h3 className="text-stone-500 font-bold text-xs uppercase tracking-widest">Batches</h3>
                                <p className="text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-purple-200 mt-2">{Object.keys(stats.by_batch || {}).length}</p>
                                <div className="mt-4 text-xs text-stone-400 flex flex-wrap gap-2">
                                    {Object.entries(stats.by_batch as any).map(([k, v]) => <span key={k} className="bg-stone-800 px-2 py-1 rounded border border-stone-700">{k}: <b className="text-purple-300">{v as number}</b></span>)}
                                </div>
                            </div>
                            <div className="bg-stone-900/50 backdrop-blur-md p-6 rounded-2xl shadow-lg border border-stone-800 relative overflow-hidden group">
                                <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                                    <svg className="w-24 h-24 text-blue-400" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M4 4a2 2 0 012-2h8a2 2 0 012 2v12a1 1 0 110 2h-3a1 1 0 01-1-1v-2a1 1 0 00-1-1H9a1 1 0 00-1 1v2a1 1 0 01-1 1H4a1 1 0 110-2V4zm3 1h2v2H7V5zm2 4H7v2h2V9zm2-4h2v2h-2V5zm2 4h-2v2h2V9z" clipRule="evenodd" /></svg>
                                </div>
                                <h3 className="text-stone-500 font-bold text-xs uppercase tracking-widest">Companies</h3>
                                <p className="text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-blue-200 mt-2">{Object.keys(stats.by_company || {}).length}</p>
                                <div className="mt-4 text-xs text-stone-400 flex flex-wrap gap-2">
                                    {Object.entries(stats.by_company as any).map(([k, v]) => <span key={k} className="bg-stone-800 px-2 py-1 rounded border border-stone-700">{k}: <b className="text-blue-300">{v as number}</b></span>)}
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Data Management Tab */}
                {activeTab === 'data' && (
                    <div className="bg-stone-900/80 backdrop-blur-md rounded-2xl shadow-2xl border border-stone-800 overflow-hidden flex flex-col h-full">
                        <div className="p-4 border-b border-stone-800 bg-stone-900/50 flex items-center space-x-4">
                            <h2 className="font-bold text-stone-200 mr-4">Data Management</h2>

                            <div className="flex-1 relative group">
                                <span className="absolute left-3 top-2.5 text-stone-500 group-focus-within:text-yellow-500 transition-colors">
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                                </span>
                                <input
                                    type="text"
                                    placeholder="Search by Name or Service ID..."
                                    className="w-full pl-9 pr-4 py-2 text-sm bg-stone-950 border border-stone-700 rounded-lg outline-none focus:border-yellow-500 focus:ring-1 focus:ring-yellow-500 text-stone-300 transition-all placeholder:text-stone-600"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                />
                            </div>

                            <select
                                value={filterBatch}
                                onChange={(e) => setFilterBatch(e.target.value)}
                                className="p-2 text-sm bg-stone-950 border border-stone-700 rounded-lg outline-none focus:border-yellow-500 text-stone-300"
                            >
                                <option value="">All Batches</option>
                                {Object.keys(stats.by_batch).map(b => (
                                    <option key={b} value={b}>{b}</option>
                                ))}
                            </select>

                            <select
                                value={filterCompany}
                                onChange={(e) => setFilterCompany(e.target.value)}
                                className="p-2 text-sm bg-stone-950 border border-stone-700 rounded-lg outline-none focus:border-yellow-500 text-stone-300"
                            >
                                <option value="">All Companies</option>
                                {Object.keys(stats.by_company).map(c => (
                                    <option key={c} value={c}>{c}</option>
                                ))}
                            </select>
                        </div>

                        <div className="flex-1 overflow-auto">
                            <table className="w-full text-sm text-left">
                                <thead className="bg-stone-950 text-stone-500 font-bold uppercase text-xs border-b border-stone-800 sticky top-0 shadow-lg">
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
                                            <td className="p-4">
                                                <button onClick={() => openEditModal(a)} className="text-blue-400 hover:text-blue-300 hover:underline mr-4 font-bold transition-colors">Edit</button>
                                                <button onClick={() => handleDelete(a.id)} className="text-red-500 hover:text-red-400 hover:underline font-bold transition-colors">Delete</button>
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
                    </div>
                )}

                {/* Batch Upload Tab */}
                {activeTab === 'batch' && (
                    <div className="max-w-2xl mx-auto bg-stone-900/80 backdrop-blur-md p-8 rounded-2xl shadow-xl border border-stone-800">
                        <h2 className="text-xl font-bold text-stone-200 mb-2">Bulk Agniveer Registration</h2>
                        <div className="flex justify-between items-start mb-8">
                            <p className="text-sm text-stone-500 max-w-md">Upload a CSV file containing batch details. Ensure the format matches the standard schema (Batch No, Service ID, Name, etc.).</p>
                            <a
                                href={`${API_BASE_URL}/uploads/agniveer_batch_template.csv`}
                                download="batch_template.csv"
                                className="flex items-center space-x-2 text-yellow-500 font-bold text-xs border border-yellow-500/30 bg-yellow-500/10 px-3 py-2 rounded-lg hover:bg-yellow-500/20 transition-all"
                            >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0l-4-4m4 4V4" /></svg>
                                <span>Download Template</span>
                            </a>
                        </div>

                        <form onSubmit={handleBulkUpload} className="space-y-6">
                            <div className="border-2 border-dashed border-stone-700 rounded-2xl p-12 text-center hover:bg-stone-800/50 hover:border-yellow-500/50 transition-all group">
                                <input
                                    type="file"
                                    accept=".csv"
                                    onChange={(e) => setCsvFile(e.target.files?.[0] || null)}
                                    className="hidden"
                                    id="csvUpload"
                                />
                                <label htmlFor="csvUpload" className="cursor-pointer flex flex-col items-center">
                                    <div className="w-16 h-16 bg-stone-800 rounded-full flex items-center justify-center mb-4 group-hover:bg-stone-700 transition-colors">
                                        <svg className="w-8 h-8 text-stone-400 group-hover:text-yellow-500 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" /></svg>
                                    </div>
                                    <span className="font-bold text-stone-300 text-lg group-hover:text-yellow-500 transition-colors">
                                        {csvFile ? csvFile.name : 'Click to Upload CSV'}
                                    </span>
                                    <span className="text-xs text-stone-500 mt-2">Maximum file size: 5MB</span>
                                </label>
                            </div>

                            {uploadStatus && (
                                <div className={`p-4 rounded-xl text-sm font-bold text-center border ${uploadStatus.includes('Failed') ? 'bg-red-900/20 text-red-400 border-red-900/50' : 'bg-teal-900/20 text-teal-400 border-teal-900/50'}`}>
                                    {uploadStatus}
                                </div>
                            )}

                            <button
                                type="submit"
                                disabled={!csvFile}
                                className="w-full bg-gradient-to-r from-yellow-600 to-yellow-700 hover:from-yellow-500 hover:to-yellow-600 disabled:from-stone-800 disabled:to-stone-800 disabled:text-stone-600 disabled:cursor-not-allowed text-stone-900 font-bold py-4 rounded-xl shadow-lg transition-all uppercase tracking-widest text-sm"
                            >
                                Process Batch Data
                            </button>
                        </form>
                    </div>
                )}

                {/* Policy Mgmt Tab */}
                {activeTab === 'policies' && (
                    <div className="space-y-6">
                        <div className="bg-stone-900/80 backdrop-blur-md p-6 rounded-2xl shadow-lg border border-stone-800">
                            <h2 className="text-lg font-bold text-stone-200 mb-4">Upload New Policy</h2>
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
                                <button type="submit" className="bg-gradient-to-r from-teal-600 to-teal-700 text-stone-100 px-6 py-3 rounded-xl font-bold shadow-lg hover:from-teal-500 hover:to-teal-600 transition-all uppercase tracking-wider text-xs">
                                    Upload
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
                                            <td className="p-4 font-bold text-stone-300">{p.title}</td>
                                            <td className="p-4 text-stone-500 font-mono text-xs">{p.filename}</td>
                                            <td className="p-4 text-stone-500">{formatDate(p.upload_date)}</td>
                                            <td className="p-4 text-right">
                                                <button className="text-red-500/80 hover:text-red-400 font-bold text-xs bg-red-900/10 px-3 py-1 rounded-lg border border-red-900/20 hover:bg-red-900/20 transition-all">Delete</button>
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
                )}

                {/* Audit Logs Tab */}
                {activeTab === 'system' && (
                    <div className="bg-stone-900/80 backdrop-blur-md rounded-2xl shadow-lg border border-stone-800 overflow-hidden">
                        <div className="p-4 border-b border-stone-800 bg-stone-900/50 flex justify-between items-center">
                            <h2 className="font-bold text-stone-200">System Audit Logs</h2>
                            <button className="bg-stone-800 border border-stone-700 text-stone-400 px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-stone-700 hover:text-white transition-all">Export Logs</button>
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
                            </tbody>
                        </table>
                    </div>
                )}

                {/* User Mgmt Tab */}
                {activeTab === 'users' && (
                    <div className="space-y-6">
                        {/* Creation Form */}
                        <div className="bg-stone-900/80 backdrop-blur-md p-6 rounded-2xl shadow-lg border border-stone-800">
                            <h2 className="text-lg font-bold text-stone-200 mb-4 border-b border-stone-800 pb-2">Create New Officer / Commander</h2>
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
                                    <button type="submit" className="bg-gradient-to-r from-yellow-600 to-yellow-700 text-stone-900 px-8 py-2.5 rounded-lg font-bold shadow-lg hover:from-yellow-500 hover:to-yellow-600 transition-all uppercase tracking-wider text-sm">Create User</button>
                                </div>
                            </form>
                        </div>

                        {/* User List */}
                        <div className="bg-stone-900/80 backdrop-blur-md rounded-2xl shadow-lg border border-stone-800 overflow-hidden">
                            <div className="p-4 bg-stone-950 border-b border-stone-800 font-bold text-stone-400 uppercase text-xs tracking-wider">Authorized Users</div>
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
                                                    <>
                                                        <button onClick={() => handleResetPassword(u.user_id)} className="text-blue-400 hover:text-blue-300 hover:underline font-bold text-xs mr-4 transition-colors">Change Password</button>
                                                        <button onClick={() => handleDeleteUser(u.user_id)} className="text-red-400 hover:text-red-300 hover:underline font-bold text-xs transition-colors">Revoke</button>
                                                    </>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

            </div>

            {/* Edit Modal Overlay */}
            {isEditModalOpen && editingAgniveer && (
                <div className="absolute inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
                    <div className="bg-stone-900 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto flex flex-col border border-stone-700 ring-1 ring-white/10">
                        <div className="p-6 border-b border-stone-800 flex justify-between items-center bg-stone-950/50">
                            <h3 className="text-xl font-bold text-stone-200">Edit Agniveer Profile</h3>
                            <button onClick={() => setIsEditModalOpen(false)} className="text-stone-500 hover:text-stone-300 transition-colors">
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                            </button>
                        </div>

                        <div className="p-8 grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* Personal Details */}
                            <div className="space-y-4">
                                <h4 className="font-bold text-teal-500 border-b border-teal-500/30 pb-2 mb-4 uppercase text-xs tracking-wider">Personal Details</h4>
                                <div><label className="text-[10px] font-bold text-stone-500 uppercase pl-1">Service ID</label><input name="service_id" value={editingAgniveer.service_id || ''} onChange={handleEditChange} className="w-full p-2.5 bg-stone-950 border border-stone-800 rounded-lg text-stone-300 outline-none focus:border-teal-500/50" /></div>
                                <div><label className="text-[10px] font-bold text-stone-500 uppercase pl-1">Name</label><input name="name" value={editingAgniveer.name || ''} onChange={handleEditChange} className="w-full p-2.5 bg-stone-950 border border-stone-800 rounded-lg text-stone-300 outline-none focus:border-teal-500/50" /></div>
                                <div><label className="text-[10px] font-bold text-stone-500 uppercase pl-1">DOB (DD-MM-YYYY)</label><input type="text" name="dob" placeholder="DD-MM-YYYY" value={editingAgniveer.dob || ''} onChange={handleEditChange} className="w-full p-2.5 bg-stone-950 border border-stone-800 rounded-lg text-stone-300 outline-none focus:border-teal-500/50" /></div>
                                <div><label className="text-[10px] font-bold text-stone-500 uppercase pl-1">Reporting Date (DD-MM-YYYY)</label><input type="text" name="reporting_date" placeholder="DD-MM-YYYY" value={editingAgniveer.reporting_date || ''} onChange={handleEditChange} className="w-full p-2.5 bg-stone-950 border border-stone-800 rounded-lg text-stone-300 outline-none focus:border-teal-500/50" /></div>
                                <div><label className="text-[10px] font-bold text-stone-500 uppercase pl-1">Qualification</label><input name="higher_qualification" value={editingAgniveer.higher_qualification || ''} onChange={handleEditChange} className="w-full p-2.5 bg-stone-950 border border-stone-800 rounded-lg text-stone-300 outline-none focus:border-teal-500/50" /></div>
                                <div className="md:col-span-2 grid grid-cols-2 gap-4">
                                    <div><label className="text-[10px] font-bold text-stone-500 uppercase pl-1">Email</label><input name="email" value={editingAgniveer.email || ''} onChange={handleEditChange} className="w-full p-2.5 bg-stone-950 border border-stone-800 rounded-lg text-stone-300 outline-none focus:border-teal-500/50" /></div>
                                    <div><label className="text-[10px] font-bold text-stone-500 uppercase pl-1">Phone (Self)</label><input name="phone" value={editingAgniveer.phone || ''} onChange={handleEditChange} className="w-full p-2.5 bg-stone-950 border border-stone-800 rounded-lg text-stone-300 outline-none focus:border-teal-500/50" /></div>
                                </div>
                                <div className="md:col-span-2"><label className="text-[10px] font-bold text-stone-500 uppercase pl-1">Photo URL</label><input name="photo_url" value={editingAgniveer.photo_url || ''} onChange={handleEditChange} className="w-full p-2.5 bg-stone-950 border border-stone-800 rounded-lg text-stone-300 outline-none focus:border-teal-500/50" /></div>
                            </div>

                            {/* Service Details */}
                            <div className="space-y-4">
                                <h4 className="font-bold text-blue-500 border-b border-blue-500/30 pb-2 mb-4 uppercase text-xs tracking-wider">Service Details</h4>
                                <div><label className="text-[10px] font-bold text-stone-500 uppercase pl-1">Batch No</label><input name="batch_no" value={editingAgniveer.batch_no || ''} onChange={handleEditChange} className="w-full p-2.5 bg-stone-950 border border-stone-800 rounded-lg text-stone-300 outline-none focus:border-blue-500/50" /></div>
                                <div><label className="text-[10px] font-bold text-stone-500 uppercase pl-1">Company</label><input name="company" value={editingAgniveer.company || ''} onChange={handleEditChange} className="w-full p-2.5 bg-stone-950 border border-stone-800 rounded-lg text-stone-300 outline-none focus:border-blue-500/50" /></div>
                                <div><label className="text-[10px] font-bold text-stone-500 uppercase pl-1">Unit</label><input name="unit" value={editingAgniveer.unit || ''} onChange={handleEditChange} className="w-full p-2.5 bg-stone-950 border border-stone-800 rounded-lg text-stone-300 outline-none focus:border-blue-500/50" /></div>
                                <div><label className="text-[10px] font-bold text-stone-500 uppercase pl-1">Rank</label><input name="rank" value={editingAgniveer.rank || ''} onChange={handleEditChange} className="w-full p-2.5 bg-stone-950 border border-stone-800 rounded-lg text-stone-300 outline-none focus:border-blue-500/50" /></div>
                            </div>

                            {/* NOK & Contact */}
                            <div className="space-y-4">
                                <h4 className="font-bold text-purple-500 border-b border-purple-500/30 pb-2 mb-4 uppercase text-xs tracking-wider">NOK & Contact</h4>
                                <div><label className="text-[10px] font-bold text-stone-500 uppercase pl-1">NOK Name</label><input name="nok_name" value={editingAgniveer.nok_name || ''} onChange={handleEditChange} className="w-full p-2.5 bg-stone-950 border border-stone-800 rounded-lg text-stone-300 outline-none focus:border-purple-500/50" /></div>
                                <div><label className="text-[10px] font-bold text-stone-500 uppercase pl-1">NOK Phone</label><input name="nok_phone" value={editingAgniveer.nok_phone || ''} onChange={handleEditChange} className="w-full p-2.5 bg-stone-950 border border-stone-800 rounded-lg text-stone-300 outline-none focus:border-purple-500/50" /></div>
                                <div className="md:col-span-2"><label className="text-[10px] font-bold text-stone-500 uppercase pl-1">Hometown Address</label><textarea name="hometown_address" value={editingAgniveer.hometown_address || ''} onChange={handleEditChange as any} className="w-full p-2.5 bg-stone-950 border border-stone-800 rounded-lg text-stone-300 outline-none focus:border-purple-500/50 h-24" /></div>
                            </div>

                            {/* Banking & IDs */}
                            <div className="space-y-4">
                                <h4 className="font-bold text-yellow-500 border-b border-yellow-500/30 pb-2 mb-4 uppercase text-xs tracking-wider">Financial & IDs</h4>
                                <div className="grid grid-cols-2 gap-4">
                                    <div><label className="text-[10px] font-bold text-stone-500 uppercase pl-1">Bank Name</label><input name="bank_name" value={editingAgniveer.bank_name || ''} onChange={handleEditChange} className="w-full p-2.5 bg-stone-950 border border-stone-800 rounded-lg text-stone-300 outline-none focus:border-yellow-500/50" /></div>
                                    <div><label className="text-[10px] font-bold text-stone-500 uppercase pl-1">Branch</label><input name="bank_branch" value={editingAgniveer.bank_branch || ''} onChange={handleEditChange} className="w-full p-2.5 bg-stone-950 border border-stone-800 rounded-lg text-stone-300 outline-none focus:border-yellow-500/50" /></div>
                                    <div className="md:col-span-2"><label className="text-[10px] font-bold text-stone-500 uppercase pl-1">Account No</label><input name="bank_account" value={editingAgniveer.bank_account || ''} onChange={handleEditChange} className="w-full p-2.5 bg-stone-950 border border-stone-800 rounded-lg text-stone-300 outline-none focus:border-yellow-500/50" /></div>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div><label className="text-[10px] font-bold text-stone-500 uppercase pl-1">PAN Card</label><input name="pan_card" value={editingAgniveer.pan_card || ''} onChange={handleEditChange} className="w-full p-2.5 bg-stone-950 border border-stone-800 rounded-lg text-stone-300 outline-none focus:border-yellow-500/50" /></div>
                                    <div><label className="text-[10px] font-bold text-stone-500 uppercase pl-1">Adhaar Card</label><input name="adhaar_card" value={editingAgniveer.adhaar_card || ''} onChange={handleEditChange} className="w-full p-2.5 bg-stone-950 border border-stone-800 rounded-lg text-stone-300 outline-none focus:border-yellow-500/50" /></div>
                                </div>
                            </div>
                        </div>

                        <div className="p-6 bg-stone-950/50 border-t border-stone-800 flex justify-end space-x-4">
                            <button onClick={() => setIsEditModalOpen(false)} className="px-6 py-2 rounded-lg font-bold text-stone-500 hover:text-stone-300 transition-colors">Cancel</button>
                            <button onClick={handleSaveEdit} className="px-8 py-2 rounded-lg font-bold bg-gradient-to-r from-teal-600 to-teal-700 hover:from-teal-500 hover:to-teal-600 text-stone-100 shadow-lg transition-all uppercase tracking-wider text-sm">Save Changes</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminDashboard;
