
import React, { createContext, useContext, useEffect, useState } from 'react';
import { authApi } from '../api/client';

interface AuthStatus {
    setupRequired: boolean;
    isLocal: boolean;
    authenticated: boolean;
}

interface AuthContextType {
    status: AuthStatus | null;
    loading: boolean;
    login: (password: string) => Promise<void>;
    setup: (password: string) => Promise<void>;
    logout: () => void;
    checkStatus: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
    const [status, setStatus] = useState<AuthStatus | null>(null);
    const [loading, setLoading] = useState(true);

    const checkStatus = async () => {
        try {
            const { data } = await authApi.getStatus();
            setStatus(data);
        } catch (err) {
            console.error('Failed to check auth status', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        checkStatus();
    }, []);

    const login = async (password: string) => {
        const { data } = await authApi.login(password);
        localStorage.setItem('plix_auth_token', data.token);
        await checkStatus();
    };

    const setup = async (password: string) => {
        const { data } = await authApi.setup(password);
        localStorage.setItem('plix_auth_token', data.token);
        await checkStatus();
    };

    const logout = () => {
        localStorage.removeItem('plix_auth_token');
        authApi.logout().catch(() => { }); // Fire and forget
        checkStatus(); // Should return unauthenticated (unless local)
    };

    return (
        <AuthContext.Provider value={{ status, loading, login, setup, logout, checkStatus }}>
            {children}
        </AuthContext.Provider>
    );
};
