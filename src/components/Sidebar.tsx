'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/AuthContext';
import UserManagementModal from './UserManagementModal';

const navItems = [
    { icon: '📁', label: 'Processos', href: '/processos' },
    { icon: '🔄', label: 'Rotinas', href: '/rotinas' },
    { icon: '📋', label: 'Kanban', href: '/kanban' },
    { icon: '📊', label: 'Dashboard', href: '/dashboard' },
    { icon: '📈', label: 'Relatórios', href: '/relatorios' },
];

export default function Sidebar() {
    const pathname = usePathname();
    const router = useRouter();
    const { user, logout, isAdmin } = useAuth();
    const [showUserModal, setShowUserModal] = useState(false);

    const handleLogout = () => {
        logout();
        router.replace('/login');
    };

    return (
        <aside className="sidebar">
            <div className="sidebar-header">
                <div className="sidebar-logo">
                    <div className="sidebar-logo-icon">⚡</div>
                    <div>
                        <div className="sidebar-logo-text">GestãoPro</div>
                        <div className="sidebar-logo-sub">Controle de Processos</div>
                    </div>
                </div>
            </div>

            <nav className="sidebar-nav">
                {/* Botão INCLUIR destacado */}
                <div className="nav-section-label">Cadastros</div>
                <Link
                    href="/cadastros"
                    className={`nav-link nav-link-incluir ${pathname.startsWith('/cadastros') ? 'active' : ''}`}
                >
                    <span className="nav-icon">➕</span>
                    Incluir
                </Link>

                <div className="nav-section-label" style={{ marginTop: '8px' }}>Menu Principal</div>
                {navItems.map((item) => (
                    <Link
                        key={item.href}
                        href={item.href}
                        className={`nav-link ${pathname === item.href || pathname.startsWith(item.href) ? 'active' : ''}`}
                    >
                        <span className="nav-icon">{item.icon}</span>
                        {item.label}
                    </Link>
                ))}
            </nav>

            <div className="sidebar-footer" style={{ padding: '20px 16px' }}>
                {isAdmin && (
                    <button 
                        className="nav-link"
                        style={{ width: '100%', marginBottom: '12px', border: '1px solid var(--border)', background: 'rgba(99,102,241,0.05)', color: 'var(--accent-purple)' }}
                        onClick={() => setShowUserModal(true)}
                    >
                        <span className="nav-icon">👤</span>
                        Cadastrar Usuário
                    </button>
                )}

                <div style={{
                    padding: '8px 12px',
                    borderRadius: '8px',
                    background: 'var(--bg-secondary)',
                    border: '1px solid var(--border)',
                    marginBottom: '12px'
                }}>
                    <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Logado como:</div>
                    <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {user?.nome}
                    </div>
                    <div style={{ fontSize: '9px', color: 'var(--accent-blue)' }}>{user?.cargo || (isAdmin ? 'Administrador' : 'Usuário')}</div>
                </div>

                <button
                    onClick={handleLogout}
                    className="nav-link"
                    style={{ width: '100%', color: 'var(--accent-red)', marginBottom: '8px' }}
                    title="Encerrar sessão"
                >
                    <span className="nav-icon">🚪</span>
                    Sair
                </button>
                <div style={{ fontSize: '10px', color: 'var(--text-muted)', textAlign: 'center' }}>
                    © 2026 — Gestão Pessoal
                </div>
            </div>

            {showUserModal && (
                <UserManagementModal onClose={() => setShowUserModal(false)} />
            )}
        </aside>
    );
}
