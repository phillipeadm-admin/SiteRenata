'use client';

import React, { useMemo, useState } from 'react';
import { Processo, calcularRisco, RISCO_LABELS, FluxoEtapa } from '@/lib/types';
import { format, parseISO, differenceInDays } from 'date-fns';
import { useCadastros, TipoAssunto } from '@/hooks/useCadastros';
import { useProcessos } from '@/hooks/useProcessos';
import { supabase } from '@/lib/supabase';

interface Props {
    item: Processo;
    onBack?: () => void;
    showBackButton?: boolean;
}

export default function ProcessoDetalhes({ item, onBack, showBackButton = false }: Props) {
    const { statusAtivos, cadastros, vincularEtapaAoStatus, vincularResponsavelAEtapa, executoresAtivos } = useCadastros();
    const { atualizarProcesso } = useProcessos();

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
    const toggleSubEtapa = async (etapaNome: string, subEtapaNome: string) => {
        const key = `${etapaNome}: ${subEtapaNome}`;
        const currentChecklist = item.checklist || {};
        const newChecklist = { ...currentChecklist };
        
        // Inverte o estado ou remove se for falso (para limpar o JSON)
        if (newChecklist[key]) {
            delete newChecklist[key];
        } else {
            newChecklist[key] = true;
        }

        try {
            await atualizarProcesso(item.id, { checklist: newChecklist });
        } catch (error) {
            console.error("Erro ao atualizar checklist:", error);
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
                    gap: '12px', 
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
                                    minWidth: '0', // Importante para o flex equilibrar as larguras
                                    background: isOver ? 'rgba(0,0,0,0.02)' : 'var(--bg-primary)',
                                    borderRadius: '16px',
                                    border: `2px ${isOver ? 'dashed' : 'solid'} ${isOver ? (statusObj.cor || 'var(--accent-blue)') : 'var(--border)'}`,
                                    padding: '12px',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: '10px',
                                    transition: 'all 0.2s',
                                    boxShadow: '0 2px 8px rgba(0,0,0,0.02)'
                                }}
                            >
                                <div style={{ 
                                    borderBottom: `3px solid ${statusObj.cor || 'var(--accent-blue)'}`, 
                                    paddingBottom: '8px',
                                    marginBottom: '4px'
                                }}>
                                    <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                        {status}
                                    </div>
                                </div>

                                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', flex: 1, overflowY: 'auto' }}>
                                    {etapasNoStatus.length > 0 ? (
                                        etapasNoStatus.map((etapa) => (
                                            <div 
                                                key={etapa.id} 
                                                draggable
                                                onDragStart={(e) => onDragStart(e, etapa.id)}
                                                style={{ 
                                                    background: 'var(--bg-secondary)',
                                                    borderRadius: '12px',
                                                    border: '1px solid var(--border)',
                                                    padding: '12px',
                                                    cursor: 'grab',
                                                    opacity: draggingEtapaId === etapa.id ? 0.5 : 1,
                                                    boxShadow: '0 2px 4px rgba(0,0,0,0.03)'
                                                }}
                                            >
                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                                                    <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1.2 }}>
                                                        {etapa.nome}
                                                    </div>
                                                </div>

                                                {/* Seletor de Responsável por Etapa */}
                                                <div style={{ marginBottom: '12px' }}>
                                                    <select 
                                                        value={etapa.responsavel_nome || ''}
                                                        onChange={(e) => vincularResponsavelAEtapa(etapa.id, e.target.value || null)}
                                                        style={{
                                                            width: '100%',
                                                            fontSize: '11px',
                                                            padding: '4px 6px',
                                                            borderRadius: '6px',
                                                            background: 'var(--bg-primary)',
                                                            border: '1px solid var(--border)',
                                                            color: etapa.responsavel_nome ? 'var(--text-primary)' : 'var(--text-muted)',
                                                            outline: 'none'
                                                        }}
                                                        onClick={(e) => e.stopPropagation()}
                                                    >
                                                        <option value="">👤 Responsável...</option>
                                                        {executoresAtivos.map(res => (
                                                            <option key={res.id} value={res.nome}>{res.nome}</option>
                                                        ))}
                                                    </select>
                                                </div>

                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                                    {etapa.sub_etapas?.map((sub, sIdx) => {
                                                        const isDone = !!item.checklist?.[`${etapa.nome}: ${sub}`];
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
                                                                    gap: '6px',
                                                                    fontSize: '12px',
                                                                    color: isDone ? 'var(--text-muted)' : 'var(--text-secondary)',
                                                                    cursor: 'pointer',
                                                                    userSelect: 'none',
                                                                    padding: '2px 0'
                                                                }}
                                                            >
                                                                <div style={{ 
                                                                    width: '16px', 
                                                                    height: '16px', 
                                                                    borderRadius: '4px', 
                                                                    border: `1.5px solid ${isDone ? 'var(--accent-green)' : 'var(--border)'}`,
                                                                    background: isDone ? 'var(--accent-green)' : 'transparent',
                                                                    display: 'flex',
                                                                    alignItems: 'center',
                                                                    justifyContent: 'center',
                                                                    color: 'white',
                                                                    fontSize: '10px',
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
