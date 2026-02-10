import React from 'react';
import { ServerList } from './ServerList';
import { PlexServer } from '../types';

interface ServerListModalProps {
    onClose: () => void;
    onEditServer: (server: PlexServer) => void;
    onAddServer: () => void;
}

export const ServerListModal: React.FC<ServerListModalProps> = ({ onClose, onEditServer, onAddServer }) => {
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
            <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-lg shadow-2xl flex flex-col max-h-[80vh] animate-scale-in">

                {/* Header */}
                <div className="flex justify-between items-center p-6 border-b border-slate-700/50">
                    <h2 className="text-xl font-bold text-white flex items-center gap-2">
                        <span className="w-1.5 h-6 bg-indigo-500 rounded-full"></span>
                        Manage Servers
                    </h2>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition-colors"
                    >
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6">
                    <ServerList onEdit={onEditServer} />
                </div>

                {/* Footer */}
                <div className="p-6 border-t border-slate-700/50 bg-slate-900/50 rounded-b-2xl">
                    <button
                        onClick={onAddServer}
                        className="w-full bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-3 rounded-xl text-sm font-bold transition-all border border-indigo-500/50 hover:shadow-[0_0_20px_rgba(79,70,229,0.3)] flex items-center justify-center gap-2"
                    >
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                        Add New Server
                    </button>
                </div>
            </div>
        </div>
    );
};
