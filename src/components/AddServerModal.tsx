import React, { useState, useEffect } from 'react';
import { serversApi } from '../api/client';
import { PlexServer } from '../types';
import { useToast } from '../context/ToastContext';

interface AddServerModalProps {
    onClose: () => void;
    onSuccess: () => void;
    serverToEdit?: PlexServer;
}

export const AddServerModal: React.FC<AddServerModalProps> = ({ onClose, onSuccess, serverToEdit }) => {
    const { addToast } = useToast();
    const [name, setName] = useState('');
    const [url, setUrl] = useState('');
    const [apiKey, setApiKey] = useState('');
    const [loading, setLoading] = useState(false);
    // const [error, setError] = useState<string | null>(null); // Replaced by Toast

    useEffect(() => {
        if (serverToEdit) {
            setName(serverToEdit.name);
            setUrl(serverToEdit.tautulli_url);
            setApiKey(serverToEdit.api_key_secret || '');
        }
    }, [serverToEdit]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        // setError(null);

        try {
            if (serverToEdit) {
                await serversApi.update(serverToEdit.id, { name, tautulli_url: url, api_key: apiKey });
                addToast(`Server "${name}" updated successfully`, 'success');
            } else {
                await serversApi.add({ name, tautulli_url: url, api_key: apiKey });
                addToast(`Server "${name}" added successfully`, 'success');
            }
            onSuccess();
            onClose();
        } catch (err: any) {
            console.error("Error saving server:", err);
            const msg = err.response?.data?.error || err.message || "Failed to save server. Check details.";
            // setError(msg);
            addToast(msg, 'error');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <div className="bg-slate-800 border border-slate-700 rounded-2xl w-full max-w-lg p-6 shadow-2xl">
                <h2 className="text-xl font-bold text-slate-50 mb-4">{serverToEdit ? 'Edit Server' : 'Add Tautulli Server'}</h2>



                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-400 mb-1">Server Name</label>
                        <input
                            type="text"
                            required
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="w-full bg-slate-900/50 border border-slate-700 rounded-lg px-4 py-2 text-slate-200 focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
                            placeholder="My Plex Server"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-400 mb-1">Tautulli URL</label>
                        <input
                            type="url"
                            required
                            value={url}
                            onChange={(e) => setUrl(e.target.value)}
                            className="w-full bg-slate-900/50 border border-slate-700 rounded-lg px-4 py-2 text-slate-200 focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
                            placeholder="http://your-server-ip:8181"
                        />
                        <p className="text-xs text-slate-500 mt-1">Must be reachable from this server.</p>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-400 mb-1">API Key</label>
                        <input
                            type="text"
                            required
                            value={apiKey}
                            onChange={(e) => setApiKey(e.target.value)}
                            className="w-full bg-slate-900/50 border border-slate-700 rounded-lg px-4 py-2 text-slate-200 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 font-mono"
                            placeholder="YOUR_API_KEY"
                        />
                    </div>

                    <div className="flex justify-end gap-3 mt-6">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 rounded-lg text-slate-300 hover:text-white hover:bg-slate-700 transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            className="px-4 py-2 rounded-lg bg-cyan-500 hover:bg-cyan-600 text-white font-medium transition-colors disabled:opacity-50"
                        >
                            {loading ? (serverToEdit ? 'Updating...' : 'Verifying & Adding...') : (serverToEdit ? 'Update Server' : 'Add Server')}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};
