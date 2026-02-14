import React from 'react';
import { useTranslation } from 'react-i18next';

interface BottomNavProps {
    currentView: 'dashboard' | 'statistics' | 'zen' | 'users' | 'analytics';
    onChange: (view: 'dashboard' | 'statistics' | 'zen' | 'users' | 'analytics') => void;
}

export const BottomNav: React.FC<BottomNavProps> = ({ currentView, onChange }) => {
    const { t } = useTranslation();

    return (
        <div className="fixed bottom-0 left-0 right-0 z-50 bg-slate-900/90 backdrop-blur-lg border-t border-slate-700/50 pb-safe md:hidden">
            <div className="flex justify-around items-center h-16">
                <button
                    onClick={() => onChange('dashboard')}
                    className={`flex flex-col items-center justify-center w-full h-full space-y-1 ${currentView === 'dashboard' ? 'text-cyan-400' : 'text-slate-500'}`}
                >
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                    </svg>
                    <span className="text-[10px] font-medium">{t('nav.dashboard')}</span>
                </button>

                <button
                    onClick={() => onChange('statistics')}
                    className={`flex flex-col items-center justify-center w-full h-full space-y-1 ${currentView === 'statistics' ? 'text-cyan-400' : 'text-slate-500'}`}
                >
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                    <span className="text-[10px] font-medium">{t('nav.stats')}</span>
                </button>

                <button
                    onClick={() => onChange('analytics')}
                    className={`flex flex-col items-center justify-center w-full h-full space-y-1 ${currentView === 'analytics' ? 'text-cyan-400' : 'text-slate-500'}`}
                >
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
                    </svg>
                    <span className="text-[10px] font-medium">{t('nav.analytics')}</span>
                </button>

                <button
                    onClick={() => onChange('users')}
                    className={`flex flex-col items-center justify-center w-full h-full space-y-1 ${currentView === 'users' ? 'text-cyan-400' : 'text-slate-500'}`}
                >
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                    </svg>
                    <span className="text-[10px] font-medium">{t('nav.users')}</span>
                </button>
            </div>
        </div>
    );
};
