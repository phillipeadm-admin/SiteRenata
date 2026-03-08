'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/AuthContext';

type View = 'login' | 'recovery' | 'change_password' | 'force_change' | 'reset_admin';

export default function LoginPage() {
    const router = useRouter();
    const { authenticated, user, loading, login, changePassword, verifyAdminPin, resetAdminPassword } = useAuth();

    const [view, setView] = useState<View>('login');

    // Form states
    const [nome, setNome] = useState('');
    const [password, setPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [pinInput, setPinInput] = useState('');

    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [showNew, setShowNew] = useState(false);

    useEffect(() => {
        if (!loading) {
            if (authenticated) {
                if (user?.isFirstLogin) {
                    setView('force_change');
                } else {
                    router.replace('/processos');
                }
            } else {
                setView('login');
            }
        }
    }, [loading, authenticated, user, router]);

    if (loading) {
        return (
            <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-primary)' }}>
                <div style={{ color: 'var(--text-secondary)', fontSize: '18px' }}>⏳ Carregando...</div>
            </div>
        );
    }

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        if (!nome.trim()) { setError('Digite seu nome de usuário.'); return; }
        const { success, mustChange } = await login(nome, password);
        if (success) {
            if (mustChange) {
                setView('force_change');
            } else {
                router.replace('/processos');
            }
        } else {
            setError('Usuário ou senha incorretos.');
            setPassword('');
        }
    };

    const handleForceChange = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        if (newPassword.length < 4) { setError('A senha deve ter ao menos 4 caracteres.'); return; }
        if (newPassword === '0000') { setError('Escolha uma senha diferente da padrão.'); return; }
        if (newPassword !== confirmPassword) { setError('As senhas não coincidem.'); return; }
        
        await changePassword(newPassword);
        setSuccess('Senha cadastrada! Redirecionando...');
        setTimeout(() => {
            router.replace('/processos');
        }, 1500);
    };

    const handleChangePassword = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        if (newPassword.length < 4) { setError('A senha deve ter ao menos 4 caracteres.'); return; }
        if (newPassword !== confirmPassword) { setError('As senhas não coincidem.'); return; }
        await changePassword(newPassword);
        setSuccess('Senha alterada com sucesso!');
        setNewPassword('');
        setConfirmPassword('');
        setTimeout(() => {
            setSuccess('');
            setView('login');
        }, 1800);
    };

    const handleVerifyPin = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        const isValid = await verifyAdminPin(pinInput);
        if (isValid) {
            setView('reset_admin');
            setPinInput('');
        } else {
            setError('PIN incorreto.');
        }
    };

    const handleResetAdmin = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        if (newPassword.length < 4) { setError('Mínimo 4 caracteres.'); return; }
        if (newPassword !== confirmPassword) { setError('Senhas não coincidem.'); return; }
        await resetAdminPassword(newPassword);
        setSuccess('Senha do Administrador redefinida!');
        setTimeout(() => {
            setSuccess('');
            setView('login');
        }, 2000);
    };

    return (
        <div style={{
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'var(--bg-primary)',
            position: 'relative',
            overflow: 'hidden',
        }}>
            {/* Background decorativo */}
            <div style={{
                position: 'absolute',
                inset: 0,
                background: 'radial-gradient(ellipse at 30% 30%, rgba(99,102,241,0.12) 0%, transparent 60%), radial-gradient(ellipse at 70% 70%, rgba(59,130,246,0.08) 0%, transparent 60%)',
                pointerEvents: 'none',
            }} />

            <div style={{
                width: '100%',
                maxWidth: '440px',
                padding: '0 20px',
                position: 'relative',
                zIndex: 1,
            }}>
                {/* Logo */}
                <div style={{ textAlign: 'center', marginBottom: '40px' }}>
                    <div style={{
                        width: '64px',
                        height: '64px',
                        background: 'linear-gradient(135deg, var(--accent-purple), var(--accent-blue))',
                        borderRadius: '18px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '28px',
                        margin: '0 auto 16px',
                        boxShadow: '0 0 40px rgba(99,102,241,0.4)',
                    }}>⚡</div>
                    <div style={{ fontFamily: 'Outfit, sans-serif', fontSize: '26px', fontWeight: 700, color: 'var(--text-primary)' }}>
                        GestãoPro
                    </div>
                </div>

                {/* Card */}
                <div style={{
                    background: 'var(--bg-card)',
                    border: '1px solid var(--border)',
                    borderRadius: '20px',
                    padding: '36px 32px',
                    boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
                }}>

                    {/* ===== VIEW: FORCE PASSWORD CHANGE ===== */}
                    {view === 'force_change' && (
                        <>
                            <h2 style={{ fontFamily: 'Outfit, sans-serif', fontSize: '20px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '6px' }}>
                                🔒 Primeiro Acesso
                            </h2>
                            <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '24px' }}>
                                Olá <strong>{user?.nome}</strong>! Por segurança, cadastre uma nova senha para continuar.
                            </p>
                            <form onSubmit={handleForceChange} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                <div className="form-group">
                                    <label className="form-label">Nova Senha</label>
                                    <div style={{ position: 'relative' }}>
                                        <input
                                            className="form-input"
                                            type={showNew ? 'text' : 'password'}
                                            placeholder="Mínimo 4 caracteres"
                                            value={newPassword}
                                            onChange={e => setNewPassword(e.target.value)}
                                            required
                                            autoFocus
                                        />
                                        <button type="button" onClick={() => setShowNew(v => !v)} style={eyeBtn}>{showNew ? '🙈' : '👁️'}</button>
                                    </div>
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Confirmar Senha</label>
                                    <input
                                        className="form-input"
                                        type={showNew ? 'text' : 'password'}
                                        placeholder="Repita a senha"
                                        value={confirmPassword}
                                        onChange={e => setConfirmPassword(e.target.value)}
                                        required
                                    />
                                </div>
                                {error && <div style={errorStyle}>{error}</div>}
                                {success && <div style={successStyle}>{success}</div>}
                                <button type="submit" className="btn btn-primary" style={{ marginTop: '4px', justifyContent: 'center' }} disabled={!!success}>
                                    ✅ Salvar e Acessar
                                </button>
                            </form>
                        </>
                    )}

                    {/* ===== VIEW: LOGIN ===== */}
                    {view === 'login' && (
                        <>
                            <h2 style={{ fontFamily: 'Outfit, sans-serif', fontSize: '20px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '6px' }}>
                                Bem-vindo 👋
                            </h2>
                            <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '24px' }}>
                                Identifique-se para acessar o sistema.
                            </p>
                            <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                <div className="form-group">
                                    <label className="form-label">Usuário (Nome)</label>
                                    <input
                                        className="form-input"
                                        placeholder="Seu nome cadastrado"
                                        value={nome}
                                        onChange={e => setNome(e.target.value)}
                                        required
                                        autoFocus
                                    />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Senha</label>
                                    <div style={{ position: 'relative' }}>
                                        <input
                                            className="form-input"
                                            type={showPassword ? 'text' : 'password'}
                                            placeholder="Sua senha..."
                                            value={password}
                                            onChange={e => setPassword(e.target.value)}
                                            required
                                        />
                                        <button type="button" onClick={() => setShowPassword(v => !v)} style={eyeBtn}>
                                            {showPassword ? '🙈' : '👁️'}
                                        </button>
                                    </div>
                                </div>
                                {error && <div style={errorStyle}>{error}</div>}
                                <button type="submit" className="btn btn-primary" style={{ justifyContent: 'center' }}>
                                    🔓 Entrar
                                </button>
                                <button 
                                    type="button" 
                                    className="btn btn-secondary btn-sm"
                                    onClick={() => setView('recovery')}
                                    style={{ border: 'none', background: 'none', color: 'var(--text-muted)', textDecoration: 'underline' }}
                                >
                                    Esqueci a senha (Admin)
                                </button>
                                <div style={{ fontSize: '11px', color: 'var(--text-muted)', textAlign: 'center', marginTop: '4px' }}>
                                    Ainda não tem acesso? Contate o administrador.
                                </div>
                            </form>
                        </>
                    )}

                    {/* ===== VIEW: RECOVERY (PIN) ===== */}
                    {view === 'recovery' && (
                        <>
                            <h2 style={{ fontFamily: 'Outfit, sans-serif', fontSize: '20px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '6px' }}>
                                🔑 Recuperar Admin
                            </h2>
                            <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '24px' }}>
                                Digite o PIN do administrador para redefinir a senha.
                            </p>
                            <form onSubmit={handleVerifyPin} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                <div className="form-group">
                                    <label className="form-label">PIN Administrativo</label>
                                    <input
                                        className="form-input"
                                        type="password"
                                        placeholder="Digite o PIN"
                                        value={pinInput}
                                        onChange={e => setPinInput(e.target.value)}
                                        required
                                        autoFocus
                                    />
                                </div>
                                {error && <div style={errorStyle}>{error}</div>}
                                <button type="submit" className="btn btn-primary" style={{ justifyContent: 'center' }}>
                                    ✓ Verificar PIN
                                </button>
                                <button type="button" className="btn btn-secondary" onClick={() => setView('login')}>Voltar</button>
                            </form>
                        </>
                    )}

                    {/* ===== VIEW: RESET ADMIN PASSWORD ===== */}
                    {view === 'reset_admin' && (
                        <>
                            <h2 style={{ fontFamily: 'Outfit, sans-serif', fontSize: '20px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '6px' }}>
                                🔒 Nova Senha Admin
                            </h2>
                            <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '24px' }}>
                                PIN verificado. Defina a nova senha do Administrador.
                            </p>
                            <form onSubmit={handleResetAdmin} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                <div className="form-group">
                                    <label className="form-label">Nova Senha</label>
                                    <input
                                        className="form-input"
                                        type="password"
                                        value={newPassword}
                                        onChange={e => setNewPassword(e.target.value)}
                                        required
                                        autoFocus
                                    />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Confirmar Senha</label>
                                    <input
                                        className="form-input"
                                        type="password"
                                        value={confirmPassword}
                                        onChange={e => setConfirmPassword(e.target.value)}
                                        required
                                    />
                                </div>
                                {error && <div style={errorStyle}>{error}</div>}
                                {success && <div style={successStyle}>{success}</div>}
                                <button type="submit" className="btn btn-primary" style={{ justifyContent: 'center' }}>
                                    💾 Salvar Nova Senha
                                </button>
                                <button type="button" className="btn btn-secondary" onClick={() => setView('login')}>Cancelar</button>
                            </form>
                        </>
                    )}

                    {/* ===== VIEW: CHANGE PASSWORD ===== */}
                    {view === 'change_password' && (
                        <>
                            <h2 style={{ fontFamily: 'Outfit, sans-serif', fontSize: '20px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '6px' }}>
                                🔒 Alterar Senha
                            </h2>
                            <form onSubmit={handleChangePassword} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                <div className="form-group">
                                    <label className="form-label">Nova Senha</label>
                                    <div style={{ position: 'relative' }}>
                                        <input
                                            className="form-input"
                                            type={showNew ? 'text' : 'password'}
                                            placeholder="Mínimo 4 caracteres"
                                            value={newPassword}
                                            onChange={e => setNewPassword(e.target.value)}
                                            required
                                            autoFocus
                                        />
                                        <button type="button" onClick={() => setShowNew(v => !v)} style={eyeBtn}>{showNew ? '🙈' : '👁️'}</button>
                                    </div>
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Confirmar Nova Senha</label>
                                    <input
                                        className="form-input"
                                        type={showNew ? 'text' : 'password'}
                                        placeholder="Repita a nova senha"
                                        value={confirmPassword}
                                        onChange={e => setConfirmPassword(e.target.value)}
                                        required
                                    />
                                </div>
                                {error && <div style={errorStyle}>{error}</div>}
                                {success && <div style={successStyle}>{success}</div>}
                                <button type="submit" className="btn btn-primary" style={{ justifyContent: 'center' }} disabled={!!success}>
                                    💾 Salvar Nova Senha
                                </button>
                                <button type="button" className="btn btn-secondary" onClick={() => setView('login')}>Voltar</button>
                            </form>
                        </>
                    )}
                </div>

                <p style={{ textAlign: 'center', marginTop: '20px', fontSize: '11px', color: 'var(--text-muted)' }}>
                    © 2026 — Gestão Pessoal · Acesso Seguro
                </p>
            </div>
        </div>
    );
}

const eyeBtn: React.CSSProperties = {
    position: 'absolute',
    right: '10px',
    top: '50%',
    transform: 'translateY(-50%)',
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    fontSize: '16px',
    padding: '4px',
    lineHeight: 1,
};

const errorStyle: React.CSSProperties = {
    background: 'rgba(239,68,68,0.12)',
    border: '1px solid rgba(239,68,68,0.3)',
    borderRadius: '10px',
    padding: '10px 14px',
    fontSize: '13px',
    color: '#f87171',
};

const successStyle: React.CSSProperties = {
    background: 'rgba(16,185,129,0.12)',
    border: '1px solid rgba(16,185,129,0.3)',
    borderRadius: '10px',
    padding: '10px 14px',
    fontSize: '13px',
    color: '#34d399',
};
