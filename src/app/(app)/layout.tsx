'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Sidebar from '@/components/Sidebar';

import { useAuth } from '@/hooks/AuthContext';
import { useRotinaAutomation } from '@/hooks/useRotinaAutomation';

export default function AppLayout({ children }: { children: React.ReactNode }) {
    const router = useRouter();
    const { authenticated, loading } = useAuth();
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);

    // Inicializa automação de rotinas
    useRotinaAutomation();

    useEffect(() => {
        if (!loading && !authenticated) {
            router.replace('/login');
        }
    }, [loading, authenticated, router]);

    // Fecha a sidebar ao mudar de rota em dispositivos móveis
    useEffect(() => {
        setIsSidebarOpen(false);
    }, [router]);

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
            <button 
                className="mobile-menu-toggle" 
                onClick={() => setIsSidebarOpen(true)}
                aria-label="Abrir menu"
            >
                ☰
            </button>
            <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
            <div className="main-content">{children}</div>
        </div>
    );
}
