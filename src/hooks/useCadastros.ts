'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';

import { StatusKanbanDef, FluxoEtapa } from '@/lib/types';

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
    fluxoEtapas: FluxoEtapa[];
}

export function useCadastros() {
    const [cadastros, setCadastros] = useState<Cadastros>({ tiposAssunto: [], responsaveis: [], statusKanban: [], fluxoEtapas: [] });
    const [loaded, setLoaded] = useState(false);

    const fetchCadastros = useCallback(async () => {
        try {
            const results = await Promise.all([
                supabase.from('renata_tipos_assunto').select('*').order('nome'),
                supabase.from('renata_responsaveis').select('*').order('nome'),
                supabase.from('renata_status_kanban').select('*').order('ordem'),
                supabase.from('renata_fluxo_etapas').select('*').order('ordem')
            ]);

            const [tiposRes, respsRes, statusRes, fluxoRes] = results;

            if (tiposRes.error) console.error("Erro ao buscar tipos:", tiposRes.error);
            if (respsRes.error) console.error("Erro ao buscar responsáveis:", respsRes.error);
            if (statusRes.error) console.error("Erro ao buscar status:", statusRes.error);
            if (fluxoRes.error) console.error("Erro ao buscar etapas de fluxo:", fluxoRes.error);

            setCadastros({
                tiposAssunto: (tiposRes.data || []) as TipoAssunto[],
                responsaveis: (respsRes.data || []) as Responsavel[],
                statusKanban: (statusRes.data || []) as StatusKanbanDef[],
                fluxoEtapas: (fluxoRes.data || []) as FluxoEtapa[]
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

        const channelFluxo = supabase
            .channel('renata_fluxo_changes')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'renata_fluxo_etapas' }, fetchCadastros)
            .subscribe();

        return () => {
            supabase.removeChannel(channelTipos);
            supabase.removeChannel(channelResps);
            supabase.removeChannel(channelStatus);
            supabase.removeChannel(channelFluxo);
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

    /* ---- FLUXO ETAPAS ---- */
    const ajustarOrdemFluxo = async (tipo_assunto_id: string, ordemAlvo: number, idIgnorado?: string) => {
        // Busca todas as etapas deste fluxo
        const { data: etapas } = await supabase
            .from('renata_fluxo_etapas')
            .select('id, ordem')
            .eq('tipo_assunto_id', tipo_assunto_id)
            .order('ordem');

        if (!etapas) return;

        // Verifica se há conflito
        const conflito = etapas.find(e => e.ordem === ordemAlvo && e.id !== idIgnorado);
        if (!conflito) return;

        // Se há conflito, precisamos deslocar esta e as próximas
        const paraDeslocar = etapas.filter(e => e.ordem >= ordemAlvo && e.id !== idIgnorado);
        
        for (const etapa of paraDeslocar) {
            await supabase
                .from('renata_fluxo_etapas')
                .update({ ordem: etapa.ordem + 1 })
                .eq('id', etapa.id);
        }
    };

    const addFluxoEtapa = async (tipo_assunto_id: string, nome: string, ordem: number, sub_etapas: string[] = []) => {
        await ajustarOrdemFluxo(tipo_assunto_id, ordem);
        const { error } = await supabase.from('renata_fluxo_etapas').insert([{ 
            tipo_assunto_id,
            nome: nome.trim(), 
            dias_entrada: 0,
            dias_saida: 0,
            ordem,
            sub_etapas
        }]);
        if (error) {
            console.error("Erro ao inserir Etapa de Fluxo:", error);
            alert("Erro ao salvar etapa: " + error.message);
        }
        await fetchCadastros();
    };

    const updateFluxoEtapa = async (id: string, nome: string, ordem: number, sub_etapas: string[] = []) => {
        // Primeiro buscamos o registro atual para saber o tipo_assunto_id
        const { data: atual } = await supabase
            .from('renata_fluxo_etapas')
            .select('tipo_assunto_id, ordem')
            .eq('id', id)
            .single();

        if (atual && atual.ordem !== ordem) {
            await ajustarOrdemFluxo(atual.tipo_assunto_id, ordem, id);
        }

        const { error } = await supabase.from('renata_fluxo_etapas').update({ 
            nome: nome.trim(), 
            ordem,
            sub_etapas
        }).eq('id', id);
        if (error) {
            console.error("Erro ao atualizar Etapa de Fluxo:", error);
            alert("Erro ao atualizar etapa: " + error.message);
        }
        await fetchCadastros();
    };

    const deleteFluxoEtapa = async (id: string) => {
        // Busca os dados da etapa antes de excluir para saber o que reordenar
        const { data: etapaExcluida } = await supabase
            .from('renata_fluxo_etapas')
            .select('tipo_assunto_id, ordem')
            .eq('id', id)
            .single();

        const { error } = await supabase.from('renata_fluxo_etapas').delete().eq('id', id);
        
        if (error) {
            console.error("Erro ao excluir Etapa de Fluxo:", error);
            alert("Erro ao excluir etapa: " + error.message);
            return;
        }

        // Se a etapa existia, reordena as próximas
        if (etapaExcluida) {
            const { data: subsequentes } = await supabase
                .from('renata_fluxo_etapas')
                .select('id, ordem')
                .eq('tipo_assunto_id', etapaExcluida.tipo_assunto_id)
                .gt('ordem', etapaExcluida.ordem);

            if (subsequentes && subsequentes.length > 0) {
                for (const etapa of subsequentes) {
                    await supabase
                        .from('renata_fluxo_etapas')
                        .update({ ordem: etapa.ordem - 1 })
                        .eq('id', etapa.id);
                }
            }
        }

        await fetchCadastros();
    };

    const vincularEtapaAoStatus = async (id: string, status: string | null) => {
        const { error } = await supabase
            .from('renata_fluxo_etapas')
            .update({ status_vinculado: status })
            .eq('id', id);

        if (error) {
            console.error("Erro ao vincular etapa ao status:", error);
            alert("Erro ao salvar vínculo de status: " + error.message);
        }
        await fetchCadastros();
    };

    const vincularResponsavelAEtapa = async (id: string, responsavel: string | null) => {
        const { error } = await supabase
            .from('renata_fluxo_etapas')
            .update({ responsavel_nome: responsavel })
            .eq('id', id);

        if (error) {
            console.error("Erro ao vincular responsável à etapa:", error);
            alert("Erro ao salvar responsável: " + error.message);
        }
        await fetchCadastros();
    };

    /* Listas filtradas */
    const tiposAtivos: TipoAssunto[] = cadastros.tiposAssunto.filter((t: TipoAssunto) => t.ativo);
    const executoresAtivos: Responsavel[] = cadastros.responsaveis.filter((r: Responsavel) => r.ativo && (r.tipo === 'execucao' || r.tipo === 'ambos'));
    const revisoresAtivos: Responsavel[] = cadastros.responsaveis.filter((r: Responsavel) => r.ativo && (r.tipo === 'revisao' || r.tipo === 'ambos'));
    const statusAtivos: StatusKanbanDef[] = cadastros.statusKanban.filter((s: StatusKanbanDef) => s.ativo).sort((a: StatusKanbanDef, b: StatusKanbanDef) => a.ordem - b.ordem);

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
        addFluxoEtapa, updateFluxoEtapa, deleteFluxoEtapa, vincularEtapaAoStatus, vincularResponsavelAEtapa
    };
}
