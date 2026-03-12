'use client';

import { useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useRotinas } from './useRotinas';
import { useProcessos } from './useProcessos';
import { addDays, addWeeks, addMonths, addYears, format, isBefore, parseISO, startOfDay } from 'date-fns';

export function useRotinaAutomation() {
    const { rotinas, atualizarRotina } = useRotinas();
    const { criarProcesso } = useProcessos();

    const calcularProximaData = (dataBase: Date, frequencia: string, diaExecucao: number): Date => {
        let proxima = dataBase;
        
        switch (frequencia) {
            case 'diaria':
                proxima = addDays(dataBase, 1);
                break;
            case 'semanal':
                // diaExecucao é 0-6 (0=Domingo)
                proxima = addWeeks(dataBase, 1);
                // Ajuste simplificado: se definimos semanal, assumimos que o intervalo é de 7 dias
                break;
            case 'mensal':
                proxima = addMonths(dataBase, 1);
                // Tenta manter o dia do mês
                break;
            case 'anual':
                proxima = addYears(dataBase, 1);
                break;
        }
        return proxima;
    };

    const processarRecorrencias = useCallback(async () => {
        const hoje = startOfDay(new Date());

        for (const rotina of rotinas) {
            if (rotina.recorrente && rotina.proxima_execucao) {
                const dataPrevista = parseISO(rotina.proxima_execucao);

                if (isBefore(dataPrevista, hoje) || dataPrevista.getTime() === hoje.getTime()) {
                    console.log(`Automatizando rotina: ${rotina.assunto}`);

                    // 1. Criar Processo
                    await criarProcesso({
                        assunto: rotina.assunto,
                        tipo_assunto: rotina.tipo_assunto,
                        responsavel_execucao: rotina.responsavel_execucao,
                        responsavel_revisao: rotina.responsavel_revisao,
                        data_entrada: format(hoje, 'yyyy-MM-dd'),
                        data_prazo: rotina.data_prazo, // Ou calcular baseado na rotina
                        status_kanban: rotina.status_kanban,
                        observacoes: rotina.observacoes,
                        recorrente: true
                    });

                    // 2. Atualizar próxima data na rotina
                    const novaData = calcularProximaData(dataPrevista, rotina.frequencia!, rotina.dia_execucao!);
                    await atualizarRotina(rotina.id, {
                        proxima_execucao: format(novaData, 'yyyy-MM-dd')
                    });
                }
            }
        }
    }, [rotinas, criarProcesso, atualizarRotina]);

    useEffect(() => {
        if (rotinas.length > 0) {
            processarRecorrencias();
        }
    }, [rotinas.length, processarRecorrencias]);
}
