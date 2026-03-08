'use client';

import { useState, useMemo } from 'react';
import { useRotinas } from '@/hooks/useRotinas';
import RotinaModal from '@/components/RotinaModal';
import {
    Processo, STATUS_KANBAN_LABELS, STATUS_KANBAN_COLORS,
    calcularRisco, RISCO_LABELS
} from '@/lib/types';
import { differenceInDays, format, parseISO } from 'date-fns';

export default function RotinasPage() {
    const { rotinas, loading, criarRotina, atualizarRotina, excluirRotina } = useRotinas();
    const [modalOpen, setModalOpen] = useState(false);
    const [selectedRotina, setSelectedRotina] = useState<Processo | null>(null);
    const [deleteId, setDeleteId] = useState<string | null>(null);

    // Filtros
    const [busca, setBusca] = useState('');
    const [filtroStatus, setFiltroStatus] = useState('');
    const [filtroRisco, setFiltroRisco] = useState('');

    const filtradas = useMemo(() => {
        return rotinas.filter(r => {
            const matchBusca = !busca ||
                r.assunto.toLowerCase().includes(busca.toLowerCase()) ||
                r.responsavel_execucao.toLowerCase().includes(busca.toLowerCase()) ||
                r.tipo_assunto.toLowerCase().includes(busca.toLowerCase());
            const matchStatus = !filtroStatus || r.status_kanban === filtroStatus;
            const risco = calcularRisco(r.data_prazo, r.status_kanban);
            const matchRisco = !filtroRisco || risco === filtroRisco;
            return matchBusca && matchStatus && matchRisco;
        });
    }, [rotinas, busca, filtroStatus, filtroRisco]);

    const handleSave = (data: Partial<Processo>) => {
        if (selectedRotina) {
            atualizarRotina(selectedRotina.id, data);
        } else {
            criarRotina(data);
        }
        setModalOpen(false);
        setSelectedRotina(null);
    };

    const handleDelete = (id: string) => {
        excluirRotina(id);
        setModalOpen(false);
        setSelectedRotina(null);
        setDeleteId(null);
    };

    if (loading) return <div style={{ padding: 40, color: 'var(--text-secondary)' }}>⏳ Carregando...</div>;

    return (
        <>
            <div className="page-header">
                <div>
                    <h1 className="page-title">🔄 Rotinas</h1>
                    <p className="page-subtitle">{filtradas.length} de {rotinas.length} rotinas</p>
                </div>
                <button
                    className="btn btn-primary"
                    onClick={() => { setSelectedRotina(null); setModalOpen(true); }}
                >
                    🔄 Nova Rotina
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
                                placeholder="Tipo, assunto, responsável..."
                                value={busca}
                                onChange={e => setBusca(e.target.value)}
                            />
                        </div>
                        <div className="form-group" style={{ flex: '1', minWidth: '150px' }}>
                            <label className="form-label">Status</label>
                            <select className="form-select" value={filtroStatus} onChange={e => setFiltroStatus(e.target.value)}>
                                <option value="">Todos</option>
                                {Object.entries(STATUS_KANBAN_LABELS).map(([k, v]) => (
                                    <option key={k} value={k}>{v}</option>
                                ))}
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
                        {(busca || filtroStatus || filtroRisco) && (
                            <button
                                className="btn btn-secondary"
                                onClick={() => { setBusca(''); setFiltroStatus(''); setFiltroRisco(''); }}
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
                                    <th>Tipo</th>
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
                                {filtradas.length === 0 && (
                                    <tr>
                                        <td colSpan={10}>
                                            <div className="empty-state">
                                                <div className="empty-state-icon">🔄</div>
                                                <div className="empty-state-text">
                                                    {rotinas.length === 0
                                                        ? 'Nenhuma rotina cadastrada. Clique em "🔄 Nova Rotina" para começar.'
                                                        : 'Nenhuma rotina encontrada com os filtros aplicados.'}
                                                </div>
                                            </div>
                                        </td>
                                    </tr>
                                )}
                                {filtradas.map(r => {
                                    const risco = calcularRisco(r.data_prazo, r.status_kanban);
                                    const dataFim = r.data_finalizacao ? parseISO(r.data_finalizacao) : new Date();
                                    const leadTime = differenceInDays(dataFim, parseISO(r.data_entrada));
                                    const isDeleting = deleteId === r.id;
                                    return (
                                        <tr key={r.id}>
                                            <td>
                                                <span style={{
                                                    background: STATUS_KANBAN_COLORS[r.status_kanban] + '25',
                                                    color: STATUS_KANBAN_COLORS[r.status_kanban],
                                                    padding: '3px 8px',
                                                    borderRadius: '6px',
                                                    fontSize: '11px',
                                                    fontWeight: 600,
                                                    display: 'inline-block',
                                                }}>
                                                    {r.tipo_assunto}
                                                </span>
                                            </td>
                                            <td style={{ maxWidth: '220px' }}>
                                                <div style={{ fontSize: '13px' }}>{r.assunto}</div>
                                                {r.observacoes && (
                                                    <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '2px' }}>
                                                        {r.observacoes.slice(0, 60)}...
                                                    </div>
                                                )}
                                            </td>
                                            <td style={{ color: r.responsavel_execucao ? 'var(--text-primary)' : 'var(--text-muted)' }}>
                                                {r.responsavel_execucao || '—'}
                                            </td>
                                            <td style={{ color: r.responsavel_revisao ? 'var(--text-primary)' : 'var(--text-muted)' }}>
                                                {r.responsavel_revisao ?? '—'}
                                            </td>
                                            <td style={{ color: 'var(--text-secondary)', fontSize: '12px' }}>
                                                {format(parseISO(r.data_entrada), 'dd/MM/yy')}
                                            </td>
                                            <td>
                                                {r.data_prazo ? (
                                                    <span style={{ fontSize: '12px', fontWeight: 600 }}>
                                                        {format(parseISO(r.data_prazo), 'dd/MM/yy')}
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
                                                <span className={`badge badge-${r.status_kanban}`} style={{ fontSize: '10px' }}>
                                                    {STATUS_KANBAN_LABELS[r.status_kanban]}
                                                </span>
                                            </td>
                                            <td>
                                                <span className={`badge badge-risco-${risco}`} style={{ fontSize: '10px' }}>
                                                    {RISCO_LABELS[risco]}
                                                </span>
                                            </td>
                                            <td>
                                                {isDeleting ? (
                                                    <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                                                        <span style={{ fontSize: '10px', color: 'var(--accent-red)', whiteSpace: 'nowrap' }}>
                                                            Excluir?
                                                        </span>
                                                        <button
                                                            className="btn btn-danger btn-sm"
                                                            style={{ fontSize: '10px', padding: '2px 6px' }}
                                                            onClick={() => handleDelete(r.id)}
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
                                                            onClick={() => { setSelectedRotina(r); setModalOpen(true); }}
                                                            title="Editar"
                                                        >
                                                            ✏️
                                                        </button>
                                                        <button
                                                            className="btn btn-danger btn-sm"
                                                            onClick={() => setDeleteId(r.id)}
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
                <RotinaModal
                    rotina={selectedRotina}
                    onSave={handleSave}
                    onClose={() => { setModalOpen(false); setSelectedRotina(null); }}
                    onDelete={handleDelete}
                />
            )}
        </>
    );
}
