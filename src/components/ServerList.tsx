import React from 'react';
import { useTranslation } from 'react-i18next';
import { useServers } from '../hooks/useServers';
import { PlexServer } from '../types';
import { serversApi } from '../api/client';

interface ServerListProps {
    onEdit: (server: PlexServer) => void;
}

const ServerListItem: React.FC<{ server: PlexServer; onEdit: (server: PlexServer) => void; onRemove: (id: number) => void }> = ({ server, onEdit, onRemove }) => {
    const { t } = useTranslation();
    const [status, setStatus] = React.useState<'checking' | 'online' | 'offline'>('checking');

    React.useEffect(() => {
        let isMounted = true;
        serversApi.checkStatus(server.id).then((res) => {
            if (isMounted) setStatus(res.data.status);
        }).catch(() => {
            if (isMounted) setStatus('offline');
        });
        return () => { isMounted = false; };
    }, [server.id]);

    const formatUrl = (url: string) => {
        try {
            const urlObj = new URL(url);
            return urlObj.hostname;
        } catch (e) {
            return url.replace(/^https?:\/\//, '').replace(/:.*$/, '');
        }
    };

    return (
        <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-3 flex items-center justify-between group hover:border-slate-600 transition-colors">
            <div className="flex items-center gap-3 overflow-hidden">
                <div className={`h-2 w-2 min-w-[8px] rounded-full transition-colors ${status === 'online' ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.4)]' : status === 'offline' ? 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.4)]' : 'bg-slate-500 animate-pulse'}`}></div>
                <div className="min-w-0 flex flex-col items-start text-left">
                    <div className="font-medium text-slate-200 text-sm truncate w-full flex items-center gap-2">
                        {server.name}
                        {status === 'offline' && <span className="text-[10px] bg-red-500/10 text-red-400 px-1.5 py-0.5 rounded border border-red-500/20 leading-none">Offline</span>}
                    </div>
                    <div className="text-xs text-slate-500 truncate w-full text-left">{formatUrl(server.tautulli_url)}</div>
                </div>
            </div>
            <div className="flex items-center gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                <button
                    onClick={() => onEdit(server)}
                    className="text-slate-400 hover:text-cyan-400 p-1.5 rounded-md hover:bg-slate-700/50 transition-colors"
                    title={t('serverList.editServer')}
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                </button>
                <button
                    onClick={() => onRemove(server.id)}
                    className="text-slate-400 hover:text-red-400 p-1.5 rounded-md hover:bg-slate-700/50 transition-colors"
                    title={t('serverList.removeServer')}
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                </button>
            </div>
        </div>
    );
};

export const ServerList: React.FC<ServerListProps> = ({ onEdit }) => {
    const { t } = useTranslation();
    const { servers, loading, error, removeServer } = useServers();

    if (loading) return <div className="text-slate-500 text-sm">{t('serverList.loadingServers')}</div>;
    if (error) return <div className="text-red-400 text-sm">{error}</div>;
    if (servers.length === 0) return <div className="text-slate-500 text-sm">{t('serverList.noServersAdded')}</div>;

    const handleRemove = (id: number) => {
        if (window.confirm(t('serverList.confirmRemove'))) {
            removeServer(id);
        }
    };

    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pr-2">
            {servers.map(server => (
                <ServerListItem key={server.id} server={server} onEdit={onEdit} onRemove={handleRemove} />
            ))}
        </div>
    );
};
