import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
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
    const { t } = useTranslation();
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
                addToast(t('serverModal.serverUpdated', { name }), 'success');
            } else {
                await serversApi.add({ name, tautulli_url: url, api_key: apiKey });
                addToast(t('serverModal.serverAdded', { name }), 'success');
            }
            onSuccess();
            onClose();
        } catch (err: any) {
            console.error("Error saving server:", err);
            const msg = err.response?.data?.error || err.message || t('serverModal.failedToSave');
            // setError(msg);
            addToast(msg, 'error');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <div className="bg-slate-800 border border-slate-700 rounded-2xl w-full max-w-lg p-6 shadow-2xl">
                <h2 className="text-xl font-bold text-slate-50 mb-4">{serverToEdit ? t('serverModal.editServer') : t('serverModal.addServer')}</h2>



                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-400 mb-1">{t('serverModal.serverName')}</label>
                        <input
                            type="text"
                            required
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="w-full bg-slate-900/50 border border-slate-700 rounded-lg px-4 py-2 text-slate-200 focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
                            placeholder={t('serverModal.serverNamePlaceholder')}
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-400 mb-1">{t('serverModal.tautulliUrl')}</label>
                        <input
                            type="url"
                            required
                            value={url}
                            onChange={(e) => setUrl(e.target.value)}
                            className="w-full bg-slate-900/50 border border-slate-700 rounded-lg px-4 py-2 text-slate-200 focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
                            placeholder={t('serverModal.tautulliUrlPlaceholder')}
                        />
                        <p className="text-xs text-slate-500 mt-1">{t('serverModal.mustBeReachable')}</p>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-400 mb-1">{t('serverModal.apiKey')}</label>
                        <input
                            type="text"
                            required
                            value={apiKey}
                            onChange={(e) => setApiKey(e.target.value)}
                            className="w-full bg-slate-900/50 border border-slate-700 rounded-lg px-4 py-2 text-slate-200 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 font-mono"
                            placeholder={t('serverModal.apiKeyPlaceholder')}
                        />
                    </div>

                    <div className="flex justify-end gap-3 mt-6">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 rounded-lg text-slate-300 hover:text-white hover:bg-slate-700 transition-colors"
                        >
                            {t('common.cancel')}
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            className="px-4 py-2 rounded-lg bg-cyan-500 hover:bg-cyan-600 text-white font-medium transition-colors disabled:opacity-50"
                        >
                            {loading ? (serverToEdit ? t('serverModal.updating') : t('serverModal.verifyingAdding')) : (serverToEdit ? t('serverModal.updateServer') : t('serverModal.addServerButton'))}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};
