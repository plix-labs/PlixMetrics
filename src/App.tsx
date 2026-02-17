import { useState, lazy, Suspense, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from './lib/queryClient';
import { usePlexNetwork } from './hooks/usePlexNetwork';
import { LiveMap } from './components/LiveMap';
import { AddServerModal } from './components/AddServerModal';

import { SessionCard } from './components/SessionCard';
import { LanguageSelector } from './components/LanguageSelector';
import { PlexServer } from './types';

// Lazy load Statistics page (solo se carga cuando se necesita)
const StatisticsPage = lazy(() => import('./components/StatisticsPage').then(module => ({ default: module.StatisticsPage })));
const AnalyticsPage = lazy(() => import('./components/AnalyticsPage').then(module => ({ default: module.AnalyticsPage })));
const UsersPage = lazy(() => import('./components/UsersPage').then(module => ({ default: module.UsersPage })));




// ... other imports ...
import { UserDetailsModal } from './components/UserDetailsModal';
import { MobilePairingModal } from './components/MobilePairingModal';

import { ServerListModal } from './components/ServerListModal';
import { Skeleton } from './components/ui/Skeleton';
import { Logo } from './components/Logo';

import { BottomNav } from './components/BottomNav';
// ... (imports) ...

import { ToastProvider } from './context/ToastContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import { LoginPage } from './components/LoginPage';
import { SetupPage } from './components/SetupPage';
import { UpdateChecker } from './components/UpdateChecker';

function AppContent() {
    const { status, loading: authLoading } = useAuth();

    // Auth Logic
    if (authLoading) {
        return (
            <div className="min-h-screen bg-slate-900 flex items-center justify-center">
                <div className="inline-block animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-cyan-400"></div>
            </div>
        );
    }

    if (status?.setupRequired) {
        return <SetupPage />;
    }

    if (!status?.authenticated && !status?.isLocal) {
        return <LoginPage />;
    }

    // Main App Logic (Dashboard)
    return <AppDashboard />;
}

// Renamed original App to AppDashboard to separate concerns clearly
function AppDashboard() {
    const { t } = useTranslation();
    const [showAddServer, setShowAddServer] = useState(false);
    const [showServerListModal, setShowServerListModal] = useState(false);
    const [serverToEdit, setServerToEdit] = useState<PlexServer | undefined>(undefined);
    const [currentView, setCurrentView] = useState<'dashboard' | 'statistics' | 'analytics' | 'users'>('dashboard');
    const [selectedUser, setSelectedUser] = useState<string | null>(null);
    const [showMobilePairing, setShowMobilePairing] = useState(false);

    // Sidebar Order State with Persistence
    const [sidebarOrder, setSidebarOrder] = useState<string[]>(() => {
        const defaultOrder = ['metrics', 'sessions', 'map'];
        try {
            const saved = localStorage.getItem('dashboardOrder');
            if (!saved) return defaultOrder;
            const parsed = JSON.parse(saved);
            // Ensure any new default keys are added to the saved order
            const merged = [...parsed];
            defaultOrder.forEach(key => {
                if (!merged.includes(key)) merged.push(key);
            });
            return merged;
        } catch {
            return defaultOrder;
        }
    });

    const [isMetricsExpanded, setIsMetricsExpanded] = useState(false);

    const moveSection = (index: number, direction: 'up' | 'down') => {
        const newOrder = [...sidebarOrder];
        const targetIndex = direction === 'up' ? index - 1 : index + 1;

        if (targetIndex >= 0 && targetIndex < newOrder.length) {
            [newOrder[index], newOrder[targetIndex]] = [newOrder[targetIndex], newOrder[index]];
            setSidebarOrder(newOrder);
            localStorage.setItem('dashboardOrder', JSON.stringify(newOrder));
        }
    };
    const [isLandscapeMobile, setIsLandscapeMobile] = useState(false);
    const [isMonochromeView, setIsMonochromeView] = useState(false);
    const [isDesktop, setIsDesktop] = useState(window.innerWidth >= 1024);
    const [showZenControls, setShowZenControls] = useState(true);
    const [showZenSessions, setShowZenSessions] = useState(true);

    useEffect(() => {
        let timeout: any;
        const handleMouseMove = () => {
            setShowZenControls(true);
            clearTimeout(timeout);
            timeout = setTimeout(() => setShowZenControls(false), 3000);
        };

        if (isMonochromeView) {
            window.addEventListener('mousemove', handleMouseMove);
            handleMouseMove();
        }

        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            clearTimeout(timeout);
        };
    }, [isMonochromeView]);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key.toLowerCase() === 'z' || e.key.toLowerCase() === 'f') {
                if (!isMonochromeView) setIsMonochromeView(true);
            } else if (e.key === 'Escape') {
                setIsMonochromeView(false);
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isMonochromeView]);

    useEffect(() => {
        const checkOrientation = () => {
            const width = window.innerWidth;
            const isLandscape = width > window.innerHeight;
            const isMobileDetected = width < 1024;

            setIsLandscapeMobile(isLandscape && isMobileDetected);
            setIsDesktop(!isMobileDetected);

            // Auto-exit monochrome if orientation changes to portrait
            if (!isLandscape) {
                setIsMonochromeView(false);
            }
        };

        window.addEventListener('resize', checkOrientation);
        checkOrientation();
        return () => window.removeEventListener('resize', checkOrientation);
    }, []);

    // No authentication needed - single user mode
    const { data, loading, error, refetch } = usePlexNetwork();

    // Widget Renderers
    const renderWidget = (id: string, controls: React.ReactNode) => {
        const getServerStats = () => {
            if (!data?.active_sessions) return [];

            const statsMap = new Map<string, { name: string, streams: number, bandwidth: number }>();

            data.active_sessions.forEach(session => {
                const serverName = session.server_name || 'Unknown';
                const existing = statsMap.get(serverName) || { name: serverName, streams: 0, bandwidth: 0 };
                existing.streams += 1;
                existing.bandwidth += (session.bandwidth || 0);
                statsMap.set(serverName, existing);
            });

            return Array.from(statsMap.values()).sort((a, b) => b.streams - a.streams);
        };

        switch (id) {
            case 'metrics':
                const serverStats = getServerStats();
                return (
                    <section className="space-y-4">
                        <div className="bg-slate-800/40 backdrop-blur-md border border-slate-700/50 p-4 sm:p-5 rounded-2xl overflow-hidden hover:bg-slate-800/60 transition-colors relative">
                            <div className="absolute top-4 right-4 flex gap-1 z-10">
                                {controls}
                            </div>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-y-4 gap-x-2 sm:gap-8">
                                <button
                                    onClick={() => setIsMetricsExpanded(!isMetricsExpanded)}
                                    className="group flex flex-col items-start cursor-pointer hover:opacity-80 transition-opacity"
                                >
                                    <div className="flex items-center gap-2 mb-1">
                                        <h3 className="text-slate-400 text-[10px] sm:text-xs font-bold uppercase tracking-widest">{t('dashboard.activeStreams')}</h3>
                                        {isMetricsExpanded && <span className="flex h-1.5 w-1.5 rounded-full bg-cyan-500 animate-pulse"></span>}
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <div className="text-2xl sm:text-3xl font-black text-cyan-400 leading-none">
                                            {data?.total_stream_count || 0}
                                        </div>
                                        <div className={`p-1 rounded bg-slate-700/30 border border-slate-700/50 group-hover:bg-slate-700/60 transition-all ${isMetricsExpanded ? 'bg-cyan-500/10 border-cyan-500/30 text-cyan-400' : 'text-slate-500'}`}>
                                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                                            </svg>
                                        </div>
                                    </div>
                                </button>
                                <div className="md:border-l md:border-white/5 md:pl-8">
                                    <h3 className="text-slate-400 text-[10px] sm:text-xs font-bold uppercase tracking-widest mb-1">{t('dashboard.transcoding')}</h3>
                                    <div className="text-2xl sm:text-3xl font-black text-amber-500 leading-none">
                                        {data?.total_transcodes || 0}
                                    </div>
                                </div>
                                <div className="md:border-l md:border-white/5 md:pl-8">
                                    <h3 className="text-slate-400 text-[10px] sm:text-xs font-bold uppercase tracking-widest mb-1">{t('dashboard.totalUsers')}</h3>
                                    <div className="text-2xl sm:text-3xl font-black text-slate-200 leading-none">
                                        {data?.total_users || 0}
                                    </div>
                                </div>
                                <div className="md:border-l md:border-white/5 md:pl-8">
                                    <h3 className="text-slate-400 text-[10px] sm:text-xs font-bold uppercase tracking-widest mb-1">{t('dashboard.bandwidth')}</h3>
                                    <div className="text-2xl sm:text-3xl font-black text-indigo-400 leading-none">
                                        {data ? (data.total_bandwidth / 1000).toFixed(1) : '0'} <span className="text-xs sm:text-sm text-slate-500 font-bold">{t('dashboard.mbps')}</span>
                                    </div>
                                </div>
                            </div>

                            {/* Server Breakdown Expansion */}
                            {isMetricsExpanded && serverStats.length > 0 && (
                                <div className="mt-6 pt-5 border-t border-white/5 animate-in slide-in-from-top-4 duration-300">
                                    <div className="flex items-center gap-2 mb-3 px-1">
                                        <span className="w-1 h-3 bg-cyan-500 rounded-full"></span>
                                        <h3 className="text-slate-400 text-[10px] font-bold uppercase tracking-widest">{t('dashboard.serverBreakdown')}</h3>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                        {serverStats.map((server) => (
                                            <div key={server.name} className="flex items-center justify-between py-1.5 px-3 rounded-lg bg-slate-400/5 hover:bg-slate-400/10 transition-colors">
                                                <div className="flex items-center gap-2 min-w-0">
                                                    <div className="w-1.5 h-1.5 rounded-full bg-cyan-500/50"></div>
                                                    <p className="text-slate-200 text-xs font-bold truncate">{server.name}</p>
                                                </div>
                                                <div className="flex items-center gap-3">
                                                    <div className="flex items-center gap-1.5">
                                                        <span className="text-sm font-black text-cyan-400 leading-none">{server.streams}</span>
                                                        <span className="text-[9px] text-slate-500 font-bold uppercase tracking-tighter">{t('stats.streams')}</span>
                                                    </div>
                                                    <div className="w-px h-2.5 bg-white/5"></div>
                                                    <div className="flex items-center gap-1.5">
                                                        <span className="text-sm font-black text-indigo-400 leading-none">{(server.bandwidth / 1000).toFixed(1)}</span>
                                                        <span className="text-[9px] text-slate-500 font-bold tracking-tighter">Mbps</span>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </section>
                );

            case 'sessions':
                return (
                    <section className="space-y-6">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-2xl font-bold text-slate-100 px-1 flex items-center gap-3">
                                <span className="w-1.5 h-6 bg-cyan-500 rounded-full"></span>
                                {t('dashboard.activeSessions')}
                                {data && data.active_sessions.length > 0 && (
                                    <span className="ml-2 text-sm font-normal text-slate-500 bg-slate-800 px-2.5 py-0.5 rounded-full border border-slate-700">
                                        {data.active_sessions.length}
                                    </span>
                                )}
                            </h2>
                            <div className="flex gap-1">
                                {controls}
                            </div>
                        </div>

                        {loading ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                                {[1, 2, 3, 4].map(i => (
                                    <div key={i} className="bg-slate-800/40 border border-slate-700/50 rounded-2xl p-4 space-y-3">
                                        <div className="flex gap-4">
                                            <Skeleton className="h-16 w-12 bg-slate-700/50 rounded-lg" />
                                            <div className="flex-1 space-y-2">
                                                <Skeleton className="h-4 w-3/4 bg-slate-700/50" />
                                                <Skeleton className="h-3 w-1/2 bg-slate-700/30" />
                                            </div>
                                        </div>
                                        <Skeleton className="h-2 w-full bg-slate-700/30 rounded-full mt-4" />
                                    </div>
                                ))}
                            </div>
                        ) : !data || data.active_sessions.length === 0 ? (
                            <div className="text-slate-400 text-center py-20 bg-slate-800/20 rounded-2xl border-2 border-slate-800/50 border-dashed">
                                <p className="text-lg">{t('dashboard.noStreamsActive')}</p>
                                <p className="text-sm text-slate-500 mt-1">{t('dashboard.activityWillAppear')}</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                                {data.active_sessions.map((session) => (
                                    <SessionCard
                                        key={session.session_id}
                                        session={session}
                                        onUserClick={setSelectedUser}
                                    />
                                ))}
                            </div>
                        )}
                    </section>
                );

            case 'map':
                return (
                    <section className="space-y-6">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-2xl font-bold text-slate-100 px-1 flex items-center gap-3">
                                <span className="w-1.5 h-6 bg-indigo-500 rounded-full"></span>
                                {t('dashboard.liveUserMap')}
                            </h2>
                            <div className="flex gap-1">
                                {controls}
                            </div>
                        </div>
                        <div className="bg-slate-800/40 backdrop-blur-md border border-slate-700/50 p-1 rounded-2xl overflow-hidden shadow-2xl h-[500px]">
                            <LiveMap
                                sessions={data?.active_sessions || []}
                                onUserClick={setSelectedUser}
                                hideControls={isMonochromeView}
                            />
                        </div>
                    </section>
                );

            default:
                return null;
        }
    };

    return (
        <div
            className="min-h-screen bg-slate-900 text-slate-50 selection:bg-cyan-500/30"

        >
            {/* ... (background and header remain same) ... */}
            <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
                <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-cyan-500/10 blur-[120px]"></div>
                <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-indigo-500/10 blur-[120px]"></div>
            </div>

            <div className="relative z-10 container mx-auto px-4 py-8 pb-24 md:pb-8">
                {/* ... Header Code Reused (omitted for brevity in replacement search) ... */}
                <header className="mb-10">
                    <div className="flex justify-between items-center mb-6">
                        <Logo />
                        <div className="flex items-center gap-4">
                            <LanguageSelector />
                            {isDesktop && (
                                <button
                                    onClick={() => setShowMobilePairing(true)}
                                    className="p-2 text-slate-400 hover:text-white hover:bg-slate-800/60 rounded-lg transition-colors"
                                    title={t('pairing.title')}
                                >
                                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
                                    </svg>
                                </button>
                            )}
                            {isLandscapeMobile && (
                                <button
                                    onClick={() => setIsMonochromeView(!isMonochromeView)}
                                    className={`p-2 rounded-lg transition-all ${isMonochromeView ? 'bg-white text-black' : 'bg-slate-800/60 text-slate-400 hover:text-white hover:bg-slate-800'}`}
                                    title={t('dashboard.minimalView')}
                                >
                                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2-2v10a2 2 0 002 2z" />
                                    </svg>
                                </button>
                            )}
                            <button
                                onClick={() => setShowServerListModal(true)}
                                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border transition-all ${loading
                                    ? 'bg-slate-800/50 border-slate-700 text-slate-400'
                                    : error
                                        ? 'bg-red-500/10 border-red-500/30 text-red-400 hover:bg-red-500/20'
                                        : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20'
                                    }`}
                            >
                                <div className={`h-2 w-2 rounded-full ${loading ? 'bg-amber-400 animate-pulse' : error ? 'bg-red-500' : 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]'}`}></div>
                                <span className="text-xs font-bold uppercase tracking-wider">
                                    {loading ? t('common.syncing') : t('common.servers')}
                                </span>
                            </button>
                        </div>

                    </div>

                    <div className="hidden md:flex gap-2 border-b border-slate-700/50">
                        <button
                            onClick={() => setCurrentView('dashboard')}
                            className={`px-4 py-2 text-sm font-medium transition-all ${currentView === 'dashboard'
                                ? 'text-cyan-400 border-b-2 border-cyan-400'
                                : 'text-slate-400 hover:text-white'
                                }`}
                        >
                            {t('nav.dashboard')}
                        </button>
                        <button
                            onClick={() => setCurrentView('statistics')}
                            className={`px-4 py-2 text-sm font-medium transition-all ${currentView === 'statistics'
                                ? 'text-cyan-400 border-b-2 border-cyan-400'
                                : 'text-slate-400 hover:text-white'
                                }`}
                        >
                            {t('nav.statistics')}
                        </button>
                        <button
                            onClick={() => setCurrentView('analytics')}
                            className={`px-4 py-2 text-sm font-medium transition-all ${currentView === 'analytics'
                                ? 'text-cyan-400 border-b-2 border-cyan-400'
                                : 'text-slate-400 hover:text-white'
                                }`}
                        >
                            {t('nav.analytics')}
                        </button>
                        <button
                            onClick={() => setCurrentView('users')}
                            className={`px-4 py-2 text-sm font-medium transition-all ${currentView === 'users'
                                ? 'text-cyan-400 border-b-2 border-cyan-400'
                                : 'text-slate-400 hover:text-white'
                                }`}
                        >
                            {t('nav.users')}
                        </button>
                    </div>
                </header>

                {
                    showAddServer && (
                        <AddServerModal
                            onClose={() => {
                                setShowAddServer(false);
                                setServerToEdit(undefined);
                            }}
                            onSuccess={() => {
                                setTimeout(refetch, 1000);
                            }}
                            serverToEdit={serverToEdit}
                        />
                    )
                }

                {
                    error && currentView === 'dashboard' && (
                        <div className="bg-red-500/10 border border-red-500/20 text-red-200 p-4 rounded-lg mb-8 backdrop-blur-sm">
                            {t('common.error')}: {error}
                        </div>
                    )
                }

                {
                    currentView === 'statistics' ? (
                        <Suspense fallback={
                            <div className="text-center py-20">
                                <div className="inline-block animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-cyan-400"></div>
                                <p className="text-slate-400 mt-4">{t('dashboard.loadingStatistics')}</p>
                            </div>
                        }>
                            <StatisticsPage onAddServer={() => setShowAddServer(true)} />
                        </Suspense>
                    ) : currentView === 'analytics' ? (
                        <Suspense fallback={
                            <div className="text-center py-20">
                                <div className="inline-block animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-cyan-400"></div>
                                <p className="text-slate-400 mt-4">{t('dashboard.loadingAnalytics')}</p>
                            </div>
                        }>
                            <AnalyticsPage onAddServer={() => setShowAddServer(true)} />
                        </Suspense>
                    ) : currentView === 'users' ? (
                        <Suspense fallback={
                            <div className="text-center py-20">
                                <div className="inline-block animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-cyan-400"></div>
                                <p className="text-slate-400 mt-4">{t('dashboard.loadingUsers')}</p>
                            </div>
                        }>
                            <UsersPage onAddServer={() => setShowAddServer(true)} />
                        </Suspense>
                    ) : (
                        <div className="space-y-8">
                            <div className="space-y-10">
                                {sidebarOrder.map((id, index) => {
                                    const isFirst = index === 0;
                                    const isLast = index === sidebarOrder.length - 1;

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
                                        <div key={id} className="h-full">
                                            {renderWidget(id, controls)}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )
                }

                {/* User Details Modal (Global) */}
                {
                    selectedUser && (
                        <UserDetailsModal
                            username={selectedUser}
                            onClose={() => setSelectedUser(null)}
                        />
                    )
                }

                {/* Server List Modal */}
                {
                    showServerListModal && (
                        <ServerListModal
                            onClose={() => setShowServerListModal(false)}
                            onAddServer={() => {
                                setShowServerListModal(false);
                                setServerToEdit(undefined);
                                setShowAddServer(true);
                            }}
                            onEditServer={(server) => {
                                setShowServerListModal(false);
                                setServerToEdit(server);
                                setShowAddServer(true);
                            }}
                        />
                    )
                }

                {/* Mobile Pairing Modal */}
                {
                    showMobilePairing && (
                        <MobilePairingModal onClose={() => setShowMobilePairing(false)} />
                    )
                }

                {/* Mobile Bottom Navigation */}
                <BottomNav
                    currentView={currentView as any}
                    onChange={(view) => {
                        if (view !== 'zen') setCurrentView(view);
                    }}
                />
                <UpdateChecker />
            </div >

            {/* Minimal Landscape View Overlay */}
            {isMonochromeView && (
                <div className="fixed inset-0 z-[100] bg-slate-950 overflow-hidden animate-in fade-in duration-300">
                    {/* Full Screen Map in Original Colors */}
                    <div className="absolute inset-0 z-0">
                        <LiveMap
                            sessions={data?.active_sessions || []}
                            onUserClick={() => { }}
                            hideControls={true}
                            showSessions={showZenSessions}
                            onToggleSessions={setShowZenSessions}
                        />
                    </div>

                    {/* Floating Info Overlay Over Map */}
                    <div className="absolute top-6 left-6 right-6 flex justify-between items-start z-10 pointer-events-none h-full pb-12">
                        <div className="flex gap-8">
                            <div className="flex flex-col items-start pointer-events-auto">
                                <span className="text-slate-400 text-[10px] font-bold uppercase tracking-widest mb-1 drop-shadow-md">{t('dashboard.activeStreams')}</span>
                                <span className="text-5xl font-black text-cyan-400 leading-none drop-shadow-[0_0_10px_rgba(34,211,238,0.5)]">{data?.total_stream_count || 0}</span>
                            </div>
                            <div className="flex flex-col items-start pointer-events-auto">
                                <span className="text-slate-400 text-[10px] font-bold uppercase tracking-widest mb-1 drop-shadow-md">{t('dashboard.bandwidth')}</span>
                                <div className="flex items-baseline gap-1.5">
                                    <span className="text-5xl font-black text-indigo-400 leading-none drop-shadow-[0_0_10px_rgba(129,140,248,0.5)]">
                                        {data ? (data.total_bandwidth / 1000).toFixed(1) : '0'}
                                    </span>
                                    <span className="text-sm font-bold text-slate-500 uppercase tracking-wider drop-shadow-md">Mbps</span>
                                </div>
                            </div>
                        </div>

                        {/* Right Side Sessions "Roulette" */}
                        <div className={`hidden md:flex flex-col w-[350px] h-full relative pointer-events-none overflow-hidden mask-roulette transition-all duration-700 ${showZenSessions ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-20'}`}>
                            <div
                                className="flex flex-col gap-6 py-20 pointer-events-auto animate-roulette"
                                style={{
                                    animationDuration: `${(data?.active_sessions.length || 0) * 4}s`,
                                }}
                            >
                                {/* Duplicate three times to ensure seamless infinite loop */}
                                {[...(data?.active_sessions || []), ...(data?.active_sessions || []), ...(data?.active_sessions || [])].map((session, idx) => (
                                    <div key={`${session.session_id}-${idx}`} className="transition-all duration-500 hover:scale-105 pointer-events-auto">
                                        <SessionCard
                                            session={session}
                                            hideBackground={true}
                                            onUserClick={() => { }}
                                        />
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    <style>{`
                        @keyframes roulette-scroll {
                            0% { transform: translateY(-33.33%); }
                            100% { transform: translateY(0); }
                        }
                        .animate-roulette {
                            animation: roulette-scroll linear infinite;
                        }
                        .animate-roulette:hover {
                            animation-play-state: paused;
                        }
                        .mask-roulette {
                            mask-image: linear-gradient(to bottom, transparent, black 15%, black 85%, transparent);
                            -webkit-mask-image: linear-gradient(to bottom, transparent, black 15%, black 85%, transparent);
                        }
                    `}</style>

                    {/* Floating Close Button for Zen Mode */}
                    <button
                        onClick={() => setIsMonochromeView(false)}
                        className={`fixed top-6 left-1/2 -translate-x-1/2 z-[110] p-3 bg-black/40 backdrop-blur-md border border-white/10 rounded-full text-white/50 hover:text-white hover:bg-black/60 transition-all duration-500 transform pointer-events-auto ${showZenControls ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-4 pointer-events-none'}`}
                        title="Exit Zen Mode (ESC)"
                    >
                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>
            )}
            <UpdateChecker />
        </div>
    );
}

function AppWrapper() {
    return (
        <QueryClientProvider client={queryClient}>
            <ToastProvider>
                <AuthProvider>
                    <AppContent />
                </AuthProvider>
            </ToastProvider>
        </QueryClientProvider>
    );
}

export default AppWrapper;


