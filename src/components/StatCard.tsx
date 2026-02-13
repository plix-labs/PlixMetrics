import React, { useState } from 'react';
import { StatItem, UserStatItem, LibraryStatItem, PlatformStatItem, ConcurrentStreamsItem } from '../types/statistics';
import { getImageProxyUrl } from '../api/client';

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
    days?: string | number
): string => {
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
            message += `${rankEmoji} ${item.user} — **${value}** ${label}\n`;
        } else if ('library_name' in item) {
            // Library cards (LibraryStatItem)
            message += `${rankEmoji} ${item.library_name} — **${value}** ${label}\n`;
        } else if ('platform' in item) {
            // Platform cards (PlatformStatItem)
            message += `${rankEmoji} ${item.platform} — **${value}** ${label}\n`;
        }
    });

    message += `\n📊 PlixMetrics`;
    return message;
};

export const StatCard: React.FC<StatCardProps> = ({ title, data, type, valueLabel, enableTelegramShare, days, onUserClick }) => {
    const [selectedIndex, setSelectedIndex] = useState(0);

    // Telegram share handler
    const handleTelegramShare = () => {
        const items = data as (StatItem | UserStatItem | LibraryStatItem | PlatformStatItem)[];
        const message = formatTelegramMessage(title, items, valueLabel || '', days);
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
                <p className="text-slate-500 text-sm text-center py-8">No data available</p>
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

    // Layout especial para media type con poster + lista scrollable
    if (type === 'media') {
        const mediaItems = items as StatItem[];
        return (
            <div className="bg-slate-800/40 backdrop-blur-md border border-slate-700/50 p-4 rounded-xl">
                {/* Header ENCIMA de todo */}
                <div className="flex items-center justify-between mb-3">
                    <h3 className="text-slate-200 text-sm font-bold uppercase tracking-wider">{title}</h3>
                    <div className="flex items-center gap-2">
                        {valueLabel && (
                            <span className="text-[10px] text-slate-500 uppercase tracking-wider font-bold">
                                {valueLabel}
                            </span>
                        )}
                        {enableTelegramShare && (
                            <button
                                onClick={handleTelegramShare}
                                className="p-1.5 hover:bg-slate-700/40 rounded-md transition-colors group"
                                title="Share on Telegram"
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

                <div className="flex gap-4">
                    {/* Left: Large Poster */}
                    <div className="flex-shrink-0">
                        {mediaItems[selectedIndex]?.thumb && (
                            <img
                                src={getImageUrl(mediaItems[selectedIndex].thumb, mediaItems[selectedIndex].server_id)}
                                alt={mediaItems[selectedIndex].title}
                                className="w-36 h-52 object-cover rounded-lg shadow-2xl border border-slate-600/50 transition-all duration-300"
                                loading="lazy"
                                onError={(e) => { (e.target as HTMLImageElement).style.opacity = '0.3' }}
                            />
                        )}
                    </div>

                    {/* Right: Scrollable List - SOLO 5 VISIBLES */}
                    <div className="flex-1 overflow-y-auto h-[208px] pr-2 custom-scrollbar">
                        {mediaItems.map((item, index) => (
                            <div
                                key={item.rank}
                                onMouseEnter={() => setSelectedIndex(index)}
                                onClick={() => setSelectedIndex(index)}
                                className={`flex items-center gap-3 py-2 px-2 cursor-pointer transition-all ${selectedIndex === index
                                    ? 'bg-slate-700/30 border-l-4 border-cyan-400 -ml-2 pl-2'
                                    : 'border-l-4 border-transparent hover:bg-slate-700/20'
                                    }`}
                            >
                                {/* Rank */}
                                <span className={`text-2xl font-black ${getRankColor(item.rank)} min-w-[32px] text-center leading-none`}>
                                    {item.rank}
                                </span>

                                {/* Info */}
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm text-white font-semibold truncate leading-tight">
                                        {item.title}
                                    </p>
                                    {item.year && (
                                        <p className="text-xs text-slate-500 leading-tight mt-0.5">
                                            {item.year}
                                        </p>
                                    )}
                                </div>

                                {/* Value */}
                                <span className="text-lg font-bold text-cyan-400 whitespace-nowrap tabular-nums">
                                    {item.formatted_value}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Custom Scrollbar Styles */}
                <style>{`
                    .custom-scrollbar::-webkit-scrollbar {
                        width: 6px;
                    }
                    .custom-scrollbar::-webkit-scrollbar-track {
                        background: rgba(30, 41, 59, 0.4);
                        border-radius: 3px;
                    }
                    .custom-scrollbar::-webkit-scrollbar-thumb {
                        background: rgba(100, 116, 139, 0.6);
                        border-radius: 3px;
                    }
                    .custom-scrollbar::-webkit-scrollbar-thumb:hover {
                        background: rgba(148, 163, 184, 0.8);
                    }
                `}</style>
            </div>
        );
    }

    // Layout para otros tipos (user, library, platform) - SOLO 5 VISIBLES
    return (
        <div className="bg-slate-800/40 backdrop-blur-md border border-slate-700/50 p-4 rounded-xl">
            {/* Header */}
            <div className="flex items-center justify-between mb-3">
                <h3 className="text-slate-200 text-sm font-bold uppercase tracking-wider">{title}</h3>
                <div className="flex items-center gap-2">
                    {valueLabel && (
                        <span className="text-[10px] text-slate-500 uppercase tracking-wider font-bold">
                            {valueLabel}
                        </span>
                    )}
                    {enableTelegramShare && (
                        <button
                            onClick={handleTelegramShare}
                            className="p-1.5 hover:bg-slate-700/40 rounded-md transition-colors group"
                            title="Share on Telegram"
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

            {/* Lista scrollable - SOLO 5 VISIBLES */}
            <div className="overflow-y-auto h-[208px] pr-2 custom-scrollbar">
                {items.map((item, index) => {
                    if (type === 'user') {
                        const userItem = item as UserStatItem;
                        return (
                            <div
                                key={userItem.rank}
                                onClick={() => onUserClick && onUserClick(userItem.user)}
                                className={`flex items-center gap-3 py-2 px-2 rounded transition-colors ${onUserClick ? 'cursor-pointer hover:bg-slate-700/40' : 'hover:bg-slate-700/20'}`}
                            >
                                <span className={`text-2xl font-black ${getRankColor(userItem.rank)} min-w-[32px] text-center leading-none`}>
                                    {userItem.rank}
                                </span>
                                <div className="flex-1 min-w-0">
                                    <p className={`text-sm font-semibold truncate leading-tight ${onUserClick ? 'text-white group-hover:text-cyan-400' : 'text-white'}`}>{userItem.user}</p>
                                    <p className="text-xs text-indigo-400 leading-tight mt-0.5">{userItem.server_name}</p>
                                </div>
                                <span className="text-lg font-bold text-cyan-400 whitespace-nowrap tabular-nums">
                                    {userItem.formatted_value}
                                </span>
                            </div>
                        );
                    }

                    if (type === 'library') {
                        const libraryItem = item as LibraryStatItem;
                        return (
                            <div key={libraryItem.rank} className="flex items-center gap-3 py-2 px-2 hover:bg-slate-700/20 rounded transition-colors">
                                <span className={`text-2xl font-black ${getRankColor(libraryItem.rank)} min-w-[32px] text-center leading-none`}>
                                    {libraryItem.rank}
                                </span>
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm text-white font-semibold truncate leading-tight">{libraryItem.library_name}</p>
                                    {libraryItem.server_name && (
                                        <p className="text-xs text-slate-500 leading-tight mt-0.5">{libraryItem.server_name}</p>
                                    )}
                                </div>
                                <span className="text-lg font-bold text-cyan-400 whitespace-nowrap tabular-nums">
                                    {libraryItem.formatted_value}
                                </span>
                            </div>
                        );
                    }

                    if (type === 'platform') {
                        const platformItem = item as PlatformStatItem;
                        return (
                            <div key={platformItem.rank} className="flex items-center gap-3 py-2 px-2 hover:bg-slate-700/20 rounded transition-colors">
                                <span className={`text-2xl font-black ${getRankColor(platformItem.rank)} min-w-[32px] text-center leading-none`}>
                                    {platformItem.rank}
                                </span>
                                <div className="flex-1">
                                    <p className="text-sm text-white font-semibold leading-tight">{platformItem.platform}</p>
                                </div>
                                <span className="text-lg font-bold text-cyan-400 whitespace-nowrap tabular-nums">
                                    {platformItem.formatted_value}
                                </span>
                            </div>
                        );
                    }

                    if (type === 'concurrent') {
                        const concurrentItem = item as ConcurrentStreamsItem;
                        // Manual ranking if not present
                        const rank = index + 1;
                        return (
                            <div key={index} className="flex items-center gap-3 py-2 px-2 hover:bg-slate-700/20 rounded transition-colors">
                                <span className={`text-2xl font-black ${getRankColor(rank)} min-w-[32px] text-center leading-none`}>
                                    {rank}
                                </span>
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm text-white font-semibold truncate leading-tight">{concurrentItem.server_name || 'Unknown Server'}</p>

                                </div>
                                <div className="text-right">
                                    <span className="text-lg font-bold text-cyan-400 whitespace-nowrap tabular-nums block leading-none">
                                        {concurrentItem.concurrent_streams}
                                    </span>
                                    <span className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">Streams</span>
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
                    width: 6px;
                }
                .custom-scrollbar::-webkit-scrollbar-track {
                    background: rgba(30, 41, 59, 0.4);
                    border-radius: 3px;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb {
                    background: rgba(100, 116, 139, 0.6);
                    border-radius: 3px;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover {
                    background: rgba(148, 163, 184, 0.8);
                }
            `}</style>
        </div>
    );
};
