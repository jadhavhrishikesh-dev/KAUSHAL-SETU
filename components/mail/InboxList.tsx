import React from 'react';
import { useMail } from './context';
import { Star, GripVertical } from 'lucide-react';
import { formatRelativeTime } from '../utils'; // Assume this helper exists or duplicate it

const getInitials = (name: string) => name ? name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() : '?';
const getAvatarColor = (name: string) => {
    const colors = ['bg-red-500', 'bg-blue-500', 'bg-green-500', 'bg-yellow-500', 'bg-purple-500', 'bg-pink-500', 'bg-indigo-500', 'bg-teal-500'];
    let hash = 0;
    for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
    return colors[Math.abs(hash) % colors.length];
};

const InboxList: React.FC = () => {
    const { inbox, loading, selectedIds, setSelectedIds, searchQuery, setSearchQuery, fetchInbox, hasMore, loadMore, readEmail, activeTab, selectedEmail, handleStar, handleBulkDelete } = useMail();

    return (
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
                            // Debounce handled in Context effect or verify context logic
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
                        onClick={() => readEmail(msg.id)}
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
                                <button
                                    onClick={(e) => handleStar(msg.id, e)}
                                    className={`text-lg hover:scale-110 transition ${msg.is_starred ? 'text-yellow-400' : 'text-gray-300 hover:text-yellow-300'}`}
                                >
                                    {msg.is_starred ? '★' : '☆'}
                                </button>
                                <span className="text-[10px] text-gray-400 flex-shrink-0 whitespace-nowrap ml-2">
                                    {/* Using helper directly or passing in context? Assuming import works. */}
                                    {/* formatRelativeTime(msg.timestamp) */}
                                    <span title={msg.timestamp}>{new Date(msg.timestamp).toLocaleDateString()}</span>
                                </span>
                            </div>
                        </div>
                        <div className={`text-sm truncate mb-1 ${!msg.is_read ? 'font-semibold text-gray-800' : 'text-gray-600'}`}>
                            {msg.subject}
                        </div>
                        <div className="text-xs text-gray-400 truncate">
                            {msg.sender_role}
                        </div>
                    </div>
                ))}
                {hasMore && !loading && (
                    <button onClick={loadMore} className="w-full py-3 text-sm text-teal-600 hover:bg-teal-50 font-medium">Load More...</button>
                )}
            </div>
        </div>
    );
};

export default InboxList;
