import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActiveSession } from '../types';
import InteractiveMap from './InteractiveMap';

interface LiveMapProps {
    sessions: ActiveSession[];
    onUserClick?: (username: string) => void;
    hideControls?: boolean;
}

export const LiveMap: React.FC<LiveMapProps> = ({ sessions, onUserClick, hideControls = false }) => {
    const { t } = useTranslation();
    const [enableClustering, setEnableClustering] = useState(() => {
        return localStorage.getItem('map_clustering') === 'true';
    });

    React.useEffect(() => {
        localStorage.setItem('map_clustering', String(enableClustering));
    }, [enableClustering]);

    return (
        <div className={`h-full w-full relative overflow-hidden bg-[#0f172a] group ${!hideControls ? 'rounded-xl border border-slate-700/50 shadow-2xl' : ''}`}>
            <div className="h-full w-full z-0 block">
                <InteractiveMap
                    sessions={sessions}
                    enableClustering={enableClustering}
                    onUserClick={onUserClick}
                    hideControls={hideControls}
                />
            </div>

            {/* Legend / Stats overlay */}
            <div className={`absolute bottom-6 z-[1000] flex items-center gap-6 ${hideControls ? 'left-6' : 'right-6 bg-slate-900/80 backdrop-blur-md px-4 py-2.5 rounded-xl border border-white/5 shadow-xl'}`}>
                {!hideControls && (
                    <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-cyan-400"></div>
                        <span className="text-[10px] text-slate-300 font-bold uppercase tracking-wider">{t('liveMap.activeStream')}</span>
                    </div>
                )}

                <label className="flex items-center gap-2 cursor-pointer select-none group/label">
                    <div className="relative flex items-center">
                        <input
                            type="checkbox"
                            checked={enableClustering}
                            onChange={(e) => setEnableClustering(e.target.checked)}
                            className="peer appearance-none w-3 h-3 border border-slate-500 rounded bg-slate-800 checked:bg-cyan-500 checked:border-cyan-500 focus:outline-none transition-colors"
                        />
                        <svg className="absolute w-2 h-2 text-slate-900 pointer-events-none opacity-0 peer-checked:opacity-100 left-0.5 top-0.5 transition-opacity" viewBox="0 0 14 14" fill="none">
                            <path d="M3 8L6 11L11 3.5" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                    </div>
                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider group-hover/label:text-slate-200 transition-colors drop-shadow-md">{t('liveMap.group')}</span>
                </label>
            </div>
        </div>
    );
};
