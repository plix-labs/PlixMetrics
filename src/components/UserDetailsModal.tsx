import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { createPortal } from 'react-dom';
import { useUserDetails } from '../hooks/useUserDetails';
import { Skeleton } from './ui/Skeleton';
import InteractiveMap from './InteractiveMap';
import { ActiveSession } from '../types';

interface UserDetailsModalProps {
    username: string | null;
    serverId?: number | string | null;
    onClose: () => void;
}

export const UserDetailsModal: React.FC<UserDetailsModalProps> = ({ username, serverId, onClose }) => {
    const { t } = useTranslation();
    const [days, setDays] = useState(30);
    const [showHistory, setShowHistory] = useState(false);
    const { data: user, isLoading, error } = useUserDetails(username, days, serverId);

    if (!username) return null;

    return createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
            <div
                className="bg-slate-900 border border-slate-700 w-full max-w-4xl max-h-[90vh] rounded-2xl shadow-2xl overflow-hidden flex flex-col animate-scale-in relative"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Close Button */}
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 text-slate-400 hover:text-white transition-colors z-10"
                >
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>

                {isLoading && (
                    <div className="flex flex-col h-full overflow-hidden w-full">
                        {/* Skeleton Header */}
                        <div className="relative bg-gradient-to-r from-slate-800 to-slate-900 p-8 pb-20 overflow-hidden shrink-0">
                            <Skeleton className="h-10 w-64 mb-4 bg-slate-700/50" />
                            <div className="flex gap-4">
                                <Skeleton className="h-4 w-32 bg-slate-700/30" />
                                <Skeleton className="h-4 w-32 bg-slate-700/30" />
                            </div>
                        </div>

                        {/* Skeleton Content */}
                        <div className="flex-1 overflow-y-auto bg-slate-900 relative -mt-12 rounded-t-3xl border-t border-slate-700/50">
                            <div className="p-8 pt-10 grid grid-cols-1 lg:grid-cols-3 gap-8">
                                <div className="space-y-8">
                                    <div className="grid grid-cols-2 gap-4">
                                        <Skeleton className="h-24 w-full bg-slate-800/50" />
                                        <Skeleton className="h-24 w-full bg-slate-800/50" />
                                    </div>
                                    <Skeleton className="h-64 w-full bg-slate-800/50" />
                                </div>
                                <div className="lg:col-span-2 space-y-8">
                                    <Skeleton className="h-48 w-full bg-slate-800/50" />
                                    <div className="space-y-3">
                                        <Skeleton className="h-12 w-full bg-slate-800/50" />
                                        <Skeleton className="h-12 w-full bg-slate-800/50" />
                                        <Skeleton className="h-12 w-full bg-slate-800/50" />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {error && (
                    <div className="flex-1 p-10 flex flex-col items-center justify-center text-center">
                        <div className="bg-red-500/10 p-4 rounded-full mb-4 text-red-400">
                            <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                        </div>
                        <h3 className="text-xl font-bold text-white mb-2">{t('userDetails.profileNotFound')}</h3>
                        <p className="text-slate-400">{t('userDetails.couldNotRetrieve', { username })}</p>
                    </div>
                )}

                {user && (
                    <div className="flex flex-col h-full overflow-hidden">
                        {/* Header Banner */}
                        <div className="relative bg-gradient-to-r from-slate-800 to-slate-900 p-8 pb-20 overflow-hidden shrink-0">
                            {/* Decorative background elements */}
                            <div className="absolute top-0 right-0 w-64 h-64 bg-cyan-500/5 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none"></div>
                            <div className="absolute bottom-0 left-0 w-48 h-48 bg-indigo-500/5 rounded-full blur-2xl -ml-10 -mb-10 pointer-events-none"></div>

                            <div className="relative z-10">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <div className="flex flex-col md:flex-row md:items-center items-start gap-4 mb-4 md:mb-2">
                                            <h2 className="text-3xl font-black text-white tracking-tight flex items-center gap-3">
                                                {user.username}
                                            </h2>
                                            {/* Time Range Selector */}
                                            <div className="flex bg-slate-800/80 rounded-lg p-1 border border-slate-700/50">
                                                {[7, 30, 90, 365, 0].map((d) => (
                                                    <button
                                                        key={d}
                                                        onClick={() => setDays(d)}
                                                        className={`px-3 py-1 text-xs font-bold rounded transition-colors ${days === d
                                                            ? 'bg-cyan-500 text-slate-900 shadow-md'
                                                            : 'text-slate-400 hover:text-white hover:bg-slate-700'}`}
                                                    >
                                                        {d === 0 ? t('userDetails.all') : d === 365 ? t('userDetails.oneYear') : `${d}D`}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                        <p className="text-slate-400 mt-1 flex items-center gap-2 text-sm">
                                            {t('userDetails.firstSeen')} <span className="text-slate-300">{new Date(user.first_seen * 1000).toLocaleDateString()}</span>
                                            <span className="w-1 h-1 bg-slate-600 rounded-full"></span>
                                            {t('userDetails.lastActive')} <span className="text-emerald-400">{new Date(user.last_seen * 1000).toLocaleDateString()}</span>
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Content Body with overlaps Header */}
                        <div className="flex-1 overflow-y-auto custom-scrollbar bg-slate-900 relative -mt-8 rounded-t-3xl border-t border-slate-700/50 shadow-[0_-10px_40px_-15px_rgba(0,0,0,0.5)]">
                            <div className="p-6 pt-8 grid grid-cols-1 lg:grid-cols-3 gap-6">

                                {/* Left Column: Key Stats & Platforms */}
                                <div className="space-y-6">
                                    {/* Key Stats Grid */}
                                    <div className="bg-slate-800/40 border border-slate-700/50 rounded-2xl flex divide-x divide-slate-700/50">
                                        <div className="flex-1 p-5">
                                            <p className="text-[10px] text-slate-500 uppercase font-bold tracking-widest mb-1">{t('userDetails.totalPlays')}</p>
                                            <p className="text-2xl font-black text-white">{user.total_plays.toLocaleString()}</p>
                                        </div>
                                        <div className="flex-1 p-5">
                                            <p className="text-[10px] text-slate-500 uppercase font-bold tracking-widest mb-1">{t('userDetails.hoursWatched')}</p>
                                            <p className="text-2xl font-black text-cyan-400">{Math.floor(user.total_duration / 3600).toLocaleString()}h</p>
                                        </div>
                                    </div>

                                    {/* Platform Usage */}
                                    <div className="bg-slate-800/40 p-5 rounded-2xl border border-slate-700/50">
                                        <h3 className="text-slate-300 font-bold mb-4 flex items-center gap-2 text-sm uppercase tracking-wider">
                                            <svg className="w-4 h-4 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
                                            </svg>
                                            {t('userDetails.topPlatforms')}
                                        </h3>
                                        <div className="space-y-4">
                                            {user.platforms.slice(0, 5).map((p, i) => {
                                                const max = user.platforms[0]?.count || 1;
                                                const percent = (p.count / max) * 100;
                                                return (
                                                    <div key={p.name}>
                                                        <div className="flex justify-between text-xs mb-1.5">
                                                            <span className="text-slate-200 font-medium">{p.name}</span>
                                                            <span className="text-slate-400">{t('userDetails.plays', { count: p.count })}</span>
                                                        </div>
                                                        <div className="h-1.5 w-full bg-slate-700/50 rounded-full overflow-hidden">
                                                            <div
                                                                className={`h-full rounded-full ${i === 0 ? 'bg-cyan-500' : 'bg-slate-500'}`}
                                                                style={{ width: `${percent}%` }}
                                                            ></div>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>

                                    {/* Recently Watched List (Collapsible) */}
                                    <div className="bg-slate-800/40 p-5 rounded-2xl border border-slate-700/50">
                                        <button
                                            onClick={() => setShowHistory(!showHistory)}
                                            className="w-full flex items-center justify-between text-slate-300 font-bold mb-2 uppercase tracking-wider text-sm transition-colors hover:text-white"
                                        >
                                            <span className="flex items-center gap-2">
                                                <svg className="w-4 h-4 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                </svg>
                                                {t('userDetails.recentlyWatched')}
                                            </span>
                                            <svg className={`w-4 h-4 transition-transform ${showHistory ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                            </svg>
                                        </button>

                                        {showHistory && (
                                            <div className="space-y-3 mt-4 animate-fade-in">
                                                {user.last_watched.slice(0, 5).map((item, i) => (
                                                    <div key={i} className="flex items-center gap-3 p-2 bg-slate-800/20 hover:bg-slate-800/50 rounded-lg transition-colors border border-transparent hover:border-slate-700/50 group">
                                                        <div className="flex-1 min-w-0">
                                                            <div className="text-xs text-slate-200 font-medium truncate group-hover:text-white transition-colors mb-0.5">
                                                                {item.title}
                                                            </div>
                                                            <p className="text-[10px] text-slate-500 truncate">
                                                                {new Date(item.date * 1000).toLocaleString()} • {item.server_name}
                                                            </p>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Right Column: Heatmap & History */}
                                <div className="lg:col-span-2 space-y-6">
                                    {/* Activity Heatmap */}
                                    <div className="bg-slate-800/40 p-5 rounded-2xl border border-slate-700/50">
                                        <h3 className="text-slate-300 font-bold mb-6 flex items-center gap-2 text-sm uppercase tracking-wider">
                                            <svg className="w-4 h-4 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                            </svg>
                                            {t('userDetails.dailyActivity')}
                                        </h3>
                                        <div className="flex items-end h-28 gap-1">
                                            {user.activity_heatmap.map((count, hour) => {
                                                const max = Math.max(...user.activity_heatmap, 1);
                                                const height = Math.max((count / max) * 100, 4); // Min 4% height
                                                return (
                                                    <div key={hour} className="flex-1 flex flex-col group relative h-full">
                                                        {/* Tooltip */}
                                                        <div className="mb-2 opacity-0 group-hover:opacity-100 transition-opacity absolute bottom-full left-1/2 -translate-x-1/2 bg-slate-800 text-xs px-2 py-1 rounded-lg border border-slate-700 whitespace-nowrap z-10 pointer-events-none shadow-lg">
                                                            {hour}:00 • <span className="text-cyan-400 font-bold">{count} plays</span>
                                                        </div>

                                                        {/* Bar Area (Flex-1 to take available space) */}
                                                        <div className="flex-1 w-full flex items-end">
                                                            <div
                                                                className={`w-full rounded-sm transition-all duration-300 group-hover:bg-cyan-300 ${count > 0 ? 'bg-cyan-500 shadow-[0_0_10px_rgba(6,182,212,0.5)]' : 'bg-slate-700/30'}`}
                                                                style={{ height: `${height}%` }}
                                                            ></div>
                                                        </div>

                                                        {/* Label Area (Fixed height) */}
                                                        <div className="h-4 w-full flex items-center justify-center mt-1">
                                                            <span className="text-[9px] text-slate-600 group-hover:text-slate-400 font-mono transition-colors">
                                                                {hour % 4 === 0 ? hour : ''}
                                                            </span>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>

                                    {/* User Locations Map */}
                                    <div className="bg-slate-800/40 p-5 rounded-2xl border border-slate-700/50 h-[300px] flex flex-col">
                                        <h3 className="text-slate-300 font-bold mb-4 flex items-center gap-2 text-sm uppercase tracking-wider shrink-0">
                                            <svg className="w-4 h-4 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                            </svg>
                                            {t('userDetails.locations', 'Locations')}
                                        </h3>
                                        <div className="flex-1 rounded-xl overflow-hidden border border-slate-700/50 relative">
                                            {user.locations && user.locations.length > 0 ? (
                                                <InteractiveMap
                                                    sessions={user.locations.map((loc, i) => ({
                                                        session_id: `loc-${i}`,
                                                        title: '',
                                                        user: new Date(loc.date * 1000).toLocaleString(),
                                                        player: '',
                                                        status: 'playing',
                                                        ip_address: '',
                                                        latitude: loc.lat,
                                                        longitude: loc.lon,
                                                        server_name: loc.ip || 'Unknown IP',
                                                        server_id: undefined
                                                    })) as ActiveSession[]}
                                                    enableClustering={true}
                                                    hideControls={true}
                                                />
                                            ) : (
                                                <div className="absolute inset-0 flex items-center justify-center bg-slate-800/50">
                                                    <p className="text-slate-500 text-sm">{t('userDetails.noLocationData', 'No location data available for this time range.')}</p>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>,
        document.body
    );
};
