'use client';

import React, { createContext, useContext } from 'react';
import { useAuth as useAuthHook } from './useAuth';
import { Usuario } from '@/lib/types';

interface AuthContextType {
    user: Usuario | null;
    users: Usuario[];
    authenticated: boolean;
    isAdmin: boolean;
    loading: boolean;
    login: (nome: string, password: string) => Promise<{ success: boolean, mustChange: boolean }>;
    logout: () => Promise<void>;
    addUser: (nome: string, cargo: string) => Promise<void>;
    deleteUser: (id: string) => Promise<void>;
    changePassword: (newPassword: string) => Promise<void>;
    verifyAdminPin: (pinInput: string) => Promise<boolean>;
    resetAdminPassword: (newPassword: string) => Promise<void>;
    updateAdminPin: (newPin: string) => Promise<void>;
    refresh: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const auth = useAuthHook();
    return (
        <AuthContext.Provider value={auth}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}
