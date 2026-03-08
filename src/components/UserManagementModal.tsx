'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/AuthContext';

interface Props {
    onClose: () => void;
}

export default function UserManagementModal({ onClose }: Props) {
    const { users, addUser, deleteUser, updateAdminPin, isAdmin } = useAuth();
    const [nome, setNome] = useState('');
    const [cargo, setCargo] = useState('');
    const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

    const [newPin, setNewPin] = useState('');
    const [pinSuccess, setPinSuccess] = useState(false);

    if (!isAdmin) return null;

    const handleAdd = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!nome.trim()) return;
        await addUser(nome, cargo);
        setNome('');
        setCargo('');
    };

    const handleUpdatePin = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newPin.trim()) return;
        await updateAdminPin(newPin);
        setNewPin('');
        setPinSuccess(true);
        setTimeout(() => setPinSuccess(false), 3000);
    };

    const adminUser = users.find(u => u.role === 'admin');

    return (
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
            <div className="modal" style={{ maxWidth: '600px' }}>
                <div className="modal-header">
                    <h2 className="modal-title">👥 Gerenciar Usuários</h2>
                    <button className="modal-close" onClick={onClose}>✕</button>
                </div>

                <div className="modal-body">
                    {/* Configuração do Admin (PIN) */}
                    <div style={{ 
                        background: 'rgba(99,102,241,0.05)', 
                        padding: '16px', 
                        borderRadius: '12px', 
                        marginBottom: '24px',
                        border: '1px solid rgba(99,102,241,0.2)'
                    }}>
                        <h3 style={{ fontSize: '14px', marginBottom: '12px', fontWeight: 600, color: 'var(--accent-purple)' }}>🔑 Segurança do Administrador</h3>
                        <form onSubmit={handleUpdatePin} style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '10px', alignItems: 'flex-end' }}>
                            <div className="form-group" style={{ marginBottom: 0 }}>
                                <label className="form-label" style={{ fontSize: '11px' }}>
                                    Novo PIN de Recuperação (Atual: <strong>{adminUser?.pin || '1234'}</strong>)
                                </label>
                                <input 
                                    className="form-input" 
                                    type="password"
                                    placeholder="Digite o novo PIN"
                                    value={newPin}
                                    onChange={e => setNewPin(e.target.value)}
                                    required
                                />
                            </div>
                            <button type="submit" className="btn btn-primary" style={{ padding: '0 16px', height: '38px', background: 'var(--accent-purple)' }}>
                                Atualizar PIN
                            </button>
                        </form>
                        {pinSuccess && (
                            <p style={{ fontSize: '11px', color: '#10b981', marginTop: '8px', fontWeight: 500 }}>
                                ✓ PIN atualizado com sucesso!
                            </p>
                        )}
                    </div>

                    {/* Formulário Novo Usuário */}
                    <div style={{ 
                        background: 'var(--bg-secondary)', 
                        padding: '16px', 
                        borderRadius: '12px', 
                        marginBottom: '24px',
                        border: '1px solid var(--border)'
                    }}>
                        <h3 style={{ fontSize: '14px', marginBottom: '12px', fontWeight: 600 }}>➕ Cadastrar Novo Usuário</h3>
                        <form onSubmit={handleAdd} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: '10px', alignItems: 'flex-end' }}>
                            <div className="form-group" style={{ marginBottom: 0 }}>
                                <label className="form-label" style={{ fontSize: '11px' }}>Nome</label>
                                <input 
                                    className="form-input" 
                                    placeholder="Nome do usuário"
                                    value={nome}
                                    onChange={e => setNome(e.target.value)}
                                    required
                                />
                            </div>
                            <div className="form-group" style={{ marginBottom: 0 }}>
                                <label className="form-label" style={{ fontSize: '11px' }}>Cargo</label>
                                <input 
                                    className="form-input" 
                                    placeholder="Ex: Analista"
                                    value={cargo}
                                    onChange={e => setCargo(e.target.value)}
                                />
                            </div>
                            <button type="submit" className="btn btn-primary" style={{ padding: '0 16px', height: '38px' }}>
                                Adicionar
                            </button>
                        </form>
                    </div>

                    {/* Lista de Usuários */}
                    <h3 style={{ fontSize: '14px', marginBottom: '12px', fontWeight: 600 }}>👤 Usuários Ativos</h3>
                    <div className="table-wrapper" style={{ maxHeight: '250px', overflowY: 'auto' }}>
                        <table>
                            <thead>
                                <tr>
                                    <th>Nome</th>
                                    <th>Cargo</th>
                                    <th>Acesso</th>
                                    <th style={{ textAlign: 'right' }}>Ação</th>
                                </tr>
                            </thead>
                            <tbody>
                                {users.map(u => {
                                    const isOnline = u.lastSeen && (new Date().getTime() - new Date(u.lastSeen).getTime() < 60000);
                                    return (
                                        <tr key={u.id}>
                                            <td>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                    <div style={{ 
                                                        width: '8px', 
                                                        height: '8px', 
                                                        borderRadius: '50%', 
                                                        background: isOnline ? '#10b981' : '#edeff2',
                                                        boxShadow: isOnline ? '0 0 8px rgba(16,185,129,0.5)' : 'none'
                                                    }} />
                                                    <div style={{ fontWeight: 500 }}>{u.nome}</div>
                                                </div>
                                                {u.isFirstLogin && (
                                                    <span style={{ fontSize: '9px', background: 'var(--accent-yellow)20', color: 'var(--accent-yellow)', padding: '1px 4px', borderRadius: '4px' }}>
                                                        Novo
                                                    </span>
                                                )}
                                            </td>
                                            <td>{u.cargo || '—'}</td>
                                            <td>
                                                <span className={`badge badge-${u.role === 'admin' ? 'triagem' : 'em_execucao'}`} style={{ fontSize: '10px' }}>
                                                    {u.role === 'admin' ? 'Admin' : 'Usuário'}
                                                </span>
                                            </td>
                                            <td style={{ textAlign: 'right' }}>
                                                {u.role === 'admin' ? (
                                                    <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Admin Fixo</span>
                                                ) : confirmDelete === u.id ? (
                                                    <div style={{ display: 'flex', gap: '4px', justifyContent: 'flex-end' }}>
                                                        <button className="btn btn-danger btn-sm" onClick={async () => { await deleteUser(u.id); setConfirmDelete(null); }}>✓</button>
                                                        <button className="btn btn-secondary btn-sm" onClick={() => setConfirmDelete(null)}>✕</button>
                                                    </div>
                                                ) : (
                                                    <button 
                                                        className="btn btn-danger btn-sm" 
                                                        onClick={() => setConfirmDelete(u.id)}
                                                    >
                                                        🗑️
                                                    </button>
                                                )}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>

                <div className="modal-footer">
                    <button className="btn btn-secondary" onClick={onClose}>Fechar</button>
                </div>
            </div>
        </div>
    );
}
