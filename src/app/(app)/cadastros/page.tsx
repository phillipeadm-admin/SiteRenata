'use client';

import { useState } from 'react';
import { useCadastros, Responsavel } from '@/hooks/useCadastros';

type Aba = 'tipos' | 'executores' | 'revisores';

export default function CadastrosPage() {
    const {
        cadastros,
        addTipo, updateTipo, deleteTipo,
        addResponsavel, updateResponsavel, deleteResponsavel,
    } = useCadastros();

    const [aba, setAba] = useState<Aba>('tipos');

    /* ---- Estados de edição e confirmação de exclusão ---- */
    const [novoTipo, setNovoTipo] = useState('');
    const [editTipoId, setEditTipoId] = useState<string | null>(null);
    const [editTipoNome, setEditTipoNome] = useState('');
    const [deleteTipoId, setDeleteTipoId] = useState<string | null>(null);

    const [novoResp, setNovoResp] = useState({ nome: '', cargo: '', tipo: 'execucao' as Responsavel['tipo'] });
    const [editRespId, setEditRespId] = useState<string | null>(null);
    const [editResp, setEditResp] = useState({ nome: '', cargo: '', tipo: 'execucao' as Responsavel['tipo'] });
    const [deleteRespId, setDeleteRespId] = useState<string | null>(null);

    const responsaveisDaAba = cadastros.responsaveis.filter(r =>
        aba === 'executores'
            ? r.tipo === 'execucao' || r.tipo === 'ambos'
            : r.tipo === 'revisao' || r.tipo === 'ambos'
    );

    const tipoLabel = aba === 'executores' ? 'execucao' : 'revisao';

    return (
        <>
            <div className="page-header">
                <div>
                    <h1 className="page-title">➕ Incluir — Cadastros do Sistema</h1>
                    <p className="page-subtitle">Gerencie os dados que alimentam os formulários de processo</p>
                </div>
            </div>

            <div className="page-body">
                {/* Abas */}
                <div style={{ display: 'flex', gap: '8px', marginBottom: '24px' }}>
                    {([
                        { key: 'tipos', label: '📂 Tipos de Assunto' },
                        { key: 'executores', label: '👤 Responsáveis Execução' },
                        { key: 'revisores', label: '🔍 Responsáveis Revisão' },
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
                            <h2 className="card-title">📂 Tipos de Assunto</h2>
                            <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                                {cadastros.tiposAssunto.length} registros
                            </span>
                        </div>

                        {/* Formulário de adição */}
                        <div style={{
                            display: 'flex', gap: '10px', marginBottom: '20px',
                            padding: '16px', background: 'var(--bg-secondary)',
                            borderRadius: '12px', border: '1px solid var(--border)'
                        }}>
                            <div className="form-group" style={{ flex: 1 }}>
                                <label className="form-label">Nome do Tipo</label>
                                <input
                                    className="form-input"
                                    placeholder="Ex: Adicional Noturno"
                                    value={novoTipo}
                                    onChange={e => setNovoTipo(e.target.value)}
                                    onKeyDown={e => {
                                        if (e.key === 'Enter' && novoTipo.trim()) {
                                            addTipo(novoTipo);
                                            setNovoTipo('');
                                        }
                                    }}
                                />
                            </div>
                            <div style={{ display: 'flex', alignItems: 'flex-end' }}>
                                <button
                                    className="btn btn-primary"
                                    disabled={!novoTipo.trim()}
                                    onClick={() => { addTipo(novoTipo); setNovoTipo(''); }}
                                >
                                    ✅ Adicionar
                                </button>
                            </div>
                        </div>

                        {/* Lista */}
                        <div className="table-wrapper">
                            <table>
                                <thead>
                                    <tr>
                                        <th>Nome</th>
                                        <th style={{ textAlign: 'right', width: '280px' }}>Ações</th>
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
                                                        style={{ maxWidth: '360px' }}
                                                        value={editTipoNome}
                                                        onChange={e => setEditTipoNome(e.target.value)}
                                                        onKeyDown={e => {
                                                            if (e.key === 'Enter') { updateTipo(t.id, editTipoNome); setEditTipoId(null); }
                                                            if (e.key === 'Escape') setEditTipoId(null);
                                                        }}
                                                        autoFocus
                                                    />
                                                ) : (
                                                    <span style={{ fontWeight: 500 }}>{t.nome}</span>
                                                )}
                                            </td>
                                            <td>
                                                <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end' }}>
                                                    {/* Confirmação de exclusão inline */}
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
                                                            <button className="btn btn-primary btn-sm" onClick={() => { updateTipo(t.id, editTipoNome); setEditTipoId(null); }}>
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
                                                                onClick={() => { setEditTipoId(t.id); setEditTipoNome(t.nome); setDeleteTipoId(null); }}
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

                {/* ===== ABA: RESPONSÁVEIS (EXECUÇÃO / REVISÃO) ===== */}
                {(aba === 'executores' || aba === 'revisores') && (
                    <div className="card">
                        <div className="card-header">
                            <h2 className="card-title">
                                {aba === 'executores' ? '👤 Responsáveis de Execução' : '🔍 Responsáveis de Revisão'}
                            </h2>
                            <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                                {responsaveisDaAba.length} cadastrados
                            </span>
                        </div>

                        {/* Formulário de adição */}
                        <div style={{
                            display: 'grid', gridTemplateColumns: '1fr 1fr auto auto', gap: '10px',
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
                            <div className="form-group">
                                <label className="form-label">Tipo</label>
                                <select
                                    className="form-select"
                                    value={novoResp.tipo}
                                    onChange={e => setNovoResp({ ...novoResp, tipo: e.target.value as Responsavel['tipo'] })}
                                >
                                    <option value="execucao">Somente Execução</option>
                                    <option value="revisao">Somente Revisão</option>
                                    <option value="ambos">Ambos</option>
                                </select>
                            </div>
                            <button
                                className="btn btn-primary"
                                disabled={!novoResp.nome.trim()}
                                onClick={() => {
                                    addResponsavel(novoResp.nome, novoResp.cargo, novoResp.tipo);
                                    setNovoResp({ nome: '', cargo: '', tipo: tipoLabel as Responsavel['tipo'] });
                                }}
                            >
                                ✅ Adicionar
                            </button>
                        </div>

                        {/* Lista */}
                        <div className="table-wrapper">
                            <table>
                                <thead>
                                    <tr>
                                        <th>Nome</th>
                                        <th>Cargo</th>
                                        <th>Tipo</th>
                                        <th style={{ textAlign: 'right', width: '300px' }}>Ações</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {responsaveisDaAba.length === 0 && (
                                        <tr>
                                            <td colSpan={4}>
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
                                                {editRespId === r.id ? (
                                                    <select
                                                        className="form-select"
                                                        style={{ maxWidth: '160px' }}
                                                        value={editResp.tipo}
                                                        onChange={e => setEditResp({ ...editResp, tipo: e.target.value as Responsavel['tipo'] })}
                                                    >
                                                        <option value="execucao">Execução</option>
                                                        <option value="revisao">Revisão</option>
                                                        <option value="ambos">Ambos</option>
                                                    </select>
                                                ) : (
                                                    <span className={`badge badge-${r.tipo === 'execucao' ? 'em_execucao' : r.tipo === 'revisao' ? 'aguardando_revisao' : 'triagem'}`}>
                                                        {r.tipo === 'execucao' ? 'Execução' : r.tipo === 'revisao' ? 'Revisão' : 'Ambos'}
                                                    </span>
                                                )}
                                            </td>
                                            <td>
                                                <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end' }}>
                                                    {/* Confirmação de exclusão inline */}
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
                                                                    updateResponsavel(r.id, editResp.nome, editResp.cargo, editResp.tipo);
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
            </div>
        </>
    );
}
