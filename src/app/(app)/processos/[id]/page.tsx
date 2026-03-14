'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Processo, DataIntermediaria, calcularRisco, RISCO_LABELS, StatusKanbanDef } from '@/lib/types';
import { format, parseISO, differenceInDays } from 'date-fns';
import ProcessoDetalhes from '@/components/ProcessoDetalhes';

export default function ProcessoDetalhesPage() {
    const { id } = useParams();
    const router = useRouter();
    const [item, setItem] = useState<Processo | null>(null);
    const [loading, setLoading] = useState(true);
    const { statusAtivos } = useCadastros();

    useEffect(() => {
        async function fetchItem() {
            setLoading(true);
            // Tenta buscar em processos
            let { data, error } = await supabase
                .from('renata_processos')
                .select('*')
                .eq('id', id)
                .single();

            if (error || !data) {
                // Tenta buscar em rotinas
                const { data: dataR, error: errorR } = await supabase
                    .from('renata_rotinas')
                    .select('*')
                    .eq('id', id)
                    .single();
                
                if (dataR) data = dataR;
            }

            if (data) {
                setItem(data as Processo);
            }
            setLoading(false);
        }

        if (id) fetchItem();
    }, [id]);

    const risco = useMemo(() => item ? calcularRisco(item.data_prazo, item.status_kanban) : 'no_prazo', [item]);
    const leadTime = item ? differenceInDays(new Date(), parseISO(item.data_entrada)) : 0;

    if (loading) return <div className="loading-container" style={{ padding: '40px', color: 'var(--text-secondary)' }}>⏳ Carregando fluxo...</div>;
    if (!item) return <div style={{ padding: '40px' }}>Item não encontrado.</div>;

    const currentStatusIdx = statusAtivos.findIndex(s => s.nome === item.status_kanban);

    return (
        <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '20px' }}>
            <ProcessoDetalhes 
                item={item} 
                showBackButton 
                onBack={() => router.back()} 
            />
        </div>
    );
}
