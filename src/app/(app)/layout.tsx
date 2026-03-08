'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Sidebar from '@/components/Sidebar';

import { useAuth } from '@/hooks/AuthContext';

export default function AppLayout({ children }: { children: React.ReactNode }) {
    const router = useRouter();
    const { authenticated, loading } = useAuth();

    useEffect(() => {
        if (!loading && !authenticated) {
            router.replace('/login');
        }
    }, [loading, authenticated, router]);

    if (loading) {
        return (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: 'var(--bg-primary)' }}>
                <div style={{ color: 'var(--text-secondary)' }}>⏳ Carregando sistema...</div>
            </div>
        );
    }

    if (!authenticated) return null;

    return (
        <div className="app-layout">
            <Sidebar />
            <div className="main-content">{children}</div>
        </div>
    );
}
