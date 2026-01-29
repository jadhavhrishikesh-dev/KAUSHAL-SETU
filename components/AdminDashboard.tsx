import React, { useState } from 'react';
import { User } from '../types';
import SystemParams from './admin/SystemParams';
import AgniveerDirectory from './admin/AgniveerDirectory';
import UserConsole from './admin/UserConsole';
import BatchRegistration from './admin/BatchRegistration';
import PolicyConsole from './admin/PolicyConsole';
import AuditLogViewer from './admin/AuditLogViewer';
import { LayoutDashboard, Database, Users, FileSpreadsheet, FileText, Activity } from 'lucide-react';

interface AdminDashboardProps {
    user: User;
}

const AdminDashboard: React.FC<AdminDashboardProps> = ({ user }) => {
    const [activeTab, setActiveTab] = useState('overview');

    const renderSidebarItem = (id: string, label: string, icon: React.ReactNode) => (
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
                    {renderSidebarItem('overview', 'Dashboard Overview', <LayoutDashboard className="w-5 h-5" />)}
                    {renderSidebarItem('data', 'Data Management', <Database className="w-5 h-5" />)}
                    {renderSidebarItem('users', 'User Management', <Users className="w-5 h-5" />)}
                    {renderSidebarItem('batch', 'Batch Upload (CSV)', <FileSpreadsheet className="w-5 h-5" />)}
                    {renderSidebarItem('policies', 'Policy Management', <FileText className="w-5 h-5" />)}
                    {renderSidebarItem('system', 'Audit Logs & Backup', <Activity className="w-5 h-5" />)}
                </div>
            </div>

            {/* Main Content Area */}
            <div className="flex-1 overflow-y-auto p-8 relative z-10 scrollbar-thin scrollbar-thumb-stone-700 scrollbar-track-stone-900">
                {activeTab === 'overview' && <SystemParams />}
                {activeTab === 'data' && <AgniveerDirectory />}
                {activeTab === 'users' && <UserConsole />}
                {activeTab === 'batch' && <BatchRegistration />}
                {activeTab === 'policies' && <PolicyConsole />}
                {activeTab === 'system' && <AuditLogViewer />}
            </div>
        </div>
    );
};

export default AdminDashboard;
