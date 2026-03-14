'use client';

import React, { useMemo } from 'react';
import { Processo, calcularRisco, RISCO_LABELS, FluxoEtapa } from '@/lib/types';
import { format, parseISO, differenceInDays } from 'date-fns';
import { useCadastros, TipoAssunto } from '@/hooks/useCadastros';

interface Props {
    item: Processo;
    onBack?: () => void;
    showBackButton?: boolean;
}

export default function ProcessoDetalhes({ item, onBack, showBackButton = false }: Props) {
    const { statusAtivos, cadastros } = useCadastros();

    const etapas = useMemo(() => {
        if (!item || !cadastros.tiposAssunto.length) return [];
        const tipoId = cadastros.tiposAssunto.find((t: TipoAssunto) => t.nome === item.tipo_assunto)?.id;
        if (!tipoId) return [];
        return cadastros.fluxoEtapas
            .filter((e: FluxoEtapa) => e.tipo_assunto_id === tipoId)
            .sort((a: FluxoEtapa, b: FluxoEtapa) => a.ordem - b.ordem);
    }, [item, cadastros]);

    const risco = useMemo(() => item ? calcularRisco(item.data_prazo, item.status_kanban) : 'no_prazo', [item]);
    const leadTime = item ? differenceInDays(new Date(), parseISO(item.data_entrada)) : 0;

    const currentStatusIdx = statusAtivos.findIndex(s => s.nome === item.status_kanban);

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
                         <span className={`badge badge-risco-${risco}`} style={{ fontSize: '14px', padding: '6px 12px' }}>
                            {RISCO_LABELS[risco]}
                        </span>
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

            <div style={{ display: 'grid', gridTemplateColumns: '1fr minmax(300px, 340px)', gap: '24px' }}>
                {/* Coluna Principal */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                    {/* Assunto e Observações */}
                    <div style={{ background: 'var(--bg-secondary)', padding: '24px', borderRadius: '20px', border: '1px solid var(--border)' }}>
                        <h3 style={{ fontSize: '18px', marginBottom: '16px' }}>📝 Descrição e Contexto</h3>
                        <p style={{ fontSize: '16px', fontWeight: 500, color: 'var(--text-primary)', marginBottom: '16px' }}>{item.assunto}</p>
                        <div style={{ padding: '16px', background: 'var(--bg-primary)', borderRadius: '12px', border: '1px solid var(--border)', color: 'var(--text-muted)', fontSize: '14px', whiteSpace: 'pre-wrap' }}>
                            {item.observacoes || 'Nenhuma observação adicional.'}
                        </div>
                    </div>

                    {/* Timeline de Marcos */}
                    <div style={{ background: 'var(--bg-secondary)', padding: '24px', borderRadius: '20px', border: '1px solid var(--border)' }}>
                        <h3 style={{ fontSize: '18px', marginBottom: '16px' }}>📅 Linha do Tempo de Marcos (Datas Intermediárias)</h3>
                        {item.datas_intermediarias && item.datas_intermediarias.length > 0 ? (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                {item.datas_intermediarias.map((d, i) => (
                                    <div key={i} style={{ 
                                        display: 'flex', 
                                        gap: '16px', 
                                        alignItems: 'flex-start',
                                        padding: '12px',
                                        borderLeft: '3px solid var(--accent-blue)',
                                        background: 'rgba(59, 130, 246, 0.05)',
                                        borderRadius: '0 12px 12px 0'
                                    }}>
                                        <div style={{ fontWeight: 700, whiteSpace: 'nowrap', fontSize: '14px' }}>{format(parseISO(d.data), 'dd/MM/yyyy')}</div>
                                        <div style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>{d.justificativa}</div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p style={{ color: 'var(--text-muted)', fontSize: '14px' }}>Nenhum marco registrado até o momento.</p>
                        )}
                      {/* FLUXO DE TRABALHO ESTIPULADO */}
                    {etapas.length > 0 && (
                        <div style={{ background: 'var(--bg-secondary)', padding: '24px', borderRadius: '20px', border: '1px solid var(--border)' }}>
                            <h3 style={{ fontSize: '18px', marginBottom: '16px' }}>🌊 Fluxo de Trabalho e Checklists</h3>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                {etapas.map((etapa, idx) => (
                                    <div key={etapa.id} style={{ 
                                        padding: '16px',
                                        background: 'var(--bg-primary)',
                                        borderRadius: '16px',
                                        border: '1px solid var(--border)'
                                    }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: (etapa.sub_etapas && etapa.sub_etapas.length > 0) ? '12px' : 0 }}>
                                            <div>
                                                <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Etapa {idx + 1}</div>
                                                <div style={{ fontSize: '16px', fontWeight: 600 }}>{etapa.nome}</div>
                                            </div>
                                        </div>

                                        {(etapa.sub_etapas && etapa.sub_etapas.length > 0) && (
                                            <div style={{ 
                                                display: 'grid', 
                                                gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', 
                                                gap: '8px',
                                                padding: '12px',
                                                background: 'var(--bg-secondary)',
                                                borderRadius: '12px',
                                                border: '1px solid var(--border)'
                                            }}>
                                                {etapa.sub_etapas.map((sub, sIdx) => (
                                                    <div key={sIdx} style={{ 
                                                        display: 'flex', 
                                                        alignItems: 'center', 
                                                        gap: '8px',
                                                        fontSize: '13px',
                                                        color: 'var(--text-secondary)'
                                                    }}>
                                                        <div style={{ 
                                                            width: '16px', 
                                                            height: '16px', 
                                                            borderRadius: '4px', 
                                                            border: '2px solid var(--border)',
                                                            flexShrink: 0
                                                        }} />
                                                        {sub}
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
 </div>
                    )}
                </div>

                {/* Coluna Lateral - Info Rápida */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                    {/* Responsáveis */}
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

                    {/* Datas Importantes */}
                    <div style={{ background: 'var(--bg-secondary)', padding: '20px', borderRadius: '20px', border: '1px solid var(--border)' }}>
                        <h3 style={{ fontSize: '16px', marginBottom: '16px' }}>🗓️ Prazos e Datas</h3>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px' }}>
                                <span style={{ color: 'var(--text-muted)' }}>Criação:</span>
                                <span style={{ fontWeight: 600 }}>{format(parseISO(item.data_entrada), 'dd/MM/yyyy')}</span>
                            </div>
                            {item.data_prazo && (
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px' }}>
                                    <span style={{ color: 'var(--text-muted)' }}>Prazo Final:</span>
                                    <span style={{ fontWeight: 600, color: risco === 'critico' ? 'var(--accent-red)' : 'inherit' }}>{format(parseISO(item.data_prazo), 'dd/MM/yyyy')}</span>
                                </div>
                            )}
                            {item.data_finalizacao && (
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px' }}>
                                    <span style={{ color: 'var(--text-muted)' }}>Concluído em:</span>
                                    <span style={{ fontWeight: 600, color: 'var(--accent-green)' }}>{format(parseISO(item.data_finalizacao), 'dd/MM/yyyy')}</span>
                                </div>
                            )}
                            {item.proxima_execucao && (
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', paddingTop: '8px', borderTop: '1px solid var(--border)' }}>
                                    <span style={{ color: 'var(--text-muted)' }}>Próxima Rotina:</span>
                                    <span style={{ fontWeight: 600, color: 'var(--accent-cyan)' }}>{format(parseISO(item.proxima_execucao), 'dd/MM/yyyy')}</span>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
