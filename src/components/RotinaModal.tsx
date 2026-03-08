'use client';

import { useState } from 'react';
import { Processo, StatusKanban, DataIntermediaria } from '@/lib/types';
import { useCadastros } from '@/hooks/useCadastros';

interface Props {
    rotina?: Processo | null;
    onSave: (data: Partial<Processo>) => void;
    onClose: () => void;
    onDelete?: (id: string) => void;
}

export default function RotinaModal({ rotina, onSave, onClose, onDelete }: Props) {
    const { tiposAtivos, executoresAtivos, revisoresAtivos } = useCadastros();

    const [form, setForm] = useState({
        assunto: rotina?.assunto ?? '',
        tipo_assunto: rotina?.tipo_assunto ?? (tiposAtivos[0]?.nome ?? ''),
        responsavel_execucao: rotina?.responsavel_execucao ?? '',
        responsavel_revisao: rotina?.responsavel_revisao ?? '',
        data_entrada: rotina?.data_entrada
            ? rotina.data_entrada.slice(0, 10)
            : new Date().toISOString().slice(0, 10),
        data_prazo: rotina?.data_prazo ? rotina.data_prazo.slice(0, 10) : '',
        status_kanban: rotina?.status_kanban ?? ('triagem' as StatusKanban),
        observacoes: rotina?.observacoes ?? '',
    });

    // Datas Intermediárias
    const [datasInter, setDatasInter] = useState<DataIntermediaria[]>(
        rotina?.datas_intermediarias ?? []
    );

    const [loading, setLoading] = useState(false);
    const [confirmDelete, setConfirmDelete] = useState(false);

    const addDataInter = () => {
        setDatasInter([...datasInter, { data: '', justificativa: '' }]);
    };

    const updateDataInter = (idx: number, field: keyof DataIntermediaria, value: string) => {
        setDatasInter(datasInter.map((d, i) => i === idx ? { ...d, [field]: value } : d));
    };

    const removeDataInter = (idx: number) => {
        setDatasInter(datasInter.filter((_, i) => i !== idx));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        const datasValidas = datasInter.filter(d => d.data.trim() !== '');
        await onSave({
            ...form,
            data_prazo: form.data_prazo || null,
            responsavel_execucao: form.responsavel_execucao || '',
            responsavel_revisao: form.responsavel_revisao || null,
            numero_processo: null, // Rotinas não têm número de processo
            observacoes: form.observacoes || null,
            datas_intermediarias: datasValidas.length > 0 ? datasValidas : null,
        });
        setLoading(false);
    };

    return (
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
            <div className="modal" style={{ maxWidth: '760px', maxHeight: '92vh', overflowY: 'auto' }}>
                <div className="modal-header">
                    <h2 className="modal-title">
                        {rotina ? '✏️ Editar Rotina' : '🔄 Nova Rotina'}
                    </h2>
                    <button className="modal-close" onClick={onClose}>✕</button>
                </div>

                <form onSubmit={handleSubmit}>
                    <div className="modal-body">
                        {/* Tipo de Assunto */}
                        <div className="form-group">
                            <label className="form-label">Tipo de Assunto *</label>
                            <select
                                className="form-select"
                                value={form.tipo_assunto}
                                onChange={(e) => setForm({ ...form, tipo_assunto: e.target.value })}
                                required
                            >
                                <option value="">— Selecione o Tipo —</option>
                                {tiposAtivos.map((t) => (
                                    <option key={t.id} value={t.nome}>{t.nome}</option>
                                ))}
                            </select>
                            {tiposAtivos.length === 0 && (
                                <span style={{ fontSize: '11px', color: 'var(--accent-yellow)' }}>
                                    ⚠️ Nenhum tipo cadastrado. Acesse <strong>➕ Incluir</strong>.
                                </span>
                            )}
                        </div>

                        {/* Assunto */}
                        <div className="form-group">
                            <label className="form-label">Assunto / Descrição *</label>
                            <input
                                className="form-input"
                                placeholder="Descreva brevemente a rotina..."
                                value={form.assunto}
                                onChange={(e) => setForm({ ...form, assunto: e.target.value })}
                                required
                            />
                        </div>

                        {/* Responsáveis */}
                        <div className="form-grid">
                            <div className="form-group">
                                <label className="form-label">Responsável Execução</label>
                                <select
                                    className="form-select"
                                    value={form.responsavel_execucao}
                                    onChange={(e) => setForm({ ...form, responsavel_execucao: e.target.value })}
                                >
                                    <option value="">— Sem Executor —</option>
                                    {executoresAtivos.map((r) => (
                                        <option key={r.id} value={r.nome}>
                                            {r.nome}{r.cargo ? ` — ${r.cargo}` : ''}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div className="form-group">
                                <label className="form-label">Responsável Revisão</label>
                                <select
                                    className="form-select"
                                    value={form.responsavel_revisao}
                                    onChange={(e) => setForm({ ...form, responsavel_revisao: e.target.value })}
                                >
                                    <option value="">— Sem Revisor —</option>
                                    {revisoresAtivos.map((r) => (
                                        <option key={r.id} value={r.nome}>
                                            {r.nome}{r.cargo ? ` — ${r.cargo}` : ''}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        {/* Datas e Status */}
                        <div className="form-grid-3">
                            <div className="form-group">
                                <label className="form-label">Data de Entrada *</label>
                                <input
                                    className="form-input"
                                    type="date"
                                    value={form.data_entrada}
                                    onChange={(e) => setForm({ ...form, data_entrada: e.target.value })}
                                    required
                                />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Prazo Final</label>
                                <input
                                    className="form-input"
                                    type="date"
                                    value={form.data_prazo}
                                    onChange={(e) => setForm({ ...form, data_prazo: e.target.value })}
                                />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Status *</label>
                                <select
                                    className="form-select"
                                    value={form.status_kanban}
                                    onChange={(e) => setForm({ ...form, status_kanban: e.target.value as StatusKanban })}
                                >
                                    <option value="triagem">Triagem / Backlog</option>
                                    <option value="em_execucao">Em Execução</option>
                                    <option value="aguardando_revisao">Aguardando Revisão</option>
                                    <option value="ajustes">Ajustes</option>
                                    <option value="finalizado">Finalizado</option>
                                </select>
                            </div>
                        </div>

                        {/* Datas Intermediárias */}
                        <div style={{
                            marginTop: '4px',
                            padding: '16px',
                            background: 'var(--bg-secondary)',
                            borderRadius: '12px',
                            border: '1px solid var(--border)'
                        }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                                <div>
                                    <span style={{ fontWeight: 600, fontSize: '13px', color: 'var(--text-primary)' }}>
                                        📅 Datas Intermediárias
                                    </span>
                                    <span style={{ fontSize: '11px', color: 'var(--text-muted)', marginLeft: '8px' }}>
                                        (opcional) — marcos, devoluções e interrupções
                                    </span>
                                </div>
                                <button
                                    type="button"
                                    className="btn btn-secondary btn-sm"
                                    onClick={addDataInter}
                                >
                                    ＋ Adicionar Data
                                </button>
                            </div>

                            {datasInter.length === 0 && (
                                <div style={{ fontSize: '12px', color: 'var(--text-muted)', textAlign: 'center', padding: '8px 0' }}>
                                    Nenhuma data intermediária registrada
                                </div>
                            )}

                            {datasInter.map((d, idx) => (
                                <div
                                    key={idx}
                                    style={{
                                        display: 'grid',
                                        gridTemplateColumns: '160px 1fr auto',
                                        gap: '8px',
                                        alignItems: 'flex-start',
                                        marginBottom: '8px',
                                        padding: '10px 12px',
                                        background: 'var(--bg-primary)',
                                        borderRadius: '8px',
                                        border: '1px solid var(--border)',
                                    }}
                                >
                                    <div className="form-group" style={{ marginBottom: 0 }}>
                                        <label className="form-label" style={{ fontSize: '10px' }}>Data</label>
                                        <input
                                            className="form-input"
                                            type="date"
                                            value={d.data}
                                            onChange={e => updateDataInter(idx, 'data', e.target.value)}
                                            style={{ fontSize: '12px', padding: '6px 8px' }}
                                        />
                                    </div>
                                    <div className="form-group" style={{ marginBottom: 0 }}>
                                        <label className="form-label" style={{ fontSize: '10px' }}>Justificativa / Marco</label>
                                        <input
                                            className="form-input"
                                            placeholder="Ex: Concluída, Pendente de aprovação..."
                                            value={d.justificativa}
                                            onChange={e => updateDataInter(idx, 'justificativa', e.target.value)}
                                            style={{ fontSize: '12px', padding: '6px 8px' }}
                                        />
                                    </div>
                                    <div style={{ paddingTop: '20px' }}>
                                        <button
                                            type="button"
                                            className="btn btn-danger btn-sm"
                                            onClick={() => removeDataInter(idx)}
                                            title="Remover"
                                        >
                                            ✕
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Observações */}
                        <div className="form-group">
                            <label className="form-label">Observações</label>
                            <textarea
                                className="form-textarea"
                                placeholder="Notas adicionais sobre a rotina..."
                                value={form.observacoes}
                                onChange={(e) => setForm({ ...form, observacoes: e.target.value })}
                            />
                        </div>
                    </div>

                    <div className="modal-footer">
                        {rotina && onDelete && (
                            confirmDelete ? (
                                <>
                                    <span style={{ fontSize: '12px', color: 'var(--accent-red)', alignSelf: 'center' }}>
                                        Confirmar exclusão?
                                    </span>
                                    <button
                                        type="button"
                                        className="btn btn-danger btn-sm"
                                        onClick={() => onDelete(rotina.id)}
                                    >
                                        ✓ Sim, excluir
                                    </button>
                                    <button
                                        type="button"
                                        className="btn btn-secondary btn-sm"
                                        onClick={() => setConfirmDelete(false)}
                                    >
                                        ✕ Cancelar
                                    </button>
                                </>
                            ) : (
                                <button
                                    type="button"
                                    className="btn btn-danger btn-sm"
                                    onClick={() => setConfirmDelete(true)}
                                >
                                    🗑️ Excluir
                                </button>
                            )
                        )}
                        <div style={{ flex: 1 }} />
                        <button type="button" className="btn btn-secondary" onClick={onClose}>
                            Cancelar
                        </button>
                        <button type="submit" className="btn btn-primary" disabled={loading}>
                            {loading ? '⏳ Salvando...' : rotina ? '💾 Atualizar' : '🔄 Criar Rotina'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
