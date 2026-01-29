import React from 'react';
import { useMail } from './context';
import { Reply, Trash2, RotateCcw, ArrowRight } from 'lucide-react';
import { formatDateTime } from '../utils';

const ReadView: React.FC = () => {
    const { selectedEmail, folder, handleRestore, handleDelete, setSelectedEmail, setActiveTab, setComposeData, user } = useMail();

    if (!selectedEmail) {
        return (
            <div className="h-full flex flex-col items-center justify-center text-gray-300">
                <p className="text-lg font-medium">Select a message to read</p>
            </div>
        );
    }

    const handleReply = () => {
        setComposeData({
            subject: `Re: ${selectedEmail.subject}`,
            body: `\n\nOn ${formatDateTime(selectedEmail.timestamp)}, ${selectedEmail.sender_name} wrote:\n> ${selectedEmail.body.replace(/\n/g, '\n> ')}`,
            targetValue: selectedEmail.sender_id.toString(), // Mocking ID as value
            selectedUser: { user_id: selectedEmail.sender_id, full_name: selectedEmail.sender_name, username: 'sender', role: 'OFFICER', email: '' } as any
        });
        setActiveTab('compose');
    };

    const handleForward = () => {
        setComposeData({
            subject: `Fwd: ${selectedEmail.subject}`,
            body: `\n\n---------- Forwarded message ----------\nFrom: ${selectedEmail.sender_name}\nDate: ${formatDateTime(selectedEmail.timestamp)}\nSubject: ${selectedEmail.subject}\n\n${selectedEmail.body}`,
            targetValue: '',
            selectedUser: null
        });
        setActiveTab('compose');
    };

    return (
        <div className="h-full flex flex-col bg-white">
            <div className="p-6 border-b border-gray-100">
                <div className="flex justify-between items-start mb-4">
                    <h1 className="text-2xl font-bold text-gray-900">{selectedEmail.subject}</h1>
                </div>
                <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-teal-500 rounded-full flex items-center justify-center text-white font-bold">
                            {selectedEmail.sender_name[0]}
                        </div>
                        <div>
                            <p className="font-bold text-gray-900">{selectedEmail.sender_name}</p>
                            <p className="text-xs text-gray-500">{selectedEmail.sender_role} • {formatDateTime(selectedEmail.timestamp)}</p>
                        </div>
                    </div>
                    <button onClick={handleReply} className="flex items-center space-x-1 text-teal-600 hover:text-teal-800 font-medium text-sm px-3 py-1 rounded hover:bg-teal-50 transition">
                        <Reply size={16} /> <span>Reply</span>
                    </button>
                </div>
            </div>
            <div className="flex-1 p-8 overflow-y-auto prose max-w-none text-gray-800">
                <div className="whitespace-pre-wrap leading-relaxed">{selectedEmail.body}</div>
            </div>
            <div className="p-4 border-t border-gray-100 flex justify-end bg-gray-50">
                {folder === 'trash' ? (
                    <div className="flex space-x-2">
                        <button onClick={() => handleRestore(selectedEmail.id)} className="flex items-center space-x-2 text-teal-600 px-4 py-2 hover:bg-teal-50 rounded-lg">
                            <RotateCcw size={16} /> <span>Restore</span>
                        </button>
                        <button onClick={() => handleDelete(selectedEmail.id)} className="flex items-center space-x-2 text-red-600 px-4 py-2 hover:bg-red-50 rounded-lg">
                            <Trash2 size={16} /> <span>Delete Forever</span>
                        </button>
                    </div>
                ) : (
                    <div className="flex space-x-2">
                        <button onClick={handleForward} className="flex items-center space-x-2 text-teal-600 px-4 py-2 hover:bg-teal-50 rounded-lg">
                            <ArrowRight size={16} /> <span>Forward</span>
                        </button>
                        <button onClick={() => handleDelete(selectedEmail.id)} className="flex items-center space-x-2 text-red-600 px-4 py-2 hover:bg-red-50 rounded-lg">
                            <Trash2 size={16} /> <span>Delete</span>
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ReadView;
