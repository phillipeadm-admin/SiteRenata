'use client';

import React, { useMemo, useState } from 'react';
import { Processo, calcularRisco, RISCO_LABELS, FluxoEtapa } from '@/lib/types';
import { format, parseISO, differenceInDays } from 'date-fns';
import { useCadastros, TipoAssunto } from '@/hooks/useCadastros';
import { useProcessos } from '@/hooks/useProcessos';
import { useRotinas } from '@/hooks/useRotinas';
import { supabase } from '@/lib/supabase';

interface Props {
    item: Processo;
    onBack?: () => void;
    showBackButton?: boolean;
}

export default function ProcessoDetalhes({ item, onBack, showBackButton = false }: Props) {
    const { statusAtivos, cadastros, vincularEtapaAoStatus, vincularResponsavelAEtapa, vincularDatasAEtapa, executoresAtivos } = useCadastros();
    const { atualizarProcesso, processos } = useProcessos();
    const { atualizarRotina, rotinas } = useRotinas();

    const isRotina = useMemo(() => {
        if (item.recorrente) return true;
        // Fallback: verificar se o ID existe na lista de rotinas
        return rotinas.some(r => r.id === item.id) && !processos.some(p => p.id === item.id);
    }, [item, rotinas, processos]);

    const [draggingEtapaId, setDraggingEtapaId] = useState<string | null>(null);
    const [dragOverStatus, setDragOverStatus] = useState<string | null>(null);

    const etapasRelacionadas = useMemo(() => {
        if (!item || !cadastros.tiposAssunto.length) return [];
        const tipoId = cadastros.tiposAssunto.find((t: TipoAssunto) => t.nome === item.tipo_assunto)?.id;
        if (!tipoId) return [];
        return cadastros.fluxoEtapas
            .filter((e: FluxoEtapa) => e.tipo_assunto_id === tipoId)
            .sort((a: FluxoEtapa, b: FluxoEtapa) => a.ordem - b.ordem);
    }, [item, cadastros]);

    // Função de toggle melhorada para garantir reatividade e ordenação de chaves
    const [checklistLocal, setChecklistLocal] = useState<Record<string, boolean>>(item.checklist || {});

    // Sincroniza estado local se o item mudar externamente
    React.useEffect(() => {
        setChecklistLocal(item.checklist || {});
    }, [item.checklist]);

    const toggleSubEtapa = async (etapaNome: string, subEtapaNome: string) => {
        const key = `${etapaNome}: ${subEtapaNome}`;
        const newChecklist = { ...checklistLocal };
        
        if (newChecklist[key]) {
            delete newChecklist[key];
        } else {
            newChecklist[key] = true;
        }

        // Atualização otimista do estado local
        setChecklistLocal(newChecklist);

        try {
            if (isRotina) {
                await atualizarRotina(item.id, { checklist: newChecklist });
            } else {
                await atualizarProcesso(item.id, { checklist: newChecklist });
            }
        } catch (error) {
            console.error("Erro ao atualizar checklist:", error);
            // Reverte em caso de erro
            setChecklistLocal(checklistLocal);
        }
    };

    const onDragStart = (e: React.DragEvent, id: string) => {
        setDraggingEtapaId(id);
        e.dataTransfer.effectAllowed = 'move';
    };

    const onDragOver = (e: React.DragEvent, status: string) => {
        e.preventDefault();
        setDragOverStatus(status);
    };

    const onDrop = async (e: React.DragEvent, targetStatus: string) => {
        e.preventDefault();
        if (draggingEtapaId) {
            await vincularEtapaAoStatus(draggingEtapaId, targetStatus);
        }
        setDraggingEtapaId(null);
        setDragOverStatus(null);
    };

    // Estilo adaptativo para as colunas caberem na largura total
    const columnWidth = statusAtivos.length > 0 ? `${100 / statusAtivos.length}%` : '320px';

    return (
        <div className="processo-detalhes-container" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
            {/* Header Reduzido */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '24px' }}>
                {showBackButton && onBack && (
                    <button 
                        onClick={onBack}
                        className="btn btn-secondary"
                        style={{ padding: '8px 12px', borderRadius: '12px' }}
                    >
                        ← Voltar
                    </button>
                )}
                <div>
                    <h1 style={{ fontSize: '22px', fontWeight: 700, margin: 0 }}>
                        {item.recorrente ? '🔄' : '📄'} {item.tipo_assunto}
                    </h1>
                    <div style={{ display: 'flex', gap: '12px', alignItems: 'center', marginTop: '4px' }}>
                        <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>ID: {item.id.slice(0, 8)}</span>
                        <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>•</span>
                        <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Assunto: <strong>{item.assunto}</strong></span>
                    </div>
                </div>
            </div>

            {/* KANBAN DE FLUXO - VISUALIZAÇÃO TOTAL */}
            <div style={{ 
                flex: 1,
                background: 'var(--bg-secondary)', 
                padding: '20px', 
                borderRadius: '24px', 
                border: '1px solid var(--border)',
                display: 'flex',
                flexDirection: 'column',
                gap: '16px',
                minHeight: '500px'
            }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                    <h3 style={{ fontSize: '17px', margin: 0 }}>🌊 Kanban de Fluxo de Trabalho</h3>
                    <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                        Organize as etapas e defina seus responsáveis
                    </div>
                </div>
                
                <div style={{ 
                    display: 'flex', 
                    gap: '8px', 
                    flex: 1,
                    width: '100%',
                    justifyContent: 'space-between'
                }}>
                    {statusAtivos.map((statusObj) => {
                        const status = statusObj.nome;
                        const etapasNoStatus = etapasRelacionadas.filter(e => {
                            if (!e.status_vinculado && statusObj.ordem === 1) return true;
                            return e.status_vinculado === status;
                        });
                        const isOver = dragOverStatus === status;
                        
                        return (
                            <div 
                                key={status} 
                                onDragOver={(e) => onDragOver(e, status)}
                                onDrop={(e) => onDrop(e, status)}
                                style={{ 
                                    flex: 1,
                                    minWidth: '0',
                                    background: isOver ? 'rgba(0,0,0,0.02)' : 'var(--bg-primary)',
                                    borderRadius: '12px',
                                    border: `2px ${isOver ? 'dashed' : 'solid'} ${isOver ? (statusObj.cor || 'var(--accent-blue)') : 'var(--border)'}`,
                                    padding: '8px',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: '6px',
                                    transition: 'all 0.2s',
                                    boxShadow: '0 2px 8px rgba(0,0,0,0.02)'
                                }}
                            >
                                <div style={{ 
                                    borderBottom: `2px solid ${statusObj.cor || 'var(--accent-blue)'}`, 
                                    paddingBottom: '4px',
                                    marginBottom: '2px'
                                }}>
                                    <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                        {status}
                                    </div>
                                </div>

                                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', flex: 1 }}>
                                    {etapasNoStatus.length > 0 ? (
                                        etapasNoStatus.map((etapa) => (
                                            <div 
                                                key={etapa.id} 
                                                draggable
                                                onDragStart={(e) => onDragStart(e, etapa.id)}
                                                style={{ 
                                                    background: 'var(--bg-secondary)',
                                                    borderRadius: '10px',
                                                    border: '1px solid var(--border)',
                                                    padding: '8px',
                                                    cursor: 'grab',
                                                    opacity: draggingEtapaId === etapa.id ? 0.5 : 1,
                                                    boxShadow: '0 1px 3px rgba(0,0,0,0.03)'
                                                }}
                                            >
                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '4px' }}>
                                                    <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1.2 }}>
                                                        {etapa.nome}
                                                    </div>
                                                </div>

                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginBottom: '8px' }}>
                                                    {etapa.sub_etapas?.map((sub, sIdx) => {
                                                        const isDone = !!checklistLocal[`${etapa.nome}: ${sub}`];
                                                        return (
                                                            <div 
                                                                key={sIdx}
                                                                onClick={(e) => { 
                                                                    e.stopPropagation(); 
                                                                    toggleSubEtapa(etapa.nome, sub); 
                                                                }}
                                                                style={{ 
                                                                    display: 'flex', 
                                                                    alignItems: 'center', 
                                                                    gap: '4px',
                                                                    fontSize: '11px',
                                                                    color: isDone ? 'var(--text-muted)' : 'var(--text-secondary)',
                                                                    cursor: 'pointer',
                                                                    userSelect: 'none',
                                                                    padding: '1px 0'
                                                                }}
                                                            >
                                                                <div style={{ 
                                                                    width: '14px', 
                                                                    height: '14px', 
                                                                    borderRadius: '3px', 
                                                                    border: `1.2px solid ${isDone ? 'var(--accent-green)' : 'var(--border)'}`,
                                                                    background: isDone ? 'var(--accent-green)' : 'transparent',
                                                                    display: 'flex',
                                                                    alignItems: 'center',
                                                                    justifyContent: 'center',
                                                                    color: 'white',
                                                                    fontSize: '9px',
                                                                    flexShrink: 0
                                                                }}>
                                                                    {isDone && '✓'}
                                                                </div>
                                                                <span style={{ 
                                                                    textDecoration: isDone ? 'line-through' : 'none',
                                                                    overflow: 'hidden',
                                                                    textOverflow: 'ellipsis',
                                                                    whiteSpace: 'nowrap'
                                                                }}>
                                                                    {sub.startsWith('• ') ? sub.slice(2) : sub}
                                                                </span>
                                                            </div>
                                                        );
                                                    })}
                                                </div>

                                                {/* Seletor de Responsável por Etapa */}
                                                <div>
                                                    <select 
                                                        value={etapa.responsavel_nome || ''}
                                                        onChange={(e) => vincularResponsavelAEtapa(etapa.id, e.target.value || null)}
                                                        style={{
                                                            width: '100%',
                                                            fontSize: '11px',
                                                            padding: '2px 4px',
                                                            borderRadius: '4px',
                                                            background: 'var(--bg-primary)',
                                                            border: '1px solid var(--border)',
                                                            color: etapa.responsavel_nome ? 'var(--text-primary)' : 'var(--text-muted)',
                                                            outline: 'none',
                                                            height: '24px'
                                                        }}
                                                        onClick={(e) => e.stopPropagation()}
                                                    >
                                                        <option value="">👤 Responsável...</option>
                                                        {executoresAtivos.map(res => (
                                                            <option key={res.id} value={res.nome}>{res.nome}</option>
                                                        ))}
                                                    </select>
                                                </div>

                                                {/* Datas - Lado a Lado */}
                                                <div style={{ 
                                                    display: 'flex', 
                                                    flexDirection: 'column',
                                                    gap: '8px', 
                                                    marginTop: '6px',
                                                    padding: '8px',
                                                    background: 'rgba(99, 102, 241, 0.04)',
                                                    borderRadius: '8px',
                                                    border: '1px solid var(--border)'
                                                }}>
                                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                                                        <label style={{ fontSize: '9px', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Início</label>
                                                        <input 
                                                            type="date"
                                                            value={etapa.data_inicio || ''}
                                                            onChange={(e) => vincularDatasAEtapa(etapa.id, 'data_inicio', e.target.value || null)}
                                                            onClick={(e) => e.stopPropagation()}
                                                            style={{
                                                                width: '100%',
                                                                fontSize: '11px',
                                                                padding: '4px 8px',
                                                                borderRadius: '6px',
                                                                background: 'var(--bg-primary)',
                                                                border: '1px solid var(--border)',
                                                                color: 'var(--text-primary)',
                                                                outline: 'none',
                                                                height: '28px'
                                                            }}
                                                        />
                                                    </div>
                                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                                                        <label style={{ fontSize: '9px', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Fim</label>
                                                        <input 
                                                            type="date"
                                                            value={etapa.data_fim || ''}
                                                            onChange={(e) => vincularDatasAEtapa(etapa.id, 'data_fim', e.target.value || null)}
                                                            onClick={(e) => e.stopPropagation()}
                                                            style={{
                                                                width: '100%',
                                                                fontSize: '11px',
                                                                padding: '4px 8px',
                                                                borderRadius: '6px',
                                                                background: 'var(--bg-primary)',
                                                                border: '1px solid var(--border)',
                                                                color: 'var(--text-primary)',
                                                                outline: 'none',
                                                                height: '28px'
                                                            }}
                                                        />
                                                    </div>
                                                </div>
                                            </div>
                                        ))
                                    ) : (
                                        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: '11px', fontStyle: 'italic', textAlign: 'center' }}>
                                            Vazio
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
