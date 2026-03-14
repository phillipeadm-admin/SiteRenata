'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Processo } from '@/lib/types';
import ProcessoDetalhes from '@/components/ProcessoDetalhes';

export default function ProcessoDetalhesPage() {
    const { id } = useParams();
    const router = useRouter();
    const [item, setItem] = useState<Processo | null>(null);
    const [loading, setLoading] = useState(true);
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

    if (loading) return <div className="loading-container" style={{ padding: '40px', color: 'var(--text-secondary)' }}>⏳ Carregando fluxo...</div>;
    if (!item) return <div style={{ padding: '40px' }}>Item não encontrado.</div>;

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
