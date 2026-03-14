'use client';

import React, { useState, useRef, useMemo } from 'react';
import { useProcessos } from '@/hooks/useProcessos';
import { useRotinas } from '@/hooks/useRotinas';
import { useCadastros } from '@/hooks/useCadastros';
import ProcessoModal from '@/components/ProcessoModal';
import RotinaModal from '@/components/RotinaModal';
import ProcessoViewModal from '@/components/ProcessoViewModal';
import { Processo, StatusKanban, StatusKanbanDef, calcularRisco, RISCO_LABELS } from '@/lib/types';
import { differenceInDays, format, parseISO } from 'date-fns';

export default function KanbanPage() {
    const {
        processosAtivos, loading: loadingP,
        criarProcesso, atualizarProcesso, excluirProcesso,
        moverKanban: moverProcesso
    } = useProcessos();

    const {
        rotinas, loading: loadingR,
        criarRotina, atualizarRotina, excluirRotina,
        moverKanban: moverRotina
    } = useRotinas();

    const { statusAtivos, loaded: loadedCadastros } = useCadastros();

    // Set de IDs de processos para identificar a origem de cada card
    const processoIds = useMemo(() => new Set(processosAtivos.map((p: Processo) => p.id)), [processosAtivos]);

    // Todos os itens juntos
    const todos = useMemo(() => [...processosAtivos, ...rotinas], [processosAtivos, rotinas]);
    const loading = loadingP || loadingR || !loadedCadastros;

    const [modalOpen, setModalOpen] = useState(false);
    const [selectedProcesso, setSelectedProcesso] = useState<Processo | null>(null);
    const [viewModalOpen, setViewModalOpen] = useState(false);
    const [viewingProcesso, setViewingProcesso] = useState<Processo | null>(null);

    // Estado do drag & drop
    const dragCardId = useRef<string | null>(null);
    const [dragOverCol, setDragOverCol] = useState<StatusKanban | null>(null);
    const [draggingId, setDraggingId] = useState<string | null>(null);

    const getByStatus = (status: StatusKanban, isFirstColumn: boolean) =>
        todos.filter((p: Processo) => {
            const statusExiste = statusAtivos.some((s: StatusKanbanDef) => s.nome === p.status_kanban);
            if (!statusExiste && isFirstColumn) return true;
            return p.status_kanban === status;
        });

    // Mover: despacha para o hook correto (processo ou rotina)
    const moverKanban = (id: string, status: StatusKanban) => {
        if (processoIds.has(id)) {
            moverProcesso(id, status);
        } else {
            moverRotina(id, status);
        }
    };

    const handleSave = async (data: Partial<Processo>) => {
        if (selectedProcesso) {
            if (processoIds.has(selectedProcesso.id)) {
                atualizarProcesso(selectedProcesso.id, data);
            } else {
                atualizarRotina(selectedProcesso.id, data);
            }
        } else {
            criarProcesso(data);
        }
        setModalOpen(false);
        setSelectedProcesso(null);
    };

    const handleDelete = (id: string) => {
        if (processoIds.has(id)) {
            excluirProcesso(id);
        } else {
            excluirRotina(id);
        }
        setModalOpen(false);
        setSelectedProcesso(null);
    };

    const getRiscoColor = (p: Processo) => {
        const risco = calcularRisco(p.data_prazo, p.status_kanban);
        const colors = { critico: '#ef4444', atencao: '#f59e0b', no_prazo: '#10b981', finalizado: '#6366f1' };
        return colors[risco];
    };

    /* ===== Handlers Drag & Drop ===== */
    const onDragStart = (e: React.DragEvent, cardId: string) => {
        dragCardId.current = cardId;
        setDraggingId(cardId);
        e.dataTransfer.effectAllowed = 'move';
        setTimeout(() => { }, 0);
    };

    const onDragEnd = () => {
        dragCardId.current = null;
        setDraggingId(null);
        setDragOverCol(null);
    };

    const onDragOver = (e: React.DragEvent, col: StatusKanban) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        setDragOverCol(col);
    };

    const onDragLeave = (e: React.DragEvent) => {
        if (!(e.currentTarget as HTMLElement).contains(e.relatedTarget as Node)) {
            setDragOverCol(null);
        }
    };

    const onDrop = (e: React.DragEvent, targetStatus: StatusKanban) => {
        e.preventDefault();
        const id = dragCardId.current;
        if (!id) return;
        const card = todos.find((p: Processo) => p.id === id);
        if (card && card.status_kanban !== targetStatus) {
            moverKanban(id, targetStatus);
        }
        setDragOverCol(null);
        setDraggingId(null);
        dragCardId.current = null;
    };

    if (loading) return <div style={{ padding: 40, color: 'var(--text-secondary)' }}>⏳ Carregando...</div>;

    const isSelectedARotina = selectedProcesso && !processoIds.has(selectedProcesso.id);

    return (
        <>
            <div className="page-header">
                <div>
                    <h1 className="page-title">📋 Kanban — Fluxo de Processos</h1>
                    <p className="page-subtitle">
                        {todos.length} item{todos.length !== 1 ? 's' : ''} no total
                        <span style={{ color: 'var(--text-muted)', fontSize: '12px', marginLeft: '8px' }}>
                            ({processosAtivos.length} processo{processosAtivos.length !== 1 ? 's' : ''} + {rotinas.length} rotina{rotinas.length !== 1 ? 's' : ''})
                        </span>
                        <span style={{ color: 'var(--text-muted)', fontSize: '12px', marginLeft: '8px' }}>
                            — Arraste os cards entre colunas para alterar o status
                        </span>
                    </p>
                </div>
            </div>

            <div className="page-body">
                <div className="kanban-board">
                    {statusAtivos.map((statusObj: StatusKanbanDef, idx: number) => {
                        const status = statusObj.nome;
                        const cards = getByStatus(status, idx === 0);
                        const isOver = dragOverCol === status;
                        const colColor = statusObj.cor || '#3b82f6';
                        return (
                            <div
                                key={status}
                                className={`kanban-column${isOver ? ' kanban-column-over' : ''}`}
                                onDragOver={(e: React.DragEvent) => onDragOver(e, status)}
                                onDragLeave={onDragLeave}
                                onDrop={(e: React.DragEvent) => onDrop(e, status)}
                                style={{
                                    transition: 'background 0.2s, box-shadow 0.2s',
                                    ...(isOver ? {
                                        background: `${colColor}18`,
                                        boxShadow: `inset 0 0 0 2px ${colColor}60`,
                                        borderRadius: '16px',
                                    } : {})
                                }}
                            >
                                <div
                                    className="kanban-column-header"
                                    style={{ '--col-color': colColor } as React.CSSProperties}
                                >
                                    <span className="kanban-column-title">{status}</span>
                                    <span className="kanban-column-count">{cards.length}</span>
                                </div>

                                <div className="kanban-cards">
                                    {/* Zona de drop vazia */}
                                    {cards.length === 0 && (
                                        <div style={{
                                            border: `2px dashed ${isOver ? colColor : 'var(--border)'}`,
                                            borderRadius: '12px',
                                            padding: '24px',
                                            textAlign: 'center',
                                            color: isOver ? colColor : 'var(--text-muted)',
                                            fontSize: '12px',
                                            transition: 'all 0.2s',
                                            minHeight: '80px',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                        }}>
                                            {isOver ? '⬇️ Soltar aqui' : 'Nenhum item aqui'}
                                        </div>
                                    )}

                                    {cards.map((p: Processo) => {
                                        const leadTime = differenceInDays(new Date(), parseISO(p.data_entrada));
                                        const risco = calcularRisco(p.data_prazo, p.status_kanban);
                                        const isDragging = draggingId === p.id;
                                        const isRotina = !processoIds.has(p.id);
                                        return (
                                            <div
                                                key={p.id}
                                                className="kanban-card"
                                                draggable
                                                onDragStart={(e: React.DragEvent) => onDragStart(e, p.id)}
                                                onDragEnd={onDragEnd}
                                                style={{
                                                    '--card-color': getRiscoColor(p),
                                                    cursor: 'grab',
                                                    opacity: isDragging ? 0.45 : 1,
                                                    transform: isDragging ? 'scale(0.97)' : 'scale(1)',
                                                    transition: 'opacity 0.15s, transform 0.15s, box-shadow 0.15s',
                                                    userSelect: 'none',
                                                    position: 'relative',
                                                } as React.CSSProperties}
                                                onClick={() => { 
                                                    if (!isDragging) { 
                                                        setViewingProcesso(p);
                                                        setViewModalOpen(true);
                                                    } 
                                                }}
                                            >
                                                {/* Botão de Editar no Canto Superior Direito */}
                                                <button
                                                    style={{
                                                        position: 'absolute',
                                                        top: '8px',
                                                        right: '8px',
                                                        background: 'rgba(255, 255, 255, 0.8)',
                                                        border: '1px solid var(--border)',
                                                        borderRadius: '6px',
                                                        width: '24px',
                                                        height: '24px',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        cursor: 'pointer',
                                                        zIndex: 2,
                                                        fontSize: '12px',
                                                        color: 'var(--text-primary)',
                                                        boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
                                                        transition: 'all 0.2s',
                                                    }}
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setSelectedProcesso(p);
                                                        setModalOpen(true);
                                                    }}
                                                    onMouseEnter={(e) => {
                                                        e.currentTarget.style.background = 'white';
                                                        e.currentTarget.style.transform = 'scale(1.1)';
                                                    }}
                                                    onMouseLeave={(e) => {
                                                        e.currentTarget.style.background = 'rgba(255, 255, 255, 0.8)';
                                                        e.currentTarget.style.transform = 'scale(1)';
                                                    }}
                                                    title="Editar"
                                                >
                                                    ✏️
                                                </button>

                                                {/* Handle de drag + badge de tipo */}
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px', paddingRight: '28px' }}>
                                                    <span style={{ fontSize: '14px', color: 'var(--text-muted)', cursor: 'grab', lineHeight: 1 }} title="Arraste para mover">⠿</span>
                                                    <div className="kanban-card-title" style={{ margin: 0, flex: 1 }}>{p.tipo_assunto}</div>
                                                    {isRotina && (
                                                        <span style={{ fontSize: '9px', background: 'rgba(6,182,212,0.15)', color: 'var(--accent-cyan)', border: '1px solid rgba(6,182,212,0.3)', borderRadius: '4px', padding: '1px 5px', whiteSpace: 'nowrap' }}>
                                                            🔄 Rotina
                                                        </span>
                                                    )}
                                                </div>

                                                <div className="kanban-card-meta">
                                                    <div className="kanban-card-meta-row">
                                                        <span>👤</span>
                                                        <span>{p.responsavel_execucao || '—'}</span>
                                                    </div>
                                                    <div className="kanban-card-meta-row">
                                                        <span>📅</span>
                                                        <span>Entrada: {format(parseISO(p.data_entrada), 'dd/MM/yy')}</span>
                                                    </div>
                                                    {p.data_prazo && (
                                                        <div className="kanban-card-meta-row">
                                                            <span>⏰</span>
                                                            <span>Prazo: {format(parseISO(p.data_prazo), 'dd/MM/yy')}</span>
                                                        </div>
                                                    )}
                                                    {p.datas_intermediarias && p.datas_intermediarias.length > 0 && (
                                                        <div className="kanban-card-meta-row">
                                                            <span>🔖</span>
                                                            <span style={{ color: 'var(--accent-cyan)', fontSize: '10px' }}>
                                                                {p.datas_intermediarias.length} marco(s)
                                                            </span>
                                                        </div>
                                                    )}
                                                    <div className="kanban-card-meta-row" style={{ marginTop: '6px', gap: '6px', flexWrap: 'wrap' }}>
                                                        <span className={`badge badge-risco-${risco}`} style={{ fontSize: '10px' }}>
                                                            {RISCO_LABELS[risco]}
                                                        </span>
                                                        <span style={{ fontSize: '10px', color: 'var(--text-muted)', background: 'var(--bg-secondary)', padding: '2px 6px', borderRadius: '4px' }}>
                                                            {leadTime}d no fluxo
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}

                                    {/* Drop zone extra quando coluna já tem cards */}
                                    {cards.length > 0 && isOver && (
                                        <div style={{
                                            border: `2px dashed ${colColor}`,
                                            borderRadius: '12px',
                                            padding: '12px',
                                            textAlign: 'center',
                                            color: colColor,
                                            fontSize: '12px',
                                            marginTop: '4px',
                                            animation: 'pulse 1s infinite',
                                        }}>
                                            ⬇️ Soltar aqui
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {modalOpen && (
                isSelectedARotina ? (
                    <RotinaModal
                        rotina={selectedProcesso}
                        onSave={handleSave}
                        onClose={() => { setModalOpen(false); setSelectedProcesso(null); }}
                        onDelete={handleDelete}
                    />
                ) : (
                    <ProcessoModal
                        processo={selectedProcesso}
                        onSave={handleSave}
                        onClose={() => { setModalOpen(false); setSelectedProcesso(null); }}
                        onDelete={handleDelete}
                    />
                )
            )}

            {viewModalOpen && viewingProcesso && (
                <ProcessoViewModal 
                    item={viewingProcesso} 
                    onClose={() => { setViewModalOpen(false); setViewingProcesso(null); }} 
                />
            )}
        </>
    );
}
