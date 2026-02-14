import React from 'react';
import { useTranslation } from 'react-i18next';
import { ActiveSession } from '../types';
import MapChart from './MapChart';

interface LiveMapProps {
    sessions: ActiveSession[];
}

export const LiveMap: React.FC<LiveMapProps> = ({ sessions }) => {
    const { t } = useTranslation();
    return (
        <div className="h-[500px] w-full rounded-xl overflow-hidden bg-[#0f172a] relative border border-slate-700/50 shadow-2xl">
            {/* Glossy Overlay */}
            <div className="absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-slate-900/90 to-transparent z-10 pointer-events-none"></div>
            <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-slate-900/90 to-transparent z-10 pointer-events-none"></div>

            {/* Header info overlay */}
            <div className="absolute top-6 left-6 z-20 flex flex-col gap-1">
                <h3 className="text-slate-100 font-bold text-lg tracking-tight flex items-center gap-2">
                    <span className="flex h-2 w-2 rounded-full bg-cyan-400 animate-pulse"></span>
                    {t('liveMap.title')}
                </h3>
                <p className="text-slate-400 text-xs font-medium uppercase tracking-widest">
                    {t('liveMap.subtitle')}
                </p>
            </div>

            <div className="h-full w-full flex items-center justify-center p-4">
                <MapChart sessions={sessions} />
            </div>

            {/* Legend / Stats overlay */}
            <div className="absolute bottom-6 right-6 z-20 bg-slate-900/60 backdrop-blur-md px-4 py-2.5 rounded-xl border border-white/5 shadow-xl">
                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-cyan-400"></div>
                        <span className="text-[10px] text-slate-300 font-bold uppercase tracking-wider">{t('liveMap.activeStream')}</span>
                    </div>
                </div>
            </div>
        </div>
    );
};
