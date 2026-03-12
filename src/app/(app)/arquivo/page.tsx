'use client';

import { useState } from 'react';
import { useProcessos } from '@/hooks/useProcessos';
import { useCadastros } from '@/hooks/useCadastros';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function ArquivoPage() {
    const { processosArquivados, loading } = useProcessos();
    const { statusAtivos } = useCadastros();
    const [filtro, setFiltro] = useState('');

    const filtrados = processosArquivados.filter(p => 
        p.assunto.toLowerCase().includes(filtro.toLowerCase()) ||
        p.numero_processo?.toLowerCase().includes(filtro.toLowerCase())
    );

    return (
        <div className="page-container">
            <header className="page-header">
                <div>
                    <h1 className="page-title">📁 Arquivo Histórico</h1>
                    <p className="page-subtitle">Processos finalizados há mais de 30 dias</p>
                </div>
            </header>

            <div className="card" style={{ marginBottom: '24px' }}>
                <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                    <div style={{ fontSize: '20px' }}>🔍</div>
                    <input 
                        type="text" 
                        className="form-input" 
                        placeholder="Pesquisar no arquivo (assunto, número...)"
                        value={filtro}
                        onChange={(e) => setFiltro(e.target.value)}
                        style={{ marginBottom: 0 }}
                    />
                </div>
            </div>

            {loading ? (
                <div className="loading-state">⏳ Carregando arquivo...</div>
            ) : filtrados.length === 0 ? (
                <div className="empty-state">
                    <div className="empty-state-icon">📁</div>
                    <p>Nenhum processo arquivado encontrado.</p>
                </div>
            ) : (
                <div className="table-wrapper">
                    <table>
                        <thead>
                            <tr>
                                <th>Processo / Assunto</th>
                                <th>Tipo</th>
                                <th>Responsável</th>
                                <th>Finalizado em</th>
                                <th>Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filtrados.map((p) => (
                                <tr key={p.id}>
                                    <td>
                                        <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                                            {p.numero_processo || 'S/N'}
                                        </div>
                                        <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                                            {p.assunto}
                                        </div>
                                    </td>
                                    <td>{p.tipo_assunto}</td>
                                    <td>{p.responsavel_execucao}</td>
                                    <td>
                                        {p.data_finalizacao ? format(new Date(p.data_finalizacao), "dd 'de' MMMM, yyyy", { locale: ptBR }) : '—'}
                                    </td>
                                    <td>
                                        {(() => {
                                            const sec = statusAtivos.find(s => s.nome === p.status_kanban);
                                            const cor = sec ? sec.cor : '#6366f1';
                                            return (
                                                <span 
                                                    className="badge" 
                                                    style={{ 
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
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}
