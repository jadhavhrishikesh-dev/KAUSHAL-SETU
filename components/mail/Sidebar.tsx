import React from 'react';
import { useMail } from './context';
import { Inbox, Send, Trash2, FileText, PenSquare } from 'lucide-react';

const Sidebar: React.FC = () => {
    const { activeTab, setActiveTab, folder, setFolder, stats, drafts, fetchDrafts, setSelectedEmail } = useMail();

    return (
        <div className="w-48 bg-gray-50 p-4 border-r border-gray-200 flex flex-col">
            <button
                onClick={() => { setActiveTab('compose'); setSelectedEmail(null); }}
                className="w-full bg-teal-600 text-white py-3 rounded-lg font-semibold shadow hover:bg-teal-700 transition mb-6 flex items-center justify-center space-x-2"
            >
                <PenSquare size={16} />
                <span>Compose</span>
            </button>

            <nav className="space-y-1 flex-1">
                <button
                    onClick={() => { setActiveTab('inbox'); setFolder('inbox'); }}
                    className={`w-full text-left px-3 py-2 rounded-md text-sm font-medium flex justify-between items-center ${activeTab === 'inbox' && folder === 'inbox' ? 'bg-teal-50 text-teal-700' : 'text-gray-600 hover:bg-gray-100'}`}
                >
                    <div className="flex items-center gap-2"><Inbox size={16} /> <span>Inbox</span></div>
                    <span className="bg-gray-200 text-gray-700 text-xs px-2 py-0.5 rounded-full">{stats.inbox_unread}/{stats.inbox_total}</span>
                </button>
                <button
                    onClick={() => { setActiveTab('inbox'); setFolder('sent'); }}
                    className={`w-full text-left px-3 py-2 rounded-md text-sm font-medium flex justify-between items-center ${activeTab === 'inbox' && folder === 'sent' ? 'bg-teal-50 text-teal-700' : 'text-gray-600 hover:bg-gray-100'}`}
                >
                    <div className="flex items-center gap-2"><Send size={16} /> <span>Sent</span></div>
                    <span className="text-xs text-gray-400">{stats.sent_total}</span>
                </button>
                <button
                    onClick={() => { setActiveTab('inbox'); setFolder('trash'); }}
                    className={`w-full text-left px-3 py-2 rounded-md text-sm font-medium flex justify-between items-center ${activeTab === 'inbox' && folder === 'trash' ? 'bg-teal-50 text-teal-700' : 'text-gray-600 hover:bg-gray-100'}`}
                >
                    <div className="flex items-center gap-2"><Trash2 size={16} /> <span>Trash</span></div>
                    <span className="text-xs text-gray-400">{stats.trash_total}</span>
                </button>
                <button
                    onClick={() => { setActiveTab('drafts'); fetchDrafts(); }}
                    className={`w-full text-left px-3 py-2 rounded-md text-sm font-medium flex justify-between items-center ${activeTab === 'drafts' ? 'bg-teal-50 text-teal-700' : 'text-gray-600 hover:bg-gray-100'}`}
                >
                    <div className="flex items-center gap-2"><FileText size={16} /> <span>Drafts</span></div>
                    <span className="text-xs text-gray-400">{drafts.length}</span>
                </button>
            </nav>
        </div>
    );
};

export default Sidebar;
