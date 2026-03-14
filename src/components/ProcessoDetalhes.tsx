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
    const { statusAtivos, cadastros, vincularEtapaAoStatus } = useCadastros();
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

    const leadTime = item ? differenceInDays(new Date(), parseISO(item.data_entrada)) : 0;
    const currentStatusIdx = statusAtivos.findIndex(s => s.nome === item.status_kanban);

    const toggleSubEtapa = async (etapaNome: string, subEtapaNome: string) => {
        const key = `${etapaNome}: ${subEtapaNome}`;
        const newChecklist = { ...(item.checklist || {}) };
        newChecklist[key] = !newChecklist[key];

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

    return (
        <div className="processo-detalhes-container">
            {/* Header / Navegação */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '32px' }}>
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
                    <h1 style={{ fontSize: '24px', fontWeight: 700, margin: 0 }}>
                        {item.recorrente ? '🔄 Rotina:' : '📄 Processo:'} {item.tipo_assunto}
                    </h1>
                    <p style={{ color: 'var(--text-muted)', margin: 0 }}>ID: {item.id.slice(0, 8)}...</p>
                </div>
            </div>

            {/* Banner de Status e Progresso */}
            <div style={{
                background: 'var(--bg-secondary)',
                padding: '32px',
                borderRadius: '24px',
                border: '1px solid var(--border)',
                marginBottom: '32px',
                boxShadow: '0 8px 32px rgba(0,0,0,0.05)'
            }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                    <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                        <span style={{ fontSize: '14px', color: 'var(--text-muted)' }}>
                            Há <strong>{leadTime} dias</strong> no fluxo
                        </span>
                    </div>
                    {item.numero_processo && (
                        <div style={{ fontSize: '16px', fontWeight: 600, color: 'var(--accent-purple)' }}>
                            Nº {item.numero_processo}
                        </div>
                    )}
                </div>

                {/* Progress Visualizer */}
                <div style={{ position: 'relative', marginTop: '40px', marginBottom: '40px' }}>
                    <div style={{ 
                        height: '6px', 
                        background: 'var(--border)', 
                        borderRadius: '3px', 
                        position: 'absolute', 
                        top: '50%', 
                        left: 0, 
                        right: 0, 
                        transform: 'translateY(-50%)',
                        zIndex: 0
                    }} />
                    <div style={{ display: 'flex', justifyContent: 'space-between', position: 'relative', zIndex: 1, flexWrap: 'nowrap', overflowX: 'auto', paddingBottom: '10px' }}>
                        {statusAtivos.map((s, i) => {
                            const isPast = i < currentStatusIdx;
                            const isCurrent = i === currentStatusIdx;
                            const color = s.cor || 'var(--accent-blue)';
                            return (
                                <div key={s.id} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', minWidth: '80px', flexShrink: 0 }}>
                                    <div style={{
                                        width: '20px',
                                        height: '20px',
                                        borderRadius: '50%',
                                        background: isCurrent ? color : (isPast ? color : 'var(--bg-primary)'),
                                        border: `3px solid ${isPast || isCurrent ? color : 'var(--border)'}`,
                                        boxShadow: isCurrent ? `0 0 15px ${color}` : 'none',
                                        transition: 'all 0.3s'
                                    }} />
                                    <span style={{ 
                                        fontSize: '12px', 
                                        fontWeight: isCurrent ? 700 : 500,
                                        color: isCurrent ? 'var(--text-primary)' : 'var(--text-muted)',
                                        maxWidth: '80px',
                                        textAlign: 'center'
                                    }}>
                                        {s.nome}
                                    </span>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                {/* Info Rápida e Cabeçalho de Descrição */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: '24px' }}>
                    <div style={{ background: 'var(--bg-secondary)', padding: '24px', borderRadius: '20px', border: '1px solid var(--border)' }}>
                        <h3 style={{ fontSize: '18px', marginBottom: '16px' }}>📝 Descrição e Contexto</h3>
                        <p style={{ fontSize: '16px', fontWeight: 500, color: 'var(--text-primary)', marginBottom: '12px' }}>{item.assunto}</p>
                        <div style={{ padding: '16px', background: 'var(--bg-primary)', borderRadius: '12px', border: '1px solid var(--border)', color: 'var(--text-muted)', fontSize: '14px', whiteSpace: 'pre-wrap' }}>
                            {item.observacoes || 'Nenhuma observação adicional.'}
                        </div>
                    </div>

                    <div style={{ background: 'var(--bg-secondary)', padding: '20px', borderRadius: '20px', border: '1px solid var(--border)' }}>
                        <h3 style={{ fontSize: '16px', marginBottom: '16px' }}>👥 Responsáveis</h3>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                            <div>
                                <label style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--text-muted)', letterSpacing: '0.05em' }}>Execução</label>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
                                    <div style={{ width: '32px', height: '32px', borderRadius: '10px', background: 'var(--accent-blue)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 700, fontSize: '12px' }}>
                                        {item.responsavel_execucao?.[0] || '?'}
                                    </div>
                                    <span style={{ fontSize: '14px', fontWeight: 600 }}>{item.responsavel_execucao || 'Indefinido'}</span>
                                </div>
                            </div>
                            <div>
                                <label style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--text-muted)', letterSpacing: '0.05em' }}>Revisão</label>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
                                    <div style={{ width: '32px', height: '32px', borderRadius: '10px', background: 'var(--accent-purple)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 700, fontSize: '12px' }}>
                                        {item.responsavel_revisao?.[0] || '?'}
                                    </div>
                                    <span style={{ fontSize: '14px', fontWeight: 600 }}>{item.responsavel_revisao || 'Ninguém'}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* FLUXO EM FORMATO KANBAN (HORIZONTAL) */}
                {etapasRelacionadas.length > 0 && (
                    <div style={{ background: 'var(--bg-secondary)', padding: '24px', borderRadius: '24px', border: '1px solid var(--border)', overflow: 'hidden' }}>
                        <h3 style={{ fontSize: '18px', marginBottom: '20px', paddingLeft: '4px' }}>🌊 Kanban de Fluxo (Arraste as etapas entre os status)</h3>
                        
                        <div style={{ 
                            display: 'flex', 
                            gap: '20px', 
                            overflowX: 'auto', 
                            paddingBottom: '20px',
                            minHeight: '400px',
                            scrollSnapType: 'x mandatory'
                        }}>
                            {statusAtivos.map((statusObj) => {
                                const status = statusObj.nome;
                                const etapasNoStatus = etapasRelacionadas.filter(e => {
                                    if (!e.status_vinculado && statusObj.ordem === 1) return true; // Primeira coluna pega os sem vínculo
                                    return e.status_vinculado === status;
                                });
                                const isOver = dragOverStatus === status;
                                
                                return (
                                    <div 
                                        key={status} 
                                        onDragOver={(e) => onDragOver(e, status)}
                                        onDrop={(e) => onDrop(e, status)}
                                        style={{ 
                                            minWidth: '320px',
                                            maxWidth: '320px',
                                            background: isOver ? 'var(--bg-secondary)' : 'var(--bg-primary)',
                                            borderRadius: '20px',
                                            border: `2px ${isOver ? 'dashed' : 'solid'} ${isOver ? (statusObj.cor || 'var(--accent-blue)') : 'var(--border)'}`,
                                            padding: '20px',
                                            display: 'flex',
                                            flexDirection: 'column',
                                            gap: '16px',
                                            scrollSnapAlign: 'start',
                                            boxShadow: '0 4px 12px rgba(0,0,0,0.03)',
                                            transition: 'all 0.2s'
                                        }}
                                    >
                                        <div style={{ borderBottom: `2px solid ${statusObj.cor || 'var(--accent-blue)'}`, paddingBottom: '12px' }}>
                                            <div style={{ fontSize: '17px', fontWeight: 700, color: 'var(--text-primary)' }}>{status}</div>
                                        </div>

                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', flex: 1 }}>
                                            {etapasNoStatus.length > 0 ? (
                                                etapasNoStatus.map((etapa) => (
                                                    <div 
                                                        key={etapa.id} 
                                                        draggable
                                                        onDragStart={(e) => onDragStart(e, etapa.id)}
                                                        style={{ 
                                                            background: 'var(--bg-secondary)',
                                                            borderRadius: '16px',
                                                            border: '1px solid var(--border)',
                                                            padding: '16px',
                                                            cursor: 'grab',
                                                            opacity: draggingEtapaId === etapa.id ? 0.5 : 1
                                                        }}
                                                    >
                                                        <div style={{ fontSize: '14px', fontWeight: 700, marginBottom: '12px', color: 'var(--text-primary)' }}>
                                                            {etapa.nome}
                                                        </div>
                                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                                            {etapa.sub_etapas?.map((sub, sIdx) => {
                                                                const isDone = !!item.checklist?.[`${etapa.nome}: ${sub}`];
                                                                return (
                                                                    <div 
                                                                        key={sIdx}
                                                                        onClick={(e) => { e.stopPropagation(); toggleSubEtapa(etapa.nome, sub); }}
                                                                        style={{ 
                                                                            display: 'flex', 
                                                                            alignItems: 'center', 
                                                                            gap: '8px',
                                                                            fontSize: '13px',
                                                                            color: isDone ? 'var(--text-muted)' : 'var(--text-secondary)',
                                                                            cursor: 'pointer',
                                                                            userSelect: 'none'
                                                                        }}
                                                                    >
                                                                        <div style={{ 
                                                                            width: '18px', 
                                                                            height: '18px', 
                                                                            borderRadius: '5px', 
                                                                            border: `2px solid ${isDone ? 'var(--accent-green)' : 'var(--border)'}`,
                                                                            background: isDone ? 'var(--accent-green)' : 'transparent',
                                                                            display: 'flex',
                                                                            alignItems: 'center',
                                                                            justifyContent: 'center',
                                                                            color: 'white',
                                                                            fontSize: '11px'
                                                                        }}>
                                                                            {isDone && '✓'}
                                                                        </div>
                                                                        <span style={{ textDecoration: isDone ? 'line-through' : 'none' }}>
                                                                            {sub.startsWith('• ') ? sub.slice(2) : sub}
                                                                        </span>
                                                                    </div>
                                                                );
                                                            })}
                                                        </div>
                                                    </div>
                                                ))
                                            ) : (
                                                <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: '13px', fontStyle: 'italic', padding: '20px' }}>
                                                    Solte etapas aqui
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
