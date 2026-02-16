import { useState, lazy, Suspense } from 'react';
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
        try {
            const saved = localStorage.getItem('dashboardOrder'); // Renamed key for new layout
            return saved ? JSON.parse(saved) : ['metrics', 'sessions', 'map'];
        } catch {
            return ['metrics', 'sessions', 'map'];
        }
    });

    const moveSection = (index: number, direction: 'up' | 'down') => {
        const newOrder = [...sidebarOrder];
        const targetIndex = direction === 'up' ? index - 1 : index + 1;

        if (targetIndex >= 0 && targetIndex < newOrder.length) {
            [newOrder[index], newOrder[targetIndex]] = [newOrder[targetIndex], newOrder[index]];
            setSidebarOrder(newOrder);
            localStorage.setItem('dashboardOrder', JSON.stringify(newOrder));
        }
    };



    // No authentication needed - single user mode
    const { data, loading, error, refetch } = usePlexNetwork();

    // Widget Renderers
    const renderWidget = (id: string, controls: React.ReactNode) => {
        switch (id) {
            case 'metrics':
                return (
                    <section className="space-y-4">
                        <div className="bg-slate-800/40 backdrop-blur-md border border-slate-700/50 p-4 sm:p-5 rounded-2xl overflow-hidden hover:bg-slate-800/60 transition-colors relative">
                            <div className="absolute top-4 right-4 flex gap-1 z-10">
                                {controls}
                            </div>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-y-4 gap-x-2 sm:gap-8">
                                <div>
                                    <h3 className="text-slate-400 text-[10px] sm:text-xs font-bold uppercase tracking-widest mb-1">{t('dashboard.activeStreams')}</h3>
                                    <div className="text-2xl sm:text-3xl font-black text-cyan-400 leading-none">
                                        {data?.total_stream_count || 0}
                                    </div>
                                </div>
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
                            <button
                                onClick={() => setShowMobilePairing(true)}
                                className="hidden md:block p-2 text-slate-400 hover:text-white hover:bg-slate-800/60 rounded-lg transition-colors"
                                title={t('pairing.title')}
                            >
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
                                </svg>
                            </button>
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
                            <StatisticsPage />
                        </Suspense>
                    ) : currentView === 'analytics' ? (
                        <Suspense fallback={
                            <div className="text-center py-20">
                                <div className="inline-block animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-cyan-400"></div>
                                <p className="text-slate-400 mt-4">{t('dashboard.loadingAnalytics')}</p>
                            </div>
                        }>
                            <AnalyticsPage />
                        </Suspense>
                    ) : currentView === 'users' ? (
                        <Suspense fallback={
                            <div className="text-center py-20">
                                <div className="inline-block animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-cyan-400"></div>
                                <p className="text-slate-400 mt-4">{t('dashboard.loadingUsers')}</p>
                            </div>
                        }>
                            <UsersPage />
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
        </div >
    )
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


