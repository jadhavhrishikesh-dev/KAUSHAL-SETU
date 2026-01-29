import React from 'react';
import { useMail } from './context';
import { formatDateTime } from '../utils';

const DraftsList: React.FC = () => {
    const { drafts, composeDraft } = useMail();

    return (
        <div className="h-full flex flex-col p-8 overflow-y-auto bg-white">
            <h2 className="text-xl font-bold mb-6 text-gray-800">📝 Drafts</h2>
            {drafts.length === 0 ? (
                <p className="text-center text-gray-400 mt-10">No drafts saved</p>
            ) : (
                <div className="space-y-3">
                    {drafts.map(draft => (
                        <div
                            key={draft.id}
                            onClick={() => composeDraft(draft)}
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
    );
};

export default DraftsList;
