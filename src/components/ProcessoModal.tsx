'use client';

import { useState } from 'react';
import { Processo, StatusKanban, DataIntermediaria } from '@/lib/types';
import { useCadastros } from '@/hooks/useCadastros';

interface Props {
    processo?: Processo | null;
    onSave: (data: Partial<Processo>) => void;
    onClose: () => void;
    onDelete?: (id: string) => void;
}

export default function ProcessoModal({ processo, onSave, onClose, onDelete }: Props) {
    const { tiposAtivos, executoresAtivos, revisoresAtivos, statusAtivos } = useCadastros();

    const [form, setForm] = useState({
        assunto: processo?.assunto ?? '',
        tipo_assunto: processo?.tipo_assunto ?? (tiposAtivos[0]?.nome ?? ''),
        numero_processo: processo?.numero_processo ?? '',
        observacoes: processo?.observacoes ?? '',
        data_entrada: processo?.data_entrada
            ? processo.data_entrada.slice(0, 10)
            : new Date().toISOString().slice(0, 10),
        data_prazo: processo?.data_prazo ? processo.data_prazo.slice(0, 10) : '',
        status_kanban: processo?.status_kanban ?? (statusAtivos[0]?.nome ?? 'Triagem / Backlog'),
    });

    const [responsaveisExec, setResponsaveisExec] = useState<string[]>(
        processo?.responsavel_execucao 
            ? processo.responsavel_execucao.split(',').map(s => s.trim()).filter(Boolean) 
            : []
    );
    const [responsaveisRev, setResponsaveisRev] = useState<string[]>(
        processo?.responsavel_revisao
            ? processo.responsavel_revisao.split(',').map(s => s.trim()).filter(Boolean) 
            : []
    );

    // Datas Intermediárias
    const [datasInter, setDatasInter] = useState<DataIntermediaria[]>(
        processo?.datas_intermediarias ?? []
    );

    const [loading, setLoading] = useState(false);
    const [confirmDelete, setConfirmDelete] = useState(false);

    const addDataInter = () => {
        setDatasInter([...datasInter, { data: '', justificativa: '' }]);
    };

    const updateDataInter = (idx: number, field: keyof DataIntermediaria, value: string) => {
        setDatasInter(datasInter.map((d: DataIntermediaria, i: number) => i === idx ? { ...d, [field]: value } : d));
    };

    const removeDataInter = (idx: number) => {
        setDatasInter(datasInter.filter((_: DataIntermediaria, i: number) => i !== idx));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        const datasValidas = datasInter.filter((d: DataIntermediaria) => d.data.trim() !== '');
        await onSave({
            ...form,
            responsavel_execucao: responsaveisExec.join(', '),
            responsavel_revisao: responsaveisRev.join(', ') || null,
            data_prazo: form.data_prazo || null,
            numero_processo: form.numero_processo || null,
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
                        {processo ? '✏️ Editar Processo' : '➕ Novo Processo'}
                    </h2>
                    <button className="modal-close" onClick={onClose}>✕</button>
                </div>

                <form onSubmit={handleSubmit}>
                    <div className="modal-body">
                        {/* Tipo e Número */}
                        <div className="form-grid">
                            <div className="form-group">
                                <label className="form-label">Tipo de Assunto *</label>
                                    <select
                                        className="form-select"
                                        value={form.tipo_assunto}
                                        onChange={(e) => {
                                            const selectedNome = e.target.value;
                                            setForm({ ...form, tipo_assunto: selectedNome });
                                            
                                            // Auto-preenchimento de responsáveis se estiverem vazios
                                            if (!processo) { // Apenas para novos processos
                                                const tipo = tiposAtivos.find(t => t.nome === selectedNome);
                                                if (tipo) {
                                                    if (responsaveisExec.length === 0 && tipo.responsavel_execucao) {
                                                        const execs = tipo.responsavel_execucao.split(',').map(s => s.trim()).filter(Boolean);
                                                        setResponsaveisExec(execs);
                                                    }
                                                    if (responsaveisRev.length === 0 && tipo.responsavel_revisao) {
                                                        const revs = tipo.responsavel_revisao.split(',').map(s => s.trim()).filter(Boolean);
                                                        setResponsaveisRev(revs);
                                                    }
                                                }
                                            }
                                        }}
                                        required
                                    >
                                        <option value="">— Selecione o Tipo —</option>
                                        {tiposAtivos.map((t: any) => (
                                            <option key={t.id} value={t.nome}>{t.nome}</option>
                                        ))}
                                    </select>
                                {tiposAtivos.length === 0 && (
                                    <span style={{ fontSize: '11px', color: 'var(--accent-yellow)' }}>
                                        ⚠️ Nenhum tipo cadastrado. Acesse <strong>➕ Incluir</strong>.
                                    </span>
                                )}
                            </div>
                            <div className="form-group">
                                <label className="form-label">Nº do Processo</label>
                                <input
                                    className="form-input"
                                    placeholder="Ex: 2026/001234"
                                    value={form.numero_processo}
                                    onChange={(e) => setForm({ ...form, numero_processo: e.target.value })}
                                />
                            </div>
                        </div>

                        {/* Assunto */}
                        <div className="form-group">
                            <label className="form-label">Assunto / Descrição *</label>
                            <input
                                className="form-input"
                                placeholder="Descreva brevemente o processo..."
                                value={form.assunto}
                                onChange={(e) => setForm({ ...form, assunto: e.target.value })}
                                required
                            />
                        </div>

                        {/* Responsáveis */}
                        {/* Responsáveis Execução */}
                        <div className="form-group">
                            <label className="form-label">Responsáveis Execução</label>
                            <select
                                className="form-input"
                                value=""
                                onChange={(e) => {
                                    const val = e.target.value;
                                    if (val && !responsaveisExec.includes(val)) {
                                        setResponsaveisExec([...responsaveisExec, val]);
                                    }
                                }}
                            >
                                <option value="">— Selecionar para adicionar —</option>
                                {executoresAtivos.map((r: any) => (
                                    <option key={r.id} value={r.nome}>{r.nome}{r.cargo ? ` (${r.cargo})` : ''}</option>
                                ))}
                            </select>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '8px' }}>
                                {responsaveisExec.map(nome => (
                                    <span key={nome} style={{
                                        background: 'var(--bg-secondary)', border: '1px solid var(--border)', fontSize: '12px',
                                        padding: '2px 8px', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '4px'
                                    }}>
                                        {nome}
                                        <button type="button" onClick={() => setResponsaveisExec(responsaveisExec.filter(n => n !== nome))}
                                          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>&times;</button>
                                    </span>
                                ))}
                            </div>
                        </div>

                        {/* Responsáveis Revisão */}
                        <div className="form-group">
                            <label className="form-label">Responsáveis Revisão</label>
                            <select
                                className="form-input"
                                value=""
                                onChange={(e) => {
                                    const val = e.target.value;
                                    if (val && !responsaveisRev.includes(val)) {
                                        setResponsaveisRev([...responsaveisRev, val]);
                                    }
                                }}
                            >
                                <option value="">— Selecionar para adicionar —</option>
                                {revisoresAtivos.map((r: any) => (
                                    <option key={r.id} value={r.nome}>{r.nome}{r.cargo ? ` (${r.cargo})` : ''}</option>
                                ))}
                            </select>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '8px' }}>
                                {responsaveisRev.map(nome => (
                                    <span key={nome} style={{
                                        background: 'var(--bg-secondary)', border: '1px solid var(--border)', fontSize: '12px',
                                        padding: '2px 8px', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '4px'
                                    }}>
                                        {nome}
                                        <button type="button" onClick={() => setResponsaveisRev(responsaveisRev.filter(n => n !== nome))}
                                          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>&times;</button>
                                    </span>
                                ))}
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
                                <label className="form-label">Kanban *</label>
                                <select
                                    className="form-select"
                                    value={form.status_kanban}
                                    onChange={(e) => setForm({ ...form, status_kanban: e.target.value as StatusKanban })}
                                    required
                                >
                                    {statusAtivos.length === 0 && <option value="Triagem / Backlog">Triagem / Backlog</option>}
                                    {statusAtivos.map((s: any) => (
                                        <option key={s.id} value={s.nome}>{s.nome}</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        {/* ===== DATAS INTERMEDIÁRIAS ===== */}
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
                                        (opcional) — marcos, devoluções e interrupções do processo
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

                            {datasInter.map((d: any, idx: number) => (
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
                                            onChange={(e: any) => updateDataInter(idx, 'data', e.target.value)}
                                            style={{ fontSize: '12px', padding: '6px 8px' }}
                                        />
                                    </div>
                                    <div className="form-group" style={{ marginBottom: 0 }}>
                                        <label className="form-label" style={{ fontSize: '10px' }}>Justificativa / Marco</label>
                                        <input
                                            className="form-input"
                                            placeholder="Ex: Devolvido para ajuste, Aprovação recebida..."
                                            value={d.justificativa}
                                            onChange={(e: any) => updateDataInter(idx, 'justificativa', e.target.value)}
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
                                placeholder="Notas adicionais sobre o processo..."
                                value={form.observacoes}
                                onChange={(e) => setForm({ ...form, observacoes: e.target.value })}
                            />
                        </div>
                    </div>

                    <div className="modal-footer">
                        {/* Confirmação de exclusão inline */}
                        {processo && onDelete && (
                            confirmDelete ? (
                                <>
                                    <span style={{ fontSize: '12px', color: 'var(--accent-red)', alignSelf: 'center' }}>
                                        Confirmar exclusão?
                                    </span>
                                    <button
                                        type="button"
                                        className="btn btn-danger btn-sm"
                                        onClick={() => onDelete(processo.id)}
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
                            {loading ? '⏳ Salvando...' : processo ? '💾 Atualizar' : '✅ Criar Processo'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
