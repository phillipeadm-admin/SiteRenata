'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { Processo, StatusKanban } from '@/lib/types';

export function useRotinas() {
    const [rotinas, setRotinas] = useState<Processo[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchRotinas = useCallback(async () => {
        const { data, error } = await supabase
            .from('renata_rotinas')
            .select('*')
            .order('created_at', { ascending: false });
        
        if (data && !error) {
            setRotinas(data as Processo[]);
        }
    }, []);

    // Carregar e Realtime
    useEffect(() => {
        fetchRotinas().finally(() => setLoading(false));

        const channel = supabase
            .channel('renata_rotinas_changes')
            .on('postgres_changes', { 
                event: '*', 
                schema: 'public', 
                table: 'renata_rotinas' 
            }, () => {
                fetchRotinas();
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [fetchRotinas]);

    const criarRotina = useCallback(
        async (data: Partial<Processo>) => {
            const nova = {
                assunto: data.assunto,
                tipo_assunto: data.tipo_assunto,
                responsavel_execucao: data.responsavel_execucao ?? '',
                responsavel_revisao: data.responsavel_revisao ?? null,
                data_entrada: data.data_entrada,
                data_prazo: data.data_prazo ?? null,
                data_finalizacao: null,
                status_kanban: data.status_kanban ?? 'triagem',
                observacoes: data.observacoes ?? null,
                datas_intermediarias: data.datas_intermediarias ?? null,
                updated_at: new Date().toISOString()
            };

            await supabase
                .from('renata_rotinas')
                .insert([nova]);
            
            await fetchRotinas();
        },
        [fetchRotinas]
    );

    const atualizarRotina = useCallback(
        async (id: string, data: Partial<Processo>) => {
            await supabase
                .from('renata_rotinas')
                .update({ ...data, updated_at: new Date().toISOString() })
                .eq('id', id);
            
            await fetchRotinas();
        },
        [fetchRotinas]
    );

    const excluirRotina = useCallback(
        async (id: string) => {
            await supabase
                .from('renata_rotinas')
                .delete()
                .eq('id', id);
            
            await fetchRotinas();
        },
        [fetchRotinas]
    );

    const moverKanban = useCallback(
        async (id: string, novoStatus: StatusKanban) => {
            const data: Partial<Processo> = {
                status_kanban: novoStatus,
                data_finalizacao:
                    novoStatus === 'finalizado' ? new Date().toISOString() : null,
            };
            await atualizarRotina(id, data);
        },
        [atualizarRotina]
    );

    return {
        rotinas,
        loading,
        criarRotina,
        atualizarRotina,
        excluirRotina,
        moverKanban,
        refresh: fetchRotinas
    };
}
