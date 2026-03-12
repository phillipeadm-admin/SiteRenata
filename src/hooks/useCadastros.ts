'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';

import { StatusKanbanDef } from '@/lib/types';

export interface TipoAssunto {
    id: string;
    nome: string;
    responsavel_execucao?: string;
    responsavel_revisao?: string;
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
    statusKanban: StatusKanbanDef[];
}

export function useCadastros() {
    const [cadastros, setCadastros] = useState<Cadastros>({ tiposAssunto: [], responsaveis: [], statusKanban: [] });
    const [loaded, setLoaded] = useState(false);

    const fetchCadastros = useCallback(async () => {
        try {
            const [tiposRes, respsRes, statusRes] = await Promise.all([
                supabase.from('renata_tipos_assunto').select('*').order('nome'),
                supabase.from('renata_responsaveis').select('*').order('nome'),
                supabase.from('renata_status_kanban').select('*').order('ordem')
            ]);

            if (tiposRes.error) console.error("Erro ao buscar tipos:", tiposRes.error);
            if (respsRes.error) console.error("Erro ao buscar responsáveis:", respsRes.error);
            if (statusRes.error) console.error("Erro ao buscar status:", statusRes.error);

            setCadastros({
                tiposAssunto: (tiposRes.data || []) as TipoAssunto[],
                responsaveis: (respsRes.data || []) as Responsavel[],
                statusKanban: (statusRes.data || []) as StatusKanbanDef[]
            });
        } catch (err) {
            console.error("Erro fatal ao carregar cadastros:", err);
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

        const channelStatus = supabase
            .channel('renata_status_changes')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'renata_status_kanban' }, fetchCadastros)
            .subscribe();

        return () => {
            supabase.removeChannel(channelTipos);
            supabase.removeChannel(channelResps);
            supabase.removeChannel(channelStatus);
        };
    }, [fetchCadastros]);

    /* ---- TIPOS DE ASSUNTO ---- */
    const addTipo = async (nome: string, responsavel_execucao?: string, responsavel_revisao?: string) => {
        const { error } = await supabase.from('renata_tipos_assunto').insert([{ 
            nome: nome.trim(), 
            responsavel_execucao: responsavel_execucao?.trim() || null,
            responsavel_revisao: responsavel_revisao?.trim() || null,
            ativo: true 
        }]);
        if (error) {
            console.error("Erro ao inserir Tipo:", error);
            alert("Erro ao salvar tipo: " + error.message);
        }
        await fetchCadastros();
    };

    const updateTipo = async (id: string, nome: string, responsavel_execucao?: string, responsavel_revisao?: string) => {
        await supabase.from('renata_tipos_assunto').update({ 
            nome: nome.trim(),
            responsavel_execucao: responsavel_execucao?.trim() || null,
            responsavel_revisao: responsavel_revisao?.trim() || null
        }).eq('id', id);
        await fetchCadastros();
    };

    const toggleTipo = async (id: string) => {
        const found = cadastros.tiposAssunto.find((t: any) => t.id === id);
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
        console.log("Tentando adicionar responsável:", { nome, cargo, tipo });
        const { error } = await supabase.from('renata_responsaveis').insert([{ 
            nome: nome.trim(), 
            cargo: cargo.trim(), 
            tipo: tipo || 'execucao', 
            ativo: true 
        }]);
        if (error) {
            console.error("Erro ao inserir Responsável:", error);
            alert("Erro ao salvar responsável: " + error.message);
        } else {
            console.log("Responsável inserido com sucesso!");
        }
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
        const found = cadastros.responsaveis.find((r: any) => r.id === id);
        if (found) {
            await supabase.from('renata_responsaveis').update({ ativo: !found.ativo }).eq('id', id);
            await fetchCadastros();
        }
    };

    const deleteResponsavel = async (id: string) => {
        await supabase.from('renata_responsaveis').delete().eq('id', id);
        await fetchCadastros();
    };

    /* ---- STATUS KANBAN ---- */
    const addStatus = async (nome: string, cor: string, ordem: number) => {
        console.log("Tentando adicionar status:", { nome, cor, ordem });
        const { error } = await supabase.from('renata_status_kanban').insert([{ nome: nome.trim(), cor: cor.trim(), ordem, ativo: true }]);
        if (error) {
            console.error("Erro ao inserir Status:", error);
            alert("Erro ao salvar status: " + error.message);
        } else {
            console.log("Status inserido com sucesso!");
        }
        await fetchCadastros();
    };

    const updateStatus = async (id: string, nome: string, cor: string, ordem: number) => {
        const { error } = await supabase.from('renata_status_kanban').update({ nome: nome.trim(), cor: cor.trim(), ordem }).eq('id', id);
        if (error) {
            console.error("Erro ao atualizar Status:", error);
            alert("Erro ao atualizar status: " + error.message);
        }
        await fetchCadastros();
    };

    const toggleStatus = async (id: string) => {
        const found = cadastros.statusKanban.find((s: any) => s.id === id);
        if (found) {
            await supabase.from('renata_status_kanban').update({ ativo: !found.ativo }).eq('id', id);
            await fetchCadastros();
        }
    };

    const deleteStatus = async (id: string) => {
        await supabase.from('renata_status_kanban').delete().eq('id', id);
        await fetchCadastros();
    };

    /* Listas filtradas */
    const tiposAtivos: TipoAssunto[] = cadastros.tiposAssunto.filter(t => t.ativo);
    const executoresAtivos: Responsavel[] = cadastros.responsaveis.filter(r => r.ativo && (r.tipo === 'execucao' || r.tipo === 'ambos'));
    const revisoresAtivos: Responsavel[] = cadastros.responsaveis.filter(r => r.ativo && (r.tipo === 'revisao' || r.tipo === 'ambos'));
    const statusAtivos: StatusKanbanDef[] = cadastros.statusKanban.filter(s => s.ativo).sort((a, b) => a.ordem - b.ordem);

    return {
        cadastros,
        loaded,
        tiposAtivos,
        executoresAtivos,
        revisoresAtivos,
        statusAtivos,
        addTipo, updateTipo, toggleTipo, deleteTipo,
        addResponsavel, updateResponsavel, toggleResponsavel, deleteResponsavel,
        addStatus, updateStatus, toggleStatus, deleteStatus,
    };
}
