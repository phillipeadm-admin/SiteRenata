'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';

export interface TipoAssunto {
    id: string;
    nome: string;
    ativo: boolean;
}

export interface Responsavel {
    id: string;
    nome: string;
    cargo: string;
    tipo: 'execucao' | 'revisao' | 'ambos';
    ativo: boolean;
}

interface Cadastros {
    tiposAssunto: TipoAssunto[];
    responsaveis: Responsavel[];
}

export function useCadastros() {
    const [cadastros, setCadastros] = useState<Cadastros>({ tiposAssunto: [], responsaveis: [] });
    const [loaded, setLoaded] = useState(false);

    const fetchCadastros = useCallback(async () => {
        const [tiposRes, respsRes] = await Promise.all([
            supabase.from('renata_tipos_assunto').select('*').order('nome'),
            supabase.from('renata_responsaveis').select('*').order('nome')
        ]);

        if (!tiposRes.error && !respsRes.error) {
            setCadastros({
                tiposAssunto: tiposRes.data as TipoAssunto[],
                responsaveis: respsRes.data as Responsavel[]
            });
        }
    }, []);

    useEffect(() => {
        fetchCadastros().finally(() => setLoaded(true));

        const channelTipos = supabase
            .channel('renata_tipos_changes')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'renata_tipos_assunto' }, fetchCadastros)
            .subscribe();

        const channelResps = supabase
            .channel('renata_resps_changes')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'renata_responsaveis' }, fetchCadastros)
            .subscribe();

        return () => {
            supabase.removeChannel(channelTipos);
            supabase.removeChannel(channelResps);
        };
    }, [fetchCadastros]);

    /* ---- TIPOS DE ASSUNTO ---- */
    const addTipo = async (nome: string) => {
        await supabase.from('renata_tipos_assunto').insert([{ nome: nome.trim(), ativo: true }]);
        await fetchCadastros();
    };

    const updateTipo = async (id: string, nome: string) => {
        await supabase.from('renata_tipos_assunto').update({ nome: nome.trim() }).eq('id', id);
        await fetchCadastros();
    };

    const toggleTipo = async (id: string) => {
        const found = cadastros.tiposAssunto.find(t => t.id === id);
        if (found) {
            await supabase.from('renata_tipos_assunto').update({ ativo: !found.ativo }).eq('id', id);
            await fetchCadastros();
        }
    };

    const deleteTipo = async (id: string) => {
        await supabase.from('renata_tipos_assunto').delete().eq('id', id);
        await fetchCadastros();
    };

    /* ---- RESPONSÁVEIS ---- */
    const addResponsavel = async (nome: string, cargo: string, tipo: Responsavel['tipo']) => {
        await supabase.from('renata_responsaveis').insert([{ 
            nome: nome.trim(), 
            cargo: cargo.trim(), 
            tipo, 
            ativo: true 
        }]);
        await fetchCadastros();
    };

    const updateResponsavel = async (id: string, nome: string, cargo: string, tipo: Responsavel['tipo']) => {
        await supabase.from('renata_responsaveis').update({ 
            nome: nome.trim(), 
            cargo: cargo.trim(), 
            tipo 
        }).eq('id', id);
        await fetchCadastros();
    };

    const toggleResponsavel = async (id: string) => {
        const found = cadastros.responsaveis.find(r => r.id === id);
        if (found) {
            await supabase.from('renata_responsaveis').update({ ativo: !found.ativo }).eq('id', id);
            await fetchCadastros();
        }
    };

    const deleteResponsavel = async (id: string) => {
        await supabase.from('renata_responsaveis').delete().eq('id', id);
        await fetchCadastros();
    };

    /* Listas filtradas */
    const tiposAtivos = cadastros.tiposAssunto.filter(t => t.ativo);
    const executoresAtivos = cadastros.responsaveis.filter(
        r => r.ativo && (r.tipo === 'execucao' || r.tipo === 'ambos')
    );
    const revisoresAtivos = cadastros.responsaveis.filter(
        r => r.ativo && (r.tipo === 'revisao' || r.tipo === 'ambos')
    );

    return {
        cadastros,
        loaded,
        tiposAtivos,
        executoresAtivos,
        revisoresAtivos,
        addTipo, updateTipo, toggleTipo, deleteTipo,
        addResponsavel, updateResponsavel, toggleResponsavel, deleteResponsavel,
    };
}
