import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { HourlyActivityChart } from './HourlyActivityChart';
import { useServers } from '../hooks/useServers';
import { useAnalytics } from '../hooks/useAnalytics';

import { DevicePreferenceChart } from './DevicePreferenceChart';
import { PlaybackHealthChart } from './PlaybackHealthChart';
import { LibraryQualityChart } from './LibraryQualityChart';
import { GenrePopularityChart } from './GenrePopularityChart';

const STORAGE_KEY = 'plixmetrics_analytics_filters';

interface AnalyticsFilters {
    days: number;
    server_id: string;
}

export const AnalyticsPage: React.FC = () => {
    const { t } = useTranslation();
    // Load filters from localStorage or use defaults
    const [filters, setFilters] = useState<AnalyticsFilters>(() => {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) {
            try {
                return JSON.parse(saved);
            } catch {
                return { days: 30, server_id: 'all' };
            }
        }
        return { days: 30, server_id: 'all' };
    });

    // Save filters to localStorage whenever they change
    useEffect(() => {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(filters));
    }, [filters]);

    // Fetch servers for the dropdown
    const { servers } = useServers();

    // Fetch Analytics Data
    const { data: analyticsData, isLoading, error } = useAnalytics(filters.days, filters.server_id);

    const [daysInput, setDaysInput] = useState(filters.days.toString());


    // Sync daysInput when filters.days changes
    useEffect(() => {
        setDaysInput(filters.days.toString());
    }, [filters.days]);

    const handleDaysChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setDaysInput(e.target.value);
    };

    const handleDaysKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            const value = parseInt(daysInput, 10);
            if (value > 0 && value <= 365) {
                setFilters(prev => ({ ...prev, days: value }));
            }
        }
    };

    // State to manage the order of widgets on the Analytics dashboard
    const [analyticsOrder, setAnalyticsOrder] = useState<string[]>(() => {
        try {
            const saved = localStorage.getItem('analyticsOrder');
            // If we have saved order, check if it has the new keys, if not, append them
            const parsed = saved ? JSON.parse(saved) : ['hourly_activity', 'device_preference', 'playback_health', 'library_quality', 'genre_popularity'];

            // Ensure all new charts are in the list if upgrading from older state
            ['device_preference', 'playback_health', 'library_quality', 'genre_popularity'].forEach(key => {
                if (!parsed.includes(key)) parsed.push(key);
            });

            return parsed;
        } catch {
            return ['hourly_activity', 'device_preference', 'playback_health', 'library_quality', 'genre_popularity'];
        }
    });

    const moveSection = (index: number, direction: 'up' | 'down') => {
        const newOrder = [...analyticsOrder];
        const id = newOrder[index];
        const isFullWidth = id === 'hourly_activity';

        // Full-width card always moves 2 positions
        // Half-width card moves 2 if its neighbor in that direction is the full-width card (jump over it)
        let step = 1;
        if (isFullWidth) {
            step = 2;
        } else {
            const adjacentIndex = direction === 'up' ? index - 1 : index + 1;
            if (adjacentIndex >= 0 && adjacentIndex < newOrder.length && newOrder[adjacentIndex] === 'hourly_activity') {
                step = 2;
            }
        }

        const targetIndex = direction === 'up' ? index - step : index + step;
        if (targetIndex < 0 || targetIndex >= newOrder.length) return;

        if (isFullWidth) {
            // Remove and reinsert to keep half-width cards paired
            const [item] = newOrder.splice(index, 1);
            newOrder.splice(targetIndex, 0, item);
        } else {
            // Swap works for half-width cards (both step=1 and step=2)
            [newOrder[index], newOrder[targetIndex]] = [newOrder[targetIndex], newOrder[index]];
        }

        setAnalyticsOrder(newOrder);
        localStorage.setItem('analyticsOrder', JSON.stringify(newOrder));
    };

    const renderWidget = (id: string, controls: React.ReactNode) => {
        switch (id) {
            case 'hourly_activity':
                return (
                    <section className="space-y-6">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-2xl font-bold text-slate-100 px-1 flex items-center gap-3">
                                <span className="w-1.5 h-6 bg-cyan-500 rounded-full"></span>
                                {t('analytics.hourlyActivity')}
                            </h2>
                            <div className="flex gap-1">
                                {controls}
                            </div>
                        </div>
                        <div className="bg-slate-800/40 backdrop-blur-md border border-slate-700/50 p-6 rounded-3xl overflow-hidden hover:bg-slate-800/60 transition-colors relative min-h-[300px]">
                            {isLoading && (
                                <div className="absolute inset-0 flex items-center justify-center bg-slate-900/50 z-10 backdrop-blur-sm rounded-3xl">
                                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-500"></div>
                                </div>
                            )}
                            <HourlyActivityChart data={analyticsData?.hourly_activity} />
                        </div>
                    </section>
                );
            case 'device_preference':
                return (
                    <section className="space-y-6">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-2xl font-bold text-slate-100 px-1 flex items-center gap-3">
                                <span className="w-1.5 h-6 bg-indigo-500 rounded-full"></span>
                                {t('analytics.devicePreferences')}
                            </h2>
                            <div className="flex gap-1">
                                {controls}
                            </div>
                        </div>
                        <div className="bg-slate-800/40 backdrop-blur-md border border-slate-700/50 p-6 rounded-3xl overflow-hidden hover:bg-slate-800/60 transition-colors relative min-h-[300px]">
                            {isLoading && (
                                <div className="absolute inset-0 flex items-center justify-center bg-slate-900/50 z-10 backdrop-blur-sm rounded-3xl">
                                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500"></div>
                                </div>
                            )}
                            <DevicePreferenceChart data={analyticsData?.device_preferences} />
                        </div>
                    </section>
                );
            case 'playback_health':
                return (
                    <section className="space-y-6">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-2xl font-bold text-slate-100 px-1 flex items-center gap-3">
                                <span className="w-1.5 h-6 bg-emerald-500 rounded-full"></span>
                                {t('analytics.playbackHealth')}
                            </h2>
                            <div className="flex gap-1">
                                {controls}
                            </div>
                        </div>
                        <div className="bg-slate-800/40 backdrop-blur-md border border-slate-700/50 p-6 rounded-3xl overflow-hidden hover:bg-slate-800/60 transition-colors relative min-h-[300px]">
                            {isLoading && (
                                <div className="absolute inset-0 flex items-center justify-center bg-slate-900/50 z-10 backdrop-blur-sm rounded-3xl">
                                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500"></div>
                                </div>
                            )}
                            <PlaybackHealthChart data={analyticsData?.playback_health} />
                        </div>
                    </section>
                );
            case 'library_quality':
                return (
                    <section className="space-y-6">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-2xl font-bold text-slate-100 px-1 flex items-center gap-3">
                                <span className="w-1.5 h-6 bg-purple-500 rounded-full"></span>
                                {t('analytics.libraryQuality')}
                            </h2>
                            <div className="flex gap-1">
                                {controls}
                            </div>
                        </div>
                        <div className="bg-slate-800/40 backdrop-blur-md border border-slate-700/50 p-6 rounded-3xl overflow-hidden hover:bg-slate-800/60 transition-colors relative min-h-[300px]">
                            {isLoading && (
                                <div className="absolute inset-0 flex items-center justify-center bg-slate-900/50 z-10 backdrop-blur-sm rounded-3xl">
                                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500"></div>
                                </div>
                            )}
                            <LibraryQualityChart data={analyticsData?.library_quality} />
                        </div>
                    </section>
                );
            case 'genre_popularity':
                return (
                    <section className="space-y-6">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-2xl font-bold text-slate-100 px-1 flex items-center gap-3">
                                <span className="w-1.5 h-6 bg-rose-500 rounded-full"></span>
                                {t('analytics.genrePopularity')}
                            </h2>
                            <div className="flex gap-1">
                                {controls}
                            </div>
                        </div>
                        <div className="bg-slate-800/40 backdrop-blur-md border border-slate-700/50 p-6 rounded-3xl overflow-hidden hover:bg-slate-800/60 transition-colors relative min-h-[300px]">
                            {isLoading && (
                                <div className="absolute inset-0 flex items-center justify-center bg-slate-900/50 z-10 backdrop-blur-sm rounded-3xl">
                                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-rose-500"></div>
                                </div>
                            )}
                            <GenrePopularityChart data={analyticsData?.genre_popularity} />
                        </div>
                    </section>
                );
            default:
                return null;
        }
    };

    return (
        <div className="space-y-8 animate-fade-in">
            {/* Header with Filters */}
            <div className="bg-slate-800/40 backdrop-blur-md border border-slate-700/50 p-6 rounded-2xl">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Days Input */}
                    <div>
                        <label htmlFor="analytics-days-input" className="text-xs text-slate-400 uppercase tracking-widest font-bold block mb-2">
                            {t('analytics.timeRange')}
                        </label>
                        <input
                            id="analytics-days-input"
                            type="number"
                            min="1"
                            max="365"
                            value={daysInput}
                            onChange={handleDaysChange}
                            onKeyPress={handleDaysKeyPress}
                            placeholder={`Current: ${filters.days}`}
                            className="w-full px-4 py-2 bg-slate-700/50 border-2 border-slate-600 text-white rounded-lg focus:outline-none focus:border-cyan-500 transition-colors [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                        />
                        <p className="text-[10px] text-slate-500 mt-1">{t('common.pressEnterToApply')}</p>
                    </div>

                    {/* Server Select */}
                    <div>
                        <label htmlFor="analytics-server-select" className="text-xs text-slate-400 uppercase tracking-widest font-bold block mb-2">
                            {t('common.server')}
                        </label>
                        <div className="relative">
                            <select
                                id="analytics-server-select"
                                value={filters.server_id}
                                onChange={(e) => setFilters(prev => ({ ...prev, server_id: e.target.value }))}
                                className="w-full px-4 py-2 bg-slate-700/50 border-2 border-slate-600 text-white rounded-lg focus:outline-none focus:border-cyan-500 transition-colors appearance-none cursor-pointer"
                            >
                                <option value="all">{t('common.allServersAggregated')}</option>
                                {servers.map(server => (
                                    <option key={server.id} value={server.id}>
                                        {server.name}
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

            {error && (
                <div className="bg-red-500/20 text-red-100 p-4 rounded-xl border border-red-500/50">
                    <p className="font-bold">{t('analytics.errorLoading')}</p>
                    <p className="text-sm">{error.message}</p>
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {analyticsOrder.map((id, index) => {
                    // Special case: Make Hourly Activity full width if it's the first item or user preference?
                    // For now, let's make 'hourly_activity' span 2 columns if on desktop
                    const isFullWidth = id === 'hourly_activity';

                    const isFirst = index === 0;
                    const isLast = index === analyticsOrder.length - 1;

                    const controls = (
                        <>
                            {!isFirst && (
                                <button
                                    onClick={() => moveSection(index, 'up')}
                                    className="p-1 rounded bg-slate-800/50 hover:bg-slate-700 text-slate-500 hover:text-cyan-400 transition-colors"
                                    title={t('common.moveUp')}
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
                                        <path fillRule="evenodd" d="M14.77 12.79a.75.75 0 01-1.06-.02L10 8.832 6.29 12.77a.75.75 0 11-1.08-1.04l4.25-4.5a.75.75 0 011.08 0l4.25 4.5a.75.75 0 01-.02 1.06z" clipRule="evenodd" />
                                    </svg>
                                </button>
                            )}
                            {!isLast && (
                                <button
                                    onClick={() => moveSection(index, 'down')}
                                    className="p-1 rounded bg-slate-800/50 hover:bg-slate-700 text-slate-500 hover:text-cyan-400 transition-colors"
                                    title={t('common.moveDown')}
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
                                        <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01-.02-1.06z" clipRule="evenodd" />
                                    </svg>
                                </button>
                            )}
                        </>
                    );

                    return (
                        <div key={id} className={`h-full ${isFullWidth ? 'md:col-span-2' : ''}`}>
                            {renderWidget(id, controls)}
                        </div>
                    );
                })}
            </div>
        </div>
    );
};
