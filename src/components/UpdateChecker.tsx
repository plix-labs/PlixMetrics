
import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { systemApi } from '../api/client';
import { useAuth } from '../context/AuthContext';

interface VersionInfo {
    current: string;
    latest: string;
    updateAvailable: boolean;
    isDocker?: boolean;
    isWindows?: boolean;
    downloadUrl?: string;
    error?: string;
}

export const UpdateChecker = () => {
    const { t } = useTranslation();
    const { status } = useAuth();
    const [info, setInfo] = useState<VersionInfo | null>(null);
    const [updating, setUpdating] = useState(false);
    const [message, setMessage] = useState<string | null>(null);
    const [copied, setCopied] = useState(false);

    useEffect(() => {
        if (status?.authenticated || status?.isLocal) {
            checkVersion();
        }
    }, [status]);

    const checkVersion = async () => {
        try {
            const { data } = await systemApi.getVersion();
            setInfo(data);
        } catch (err) {
            console.error('Failed to check version', err);
        }
    };

    const handleUpdate = async () => {
        if (info?.isWindows) {
            const url = info.downloadUrl || `https://github.com/plix-labs/PlixMetrics/releases/tag/v${info.latest}`;
            window.open(url, '_blank');
            setMessage(t('update.openingDownload'));
            return;
        }

        const text = t('update.confirmUpdate');

        if (!confirm(text)) return;

        setUpdating(true);
        try {
            await systemApi.update();
            setMessage(t('update.updateStarted'));
        } catch (err: any) {
            setMessage(t('update.updateFailed') + ' ' + (err.response?.data?.error || err.message));
            setUpdating(false);
        }
    };



    if (!info || !info.updateAvailable) return null;

    return (
        <div className="fixed bottom-4 right-4 z-50 animate-in slide-in-from-bottom-5 fade-in duration-500">
            <div className="bg-slate-800/90 backdrop-blur-md border border-cyan-500/50 p-4 rounded-xl shadow-2xl max-w-sm">
                <div className="flex items-start gap-4">
                    <div className="p-2 bg-cyan-500/20 rounded-lg text-cyan-400">
                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                        </svg>
                    </div>
                    <div className="flex-1">
                        <h3 className="font-bold text-slate-100 mb-1">{t('update.available')}</h3>
                        <p className="text-sm text-slate-400 mb-3">
                            {t('update.versionAvailable', { version: info.latest, current: info.current })}
                        </p>

                        {message ? (
                            <p className="text-sm text-emerald-400 font-medium animate-pulse">{message}</p>
                        ) : info.isDocker ? (
                            // Docker install - show command to copy
                            <div className="space-y-3">
                                <p className="text-xs text-slate-400">{t('update.runCommands')}</p>

                                {/* Image Update (Recommended) */}
                                <div className="space-y-1">
                                    <span className="text-[10px] text-slate-500 font-medium">{t('update.usingDocker')}</span>
                                    <div
                                        onClick={() => {
                                            navigator.clipboard.writeText('docker-compose pull && docker-compose up -d');
                                            setCopied(true);
                                            setTimeout(() => setCopied(false), 2000);
                                        }}
                                        className="bg-slate-900 p-2 rounded-lg text-xs text-cyan-400 font-mono cursor-pointer hover:bg-slate-950 transition-colors border border-cyan-900/30"
                                    >
                                        docker-compose pull && docker-compose up -d
                                    </div>
                                </div>

                                {/* Source Update (Legacy) */}
                                <div className="space-y-1 opacity-60 hover:opacity-100 transition-opacity">
                                    <span className="text-[10px] text-slate-500 font-medium">{t('update.usingSource')}</span>
                                    <div
                                        onClick={() => {
                                            navigator.clipboard.writeText('git pull && docker-compose up -d --build');
                                            setCopied(true);
                                            setTimeout(() => setCopied(false), 2000);
                                        }}
                                        className="bg-slate-900 p-2 rounded-lg text-xs text-slate-400 font-mono cursor-pointer hover:bg-slate-950 transition-colors border border-slate-800"
                                    >
                                        git pull && docker-compose up -d --build
                                    </div>
                                </div>

                                <div className="flex gap-2 pt-2">
                                    <button
                                        onClick={() => setInfo(null)}
                                        className="w-full px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-slate-300 text-sm font-medium rounded-lg transition-colors"
                                    >
                                        {copied ? '✓ ' + t('update.commandCopied') : t('update.dismiss')}
                                    </button>
                                </div>
                            </div>
                        ) : (
                            // Non-Docker install - show Update Now button
                            <div className="flex gap-2">
                                <button
                                    onClick={handleUpdate}
                                    disabled={updating}
                                    className="px-3 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-white text-sm font-bold rounded-lg transition-colors disabled:opacity-50"
                                >
                                    {updating ? t('update.updatingButton') : (info.isWindows ? t('update.downloadExe') : t('update.updateNow'))}
                                </button>
                                <button
                                    onClick={() => setInfo(null)}
                                    className="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-slate-300 text-sm font-medium rounded-lg transition-colors"
                                >
                                    {t('update.later')}
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};
