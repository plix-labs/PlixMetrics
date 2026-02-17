import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useWatchStats } from '../hooks/useWatchStats';
import { useServers } from '../hooks/useServers';
import { StatCard } from './StatCard';
import { UserDetailsModal } from './UserDetailsModal';
import { usePrivacy } from '../lib/privacy';
import { WatchStatsFilters } from '../types/statistics';

const STORAGE_KEY = 'plixmetrics_watch_stats_filters';

export const StatisticsPage: React.FC = () => {
    const { t } = useTranslation();
    const { anonymizeServer } = usePrivacy();
    // Load filters from localStorage or use defaults
    const [filters, setFilters] = useState<WatchStatsFilters>(() => {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) {
            try {
                return JSON.parse(saved);
            } catch {
                return { days: 30, stat_type: 'plays', server_id: 'all' };
            }
        }
        return { days: 30, stat_type: 'plays', server_id: 'all' };
    });

    const [selectedUser, setSelectedUser] = useState<string | null>(null);

    // Save filters to localStorage whenever they change
    useEffect(() => {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(filters));
    }, [filters]);

    // Fetch watch stats (only when this component is mounted)
    const { data, isLoading, error } = useWatchStats(filters, true);

    // Fetch servers for the dropdown
    const { servers } = useServers();

    const [daysInput, setDaysInput] = useState(filters.days.toString());

    // Sync daysInput when filters.days changes (e.g., from localStorage)
    useEffect(() => {
        setDaysInput(filters.days.toString());
    }, [filters.days]);

    const handleDaysChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setDaysInput(e.target.value);
    };



    return (
        <div className="space-y-8">
            {/* Header with Filters */}
            <div className="bg-slate-800/40 backdrop-blur-md border border-slate-700/50 p-6 rounded-2xl">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* Stat Type Toggle */}
                    <div>
                        <label className="text-xs text-slate-400 uppercase tracking-widest font-bold block mb-2">
                            {t('stats.displayMode')}
                        </label>
                        <div className="flex gap-2">
                            <button
                                onClick={() => setFilters(prev => ({ ...prev, stat_type: 'plays' }))}
                                className={`flex-1 h-11 px-4 rounded-lg text-sm font-medium transition-all ${filters.stat_type === 'plays'
                                    ? 'bg-cyan-600 text-white border-2 border-cyan-500'
                                    : 'bg-slate-700/50 text-slate-300 border-2 border-slate-600 hover:bg-slate-700'
                                    }`}
                            >
                                {t('stats.playCount')}
                            </button>
                            <button
                                onClick={() => setFilters(prev => ({ ...prev, stat_type: 'duration' }))}
                                className={`flex-1 h-11 px-4 rounded-lg text-sm font-medium transition-all ${filters.stat_type === 'duration'
                                    ? 'bg-amber-600 text-white border-2 border-amber-500'
                                    : 'bg-slate-700/50 text-slate-300 border-2 border-slate-600 hover:bg-slate-700'
                                    }`}
                            >
                                {t('stats.playDuration')}
                            </button>
                        </div>
                    </div>

                    <div className="flex gap-2">
                        <div className="flex-1">
                            <label htmlFor="days-input" className="text-xs text-slate-400 uppercase tracking-widest font-bold block mb-2">
                                {t('stats.timeRange')}
                            </label>
                            <div className="flex gap-2">
                                <input
                                    id="days-input"
                                    type="number"
                                    min="1"
                                    max="365"
                                    value={daysInput}
                                    onChange={handleDaysChange}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') {
                                            const value = parseInt(daysInput, 10);
                                            if (value > 0 && value <= 365) {
                                                setFilters(prev => ({ ...prev, days: value }));
                                            }
                                        }
                                    }}
                                    placeholder={`Current: ${filters.days}`}
                                    className="w-full h-11 px-4 bg-slate-700/50 border-2 border-slate-600 text-white rounded-lg focus:outline-none focus:border-cyan-500 transition-colors [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                />
                                <button
                                    onClick={() => {
                                        const value = parseInt(daysInput, 10);
                                        if (value > 0 && value <= 365) {
                                            setFilters(prev => ({ ...prev, days: value }));
                                        }
                                    }}
                                    className="h-11 px-4 bg-slate-700/50 border-2 border-slate-600 hover:bg-slate-700 text-cyan-400 rounded-lg transition-colors flex items-center justify-center"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
                                        <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z" clipRule="evenodd" />
                                    </svg>
                                </button>
                            </div>

                        </div>
                    </div>

                    {/* Server Select */}
                    <div>
                        <label htmlFor="server-select" className="text-xs text-slate-400 uppercase tracking-widest font-bold block mb-2">
                            {t('common.server')}
                        </label>
                        <div className="relative">
                            <select
                                id="server-select"
                                value={filters.server_id}
                                onChange={(e) => setFilters(prev => ({ ...prev, server_id: e.target.value }))}
                                className="w-full h-11 px-4 bg-slate-700/50 border-2 border-slate-600 text-white rounded-lg focus:outline-none focus:border-cyan-500 transition-colors appearance-none cursor-pointer"
                            >
                                <option value="all">{t('common.allServersAggregated')}</option>
                                {servers.map(server => (
                                    <option key={server.id} value={server.id}>
                                        {anonymizeServer(server.name)}
                                    </option>
                                ))}
                            </select>
                            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-slate-400">
                                <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
                                    <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z" />
                                </svg>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Loading State */}
            {isLoading && (
                <div className="text-center py-20">
                    <div className="inline-block animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-cyan-400"></div>
                    <p className="text-slate-400 mt-4">{t('stats.loadingStatistics')}</p>
                </div>
            )}

            {/* Error State */}
            {error && (
                <div className="bg-red-500/10 border border-red-500/20 text-red-200 p-4 rounded-lg">
                    {t('stats.errorLoading')} {error instanceof Error ? error.message : t('common.unknownError')}
                </div>
            )}

            {/* Stats Grid */}
            {!isLoading && data && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <StatCard
                        title={t('stats.mostWatchedMovies')}
                        data={data.most_watched_movies}
                        type="media"
                        valueLabel={filters.stat_type === 'plays' ? t('stats.plays') : 'hh:mm'}
                        enableTelegramShare={true}
                        days={filters.days}
                    />
                    <StatCard
                        title={t('stats.mostPopularMovies')}
                        data={data.most_popular_movies}
                        type="media"
                        valueLabel={t('stats.users')}
                        enableTelegramShare={true}
                        days={filters.days}
                    />
                    <StatCard
                        title={t('stats.mostWatchedShows')}
                        data={data.most_watched_shows}
                        type="media"
                        valueLabel={filters.stat_type === 'plays' ? t('stats.plays') : 'hh:mm'}
                        enableTelegramShare={true}
                        days={filters.days}
                    />
                    <StatCard
                        title={t('stats.mostPopularShows')}
                        data={data.most_popular_shows}
                        type="media"
                        valueLabel={t('stats.users')}
                        enableTelegramShare={true}
                        days={filters.days}
                    />
                    <StatCard
                        title={t('stats.mostActiveLibraries')}
                        data={data.most_active_libraries}
                        type="library"
                        valueLabel={filters.stat_type === 'plays' ? t('stats.plays') : 'hh:mm'}
                        enableTelegramShare={true}
                        days={filters.days}
                    />
                    <StatCard
                        title={t('stats.mostActiveUsers')}
                        data={data.most_active_users}
                        type="user"
                        valueLabel={filters.stat_type === 'plays' ? t('stats.plays') : 'hh:mm'}
                        enableTelegramShare={true}
                        days={filters.days}
                        onUserClick={setSelectedUser}
                    />
                    <StatCard
                        title={t('stats.mostActivePlatforms')}
                        data={data.most_active_platforms}
                        type="platform"
                        valueLabel={filters.stat_type === 'plays' ? t('stats.plays') : 'hh:mm'}
                        enableTelegramShare={true}
                        days={filters.days}
                    />
                    <StatCard
                        title={t('stats.mostConcurrentStreams')}
                        data={data.most_concurrent_streams}
                        type="concurrent"
                    />
                </div>
            )}

            {/* User Details Modal */}
            {selectedUser && (
                <UserDetailsModal
                    username={selectedUser}
                    onClose={() => setSelectedUser(null)}
                />
            )}
        </div>
    );
};
