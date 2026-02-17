import React from 'react';
import { useTranslation } from 'react-i18next';

interface EmptyServersStateProps {
    onAddServer: () => void;
}

export const EmptyServersState: React.FC<EmptyServersStateProps> = ({ onAddServer }) => {
    const { t } = useTranslation();

    return (
        <div className="flex flex-col items-center justify-center py-20 px-4 text-center animate-in fade-in zoom-in duration-500">
            <div className="relative mb-8">
                {/* Decorative background glow */}
                <div className="absolute inset-0 bg-cyan-500/20 blur-[50px] rounded-full"></div>

                {/* Icon Container */}
                <div className="relative bg-slate-800/50 backdrop-blur-xl border border-slate-700/50 p-8 rounded-3xl shadow-2xl">
                    <svg
                        className="w-16 h-16 text-cyan-400"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                    >
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={1.5}
                            d="M5 12h14M12 5l7 7-7 7"
                            className="animate-pulse"
                        />
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={1.5}
                            d="M19 12H5m14 0l-7-7m7 7l-7 7"
                            opacity="0.5"
                        />
                        <rect x="3" y="3" width="18" height="18" rx="2" strokeWidth={1.5} />
                    </svg>
                </div>
            </div>

            <h2 className="text-3xl font-black text-white mb-4 tracking-tight">
                {t('common.noServers')}
            </h2>

            <p className="text-slate-400 max-w-md mb-10 text-lg leading-relaxed">
                {t('common.addServerToStart')}
            </p>

            <button
                onClick={onAddServer}
                className="group relative px-8 py-4 bg-cyan-600 hover:bg-cyan-500 text-white font-bold rounded-2xl transition-all duration-300 shadow-lg shadow-cyan-900/20 hover:shadow-cyan-500/40 active:scale-95 flex items-center gap-3 overflow-hidden"
            >
                {/* Glow effect on hover */}
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:animate-shimmer"></div>

                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
                </svg>
                <span>{t('serverModal.addServerButton')}</span>
            </button>

            <style>{`
                @keyframes shimmer {
                    100% { transform: translateX(100%); }
                }
                .animate-shimmer {
                    animation: shimmer 2s infinite;
                }
            `}</style>
        </div>
    );
};
