import React, { useState, useEffect } from 'react';
import { User } from '../types';

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

    const formatDate = (dateString: string | Date | null) => {
        if (!dateString) return 'N/A';
        const d = new Date(dateString);
        return `${d.getDate().toString().padStart(2, '0')}-${(d.getMonth() + 1).toString().padStart(2, '0')}-${d.getFullYear()}`;
    };

    const formatDateTime = (dateString: string | Date | null) => {
        if (!dateString) return 'N/A';
        const d = new Date(dateString);
        return `${formatDate(d)} ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    };

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
            const res = await fetch('http://localhost:8000/api/admin/stats', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) setStats(await res.json());
        } catch (e) { console.error(e); }
    };

    const fetchAuditLogs = async () => {
        try {
            const token = localStorage.getItem('token');
            const res = await fetch('http://localhost:8000/api/admin/audit-logs', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) setAuditLogs(await res.json());
        } catch (e) { console.error(e); }
    };

    const fetchPolicies = async () => {
        try {
            const token = localStorage.getItem('token');
            const res = await fetch('http://localhost:8000/api/policies', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) setPolicies(await res.json());
        } catch (e) { console.error(e); }
    };

    const fetchAgniveers = async () => {
        let url = 'http://localhost:8000/api/admin/agniveers?';
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
            const res = await fetch('http://localhost:8000/api/admin/bulk-upload', {
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
            await fetch('http://localhost:8000/api/policies', {
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
            const res = await fetch('http://localhost:8000/api/admin/users', {
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
            const res = await fetch('http://localhost:8000/api/admin/users', {
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
            await fetch(`http://localhost:8000/api/admin/users/${id}`, {
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
            const res = await fetch(`http://localhost:8000/api/admin/users/${id}/password`, {
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
            const res = await fetch(`http://localhost:8000/api/admin/agniveers/${id}`, {
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

    // Converter: ISO (YYYY-MM-DD) -> Display (DD-MM-YYYY)
    const toDisplayDate = (iso: string) => {
        if (!iso) return '';
        const d = new Date(iso);
        if (isNaN(d.getTime())) return iso; // return as-is if strictly typing
        return `${d.getDate().toString().padStart(2, '0')}-${(d.getMonth() + 1).toString().padStart(2, '0')}-${d.getFullYear()}`;
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
    const renderSidebarItem = (id: string, label: string, icon: any) => (
        <button
            onClick={() => setActiveTab(id)}
            className={`w-full text-left p-3 rounded-lg flex items-center space-x-3 transition-colors ${activeTab === id ? 'bg-teal-700 text-white shadow-md' : 'text-stone-600 hover:bg-stone-200'}`}
        >
            {icon}
            <span className="font-bold text-sm">{label}</span>
        </button>
    );

    return (
        <div className="flex h-[calc(100vh-100px)] bg-stone-100 rounded-xl overflow-hidden border border-stone-200 shadow-xl relative">

            {/* Sidebar */}
            <div className="w-64 bg-white border-r border-stone-200 p-4 flex flex-col space-y-2">
                <div className="mb-6 px-3">
                    <h2 className="text-xl font-bold text-teal-800">Admin Console</h2>
                    <p className="text-xs text-stone-400">System Management v2.0</p>
                </div>

                {renderSidebarItem('overview', 'Dashboard Overview', <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" /></svg>)}
                {renderSidebarItem('data', 'Data Management', <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>)}
                {renderSidebarItem('users', 'User Management', <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>)}
                {renderSidebarItem('batch', 'Batch Upload (CSV)', <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>)}
                {renderSidebarItem('policies', 'Policy Management', <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>)}
                {renderSidebarItem('system', 'Audit Logs & Backup', <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>)}
            </div>

            {/* Main Content Area */}
            <div className="flex-1 overflow-y-auto p-8">

                {/* Overview Tab */}
                {activeTab === 'overview' && (
                    <div className="space-y-6">
                        <h2 className="text-2xl font-bold text-stone-800">System Parameters</h2>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div className="bg-white p-6 rounded-xl shadow-sm border border-stone-100">
                                <h3 className="text-stone-500 font-bold text-sm uppercase">Total Agniveers</h3>
                                <p className="text-4xl font-black text-teal-700 mt-2">{stats.total_agniveers}</p>
                            </div>
                            <div className="bg-white p-6 rounded-xl shadow-sm border border-stone-100">
                                <h3 className="text-stone-500 font-bold text-sm uppercase">Batches</h3>
                                <p className="text-4xl font-black text-purple-700 mt-2">{Object.keys(stats.by_batch || {}).length}</p>
                                <div className="mt-2 text-xs text-stone-500">
                                    {Object.entries(stats.by_batch as any).map(([k, v]) => <span key={k} className="mr-2">{k}: <b>{v as number}</b></span>)}
                                </div>
                            </div>
                            <div className="bg-white p-6 rounded-xl shadow-sm border border-stone-100">
                                <h3 className="text-stone-500 font-bold text-sm uppercase">Companies</h3>
                                <p className="text-4xl font-black text-blue-700 mt-2">{Object.keys(stats.by_company || {}).length}</p>
                                <div className="mt-2 text-xs text-stone-500">
                                    {Object.entries(stats.by_company as any).map(([k, v]) => <span key={k} className="mr-2">{k}: <b>{v as number}</b></span>)}
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Data Management Tab */}
                {activeTab === 'data' && (
                    <div className="bg-white rounded-xl shadow border border-stone-200 overflow-hidden flex flex-col h-full bg-opacity-50">
                        <div className="p-4 border-b border-stone-200 bg-stone-50 flex items-center space-x-4">
                            <h2 className="font-bold text-stone-700 mr-4">Data Management</h2>

                            <div className="flex-1 relative">
                                <span className="absolute left-3 top-2.5 text-stone-400">
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                                </span>
                                <input
                                    type="text"
                                    placeholder="Search by Name or Service ID..."
                                    className="w-full pl-9 pr-4 py-2 text-sm border border-stone-300 rounded-lg outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 transition-all"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                />
                            </div>

                            <select
                                value={filterBatch}
                                onChange={(e) => setFilterBatch(e.target.value)}
                                className="p-2 text-sm border border-stone-300 rounded-lg outline-none"
                            >
                                <option value="">All Batches</option>
                                {Object.keys(stats.by_batch).map(b => (
                                    <option key={b} value={b}>{b}</option>
                                ))}
                            </select>

                            <select
                                value={filterCompany}
                                onChange={(e) => setFilterCompany(e.target.value)}
                                className="p-2 text-sm border border-stone-300 rounded-lg outline-none"
                            >
                                <option value="">All Companies</option>
                                {Object.keys(stats.by_company).map(c => (
                                    <option key={c} value={c}>{c}</option>
                                ))}
                            </select>
                        </div>

                        <div className="flex-1 overflow-auto">
                            <table className="w-full text-sm text-left">
                                <thead className="bg-white text-stone-500 font-bold uppercase text-xs border-b border-stone-200 sticky top-0 shadow-sm">
                                    <tr>
                                        <th className="p-3">Service ID</th>
                                        <th className="p-3">Name</th>
                                        <th className="p-3">Batch</th>
                                        <th className="p-3">Company</th>
                                        <th className="p-3">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-stone-100 font-mono text-xs">
                                    {agniveers.map((a: any) => (
                                        <tr key={a.id} className="hover:bg-stone-50">
                                            <td className="p-3 font-bold text-teal-700">{a.service_id}</td>
                                            <td className="p-3 text-stone-800">{a.name}</td>
                                            <td className="p-3 text-stone-600">{a.batch_no}</td>
                                            <td className="p-3 text-blue-600 font-bold">{a.company}</td>
                                            <td className="p-3">
                                                <button onClick={() => openEditModal(a)} className="text-blue-500 hover:underline mr-3 font-bold">Edit</button>
                                                <button onClick={() => handleDelete(a.id)} className="text-red-500 hover:underline font-bold">Delete</button>
                                            </td>
                                        </tr>
                                    ))}
                                    {agniveers.length === 0 && (
                                        <tr><td colSpan={5} className="p-8 text-center text-stone-400">No records found matching filters.</td></tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                        <div className="p-2 bg-stone-50 text-xs text-center text-stone-400 border-t border-stone-200">
                            Showing {agniveers.length} records
                        </div>
                    </div>
                )}

                {/* Batch Upload Tab */}
                {activeTab === 'batch' && (
                    <div className="max-w-2xl mx-auto bg-white p-8 rounded-xl shadow-lg border border-stone-100">
                        <h2 className="text-xl font-bold text-stone-800 mb-4">Bulk Agniveer Registration</h2>
                        <div className="flex justify-between items-center mb-6">
                            <p className="text-sm text-stone-500">Upload a CSV file containing batch details. Ensure the format matches the standard schema (Batch No, Service ID, Name, etc.).</p>
                            <a
                                href="http://localhost:8000/uploads/agniveer_batch_template.csv"
                                download="batch_template.csv"
                                className="flex items-center space-x-2 text-teal-700 font-bold text-sm border border-teal-200 px-3 py-1.5 rounded hover:bg-teal-50"
                            >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0l-4-4m4 4V4" /></svg>
                                <span>Download Template</span>
                            </a>
                        </div>

                        <form onSubmit={handleBulkUpload} className="space-y-6">
                            <div className="border-2 border-dashed border-stone-300 rounded-xl p-10 text-center hover:bg-stone-50 transition-colors">
                                <input
                                    type="file"
                                    accept=".csv"
                                    onChange={(e) => setCsvFile(e.target.files?.[0] || null)}
                                    className="hidden"
                                    id="csvUpload"
                                />
                                <label htmlFor="csvUpload" className="cursor-pointer flex flex-col items-center">
                                    <svg className="w-12 h-12 text-stone-400 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" /></svg>
                                    <span className="font-bold text-teal-700 text-lg">
                                        {csvFile ? csvFile.name : 'Click to Upload CSV'}
                                    </span>
                                    <span className="text-xs text-stone-400 mt-2">Maximum file size: 5MB</span>
                                </label>
                            </div>

                            {uploadStatus && (
                                <div className={`p-4 rounded-lg text-sm font-bold text-center ${uploadStatus.includes('Failed') ? 'bg-red-50 text-red-600' : 'bg-teal-50 text-teal-700'}`}>
                                    {uploadStatus}
                                </div>
                            )}

                            <button
                                type="submit"
                                disabled={!csvFile}
                                className="w-full bg-teal-700 hover:bg-teal-800 disabled:bg-stone-300 disabled:cursor-not-allowed text-white font-bold py-3 rounded-lg shadow-md transition-all"
                            >
                                Process Batch Data
                            </button>
                        </form>
                    </div>
                )}

                {/* Policy Mgmt Tab */}
                {activeTab === 'policies' && (
                    <div className="space-y-6">
                        <div className="bg-white p-6 rounded-xl shadow-lg border border-stone-100">
                            <h2 className="text-lg font-bold text-stone-800 mb-4">Upload New Policy</h2>
                            <form onSubmit={handlePolicyUpload} className="flex gap-4 items-end">
                                <div className="flex-1">
                                    <label className="block text-xs font-bold text-stone-500 uppercase mb-1">Policy Title</label>
                                    <input
                                        type="text"
                                        value={policyTitle}
                                        onChange={e => setPolicyTitle(e.target.value)}
                                        className="w-full p-2 border border-stone-300 rounded-lg outline-none focus:border-teal-500"
                                        placeholder="e.g. Leave Policy 2026"
                                    />
                                </div>
                                <div className="flex-1">
                                    <label className="block text-xs font-bold text-stone-500 uppercase mb-1">Document (PDF)</label>
                                    <input
                                        type="file"
                                        accept="application/pdf"
                                        onChange={e => setPolicyFile(e.target.files?.[0] || null)}
                                        className="w-full text-sm text-stone-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-teal-50 file:text-teal-700 hover:file:bg-teal-100"
                                    />
                                </div>
                                <button type="submit" className="bg-teal-700 text-white px-6 py-2 rounded-lg font-bold shadow-md hover:bg-teal-800">
                                    Upload
                                </button>
                            </form>
                        </div>

                        <div className="bg-white rounded-xl shadow border border-stone-200 overflow-hidden">
                            <table className="w-full text-sm text-left">
                                <thead className="bg-stone-50 text-stone-500 font-bold uppercase text-xs">
                                    <tr>
                                        <th className="p-4">Title</th>
                                        <th className="p-4">Filename</th>
                                        <th className="p-4">Upload Date</th>
                                        <th className="p-4 text-right">Action</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-stone-100">
                                    {policies.map(p => (
                                        <tr key={p.id} className="hover:bg-stone-50">
                                            <td className="p-4 font-bold text-stone-700">{p.title}</td>
                                            <td className="p-4 text-stone-500 font-mono text-xs">{p.filename}</td>
                                            <td className="p-4 text-stone-500">{formatDate(p.upload_date)}</td>
                                            <td className="p-4 text-right">
                                                <button className="text-red-500 hover:text-red-700 font-bold text-xs">Delete</button>
                                            </td>
                                        </tr>
                                    ))}
                                    {policies.length === 0 && (
                                        <tr><td colSpan={4} className="p-8 text-center text-stone-400 font-bold">No active policies found.</td></tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* Audit Logs Tab */}
                {activeTab === 'system' && (
                    <div className="bg-white rounded-xl shadow border border-stone-200 overflow-hidden">
                        <div className="p-4 border-b border-stone-200 bg-stone-50 flex justify-between items-center">
                            <h2 className="font-bold text-stone-700">System Audit Logs</h2>
                            <button className="bg-white border border-stone-300 text-stone-600 px-3 py-1 rounded text-xs font-bold hover:bg-stone-100">Export Logs</button>
                        </div>
                        <table className="w-full text-sm text-left">
                            <thead className="bg-white text-stone-500 font-bold uppercase text-xs border-b border-stone-200">
                                <tr>
                                    <th className="p-3">Timestamp</th>
                                    <th className="p-3">User ID</th>
                                    <th className="p-3">Action</th>
                                    <th className="p-3">Details</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-stone-100 font-mono text-xs">
                                {auditLogs.map(log => (
                                    <tr key={log.id} className="hover:bg-stone-50">
                                        <td className="p-3 text-stone-500">{formatDateTime(log.timestamp)}</td>
                                        <td className="p-3 text-teal-600 font-bold">USR-{log.user_id}</td>
                                        <td className="p-3 font-bold text-stone-800">{log.action}</td>
                                        <td className="p-3 text-stone-600">{log.details}</td>
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
                        <div className="bg-white p-6 rounded-xl shadow-lg border border-stone-100">
                            <h2 className="text-lg font-bold text-stone-800 mb-4">Create New Officer / Commander</h2>
                            <form onSubmit={handleCreateUser} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-stone-500 uppercase mb-1">Rank</label>
                                    <input value={newUser.rank} onChange={e => setNewUser({ ...newUser, rank: e.target.value })} className="w-full p-2 border rounded" placeholder="e.g. Major" />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-stone-500 uppercase mb-1">Full Name</label>
                                    <input value={newUser.full_name} onChange={e => setNewUser({ ...newUser, full_name: e.target.value })} className="w-full p-2 border rounded" placeholder="Name" />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-stone-500 uppercase mb-1">Role / Appointment</label>
                                    <select value={newUser.role} onChange={e => setNewUser({ ...newUser, role: e.target.value })} className="w-full p-2 border rounded">
                                        <option value="co">Battalion Commander (CO)</option>
                                        <option value="trg_officer">Training Officer</option>
                                        <option value="coy_cdr">Company Commander</option>
                                        <option value="coy_clk">Company Clerk</option>
                                    </select>
                                </div>

                                {/* Dynamic Field: Assigned Company */}
                                {['coy_cdr', 'coy_clk'].includes(newUser.role) && (
                                    <div className="bg-blue-50 p-2 rounded border border-blue-100">
                                        <label className="block text-xs font-bold text-blue-700 uppercase mb-1">Assigned Company</label>
                                        <select value={newUser.assigned_company} onChange={e => setNewUser({ ...newUser, assigned_company: e.target.value })} className="w-full p-2 border rounded border-blue-200">
                                            <option value="">-- Select Company --</option>
                                            {['Alpha', 'Bravo', 'Charlie', 'Delta', 'Support', 'Headquarter'].map(c => (
                                                <option key={c} value={c}>{c}</option>
                                            ))}
                                        </select>
                                    </div>
                                )}

                                <div>
                                    <label className="block text-xs font-bold text-stone-500 uppercase mb-1">Login Username</label>
                                    <input value={newUser.username} onChange={e => setNewUser({ ...newUser, username: e.target.value })} className="w-full p-2 border rounded" placeholder="Service ID" required />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-stone-500 uppercase mb-1">Login Password</label>
                                    <input type="password" value={newUser.password} onChange={e => setNewUser({ ...newUser, password: e.target.value })} className="w-full p-2 border rounded" placeholder="******" required />
                                </div>

                                <div className="md:col-span-2 lg:col-span-3 flex justify-end mt-2">
                                    <button type="submit" className="bg-teal-700 text-white px-8 py-2 rounded-lg font-bold shadow hover:bg-teal-800">Create User</button>
                                </div>
                            </form>
                        </div>

                        {/* User List */}
                        <div className="bg-white rounded-xl shadow border border-stone-200 overflow-hidden">
                            <div className="p-4 bg-stone-50 border-b border-stone-200 font-bold text-stone-600">Authorized Users</div>
                            <table className="w-full text-sm text-left">
                                <thead className="bg-white text-stone-500 font-bold uppercase text-xs border-b border-stone-200">
                                    <tr>
                                        <th className="p-3">Rank/Name</th>
                                        <th className="p-3">Role</th>
                                        <th className="p-3">Scope</th>
                                        <th className="p-3">Username</th>
                                        <th className="p-3 text-right">Action</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-stone-100">
                                    {adminUsers.filter((u: any) => u.role !== 'agniveer').map((u: any) => (
                                        <tr key={u.user_id} className="hover:bg-stone-50">
                                            <td className="p-3 font-bold text-stone-700">
                                                <span className="text-stone-500 text-xs mr-1">{u.rank}</span> {u.full_name || 'N/A'}
                                            </td>
                                            <td className="p-3">
                                                <span className={`px-2 py-1 rounded-full text-xs font-bold ${u.role === 'co' ? 'bg-purple-100 text-purple-700' :
                                                    u.role === 'coy_cdr' ? 'bg-blue-100 text-blue-700' :
                                                        u.role === 'coy_clk' ? 'bg-yellow-100 text-yellow-700' :
                                                            u.role === 'trg_officer' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'
                                                    }`}>
                                                    {u.role.toUpperCase().replace('_', ' ')}
                                                </span>
                                            </td>
                                            <td className="p-3 text-xs font-mono">
                                                {['coy_cdr', 'coy_clk'].includes(u.role) ? (
                                                    <span className="text-blue-600 font-bold">ONLY {u.assigned_company}</span>
                                                ) : <span className="text-stone-400">GLOBAL ACCESS</span>}
                                            </td>
                                            <td className="p-3 text-stone-500">{u.username}</td>
                                            <td className="p-3 text-right">
                                                {u.username !== 'admin' && (
                                                    <>
                                                        <button onClick={() => handleResetPassword(u.user_id)} className="text-blue-500 hover:underline font-bold text-xs mr-3">Change Password</button>
                                                        <button onClick={() => handleDeleteUser(u.user_id)} className="text-red-500 hover:underline font-bold text-xs">Revoke</button>
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
                <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto flex flex-col">
                        <div className="p-6 border-b border-stone-200 flex justify-between items-center bg-stone-50">
                            <h3 className="text-xl font-bold text-stone-800">Edit Agniveer Profile</h3>
                            <button onClick={() => setIsEditModalOpen(false)} className="text-stone-400 hover:text-stone-600">
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                            </button>
                        </div>

                        <div className="p-8 grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* Personal Details */}
                            <div className="space-y-4">
                                <h4 className="font-bold text-teal-800 border-b border-teal-100 pb-2 mb-4">Personal Details</h4>
                                <div><label className="text-xs font-bold text-stone-500 uppercase">Service ID</label><input name="service_id" value={editingAgniveer.service_id || ''} onChange={handleEditChange} className="w-full p-2 border rounded" /></div>
                                <div><label className="text-xs font-bold text-stone-500 uppercase">Name</label><input name="name" value={editingAgniveer.name || ''} onChange={handleEditChange} className="w-full p-2 border rounded" /></div>
                                <div><label className="text-xs font-bold text-stone-500 uppercase">DOB (DD-MM-YYYY)</label><input type="text" name="dob" placeholder="DD-MM-YYYY" value={editingAgniveer.dob || ''} onChange={handleEditChange} className="w-full p-2 border rounded" /></div>
                                <div><label className="text-xs font-bold text-stone-500 uppercase">Reporting Date (DD-MM-YYYY)</label><input type="text" name="reporting_date" placeholder="DD-MM-YYYY" value={editingAgniveer.reporting_date || ''} onChange={handleEditChange} className="w-full p-2 border rounded" /></div>
                                <div><label className="text-xs font-bold text-stone-500 uppercase">Qualification</label><input name="higher_qualification" value={editingAgniveer.higher_qualification || ''} onChange={handleEditChange} className="w-full p-2 border rounded" /></div>
                                <div className="md:col-span-2 grid grid-cols-2 gap-4">
                                    <div><label className="text-xs font-bold text-stone-500 uppercase">Email</label><input name="email" value={editingAgniveer.email || ''} onChange={handleEditChange} className="w-full p-2 border rounded" /></div>
                                    <div><label className="text-xs font-bold text-stone-500 uppercase">Phone (Self)</label><input name="phone" value={editingAgniveer.phone || ''} onChange={handleEditChange} className="w-full p-2 border rounded" /></div>
                                </div>
                                <div className="md:col-span-2"><label className="text-xs font-bold text-stone-500 uppercase">Photo URL</label><input name="photo_url" value={editingAgniveer.photo_url || ''} onChange={handleEditChange} className="w-full p-2 border rounded" /></div>
                            </div>

                            {/* Service Details */}
                            <div className="space-y-4">
                                <h4 className="font-bold text-blue-800 border-b border-blue-100 pb-2 mb-4">Service Details</h4>
                                <div><label className="text-xs font-bold text-stone-500 uppercase">Batch No</label><input name="batch_no" value={editingAgniveer.batch_no || ''} onChange={handleEditChange} className="w-full p-2 border rounded" /></div>
                                <div><label className="text-xs font-bold text-stone-500 uppercase">Company</label><input name="company" value={editingAgniveer.company || ''} onChange={handleEditChange} className="w-full p-2 border rounded" /></div>
                                <div><label className="text-xs font-bold text-stone-500 uppercase">Unit</label><input name="unit" value={editingAgniveer.unit || ''} onChange={handleEditChange} className="w-full p-2 border rounded" /></div>
                                <div><label className="text-xs font-bold text-stone-500 uppercase">Rank</label><input name="rank" value={editingAgniveer.rank || ''} onChange={handleEditChange} className="w-full p-2 border rounded" /></div>
                            </div>

                            {/* NOK & Contact */}
                            <div className="space-y-4">
                                <h4 className="font-bold text-purple-800 border-b border-purple-100 pb-2 mb-4">NOK & Contact</h4>
                                <div><label className="text-xs font-bold text-stone-500 uppercase">NOK Name</label><input name="nok_name" value={editingAgniveer.nok_name || ''} onChange={handleEditChange} className="w-full p-2 border rounded" /></div>
                                <div><label className="text-xs font-bold text-stone-500 uppercase">NOK Phone</label><input name="nok_phone" value={editingAgniveer.nok_phone || ''} onChange={handleEditChange} className="w-full p-2 border rounded" /></div>
                                <div className="md:col-span-2"><label className="text-xs font-bold text-stone-500 uppercase">Hometown Address</label><textarea name="hometown_address" value={editingAgniveer.hometown_address || ''} onChange={handleEditChange as any} className="w-full p-2 border rounded h-20" /></div>
                            </div>

                            {/* Banking & IDs */}
                            <div className="space-y-4">
                                <h4 className="font-bold text-stone-800 border-b border-stone-200 pb-2 mb-4">Financial & IDs</h4>
                                <div className="grid grid-cols-2 gap-4">
                                    <div><label className="text-xs font-bold text-stone-500 uppercase">Bank Name</label><input name="bank_name" value={editingAgniveer.bank_name || ''} onChange={handleEditChange} className="w-full p-2 border rounded" /></div>
                                    <div><label className="text-xs font-bold text-stone-500 uppercase">Branch</label><input name="bank_branch" value={editingAgniveer.bank_branch || ''} onChange={handleEditChange} className="w-full p-2 border rounded" /></div>
                                    <div className="md:col-span-2"><label className="text-xs font-bold text-stone-500 uppercase">Account No</label><input name="bank_account" value={editingAgniveer.bank_account || ''} onChange={handleEditChange} className="w-full p-2 border rounded" /></div>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div><label className="text-xs font-bold text-stone-500 uppercase">PAN Card</label><input name="pan_card" value={editingAgniveer.pan_card || ''} onChange={handleEditChange} className="w-full p-2 border rounded" /></div>
                                    <div><label className="text-xs font-bold text-stone-500 uppercase">Adhaar Card</label><input name="adhaar_card" value={editingAgniveer.adhaar_card || ''} onChange={handleEditChange} className="w-full p-2 border rounded" /></div>
                                </div>
                            </div>
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

export default AdminDashboard;
