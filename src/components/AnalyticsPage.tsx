import React, { useState } from 'react';
import { HourlyActivityChart } from './HourlyActivityChart';

import { DevicePreferenceChart } from './DevicePreferenceChart';
import { PlaybackHealthChart } from './PlaybackHealthChart';
import { LibraryQualityChart } from './LibraryQualityChart';
import { GenrePopularityChart } from './GenrePopularityChart';

export const AnalyticsPage: React.FC = () => {
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
        const targetIndex = direction === 'up' ? index - 1 : index + 1;

        if (targetIndex >= 0 && targetIndex < newOrder.length) {
            [newOrder[index], newOrder[targetIndex]] = [newOrder[targetIndex], newOrder[index]];
            setAnalyticsOrder(newOrder);
            localStorage.setItem('analyticsOrder', JSON.stringify(newOrder));
        }
    };

    const renderWidget = (id: string, controls: React.ReactNode) => {
        switch (id) {
            case 'hourly_activity':
                return (
                    <section className="space-y-6">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-2xl font-bold text-slate-100 px-1 flex items-center gap-3">
                                <span className="w-1.5 h-6 bg-cyan-500 rounded-full"></span>
                                Hourly Activity
                            </h2>
                            <div className="flex gap-1">
                                {controls}
                            </div>
                        </div>
                        <div className="bg-slate-800/40 backdrop-blur-md border border-slate-700/50 p-6 rounded-3xl overflow-hidden hover:bg-slate-800/60 transition-colors">
                            <HourlyActivityChart />
                        </div>
                    </section>
                );
            case 'device_preference':
                return (
                    <section className="space-y-6">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-2xl font-bold text-slate-100 px-1 flex items-center gap-3">
                                <span className="w-1.5 h-6 bg-indigo-500 rounded-full"></span>
                                Device Preferences
                            </h2>
                            <div className="flex gap-1">
                                {controls}
                            </div>
                        </div>
                        <div className="bg-slate-800/40 backdrop-blur-md border border-slate-700/50 p-6 rounded-3xl overflow-hidden hover:bg-slate-800/60 transition-colors">
                            <DevicePreferenceChart />
                        </div>
                    </section>
                );
            case 'playback_health':
                return (
                    <section className="space-y-6">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-2xl font-bold text-slate-100 px-1 flex items-center gap-3">
                                <span className="w-1.5 h-6 bg-emerald-500 rounded-full"></span>
                                Playback Health
                            </h2>
                            <div className="flex gap-1">
                                {controls}
                            </div>
                        </div>
                        <div className="bg-slate-800/40 backdrop-blur-md border border-slate-700/50 p-6 rounded-3xl overflow-hidden hover:bg-slate-800/60 transition-colors">
                            <PlaybackHealthChart />
                        </div>
                    </section>
                );
            case 'library_quality':
                return (
                    <section className="space-y-6">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-2xl font-bold text-slate-100 px-1 flex items-center gap-3">
                                <span className="w-1.5 h-6 bg-purple-500 rounded-full"></span>
                                Library Quality
                            </h2>
                            <div className="flex gap-1">
                                {controls}
                            </div>
                        </div>
                        <div className="bg-slate-800/40 backdrop-blur-md border border-slate-700/50 p-6 rounded-3xl overflow-hidden hover:bg-slate-800/60 transition-colors">
                            <LibraryQualityChart />
                        </div>
                    </section>
                );
            case 'genre_popularity':
                return (
                    <section className="space-y-6">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-2xl font-bold text-slate-100 px-1 flex items-center gap-3">
                                <span className="w-1.5 h-6 bg-rose-500 rounded-full"></span>
                                Genre Popularity
                            </h2>
                            <div className="flex gap-1">
                                {controls}
                            </div>
                        </div>
                        <div className="bg-slate-800/40 backdrop-blur-md border border-slate-700/50 p-6 rounded-3xl overflow-hidden hover:bg-slate-800/60 transition-colors">
                            <GenrePopularityChart />
                        </div>
                    </section>
                );
            default:
                return null;
        }
    };

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 animate-fade-in">
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
                                title="Move Up"
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
                                title="Move Down"
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
    );
};
