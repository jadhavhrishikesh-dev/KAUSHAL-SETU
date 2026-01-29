import React from 'react';
import { createPortal } from 'react-dom';
import { User } from '../types';
import { MailProvider, useMail } from './mail/context';
import Sidebar from './mail/Sidebar';
import InboxList from './mail/InboxList';
import ReadView from './mail/ReadView';
import ComposeView from './mail/ComposeView';
import DraftsList from './mail/DraftsList';

interface MailModalProps {
    isOpen: boolean;
    onClose: () => void;
    user: User;
}

const MailLayout: React.FC<{ onClose: () => void }> = ({ onClose }) => {
    const { activeTab } = useMail();

    return (
        <div className="bg-white w-full max-w-6xl h-[85vh] rounded-xl shadow-2xl flex overflow-hidden relative">
            <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 z-10 p-1 rounded-full hover:bg-gray-200">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
            <Sidebar />

            {activeTab === 'inbox' && (
                <>
                    <InboxList />
                    <div className="flex-1 bg-gray-50 flex flex-col overflow-hidden relative">
                        <ReadView />
                    </div>
                </>
            )}

            {activeTab === 'compose' && (
                <div className="flex-1 bg-gray-50 flex flex-col overflow-hidden relative">
                    <ComposeView />
                </div>
            )}

            {activeTab === 'drafts' && (
                <div className="flex-1 bg-gray-50 flex flex-col overflow-hidden relative">
                    <DraftsList />
                </div>
            )}
        </div>
    );
};

const MailModal: React.FC<MailModalProps> = ({ isOpen, onClose, user }) => {
    if (!isOpen) return null;

    return createPortal(
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9999]">
            <MailProvider user={user}>
                <MailLayout onClose={onClose} />
            </MailProvider>
        </div>,
        document.body
    );
};

export default MailModal;
