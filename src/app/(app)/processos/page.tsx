'use client';

import { useState, useMemo } from 'react';
import { useProcessos } from '@/hooks/useProcessos';
import ProcessoModal from '@/components/ProcessoModal';
import {
    Processo,
    calcularRisco, RISCO_LABELS
} from '@/lib/types';
import { useCadastros } from '@/hooks/useCadastros';
import { differenceInDays, format, parseISO } from 'date-fns';

export default function ProcessosPage() {
    const { 
        processosAtivos, 
        loading, 
        criarProcesso, 
        atualizarProcesso, 
        excluirProcesso 
    } = useProcessos();
    const { cadastros } = useCadastros();
    const [modalOpen, setModalOpen] = useState(false);
    const [selectedProcesso, setSelectedProcesso] = useState<Processo | null>(null);
    const [deleteId, setDeleteId] = useState<string | null>(null);

    // Filtros
    const [busca, setBusca] = useState('');
    const [filtroStatus, setFiltroStatus] = useState('');
    const [filtroTipo, setFiltroTipo] = useState('');
    const [filtroRisco, setFiltroRisco] = useState('');

    const filtrados = useMemo(() => {
        return processosAtivos.filter(p => {
            const matchBusca = !busca ||
                p.assunto.toLowerCase().includes(busca.toLowerCase()) ||
                p.responsavel_execucao.toLowerCase().includes(busca.toLowerCase()) ||
                (p.numero_processo?.toLowerCase().includes(busca.toLowerCase()));
            const matchStatus = !filtroStatus || p.status_kanban === filtroStatus;
            const matchTipo = !filtroTipo || p.tipo_assunto === filtroTipo;
            const risco = calcularRisco(p.data_prazo, p.status_kanban);
            const matchRisco = !filtroRisco || risco === filtroRisco;
            return matchBusca && matchStatus && matchTipo && matchRisco;
        });
    }, [processosAtivos, busca, filtroStatus, filtroTipo, filtroRisco]);

    const handleSave = (data: Partial<Processo>) => {
        if (selectedProcesso) {
            atualizarProcesso(selectedProcesso.id, data);
        } else {
            criarProcesso(data);
        }
        setModalOpen(false);
        setSelectedProcesso(null);
    };

    const handleDelete = (id: string) => {
        excluirProcesso(id);
        setModalOpen(false);
        setSelectedProcesso(null);
        setDeleteId(null);
    };

    if (loading) return <div style={{ padding: 40, color: 'var(--text-secondary)' }}>⏳ Carregando...</div>;

    // Tipos únicos dos processos cadastrados
    const tiposDisponiveis = Array.from(new Set(processosAtivos.map(p => p.tipo_assunto)));

    return (
        <>
            <div className="page-header">
                <div>
                    <h1 className="page-title">📁 Processos</h1>
                    <p className="page-subtitle">{filtrados.length} de {processosAtivos.length} processos</p>
                </div>
                <button
                    className="btn btn-primary"
                    onClick={() => { setSelectedProcesso(null); setModalOpen(true); }}
                >
                    ➕ Novo Processo
                </button>
            </div>

            <div className="page-body">
                {/* Filtros */}
                <div className="card" style={{ marginBottom: '20px' }}>
                    <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'flex-end' }}>
                        <div className="form-group" style={{ flex: '2', minWidth: '200px' }}>
                            <label className="form-label">🔍 Buscar</label>
                            <input
                                className="form-input"
                                placeholder="Assunto, responsável, número..."
                                value={busca}
                                onChange={e => setBusca(e.target.value)}
                            />
                        </div>
                        <div className="form-group" style={{ flex: '1', minWidth: '150px' }}>
                            <label className="form-label">Status</label>
                            <select className="form-select" value={filtroStatus} onChange={e => setFiltroStatus(e.target.value)}>
                                <option value="">Todos</option>
                                {statusAtivos.map(s => (
                                    <option key={s.nome} value={s.nome}>{s.nome}</option>
                                ))}
                            </select>
                        </div>
                        <div className="form-group" style={{ flex: '1', minWidth: '150px' }}>
                            <label className="form-label">Tipo</label>
                            <select className="form-select" value={filtroTipo} onChange={e => setFiltroTipo(e.target.value)}>
                                <option value="">Todos</option>
                                {tiposDisponiveis.map(t => <option key={t} value={t}>{t}</option>)}
                            </select>
                        </div>
                        <div className="form-group" style={{ flex: '1', minWidth: '130px' }}>
                            <label className="form-label">Risco</label>
                            <select className="form-select" value={filtroRisco} onChange={e => setFiltroRisco(e.target.value)}>
                                <option value="">Todos</option>
                                <option value="critico">🔴 Crítico</option>
                                <option value="atencao">🟡 Atenção</option>
                                <option value="no_prazo">🟢 No Prazo</option>
                                <option value="finalizado">✅ Finalizado</option>
                            </select>
                        </div>
                        {(busca || filtroStatus || filtroTipo || filtroRisco) && (
                            <button
                                className="btn btn-secondary"
                                onClick={() => { setBusca(''); setFiltroStatus(''); setFiltroTipo(''); setFiltroRisco(''); }}
                            >
                                ✕ Limpar
                            </button>
                        )}
                    </div>
                </div>

                {/* Tabela */}
                <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                    <div className="table-wrapper">
                        <table>
                            <thead>
                                <tr>
                                    <th>Nº / Tipo</th>
                                    <th>Assunto</th>
                                    <th>Executor</th>
                                    <th>Revisor</th>
                                    <th>Entrada</th>
                                    <th>Prazo</th>
                                    <th>Lead Time</th>
                                    <th>Status</th>
                                    <th>Risco</th>
                                    <th>Ações</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filtrados.length === 0 && (
                                    <tr>
                                        <td colSpan={10}>
                                            <div className="empty-state">
                                                <div className="empty-state-icon">📭</div>
                                                <div className="empty-state-text">Nenhum processo encontrado</div>
                                            </div>
                                        </td>
                                    </tr>
                                )}
                                {filtrados.map(p => {
                                    const risco = calcularRisco(p.data_prazo, p.status_kanban);
                                    const dataFim = p.data_finalizacao ? parseISO(p.data_finalizacao) : new Date();
                                    const leadTime = differenceInDays(dataFim, parseISO(p.data_entrada));
                                    const isDeleting = deleteId === p.id;
                                    return (
                                        <tr key={p.id}>
                                            <td>
                                                <div style={{ fontWeight: 600, fontSize: '12px' }}>
                                                    <span style={{
                                                        background: (statusAtivos.find(s => s.nome === p.status_kanban)?.cor || '#6366f1') + '25',
                                                        color: statusAtivos.find(s => s.nome === p.status_kanban)?.cor || '#6366f1',
                                                        padding: '2px 6px',
                                                        borderRadius: '4px',
                                                        fontSize: '10px',
                                                        marginBottom: '4px',
                                                        display: 'block',
                                                        width: 'fit-content'
                                                    }}>
                                                        {p.tipo_assunto}
                                                    </span>
                                                    {p.numero_processo && (
                                                        <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
                                                            #{p.numero_processo}
                                                        </span>
                                                    )}
                                                </div>
                                            </td>
                                            <td style={{ maxWidth: '200px' }}>
                                                <div style={{ fontSize: '13px' }}>{p.assunto}</div>
                                                {p.observacoes && (
                                                    <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '2px' }}>
                                                        {p.observacoes.slice(0, 60)}...
                                                    </div>
                                                )}
                                            </td>
                                            <td>{p.responsavel_execucao}</td>
                                            <td style={{ color: p.responsavel_revisao ? 'var(--text-primary)' : 'var(--text-muted)' }}>
                                                {p.responsavel_revisao ?? '—'}
                                            </td>
                                            <td style={{ color: 'var(--text-secondary)', fontSize: '12px' }}>
                                                {format(parseISO(p.data_entrada), 'dd/MM/yy')}
                                            </td>
                                            <td>
                                                {p.data_prazo ? (
                                                    <span style={{ fontSize: '12px', fontWeight: 600 }}>
                                                        {format(parseISO(p.data_prazo), 'dd/MM/yy')}
                                                    </span>
                                                ) : (
                                                    <span style={{ color: 'var(--text-muted)' }}>—</span>
                                                )}
                                            </td>
                                            <td>
                                                <span style={{
                                                    background: 'var(--bg-secondary)',
                                                    padding: '3px 8px',
                                                    borderRadius: '6px',
                                                    fontSize: '12px',
                                                    fontWeight: 600
                                                }}>
                                                    {leadTime}d
                                                </span>
                                            </td>
                                            <td>
                                                {(() => {
                                                    const cor = statusAtivos.find(s => s.nome === p.status_kanban)?.cor || '#6366f1';
                                                    return (
                                                        <span 
                                                            className="badge" 
                                                            style={{ 
                                                                fontSize: '10px',
                                                                backgroundColor: `${cor}15`,
                                                                color: cor,
                                                                border: `1px solid ${cor}30`
                                                            }}
                                                        >
                                                            {p.status_kanban}
                                                        </span>
                                                    );
                                                })()}
                                            </td>
                                            <td>
                                                <span className={`badge badge-risco-${risco}`} style={{ fontSize: '10px' }}>
                                                    {RISCO_LABELS[risco]}
                                                </span>
                                            </td>
                                            <td>
                                                {/* Confirmação inline de exclusão */}
                                                {isDeleting ? (
                                                    <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                                                        <span style={{ fontSize: '10px', color: 'var(--accent-red)', whiteSpace: 'nowrap' }}>
                                                            Excluir?
                                                        </span>
                                                        <button
                                                            className="btn btn-danger btn-sm"
                                                            style={{ fontSize: '10px', padding: '2px 6px' }}
                                                            onClick={() => handleDelete(p.id)}
                                                        >
                                                            ✓
                                                        </button>
                                                        <button
                                                            className="btn btn-secondary btn-sm"
                                                            style={{ fontSize: '10px', padding: '2px 6px' }}
                                                            onClick={() => setDeleteId(null)}
                                                        >
                                                            ✕
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <div style={{ display: 'flex', gap: '4px' }}>
                                                        <button
                                                            className="btn btn-secondary btn-sm"
                                                            onClick={() => { setSelectedProcesso(p); setModalOpen(true); }}
                                                            title="Editar"
                                                        >
                                                            ✏️
                                                        </button>
                                                        <button
                                                            className="btn btn-danger btn-sm"
                                                            onClick={() => setDeleteId(p.id)}
                                                            title="Excluir"
                                                        >
                                                            🗑️
                                                        </button>
                                                    </div>
                                                )}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {modalOpen && (
                <ProcessoModal
                    processo={selectedProcesso}
                    onSave={handleSave}
                    onClose={() => { setModalOpen(false); setSelectedProcesso(null); }}
                    onDelete={handleDelete}
                />
            )}
        </>
    );
}
