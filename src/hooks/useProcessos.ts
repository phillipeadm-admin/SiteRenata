'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { Processo, StatusKanban } from '@/lib/types';

export function useProcessos() {
    const [processos, setProcessos] = useState<Processo[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchProcessos = useCallback(async () => {
        const { data, error } = await supabase
            .from('renata_processos')
            .select('*')
            .order('created_at', { ascending: false });
        
        if (data && !error) {
            setProcessos(data as Processo[]);
        }
    }, []);

    // Carregar e Realtime
    useEffect(() => {
        fetchProcessos().finally(() => setLoading(false));

        const channel = supabase
            .channel('renata_processos_changes')
            .on('postgres_changes', { 
                event: '*', 
                schema: 'public', 
                table: 'renata_processos' 
            }, () => {
                fetchProcessos();
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [fetchProcessos]);

    const criarProcesso = useCallback(
        async (data: Partial<Processo>) => {
            const novo = {
                assunto: data.assunto,
                tipo_assunto: data.tipo_assunto,
                responsavel_execucao: data.responsavel_execucao,
                responsavel_revisao: data.responsavel_revisao ?? null,
                data_entrada: data.data_entrada,
                data_prazo: data.data_prazo ?? null,
                data_finalizacao: null,
                status_kanban: data.status_kanban ?? 'triagem',
                observacoes: data.observacoes ?? null,
                numero_processo: data.numero_processo ?? null,
                datas_intermediarias: data.datas_intermediarias ?? null,
                recorrente: data.recorrente ?? false,
                updated_at: new Date().toISOString()
            };

            const { error } = await supabase
                .from('renata_processos')
                .insert([novo]);
            
            if (error) {
                console.error("Erro ao criar processo:", error);
                alert("Erro ao criar processo: " + error.message);
                return;
            }
            
            await fetchProcessos();
        },
        [fetchProcessos]
    );

    const atualizarProcesso = useCallback(
        async (id: string, data: Partial<Processo>) => {
            const { error } = await supabase
                .from('renata_processos')
                .update({ ...data, updated_at: new Date().toISOString() })
                .eq('id', id);

            if (error) {
                console.error("Erro ao atualizar processo:", error);
                alert("Erro ao atualizar processo: " + error.message);
                return;
            }
            
            await fetchProcessos();
        },
        [fetchProcessos]
    );

    const excluirProcesso = useCallback(
        async (id: string) => {
            await supabase
                .from('renata_processos')
                .delete()
                .eq('id', id);
            
            await fetchProcessos();
        },
        [fetchProcessos]
    );

    const moverKanban = useCallback(
        async (id: string, novoStatus: StatusKanban) => {
            const data: Partial<Processo> = {
                status_kanban: novoStatus,
                data_finalizacao:
                    novoStatus.toLowerCase().includes('finalizado') ? new Date().toISOString() : null,
            };
            await atualizarProcesso(id, data);
        },
        [atualizarProcesso]
    );

    return {
        processos, // Todos
        processosAtivos: processos.filter(p => {
            if (!p.status_kanban.toLowerCase().includes('finalizado')) return true;
            if (!p.data_finalizacao) return true;
            
            const trintaDiasEmMs = 30 * 24 * 60 * 60 * 1000;
            const dataFinal = new Date(p.data_finalizacao).getTime();
            const agora = new Date().getTime();
            
            return (agora - dataFinal) < trintaDiasEmMs;
        }),
        processosArquivados: processos.filter(p => {
            if (!p.status_kanban.toLowerCase().includes('finalizado')) return false;
            if (!p.data_finalizacao) return false;
            
            const trintaDiasEmMs = 30 * 24 * 60 * 60 * 1000;
            const dataFinal = new Date(p.data_finalizacao).getTime();
            const agora = new Date().getTime();
            
            return (agora - dataFinal) >= trintaDiasEmMs;
        }),
        loading,
        criarProcesso,
        atualizarProcesso,
        excluirProcesso,
        moverKanban,
        refresh: fetchProcessos
    };
}
