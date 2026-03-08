'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { Usuario } from '@/lib/types';

const SESSION_KEY = 'renata_session_v1';

export function useAuth() {
    const [user, setUser] = useState<Usuario | null>(null);
    const [users, setUsers] = useState<Usuario[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchUsers = useCallback(async () => {
        try {
            const { data, error } = await supabase
                .from('renata_usuarios')
                .select('*')
                .order('nome');
            
            if (error) {
                console.error('Erro ao buscar usuários:', error);
                return;
            }

            if (data) {
                // Map database fields to interface fields
                const mapped = data.map((u: any) => ({
                    ...u,
                    isFirstLogin: u.isfirstlogin,
                    lastSeen: u.lastseen
                })) as Usuario[];
                setUsers(mapped);
            }
        } catch (err) {
            console.error('Falha crítica ao buscar usuários:', err);
        }
    }, []);

    const initialize = useCallback(async () => {
        setLoading(true);
        
        // 1. Busca todos os usuários
        await fetchUsers();

        // 2. Verifica sessão
        const rawSession = sessionStorage.getItem(SESSION_KEY);
        if (rawSession) {
            try {
                const { userId } = JSON.parse(rawSession);
                const { data, error } = await supabase
                    .from('renata_usuarios')
                    .select('*')
                    .eq('id', userId)
                    .single();
                
                if (data && !error) {
                    setUser({
                        ...data,
                        isFirstLogin: data.isfirstlogin,
                        lastSeen: data.lastseen
                    } as Usuario);
                } else {
                    sessionStorage.removeItem(SESSION_KEY);
                }
            } catch {
                sessionStorage.removeItem(SESSION_KEY);
            }
        }
        setLoading(false);
    }, [fetchUsers]);

    // Inicialização e Realtime
    useEffect(() => {
        initialize();

        // Inscreve para mudanças em tempo real na tabela de usuários
        const channel = supabase
            .channel('renata_usuarios_changes')
            .on('postgres_changes', { 
                event: '*', 
                schema: 'public', 
                table: 'renata_usuarios' 
            }, () => {
                fetchUsers();
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [initialize, fetchUsers]);

    // Heartbeat: Atualiza lastSeen a cada 30 segundos
    useEffect(() => {
        if (!user) return;

        const heartbeat = async () => {
            const now = new Date().toISOString();
            await supabase
                .from('renata_usuarios')
                .update({ lastseen: now })
                .eq('id', user.id);
        };

        const interval = setInterval(heartbeat, 30000);
        heartbeat(); // Primeira execução
        return () => clearInterval(interval);
    }, [user]);

    const login = async (nome: string, password: string): Promise<{ success: boolean, mustChange: boolean }> => {
        const { data, error } = await supabase
            .from('renata_usuarios')
            .select('*')
            .ilike('nome', nome.trim())
            .eq('password', password)
            .single();
        
        if (data && !error) {
            const now = new Date().toISOString();
            
            // Atualiza lastSeen no login
            await supabase
                .from('renata_usuarios')
                .update({ lastseen: now })
                .eq('id', data.id);

            sessionStorage.setItem(SESSION_KEY, JSON.stringify({ userId: data.id }));
            const found = {
                ...data,
                isFirstLogin: data.isfirstlogin,
                lastSeen: data.lastseen
            } as Usuario;
            setUser(found);
            return { success: true, mustChange: found.isFirstLogin };
        }
        return { success: false, mustChange: false };
    };

    const logout = async () => {
        if (user) {
            await supabase
                .from('renata_usuarios')
                .update({ lastseen: null })
                .eq('id', user.id);
        }
        sessionStorage.removeItem(SESSION_KEY);
        setUser(null);
    };

    const verifyAdminPin = async (pinInput: string): Promise<boolean> => {
        const { data, error } = await supabase
            .from('renata_usuarios')
            .select('pin')
            .eq('role', 'admin')
            .single();
        
        return data?.pin === pinInput;
    };

    const resetAdminPassword = async (newPassword: string) => {
        await supabase
            .from('renata_usuarios')
            .update({ password: newPassword, isfirstlogin: false })
            .eq('role', 'admin');
        await fetchUsers();
    };

    const updateAdminPin = async (newPin: string) => {
        await supabase
            .from('renata_usuarios')
            .update({ pin: newPin })
            .eq('role', 'admin');
        await fetchUsers();
    };

    const addUser = async (nome: string, cargo: string) => {
        if (user?.role !== 'admin') {
            console.error('Permissão negada: Usuário não é admin');
            return;
        }
        
        try {
            const { error } = await supabase
                .from('renata_usuarios')
                .insert([{
                    nome: nome.trim(),
                    cargo: cargo.trim(),
                    password: '0000',
                    role: 'user',
                    isfirstlogin: true,
                    created_at: new Date().toISOString()
                }]);
            
            if (error) {
                console.error('Erro ao inserir usuário:', error);
                alert('Erro ao cadastrar usuário: ' + error.message);
                return;
            }

            await fetchUsers();
        } catch (err) {
            console.error('Falha crítica ao adicionar usuário:', err);
            alert('Falha interna ao cadastrar usuário.');
        }
    };

    const deleteUser = async (id: string) => {
        if (user?.role !== 'admin') return;
        await supabase
            .from('renata_usuarios')
            .delete()
            .eq('id', id);
        await fetchUsers();
    };

    const changePassword = async (newPassword: string) => {
        if (!user) return;
        await supabase
            .from('renata_usuarios')
            .update({ password: newPassword, isfirstlogin: false })
            .eq('id', user.id);
        
        const { data } = await supabase
            .from('renata_usuarios')
            .select('*')
            .eq('id', user.id)
            .single();
        
        if (data) {
            setUser({
                ...data,
                isFirstLogin: data.isfirstlogin,
                lastSeen: data.lastseen
            } as Usuario);
        }
        await fetchUsers();
    };

    return { 
        user, 
        users,
        authenticated: !!user, 
        isAdmin: user?.role === 'admin',
        loading, 
        login, 
        logout, 
        addUser, 
        deleteUser, 
        changePassword,
        verifyAdminPin,
        resetAdminPassword,
        updateAdminPin,
        refresh: initialize
    };
}
