'use client';

import { useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useCadastros, Responsavel, TipoAssunto } from '@/hooks/useCadastros';
import { FluxoEtapa, StatusKanbanDef } from '@/lib/types';

type Aba = 'tipos' | 'responsaveis' | 'status' | 'fluxo';

export default function CadastrosPage() {
    const {
        cadastros, statusAtivos,
        addTipo, updateTipo, deleteTipo,
        addResponsavel, updateResponsavel, deleteResponsavel,
        addStatus, updateStatus, deleteStatus,
        addFluxoEtapa, updateFluxoEtapa, deleteFluxoEtapa
    } = useCadastros();

    const searchParams = useSearchParams();
    const abaParam = searchParams.get('aba') as Aba;
    const [aba, setAba] = useState<Aba>(abaParam || 'tipos');

    /* ---- Estados de edição e confirmação de exclusão ---- */
    const [novoTipo, setNovoTipo] = useState({ nome: '', responsavel_execucao: '', responsavel_revisao: '' });
    const [editTipoId, setEditTipoId] = useState<string | null>(null);
    const [editTipo, setEditTipo] = useState({ nome: '', responsavel_execucao: '', responsavel_revisao: '' });
    const [deleteTipoId, setDeleteTipoId] = useState<string | null>(null);

    const [novoResp, setNovoResp] = useState({ nome: '', cargo: '', tipo: 'execucao' as Responsavel['tipo'] });
    const [editRespId, setEditRespId] = useState<string | null>(null);
    const [editResp, setEditResp] = useState({ nome: '', cargo: '', tipo: 'execucao' as Responsavel['tipo'] });
    const [deleteRespId, setDeleteRespId] = useState<string | null>(null);

    const [novoStatus, setNovoStatus] = useState({ nome: '', cor: '#6366f1', ordem: 1 });
    const [editStatusId, setEditStatusId] = useState<string | null>(null);
    const [editStatus, setEditStatus] = useState({ nome: '', cor: '#6366f1', ordem: 1 });
    const [deleteStatusId, setDeleteStatusId] = useState<string | null>(null);

    const [tipoFluxoId, setTipoFluxoId] = useState<string>('');
    const [novaEtapa, setNovaEtapa] = useState<{ nome: string, ordem: number, sub_etapas: string[] }>({ nome: '', ordem: 1, sub_etapas: [] });
    const [editEtapaId, setEditEtapaId] = useState<string | null>(null);
    const [editEtapa, setEditEtapa] = useState<{ nome: string, ordem: number, sub_etapas: string[] }>({ nome: '', ordem: 1, sub_etapas: [] });
    const [deleteEtapaId, setDeleteEtapaId] = useState<string | null>(null);
    const [novaSubEtapa, setNovaSubEtapa] = useState('');

    const responsaveisDaAba = cadastros.responsaveis;
    const statusOrdenados = [...cadastros.statusKanban].sort((a, b) => a.ordem - b.ordem);

    return (
        <>
            <div className="page-header">
                <div>
                    <h1 className="page-title">➕ Incluir — Cadastros do Sistema</h1>
                    <p className="page-subtitle">Gerencie os dados que alimentam os formulários de processo e colunas do Kanban</p>
                </div>
            </div>

            <div className="page-body">
                {/* Abas */}
                <div style={{ display: 'flex', gap: '8px', marginBottom: '24px' }}>
                    {([
                        { key: 'tipos', label: '📂 Processo e Rotina' },
                        { key: 'responsaveis', label: '👤 Responsáveis' },
                        { key: 'status', label: '📊 Kanban' },
                        { key: 'fluxo', label: '🌊 Fluxo' },
                    ] as { key: Aba; label: string }[]).map(tab => (
                        <button
                            key={tab.key}
                            className={`btn ${aba === tab.key ? 'btn-primary' : 'btn-secondary'}`}
                            onClick={() => setAba(tab.key)}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>

                {/* ===== ABA: TIPOS DE ASSUNTO ===== */}
                {aba === 'tipos' && (
                    <div className="card">
                        <div className="card-header">
                            <h2 className="card-title">📂 Definição de Processo e Rotina</h2>
                            <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                                {cadastros.tiposAssunto.length} registros
                            </span>
                        </div>

                        <div style={{
                            display: 'grid', gridTemplateColumns: '1fr 1fr 1fr auto', gap: '10px',
                            marginBottom: '20px', padding: '16px',
                            background: 'var(--bg-secondary)', borderRadius: '12px',
                            border: '1px solid var(--border)', alignItems: 'start'
                        }}>
                            <div className="form-group">
                                <label className="form-label">Nome do Tipo *</label>
                                <input
                                    className="form-input"
                                    placeholder="Ex: Adicional Noturno"
                                    value={novoTipo.nome}
                                    onChange={e => setNovoTipo({ ...novoTipo, nome: e.target.value })}
                                />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Executores Padrão</label>
                                <select
                                    className="form-select"
                                    value=""
                                    onChange={e => {
                                        const val = e.target.value;
                                        if (val) {
                                            const current = novoTipo.responsavel_execucao ? novoTipo.responsavel_execucao.split(',').map(s => s.trim()).filter(Boolean) : [];
                                            if (!current.includes(val)) {
                                                setNovoTipo({ ...novoTipo, responsavel_execucao: [...current, val].join(', ') });
                                            }
                                        }
                                    }}
                                >
                                    <option value="">— Selecionar —</option>
                                    {cadastros.responsaveis.filter(r => r.ativo && (r.tipo === 'execucao' || r.tipo === 'ambos')).map(r => (
                                        <option key={r.id} value={r.nome}>{r.nome}</option>
                                    ))}
                                </select>
                                <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '4px' }}>
                                    {novoTipo.responsavel_execucao || 'Nenhum selecionado'}
                                    {novoTipo.responsavel_execucao && <button onClick={() => setNovoTipo({...novoTipo, responsavel_execucao: ''})} style={{marginLeft: '5px', color: 'var(--accent-red)', border: 'none', background: 'none', cursor: 'pointer'}}>Limpar</button>}
                                </div>
                            </div>
                            <div className="form-group">
                                <label className="form-label">Revisores Padrão</label>
                                <select
                                    className="form-select"
                                    value=""
                                    onChange={e => {
                                        const val = e.target.value;
                                        if (val) {
                                            const current = novoTipo.responsavel_revisao ? novoTipo.responsavel_revisao.split(',').map(s => s.trim()).filter(Boolean) : [];
                                            if (!current.includes(val)) {
                                                setNovoTipo({ ...novoTipo, responsavel_revisao: [...current, val].join(', ') });
                                            }
                                        }
                                    }}
                                >
                                    <option value="">— Selecionar —</option>
                                    {cadastros.responsaveis.filter(r => r.ativo && (r.tipo === 'revisao' || r.tipo === 'ambos')).map(r => (
                                        <option key={r.id} value={r.nome}>{r.nome}</option>
                                    ))}
                                </select>
                                <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '4px' }}>
                                    {novoTipo.responsavel_revisao || 'Nenhum selecionado'}
                                    {novoTipo.responsavel_revisao && <button onClick={() => setNovoTipo({...novoTipo, responsavel_revisao: ''})} style={{marginLeft: '5px', color: 'var(--accent-red)', border: 'none', background: 'none', cursor: 'pointer'}}>Limpar</button>}
                                </div>
                            </div>
                            <div className="form-group">
                                <label className="form-label" style={{ visibility: 'hidden' }}>Spacer</label>
                                <button
                                    className="btn btn-primary"
                                    disabled={!novoTipo.nome.trim()}
                                    style={{ width: '100%' }}
                                    onClick={async () => {
                                        await addTipo(novoTipo.nome, novoTipo.responsavel_execucao, novoTipo.responsavel_revisao);
                                        setNovoTipo({ nome: '', responsavel_execucao: '', responsavel_revisao: '' });
                                    }}
                                >
                                    ✅ Adicionar
                                </button>
                            </div>
                        </div>

                        <div className="table-wrapper">
                            <table>
                                <thead>
                                    <tr>
                                        <th>Nome / Tipo</th>
                                        <th>Executores Padrão</th>
                                        <th>Revisores Padrão</th>
                                        <th style={{ textAlign: 'right', width: '220px' }}>Ações</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {cadastros.tiposAssunto.length === 0 && (
                                        <tr>
                                            <td colSpan={2}>
                                                <div className="empty-state">
                                                    <div className="empty-state-icon">📂</div>
                                                    <div className="empty-state-text">Nenhum tipo cadastrado</div>
                                                </div>
                                            </td>
                                        </tr>
                                    )}
                                    {cadastros.tiposAssunto.map(t => (
                                        <tr key={t.id}>
                                            <td>
                                                {editTipoId === t.id ? (
                                                    <input
                                                        className="form-input"
                                                        value={editTipo.nome}
                                                        onChange={e => setEditTipo({ ...editTipo, nome: e.target.value })}
                                                        autoFocus
                                                    />
                                                ) : (
                                                    <span style={{ fontWeight: 600, color: 'var(--accent-purple)' }}>{t.nome}</span>
                                                )}
                                            </td>
                                            <td>
                                                {editTipoId === t.id ? (
                                                    <select
                                                        className="form-select"
                                                        value=""
                                                        onChange={e => {
                                                            const val = e.target.value;
                                                            if (val) {
                                                                const current = editTipo.responsavel_execucao ? editTipo.responsavel_execucao.split(',').map(s => s.trim()).filter(Boolean) : [];
                                                                if (!current.includes(val)) {
                                                                    setEditTipo({ ...editTipo, responsavel_execucao: [...current, val].join(', ') });
                                                                }
                                                            }
                                                        }}
                                                    >
                                                        <option value="">+ Adicionar</option>
                                                        {cadastros.responsaveis.filter(r => r.ativo && (r.tipo === 'execucao' || r.tipo === 'ambos')).map(r => (
                                                            <option key={r.id} value={r.nome}>{r.nome}</option>
                                                        ))}
                                                    </select>
                                                ) : (
                                                    <span style={{ fontSize: '12px' }}>{t.responsavel_execucao || '—'}</span>
                                                )}
                                                {editTipoId === t.id && editTipo.responsavel_execucao && (
                                                    <div style={{ fontSize: '10px', marginTop: '4px' }}>
                                                        {editTipo.responsavel_execucao}
                                                        <button onClick={() => setEditTipo({...editTipo, responsavel_execucao: ''})} style={{marginLeft: '5px', color: 'var(--accent-red)', border: 'none', background: 'none', cursor: 'pointer'}}>✕</button>
                                                    </div>
                                                )}
                                            </td>
                                            <td>
                                                {editTipoId === t.id ? (
                                                    <select
                                                        className="form-select"
                                                        value=""
                                                        onChange={e => {
                                                            const val = e.target.value;
                                                            if (val) {
                                                                const current = editTipo.responsavel_revisao ? editTipo.responsavel_revisao.split(',').map(s => s.trim()).filter(Boolean) : [];
                                                                if (!current.includes(val)) {
                                                                    setEditTipo({ ...editTipo, responsavel_revisao: [...current, val].join(', ') });
                                                                }
                                                            }
                                                        }}
                                                    >
                                                        <option value="">+ Adicionar</option>
                                                        {cadastros.responsaveis.filter(r => r.ativo && (r.tipo === 'revisao' || r.tipo === 'ambos')).map(r => (
                                                            <option key={r.id} value={r.nome}>{r.nome}</option>
                                                        ))}
                                                    </select>
                                                ) : (
                                                    <span style={{ fontSize: '12px' }}>{t.responsavel_revisao || '—'}</span>
                                                )}
                                                {editTipoId === t.id && editTipo.responsavel_revisao && (
                                                    <div style={{ fontSize: '10px', marginTop: '4px' }}>
                                                        {editTipo.responsavel_revisao}
                                                        <button onClick={() => setEditTipo({...editTipo, responsavel_revisao: ''})} style={{marginLeft: '5px', color: 'var(--accent-red)', border: 'none', background: 'none', cursor: 'pointer'}}>✕</button>
                                                    </div>
                                                )}
                                            </td>
                                            <td>
                                                <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end' }}>
                                                    {deleteTipoId === t.id ? (
                                                        <>
                                                            <span style={{ fontSize: '12px', color: 'var(--accent-red)', alignSelf: 'center' }}>
                                                                Confirmar exclusão?
                                                            </span>
                                                            <button
                                                                className="btn btn-danger btn-sm"
                                                                onClick={() => { deleteTipo(t.id); setDeleteTipoId(null); }}
                                                            >
                                                                ✓ Sim
                                                            </button>
                                                            <button
                                                                className="btn btn-secondary btn-sm"
                                                                onClick={() => setDeleteTipoId(null)}
                                                            >
                                                                ✕ Não
                                                            </button>
                                                        </>
                                                    ) : editTipoId === t.id ? (
                                                        <>
                                                            <button className="btn btn-primary btn-sm" onClick={() => { 
                                                                updateTipo(t.id, editTipo.nome, editTipo.responsavel_execucao, editTipo.responsavel_revisao); 
                                                                setEditTipoId(null); 
                                                            }}>
                                                                💾 Salvar
                                                            </button>
                                                            <button className="btn btn-secondary btn-sm" onClick={() => setEditTipoId(null)}>
                                                                ✕ Cancelar
                                                            </button>
                                                        </>
                                                    ) : (
                                                        <>
                                                            <button
                                                                className="btn btn-secondary btn-sm"
                                                                onClick={() => { 
                                                                    setEditTipoId(t.id); 
                                                                    setEditTipo({ 
                                                                        nome: t.nome, 
                                                                        responsavel_execucao: t.responsavel_execucao || '', 
                                                                        responsavel_revisao: t.responsavel_revisao || '' 
                                                                    }); 
                                                                    setDeleteTipoId(null); 
                                                                }}
                                                            >
                                                                ✏️ Editar
                                                            </button>
                                                            <button
                                                                className="btn btn-danger btn-sm"
                                                                onClick={() => { setDeleteTipoId(t.id); setEditTipoId(null); }}
                                                            >
                                                                🗑️ Excluir
                                                            </button>
                                                        </>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* ===== ABA: RESPONSÁVEIS ===== */}
                {aba === 'responsaveis' && (
                    <div className="card">
                        <div className="card-header">
                            <h2 className="card-title">👤 Responsáveis</h2>
                            <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                                {responsaveisDaAba.length} cadastrados
                            </span>
                        </div>

                        <div style={{
                            display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: '10px',
                            marginBottom: '20px', padding: '16px',
                            background: 'var(--bg-secondary)', borderRadius: '12px',
                            border: '1px solid var(--border)', alignItems: 'flex-end'
                        }}>
                            <div className="form-group">
                                <label className="form-label">Nome *</label>
                                <input
                                    className="form-input"
                                    placeholder="Nome completo"
                                    value={novoResp.nome}
                                    onChange={e => setNovoResp({ ...novoResp, nome: e.target.value })}
                                />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Cargo / Função</label>
                                <input
                                    className="form-input"
                                    placeholder="Ex: Analista, Técnico..."
                                    value={novoResp.cargo}
                                    onChange={e => setNovoResp({ ...novoResp, cargo: e.target.value })}
                                />
                            </div>
                            <button
                                className="btn btn-primary"
                                disabled={!novoResp.nome.trim()}
                                onClick={async () => {
                                    await addResponsavel(novoResp.nome, novoResp.cargo, 'ambos');
                                    setNovoResp({ ...novoResp, nome: '', cargo: '', tipo: 'ambos' });
                                }}
                            >
                                ✅ Adicionar
                            </button>
                        </div>

                        <div className="table-wrapper">
                            <table>
                                <thead>
                                    <tr>
                                        <th>Nome</th>
                                        <th>Cargo</th>
                                        <th style={{ textAlign: 'right', width: '300px' }}>Ações</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {responsaveisDaAba.length === 0 && (
                                        <tr>
                                            <td colSpan={3}>
                                                <div className="empty-state">
                                                    <div className="empty-state-icon">👤</div>
                                                    <div className="empty-state-text">Nenhum responsável cadastrado nesta categoria</div>
                                                </div>
                                            </td>
                                        </tr>
                                    )}
                                    {responsaveisDaAba.map(r => (
                                        <tr key={r.id}>
                                            <td>
                                                {editRespId === r.id ? (
                                                    <input
                                                        className="form-input"
                                                        style={{ maxWidth: '220px' }}
                                                        value={editResp.nome}
                                                        onChange={e => setEditResp({ ...editResp, nome: e.target.value })}
                                                        autoFocus
                                                    />
                                                ) : (
                                                    <span style={{ fontWeight: 500 }}>{r.nome}</span>
                                                )}
                                            </td>
                                            <td>
                                                {editRespId === r.id ? (
                                                    <input
                                                        className="form-input"
                                                        style={{ maxWidth: '160px' }}
                                                        value={editResp.cargo}
                                                        onChange={e => setEditResp({ ...editResp, cargo: e.target.value })}
                                                    />
                                                ) : (
                                                    <span style={{ color: 'var(--text-secondary)' }}>{r.cargo || '—'}</span>
                                                )}
                                            </td>
                                            <td>
                                                <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end' }}>
                                                    {deleteRespId === r.id ? (
                                                        <>
                                                            <span style={{ fontSize: '12px', color: 'var(--accent-red)', alignSelf: 'center' }}>
                                                                Confirmar exclusão?
                                                            </span>
                                                            <button
                                                                className="btn btn-danger btn-sm"
                                                                onClick={() => { deleteResponsavel(r.id); setDeleteRespId(null); }}
                                                            >
                                                                ✓ Sim
                                                            </button>
                                                            <button
                                                                className="btn btn-secondary btn-sm"
                                                                onClick={() => setDeleteRespId(null)}
                                                            >
                                                                ✕ Não
                                                            </button>
                                                        </>
                                                    ) : editRespId === r.id ? (
                                                        <>
                                                            <button
                                                                className="btn btn-primary btn-sm"
                                                                onClick={() => {
                                                                    updateResponsavel(r.id, editResp.nome, editResp.cargo, r.tipo);
                                                                    setEditRespId(null);
                                                                }}
                                                            >
                                                                💾 Salvar
                                                            </button>
                                                            <button className="btn btn-secondary btn-sm" onClick={() => setEditRespId(null)}>
                                                                ✕ Cancelar
                                                            </button>
                                                        </>
                                                    ) : (
                                                        <>
                                                            <button
                                                                className="btn btn-secondary btn-sm"
                                                                onClick={() => { setEditRespId(r.id); setEditResp({ nome: r.nome, cargo: r.cargo, tipo: r.tipo }); setDeleteRespId(null); }}
                                                            >
                                                                ✏️ Editar
                                                            </button>
                                                            <button
                                                                className="btn btn-danger btn-sm"
                                                                onClick={() => { setDeleteRespId(r.id); setEditRespId(null); }}
                                                            >
                                                                🗑️ Excluir
                                                            </button>
                                                        </>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* ===== ABA: STATUS KANBAN ===== */}
                {aba === 'status' && (
                    <div className="card">
                        <div className="card-header">
                            <h2 className="card-title">📊 Kanban</h2>
                            <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                                {statusOrdenados.length} status (colunas)
                            </span>
                        </div>

                        <div style={{
                            display: 'grid', gridTemplateColumns: '1fr 100px 100px auto', gap: '10px',
                            marginBottom: '20px', padding: '16px',
                            background: 'var(--bg-secondary)', borderRadius: '12px',
                            border: '1px solid var(--border)', alignItems: 'flex-end'
                        }}>
                            <div className="form-group">
                                <label className="form-label">Nome da Coluna *</label>
                                <input
                                    className="form-input"
                                    placeholder="Ex: Em Análise"
                                    value={novoStatus.nome}
                                    onChange={e => setNovoStatus({ ...novoStatus, nome: e.target.value })}
                                />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Cor</label>
                                <input
                                    className="form-input"
                                    type="color"
                                    value={novoStatus.cor}
                                    onChange={e => setNovoStatus({ ...novoStatus, cor: e.target.value })}
                                    style={{ padding: '0 4px', height: '36px', width: '100%' }}
                                />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Ordem</label>
                                <input
                                    className="form-input"
                                    type="number"
                                    min="1"
                                    value={novoStatus.ordem}
                                    onChange={e => setNovoStatus({ ...novoStatus, ordem: parseInt(e.target.value) || 1 })}
                                />
                            </div>
                            <button
                                className="btn btn-primary"
                                disabled={!novoStatus.nome.trim()}
                                onClick={async () => {
                                    await addStatus(novoStatus.nome, novoStatus.cor, novoStatus.ordem);
                                    setNovoStatus({ nome: '', cor: '#6366f1', ordem: statusOrdenados.length + 2 });
                                }}
                            >
                                ✅ Adicionar
                            </button>
                        </div>

                        <div className="table-wrapper">
                            <table>
                                <thead>
                                    <tr>
                                        <th>Ordem</th>
                                        <th>Nome do Status</th>
                                        <th>Cor Visual</th>
                                        <th style={{ textAlign: 'right', width: '300px' }}>Ações</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {statusOrdenados.length === 0 && (
                                        <tr>
                                            <td colSpan={4}>
                                                <div className="empty-state">
                                                    <div className="empty-state-icon">📊</div>
                                                    <div className="empty-state-text">Nenhum status cadastrado</div>
                                                </div>
                                            </td>
                                        </tr>
                                    )}
                                    {statusOrdenados.map(s => (
                                        <tr key={s.id}>
                                            <td style={{ width: '80px' }}>
                                                {editStatusId === s.id ? (
                                                    <input
                                                        className="form-input"
                                                        type="number"
                                                        style={{ width: '60px' }}
                                                        value={editStatus.ordem}
                                                        onChange={e => setEditStatus({ ...editStatus, ordem: parseInt(e.target.value) || 1 })}
                                                    />
                                                ) : (
                                                    <span style={{ fontWeight: 600, color: 'var(--text-muted)' }}>{s.ordem}</span>
                                                )}
                                            </td>
                                            <td>
                                                {editStatusId === s.id ? (
                                                    <input
                                                        className="form-input"
                                                        style={{ maxWidth: '220px' }}
                                                        value={editStatus.nome}
                                                        onChange={e => setEditStatus({ ...editStatus, nome: e.target.value })}
                                                        autoFocus
                                                    />
                                                ) : (
                                                    <span style={{ fontWeight: 500 }}>{s.nome}</span>
                                                )}
                                            </td>
                                            <td>
                                                {editStatusId === s.id ? (
                                                    <input
                                                        className="form-input"
                                                        type="color"
                                                        style={{ width: '60px', padding: '0 4px', height: '32px' }}
                                                        value={editStatus.cor}
                                                        onChange={e => setEditStatus({ ...editStatus, cor: e.target.value })}
                                                    />
                                                ) : (
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                        <div style={{ width: '20px', height: '20px', borderRadius: '4px', background: s.cor, border: '1px solid rgba(0,0,0,0.1)' }}></div>
                                                        <span style={{ fontSize: '13px', fontFamily: 'monospace' }}>{s.cor}</span>
                                                    </div>
                                                )}
                                            </td>
                                            <td>
                                                <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end' }}>
                                                    {deleteStatusId === s.id ? (
                                                        <>
                                                            <span style={{ fontSize: '12px', color: 'var(--accent-red)', alignSelf: 'center' }}>
                                                                Confirmar exclusão?
                                                            </span>
                                                            <button
                                                                className="btn btn-danger btn-sm"
                                                                onClick={() => { deleteStatus(s.id); setDeleteStatusId(null); }}
                                                            >
                                                                ✓ Sim
                                                            </button>
                                                            <button
                                                                className="btn btn-secondary btn-sm"
                                                                onClick={() => setDeleteStatusId(null)}
                                                            >
                                                                ✕ Não
                                                            </button>
                                                        </>
                                                    ) : editStatusId === s.id ? (
                                                        <>
                                                            <button
                                                                className="btn btn-primary btn-sm"
                                                                onClick={() => {
                                                                    updateStatus(s.id, editStatus.nome, editStatus.cor, editStatus.ordem);
                                                                    setEditStatusId(null);
                                                                }}
                                                            >
                                                                💾 Salvar
                                                            </button>
                                                            <button className="btn btn-secondary btn-sm" onClick={() => setEditStatusId(null)}>
                                                                ✕ Cancelar
                                                            </button>
                                                        </>
                                                    ) : (
                                                        <>
                                                            <button
                                                                className="btn btn-secondary btn-sm"
                                                                onClick={() => { setEditStatusId(s.id); setEditStatus({ nome: s.nome, cor: s.cor, ordem: s.ordem }); setDeleteStatusId(null); }}
                                                            >
                                                                ✏️ Editar
                                                            </button>
                                                            <button
                                                                className="btn btn-danger btn-sm"
                                                                onClick={() => { setDeleteStatusId(s.id); setEditStatusId(null); }}
                                                            >
                                                                🗑️ Excluir
                                                            </button>
                                                        </>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
                {/* ===== ABA: FLUXO ===== */}
                {aba === 'fluxo' && (
                    <div className="card">
                        <div className="card-header">
                            <h2 className="card-title">🌊 Configuração de Fluxo de Trabalho</h2>
                            <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Defina as etapas padrão para cada tipo de processo</p>
                        </div>

                        <div className="form-group" style={{ padding: '0 16px', marginBottom: '16px' }}>
                            <label className="form-label">Selecionar Tipo de Processo / Rotina</label>
                            <select 
                                className="form-select" 
                                value={tipoFluxoId}
                                onChange={(e) => setTipoFluxoId(e.target.value)}
                            >
                                <option value="">— Selecione um tipo para editar o fluxo —</option>
                                {cadastros.tiposAssunto.map(t => (
                                    <option key={t.id} value={t.id}>{t.nome}</option>
                                ))}
                            </select>
                        </div>

                        {tipoFluxoId && (
                            <>
                                <div style={{
                                    display: 'grid', gridTemplateColumns: '1fr 100px auto', gap: '10px',
                                    marginBottom: '10px', padding: '16px',
                                    background: 'var(--bg-secondary)', borderRadius: '12px',
                                    border: '1px solid var(--border)', alignItems: 'flex-end'
                                }}>
                                    <div className="form-group">
                                        <label className="form-label">Nome da Etapa</label>
                                        <input
                                            className="form-input"
                                            placeholder="Ex: Análise Inicial"
                                            value={novaEtapa.nome}
                                            onChange={e => setNovaEtapa({ ...novaEtapa, nome: e.target.value })}
                                        />
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label">Ordem</label>
                                        <input
                                            className="form-input"
                                            type="number"
                                            value={novaEtapa.ordem}
                                            onChange={e => setNovaEtapa({ ...novaEtapa, ordem: parseInt(e.target.value) || 1 })}
                                        />
                                    </div>
                                    <button
                                        className="btn btn-primary"
                                        disabled={!novaEtapa.nome.trim()}
                                        onClick={async () => {
                                            await addFluxoEtapa(tipoFluxoId, novaEtapa.nome, novaEtapa.ordem, novaEtapa.sub_etapas);
                                            setNovaEtapa({ nome: '', ordem: novaEtapa.ordem + 1, sub_etapas: [] });
                                        }}
                                    >
                                        ✅ Adicionar
                                    </button>
                                </div>

                                <div style={{
                                    marginBottom: '20px', padding: '16px',
                                    background: 'var(--bg-secondary)', borderRadius: '12px',
                                    border: '1px solid var(--border)'
                                }}>
                                    <label className="form-label">Checklist da Etapa (Sub-etapas)</label>
                                    <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                                        <input 
                                            type="text" 
                                            className="form-input" 
                                            placeholder="Adicionar item ao checklist..."
                                            value={novaSubEtapa}
                                            onChange={(e) => setNovaSubEtapa(e.target.value)}
                                            onKeyPress={(e) => {
                                                if (e.key === 'Enter' && novaSubEtapa.trim()) {
                                                    setNovaEtapa({ ...novaEtapa, sub_etapas: [...novaEtapa.sub_etapas, novaSubEtapa.trim()] });
                                                    setNovaSubEtapa('');
                                                }
                                            }}
                                        />
                                        <button 
                                            className="btn btn-secondary"
                                            onClick={() => {
                                                if (novaSubEtapa.trim()) {
                                                    setNovaEtapa({ ...novaEtapa, sub_etapas: [...novaEtapa.sub_etapas, novaSubEtapa.trim()] });
                                                    setNovaSubEtapa('');
                                                }
                                            }}
                                        >
                                            ➕
                                        </button>
                                    </div>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                        {novaEtapa.sub_etapas.map((sub, idx) => (
                                            <span key={idx} className="badge" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                {sub}
                                                <button 
                                                    style={{ border: 'none', background: 'none', cursor: 'pointer', fontSize: '10px' }}
                                                    onClick={() => setNovaEtapa({ ...novaEtapa, sub_etapas: novaEtapa.sub_etapas.filter((_, i) => i !== idx) })}
                                                >
                                                    ✕
                                                </button>
                                            </span>
                                        ))}
                                    </div>
                                </div>

                                <div className="table-wrapper">
                                    <table>
                                        <thead>
                                            <tr>
                                                <th style={{ width: '80px' }}>Ordem</th>
                                                <th>Etapa / Checklist</th>
                                                <th style={{ textAlign: 'right', width: '200px' }}>Ações</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {cadastros.fluxoEtapas.filter(e => e.tipo_assunto_id === tipoFluxoId).length === 0 && (
                                                <tr>
                                                    <td colSpan={5}>
                                                        <div className="empty-state">
                                                            <div className="empty-state-icon">🌊</div>
                                                            <div className="empty-state-text">Nenhuma etapa configurada para este fluxo</div>
                                                        </div>
                                                    </td>
                                                </tr>
                                            )}
                                            {cadastros.fluxoEtapas
                                                .filter(e => e.tipo_assunto_id === tipoFluxoId)
                                                .sort((a, b) => a.ordem - b.ordem)
                                                .map(etapa => (
                                                <tr key={etapa.id}>
                                                    <td>
                                                        {editEtapaId === etapa.id ? (
                                                            <input
                                                                className="form-input"
                                                                type="number"
                                                                style={{ width: '60px' }}
                                                                value={editEtapa.ordem}
                                                                onChange={e => setEditEtapa({ ...editEtapa, ordem: parseInt(e.target.value) || 1 })}
                                                            />
                                                        ) : (
                                                            <span>{etapa.ordem}</span>
                                                        )}
                                                    </td>
                                                    <td>
                                                        {editEtapaId === etapa.id ? (
                                                            <div>
                                                                <input
                                                                    className="form-input"
                                                                    value={editEtapa.nome}
                                                                    onChange={e => setEditEtapa({ ...editEtapa, nome: e.target.value })}
                                                                    style={{ marginBottom: '8px' }}
                                                                />
                                                                <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                                                                    <input 
                                                                        className="form-input" 
                                                                        placeholder="Add sub-etapa..."
                                                                        onKeyPress={(e) => {
                                                                            if (e.key === 'Enter') {
                                                                                const val = (e.target as HTMLInputElement).value;
                                                                                if (val.trim()) {
                                                                                    setEditEtapa({ ...editEtapa, sub_etapas: [...(editEtapa.sub_etapas || []), val.trim()] });
                                                                                    (e.target as HTMLInputElement).value = '';
                                                                                }
                                                                            }
                                                                        }}
                                                                    />
                                                                </div>
                                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                                                    {(editEtapa.sub_etapas || []).map((sub, idx) => (
                                                                        <span key={idx} className="badge" style={{ fontSize: '11px' }}>
                                                                            {sub}
                                                                            <button 
                                                                                style={{ marginLeft: '4px', border: 'none', background: 'none', cursor: 'pointer' }}
                                                                                onClick={() => setEditEtapa({ ...editEtapa, sub_etapas: editEtapa.sub_etapas.filter((_, i) => i !== idx) })}
                                                                            >✕</button>
                                                                        </span>
                                                                    ))}
                                                                </div>
                                                            </div>
                                                        ) : (
                                                            <div>
                                                                <div style={{ fontWeight: 500 }}>{etapa.nome}</div>
                                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginTop: '4px' }}>
                                                                    {(etapa.sub_etapas || []).map((sub, idx) => (
                                                                        <span key={idx} className="badge" style={{ fontSize: '10px', opacity: 0.8 }}>{sub}</span>
                                                                    ))}
                                                                </div>
                                                            </div>
                                                        )}
                                                    </td>
                                                    <td>
                                                        <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end' }}>
                                                            {deleteEtapaId === etapa.id ? (
                                                                <>
                                                                    <button className="btn btn-danger btn-sm" onClick={() => { deleteFluxoEtapa(etapa.id); setDeleteEtapaId(null); }}>✓</button>
                                                                    <button className="btn btn-secondary btn-sm" onClick={() => setDeleteEtapaId(null)}>✕</button>
                                                                </>
                                                            ) : editEtapaId === etapa.id ? (
                                                                <>
                                                                    <button className="btn btn-primary btn-sm" onClick={() => { 
                                                                        updateFluxoEtapa(etapa.id, editEtapa.nome, editEtapa.ordem, editEtapa.sub_etapas); 
                                                                        setEditEtapaId(null); 
                                                                    }}>💾</button>
                                                                    <button className="btn btn-secondary btn-sm" onClick={() => setEditEtapaId(null)}>✕</button>
                                                                </>
                                                            ) : (
                                                                <>
                                                                    <button className="btn btn-secondary btn-sm" onClick={() => {
                                                                        setEditEtapaId(etapa.id);
                                                                        setEditEtapa({ 
                                                                            nome: etapa.nome, 
                                                                            ordem: etapa.ordem,
                                                                            sub_etapas: etapa.sub_etapas || [] 
                                                                        });
                                                                    }}>✏️</button>
                                                                    <button className="btn btn-danger btn-sm" onClick={() => setDeleteEtapaId(etapa.id)}>🗑️</button>
                                                                </>
                                                            )}
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </>
                        )}
                    </div>
                )}
            </div>
        </>
    );
}

