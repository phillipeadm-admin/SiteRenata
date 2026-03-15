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
    { icon: '📈', label: 'Gestão/Controle', href: '/relatorios' },
    { icon: '📁', label: 'Arquivo', href: '/arquivo' },
];

interface SidebarProps {
    isOpen?: boolean;
    onClose?: () => void;
}

export default function Sidebar({ isOpen, onClose }: SidebarProps) {
    const pathname = usePathname();
    const router = useRouter();
    const { user, users, logout, isAdmin } = useAuth();
    const [showUserModal, setShowUserModal] = useState(false);

    const handleLogout = () => {
        logout();
        router.replace('/login');
    };

    const onlineUsers = isAdmin ? users.filter(u => {
        if (!u.lastSeen) return false;
        // Considera online se o heartbeat ocorreu nos últimos 90 segundos
        const diff = new Date().getTime() - new Date(u.lastSeen).getTime();
        return diff < 90000;
    }) : [];

    return (
        <>
            <div className={`sidebar-overlay ${isOpen ? 'show' : ''}`} onClick={onClose} />
            <aside className={`sidebar ${isOpen ? 'show' : ''}`}>
                <div className="sidebar-header">
                    <div className="sidebar-logo">
                        <div className="sidebar-logo-icon">⚡</div>
                        <div style={{ flex: 1 }}>
                            <div className="sidebar-logo-text">GestãoPro</div>
                            <div className="sidebar-logo-sub">Controle de Processos</div>
                        </div>
                        <button className="mobile-close-btn" onClick={onClose}>✕</button>
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
                    <span className="nav-label">Incluir</span>
                </Link>

                <div className="nav-section-label" style={{ marginTop: '8px' }}>Menu Principal</div>
                {navItems.map((item) => (
                    <Link
                        key={item.href}
                        href={item.href}
                        className={`nav-link ${pathname === item.href || pathname.startsWith(item.href) ? 'active' : ''}`}
                    >
                        <span className="nav-icon">{item.icon}</span>
                        <span className="nav-label">{item.label}</span>
                    </Link>
                ))}
            </nav>

            <div className="sidebar-footer" style={{ padding: '20px 16px' }}>
                {isAdmin && (
                    <>
                        <div className="nav-section-label" style={{ marginBottom: '8px', color: 'var(--text-secondary)' }}>👥 Online ({onlineUsers.length})</div>
                        <div style={{ marginBottom: '16px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                            {onlineUsers.length === 0 ? (
                                <div style={{ fontSize: '10px', color: 'var(--text-muted)', paddingLeft: '8px' }}>Nenhum outro usuário</div>
                            ) : (
                                onlineUsers.map(u => (
                                    <div key={u.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '4px 8px', borderRadius: '6px', background: 'rgba(99,102,241,0.03)' }}>
                                        <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#10b981', boxShadow: '0 0 6px rgba(16,185,129,0.4)' }} />
                                        <span style={{ fontSize: '11px', color: 'var(--text-primary)', fontWeight: 500 }}>{u.nome}</span>
                                    </div>
                                ))
                            )}
                        </div>

                        <button 
                            className="nav-link"
                            style={{ width: '100%', marginBottom: '12px', border: '1px solid var(--border)', background: 'rgba(99,102,241,0.05)', color: 'var(--accent-purple)' }}
                            onClick={() => setShowUserModal(true)}
                        >
                            <span className="nav-icon">👤</span>
                            <span className="nav-label">Gerenciar Sistema</span>
                        </button>
                    </>
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
                    <span className="nav-label">Sair</span>
                </button>
                <div style={{ fontSize: '10px', color: 'var(--text-muted)', textAlign: 'center' }}>
                    © 2026 — Gestão Pessoal
                </div>
            </div>

            {showUserModal && (
                <UserManagementModal onClose={() => setShowUserModal(false)} />
            )}
        </aside>
        </>
    );
}
