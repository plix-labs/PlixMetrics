import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StatItem, UserStatItem, LibraryStatItem, PlatformStatItem, ConcurrentStreamsItem } from '../types/statistics';
import { getImageProxyUrl } from '../api/client';
import { usePrivacy } from '../lib/privacy';

// ... (imports)

interface StatCardProps {
    title: string;
    icon?: string;
    data: StatItem[] | UserStatItem[] | LibraryStatItem[] | PlatformStatItem[] | ConcurrentStreamsItem[];
    type: 'media' | 'user' | 'library' | 'platform' | 'concurrent';
    valueLabel?: string; // "Plays", "Users", "Streams", "hh:mm"
    enableTelegramShare?: boolean; // Enable Telegram share button
    days?: string | number;
    onUserClick?: (username: string) => void;
}

// Helper function to get emoji based on card title
const getEmoji = (title: string): string => {
    if (title.includes('Movies')) return '🎬';
    if (title.includes('TV Shows')) return '📺';
    if (title.includes('Libraries')) return '📚';
    if (title.includes('Users')) return '👤';
    if (title.includes('Platforms')) return '📱';
    return '📊';
};

// Helper function to get rank emoji
const getRankEmoji = (rank: number): string => {
    if (rank === 1) return '🥇';
    if (rank === 2) return '🥈';
    if (rank === 3) return '🥉';
    return `${rank}.`;
};

// Helper function to format Telegram message
const formatTelegramMessage = (
    title: string,
    items: (StatItem | UserStatItem | LibraryStatItem | PlatformStatItem)[],
    label: string,
    privacyUtils: { anonymizeUser: (n: string) => string; anonymizeServer: (n: string) => string },
    days?: string | number
): string => {
    const { anonymizeUser, anonymizeServer } = privacyUtils;
    const emoji = getEmoji(title);
    const period = days === 'all' ? 'All Time' : `Last ${days} Days`;
    let message = `${emoji} **${title.toUpperCase()}** (${period})\n\n`;

    items.slice(0, 5).forEach(item => {
        const rankEmoji = getRankEmoji(item.rank);
        const value = item.formatted_value;

        if ('title' in item) {
            // Media cards (StatItem)
            message += `${rankEmoji} ${item.title}${item.year ? ` (${item.year})` : ''} — **${value}** ${label}\n`;
        } else if ('user' in item) {
            // User cards (UserStatItem)
            message += `${rankEmoji} ${anonymizeUser(item.user)} — **${value}** ${label}\n`;
        } else if ('library_name' in item) {
            // Library cards (LibraryStatItem)
            message += `${rankEmoji} ${anonymizeServer(item.library_name)} — **${value}** ${label}\n`;
        } else if ('platform' in item) {
            // Platform cards (PlatformStatItem)
            message += `${rankEmoji} ${item.platform} — **${value}** ${label}\n`;
        }
    });

    message += `\n📊 PlixMetrics`;
    return message;
};

export const StatCard: React.FC<StatCardProps> = ({ title, data, type, valueLabel, enableTelegramShare, days, onUserClick }) => {
    const { t } = useTranslation();
    const [selectedIndex, setSelectedIndex] = useState(0);
    const { anonymizeUser, anonymizeServer } = usePrivacy();

    // Telegram share handler
    const handleTelegramShare = () => {
        const items = data as (StatItem | UserStatItem | LibraryStatItem | PlatformStatItem)[];
        const message = formatTelegramMessage(title, items, valueLabel || '', { anonymizeUser, anonymizeServer }, days);
        // Usar un espacio como URL para que no aparezca en el mensaje
        const url = `https://t.me/share/url?url=${encodeURIComponent(' ')}&text=${encodeURIComponent(message)}`;
        window.open(url, '_blank');
    };

    const items = data as any[];

    if (!items || items.length === 0) {
        return (
            <div className="bg-slate-800/40 backdrop-blur-md border border-slate-700/50 p-4 rounded-xl">
                <div className="flex items-center justify-between mb-3">
                    <h3 className="text-slate-200 text-sm font-bold uppercase tracking-wider">{title}</h3>
                </div>
                <p className="text-slate-500 text-sm text-center py-8">{t('common.noDataAvailable')}</p>
            </div>
        );
    }

    // ... (rest of render)

    const getRankColor = (rank: number) => {
        if (rank === 1) return 'text-amber-400';
        if (rank === 2) return 'text-slate-300';
        if (rank === 3) return 'text-orange-500';
        return 'text-slate-500';
    };

    const getImageUrl = (path: string | undefined, serverId: number | string | undefined) => {
        if (!path || !serverId) return '';
        return getImageProxyUrl(serverId, path, 200);
    };

    // Preload images for smoother hovering
    React.useEffect(() => {
        if (type === 'media' && data) {
            const items = data as StatItem[];
            items.slice(0, 5).forEach(item => {
                if (item.thumb && item.server_id) {
                    const img = new Image();
                    img.src = getImageUrl(item.thumb, item.server_id);
                }
            });
        }
    }, [data, type]);

    // Special layout for media type with poster + scrollable list
    if (type === 'media') {
        const mediaItems = items as StatItem[];
        return (
            <div className="bg-slate-800/40 backdrop-blur-md border border-slate-700/50 p-4 rounded-2xl">
                {/* Header */}
                <div className="flex items-center justify-between mb-4 border-b border-slate-700/30 pb-3">
                    <h3 className="text-slate-200 text-xs sm:text-sm font-bold uppercase tracking-widest truncate mr-2">{title}</h3>
                    <div className="flex items-center gap-2 shrink-0">
                        {valueLabel && (
                            <span className="text-[9px] sm:text-[10px] text-slate-500 uppercase tracking-wider font-extrabold">
                                {valueLabel}
                            </span>
                        )}
                        {enableTelegramShare && (
                            <button
                                onClick={handleTelegramShare}
                                className="p-1.5 hover:bg-slate-700/40 rounded-md transition-colors group"
                                title={t('statCard.shareOnTelegram')}
                            >
                                <svg
                                    className="w-4 h-4 text-slate-400 group-hover:text-cyan-400 transition-colors"
                                    fill="currentColor"
                                    viewBox="0 0 24 24"
                                >
                                    <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.894 8.221l-1.97 9.28c-.145.658-.537.818-1.084.508l-3-2.21-1.446 1.394c-.14.18-.357.295-.6.295-.002 0-.003 0-.005 0l.213-3.054 5.56-5.022c.24-.213-.054-.334-.373-.121l-6.869 4.326-2.96-.924c-.64-.203-.658-.64.135-.954l11.566-4.458c.538-.196 1.006.128.832.941z" />
                                </svg>
                            </button>
                        )}
                    </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-5 sm:gap-4">
                    {/* Poster - Centered on mobile, Side on desktop */}
                    <div className="flex justify-center sm:block shrink-0">
                        {mediaItems[selectedIndex]?.thumb && (
                            <div className="relative group">
                                <img
                                    src={getImageUrl(mediaItems[selectedIndex].thumb, mediaItems[selectedIndex].server_id)}
                                    alt={mediaItems[selectedIndex].title}
                                    className="w-32 h-44 sm:w-36 sm:h-52 object-cover rounded-xl shadow-2xl border border-slate-600/50 transition-all duration-300 group-hover:border-cyan-500/50"
                                    loading="lazy"
                                    onError={(e) => { (e.target as HTMLImageElement).style.opacity = '0.3' }}
                                />
                                <div className="absolute inset-0 rounded-xl bg-gradient-to-t from-slate-900/40 to-transparent opacity-0 sm:group-hover:opacity-100 transition-opacity pointer-events-none"></div>
                            </div>
                        )}
                    </div>

                    {/* Right: Scrollable List */}
                    <div className="overflow-y-auto h-[240px] sm:h-[208px] pr-1.5 custom-scrollbar">
                        {mediaItems.map((item, index) => (
                            <div
                                key={item.rank}
                                onMouseEnter={() => setSelectedIndex(index)}
                                onClick={() => setSelectedIndex(index)}
                                className={`flex items-center gap-3 sm:gap-3 py-2 sm:py-2 px-3 sm:px-2 cursor-pointer transition-all rounded-lg mb-1 ${selectedIndex === index
                                    ? 'bg-cyan-500/10 border-l-4 border-cyan-400'
                                    : 'border-l-4 border-transparent hover:bg-slate-700/20'
                                    }`}
                            >
                                {/* Rank */}
                                <span className={`text-base sm:text-2xl font-black ${getRankColor(item.rank)} min-w-[20px] sm:min-w-[32px] text-center`}>
                                    {item.rank}
                                </span>

                                {/* Info */}
                                <div className="flex-1 min-w-0">
                                    <p className="text-xs sm:text-sm text-white font-bold truncate">
                                        {item.title}
                                    </p>
                                    {item.year && (
                                        <p className="text-[10px] sm:text-xs text-slate-500 font-medium">
                                            {item.year}
                                        </p>
                                    )}
                                </div>

                                {/* Value */}
                                <span className="text-sm sm:text-lg font-black text-cyan-400 tabular-nums">
                                    {item.formatted_value}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Custom Scrollbar Styles */}
                <style>{`
                    .custom-scrollbar::-webkit-scrollbar {
                        width: 4px;
                    }
                    .custom-scrollbar::-webkit-scrollbar-track {
                        background: rgba(30, 41, 59, 0.2);
                        border-radius: 2px;
                    }
                    .custom-scrollbar::-webkit-scrollbar-thumb {
                        background: rgba(6, 182, 212, 0.3);
                        border-radius: 2px;
                    }
                `}</style>
            </div>
        );
    }

    // Layout para otros tipos (user, library, platform)
    return (
        <div className="bg-slate-800/40 backdrop-blur-md border border-slate-700/50 p-4 rounded-2xl">
            {/* Header */}
            <div className="flex items-center justify-between mb-4 border-b border-slate-700/30 pb-3">
                <h3 className="text-slate-200 text-xs sm:text-sm font-bold uppercase tracking-widest truncate mr-2">{title}</h3>
                <div className="flex items-center gap-2 shrink-0">
                    {valueLabel && (
                        <span className="text-[9px] sm:text-[10px] text-slate-500 uppercase tracking-wider font-extrabold">
                            {valueLabel}
                        </span>
                    )}
                    {enableTelegramShare && (
                        <button
                            onClick={handleTelegramShare}
                            className="p-1.5 hover:bg-slate-700/40 rounded-md transition-colors group"
                            title={t('statCard.shareOnTelegram')}
                        >
                            <svg
                                className="w-4 h-4 text-slate-400 group-hover:text-cyan-400 transition-colors"
                                fill="currentColor"
                                viewBox="0 0 24 24"
                            >
                                <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.894 8.221l-1.97 9.28c-.145.658-.537.818-1.084.508l-3-2.21-1.446 1.394c-.14.18-.357.295-.6.295-.002 0-.003 0-.005 0l.213-3.054 5.56-5.022c.24-.213-.054-.334-.373-.121l-6.869 4.326-2.96-.924c-.64-.203-.658-.64.135-.954l11.566-4.458c.538-.196 1.006.128.832.941z" />
                            </svg>
                        </button>
                    )}
                </div>
            </div>

            <div className="overflow-y-auto h-[240px] sm:h-[208px] pr-1.5 custom-scrollbar">
                {items.map((item, index) => {
                    if (type === 'user') {
                        const userItem = item as UserStatItem;
                        return (
                            <div
                                key={userItem.rank}
                                onClick={() => onUserClick && onUserClick(userItem.user)}
                                className={`flex items-center gap-3 py-2 px-3 rounded-lg mb-1 transition-colors ${onUserClick ? 'cursor-pointer hover:bg-cyan-500/10' : 'hover:bg-slate-700/20'}`}
                            >
                                <span className={`text-base sm:text-2xl font-black ${getRankColor(userItem.rank)} min-w-[24px] sm:min-w-[32px] text-center`}>
                                    {userItem.rank}
                                </span>
                                <div className="flex-1 min-w-0">
                                    <p className={`text-sm font-semibold truncate leading-tight ${onUserClick ? 'text-white group-hover:text-cyan-400' : 'text-white'}`}>{anonymizeUser(userItem.user)}</p>
                                    <p className="text-xs text-indigo-400 leading-tight mt-0.5">{anonymizeServer(userItem.server_name)}</p>
                                </div>
                                <span className="text-sm sm:text-lg font-black text-cyan-400 tabular-nums">
                                    {userItem.formatted_value}
                                </span>
                            </div>
                        );
                    }

                    if (type === 'library') {
                        const libraryItem = item as LibraryStatItem;
                        return (
                            <div key={libraryItem.rank} className="flex items-center gap-3 py-2 px-3 hover:bg-slate-700/20 rounded-lg mb-1 transition-colors">
                                <span className={`text-base sm:text-2xl font-black ${getRankColor(libraryItem.rank)} min-w-[24px] sm:min-w-[32px] text-center`}>
                                    {libraryItem.rank}
                                </span>
                                <div className="flex-1 min-w-0">
                                    <p className="text-xs sm:text-sm text-white font-bold truncate">{libraryItem.library_name}</p>
                                    {libraryItem.server_name && (
                                        <p className="text-xs text-slate-500 leading-tight mt-0.5">{anonymizeServer(libraryItem.server_name)}</p>
                                    )}
                                </div>
                                <span className="text-sm sm:text-lg font-black text-cyan-400 tabular-nums">
                                    {libraryItem.formatted_value}
                                </span>
                            </div>
                        );
                    }

                    if (type === 'platform') {
                        const platformItem = item as PlatformStatItem;
                        return (
                            <div key={platformItem.rank} className="flex items-center gap-3 py-2 px-3 hover:bg-slate-700/20 rounded-lg mb-1 transition-colors">
                                <span className={`text-base sm:text-2xl font-black ${getRankColor(platformItem.rank)} min-w-[24px] sm:min-w-[32px] text-center`}>
                                    {platformItem.rank}
                                </span>
                                <div className="flex-1">
                                    <p className="text-xs sm:text-sm text-white font-bold">{platformItem.platform}</p>
                                </div>
                                <span className="text-sm sm:text-lg font-black text-cyan-400 tabular-nums">
                                    {platformItem.formatted_value}
                                </span>
                            </div>
                        );
                    }

                    if (type === 'concurrent') {
                        const concurrentItem = item as ConcurrentStreamsItem;
                        const rank = index + 1;
                        return (
                            <div key={index} className="flex items-center gap-3 py-2 px-3 hover:bg-slate-700/20 rounded-lg mb-1 transition-colors">
                                <span className={`text-base sm:text-2xl font-black ${getRankColor(rank)} min-w-[24px] sm:min-w-[32px] text-center`}>
                                    {rank}
                                </span>
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm text-white font-semibold truncate leading-tight">{anonymizeServer(concurrentItem.server_name || 'Unknown Server')}</p>
                                </div>
                                <div className="text-right">
                                    <span className="text-sm sm:text-lg font-black text-cyan-400 tabular-nums block leading-none">
                                        {concurrentItem.concurrent_streams}
                                    </span>
                                    <span className="text-[9px] sm:text-[10px] text-slate-500 uppercase font-black tracking-widest">{t('stats.streams')}</span>
                                </div>
                            </div>
                        );
                    }

                    return null;
                })}
            </div>

            {/* Custom Scrollbar Styles */}
            <style>{`
                .custom-scrollbar::-webkit-scrollbar {
                    width: 4px;
                }
                .custom-scrollbar::-webkit-scrollbar-track {
                    background: rgba(30, 41, 59, 0.2);
                    border-radius: 2px;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb {
                    background: rgba(6, 182, 212, 0.3);
                    border-radius: 2px;
                }
            `}</style>
        </div>
    );
};
