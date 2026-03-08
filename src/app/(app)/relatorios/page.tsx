'use client';

import { useMemo } from 'react';
import { useProcessos } from '@/hooks/useProcessos';
import { calcularRisco, RISCO_LABELS, TIPOS_ASSUNTO, STATUS_KANBAN_LABELS } from '@/lib/types';
import { differenceInDays, format, parseISO } from 'date-fns';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
    ResponsiveContainer, LineChart, Line, Legend
} from 'recharts';

export default function RelatoriosPage() {
    const { processos, loading } = useProcessos();

    // Matriz de gestão: Executor → métricas
    const matrizExecutores = useMemo(() => {
        const map: Record<string, {
            executor: string;
            total: number;
            emExecucao: number;
            aguardandoRevisao: number;
            finalizados: number;
            criticos: number;
            somaLeadTime: number;
            somaTempoRevisao: number;
        }> = {};

        processos.forEach(p => {
            const ex = p.responsavel_execucao || 'Indefinido';
            if (!map[ex]) map[ex] = {
                executor: ex, total: 0, emExecucao: 0,
                aguardandoRevisao: 0, finalizados: 0, criticos: 0,
                somaLeadTime: 0, somaTempoRevisao: 0
            };
            map[ex].total++;
            if (p.status_kanban === 'em_execucao') map[ex].emExecucao++;
            if (p.status_kanban === 'aguardando_revisao') map[ex].aguardandoRevisao++;
            if (p.status_kanban === 'finalizado') map[ex].finalizados++;
            if (calcularRisco(p.data_prazo, p.status_kanban) === 'critico') map[ex].criticos++;

            try {
                const dataEntrada = p.data_entrada ? parseISO(p.data_entrada) : new Date();
                const dataFim = p.data_finalizacao ? parseISO(p.data_finalizacao) : new Date();
                map[ex].somaLeadTime += Math.max(0, differenceInDays(dataFim, dataEntrada));
            } catch (e) {
                console.error("Erro ao calcular lead time para processo:", p.id, e);
            }
        });

        return Object.values(map).map(m => ({
            ...m,
            mediaLeadTime: m.total > 0 ? Math.round(m.somaLeadTime / m.total) : 0,
        }));
    }, [processos]);

    // Por tipo de assunto
    const porTipo = useMemo(() => {
        const map: Record<string, { total: number; finalizados: number; criticos: number; somaLT: number }> = {};
        processos.forEach(p => {
            const t = p.tipo_assunto || 'Outros';
            if (!map[t]) map[t] = { total: 0, finalizados: 0, criticos: 0, somaLT: 0 };
            map[t].total++;
            if (p.status_kanban === 'finalizado') map[t].finalizados++;
            if (calcularRisco(p.data_prazo, p.status_kanban) === 'critico') map[t].criticos++;
            
            try {
                const dataEntrada = p.data_entrada ? parseISO(p.data_entrada) : new Date();
                const dataFim = p.data_finalizacao ? parseISO(p.data_finalizacao) : new Date();
                map[t].somaLT += Math.max(0, differenceInDays(dataFim, dataEntrada));
            } catch (e) {
                console.error("Erro ao calcular lead time por tipo:", p.id, e);
            }
        });
        return Object.entries(map).map(([tipo, v]) => ({
            tipo,
            total: v.total,
            finalizados: v.finalizados,
            criticos: v.criticos,
            mediaLeadTime: v.total > 0 ? Math.round(v.somaLT / v.total) : 0,
            taxaConclusao: v.total > 0 ? Math.round((v.finalizados / v.total) * 100) : 0,
        }));
    }, [processos]);

    // Gargalo: processos parados em Revisão
    const processosEmRevisao = useMemo(() =>
        processos
            .filter(p => p.status_kanban === 'aguardando_revisao')
            .map(p => {
                let diasParado = 0;
                try {
                    const dataUpdate = p.updated_at ? parseISO(p.updated_at) : new Date();
                    diasParado = Math.max(0, differenceInDays(new Date(), dataUpdate));
                } catch (e) {
                    console.error("Erro ao calcular dias parado:", p.id, e);
                }
                return {
                    ...p,
                    diasParado,
                };
            })
            .sort((a, b) => b.diasParado - a.diasParado),
        [processos]
    );

    // Gráfico de executor vs. carga
    const chartExecutor = useMemo(() => matrizExecutores.map(m => ({
        name: (m.executor || 'Indefinido').split(' ')[0],
        'Em Execução': m.emExecucao || 0,
        'Aguard. Revisão': m.aguardandoRevisao || 0,
        Finalizados: m.finalizados || 0,
        Críticos: m.criticos || 0,
    })), [matrizExecutores]);

    if (loading) return <div style={{ padding: 40, color: 'var(--text-secondary)' }}>⏳ Carregando...</div>;

    if (processos.length === 0) {
        return (
            <div className="page-body">
                <div className="card">
                    <div className="empty-state" style={{ padding: '80px 20px' }}>
                        <div className="empty-state-icon">📊</div>
                        <div className="empty-state-text">
                            Nenhum processo cadastrado para gerar relatórios.<br/>
                            Inicie cadastrando processos na aba <strong>📁 Processos</strong>.
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <>
            <div className="page-header">
                <div>
                    <h1 className="page-title">📈 Relatórios & Matriz de Gestão</h1>
                    <p className="page-subtitle">Visão holística — gerado em {format(new Date(), 'dd/MM/yyyy HH:mm')}</p>
                </div>
            </div>

            <div className="page-body">
                {/* Matriz por Executor */}
                <div className="card" style={{ marginBottom: '20px' }}>
                    <div className="card-header">
                        <h2 className="card-title">👥 Matriz por Executor</h2>
                    </div>
                    <div className="table-wrapper">
                        <table>
                            <thead>
                                <tr>
                                    <th>Executor</th>
                                    <th>Total</th>
                                    <th>Em Execução</th>
                                    <th>Aguard. Revisão</th>
                                    <th>Finalizados</th>
                                    <th>🚨 Críticos</th>
                                    <th>Lead Time Médio</th>
                                    <th>Carga de Trabalho</th>
                                </tr>
                            </thead>
                            <tbody>
                                {matrizExecutores.map(m => {
                                    const carga = m.total > 0 ? Math.round(((m.emExecucao + m.aguardandoRevisao) / m.total) * 100) : 0;
                                    return (
                                        <tr key={m.executor}>
                                            <td style={{ fontWeight: 600 }}>{m.executor}</td>
                                            <td>
                                                <span style={{
                                                    background: 'var(--bg-secondary)',
                                                    padding: '3px 8px',
                                                    borderRadius: '6px',
                                                    fontWeight: 700
                                                }}>{m.total}</span>
                                            </td>
                                            <td style={{ color: '#60a5fa' }}>{m.emExecucao}</td>
                                            <td style={{ color: '#fbbf24' }}>{m.aguardandoRevisao}</td>
                                            <td style={{ color: '#34d399' }}>{m.finalizados}</td>
                                            <td>
                                                {m.criticos > 0 ? (
                                                    <span className="badge badge-risco-critico">{m.criticos}</span>
                                                ) : (
                                                    <span style={{ color: 'var(--text-muted)' }}>0</span>
                                                )}
                                            </td>
                                            <td style={{ fontWeight: 600 }}>{m.mediaLeadTime} dias</td>
                                            <td>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                    <div className="progress-bar" style={{ width: '80px' }}>
                                                        <div
                                                            className="progress-fill"
                                                            style={{
                                                                width: `${carga}%`,
                                                                background: carga > 70
                                                                    ? 'var(--accent-red)'
                                                                    : carga > 40
                                                                        ? 'var(--accent-yellow)'
                                                                        : 'var(--accent-green)'
                                                            }}
                                                        />
                                                    </div>
                                                    <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>{carga}%</span>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Gráfico de carga */}
                <div className="grid-2" style={{ marginBottom: '20px' }}>
                    <div className="card">
                        <div className="card-header">
                            <h2 className="card-title">📊 Carga por Executor</h2>
                        </div>
                        <ResponsiveContainer width="100%" height={240}>
                            <BarChart data={chartExecutor} margin={{ left: -20 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(99,102,241,0.1)" />
                                <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#8892aa' }} />
                                <YAxis tick={{ fontSize: 11, fill: '#8892aa' }} allowDecimals={false} />
                                <Tooltip
                                    contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '10px', fontSize: '12px' }}
                                />
                                <Legend wrapperStyle={{ fontSize: '11px' }} />
                                <Bar dataKey="Em Execução" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                                <Bar dataKey="Aguard. Revisão" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                                <Bar dataKey="Finalizados" fill="#10b981" radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>

                    {/* Por Tipo */}
                    <div className="card">
                        <div className="card-header">
                            <h2 className="card-title">📂 Taxa de Conclusão por Tipo</h2>
                        </div>
                        <ResponsiveContainer width="100%" height={240}>
                            <BarChart data={porTipo} layout="vertical" margin={{ left: 10, right: 20 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(99,102,241,0.1)" />
                                <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 10, fill: '#8892aa' }} unit="%" />
                                <YAxis dataKey="tipo" type="category" tick={{ fontSize: 10, fill: '#8892aa' }} width={120} />
                                <Tooltip
                                    contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '10px', fontSize: '12px' }}
                                    formatter={(v: unknown) => [`${v}%`, 'Taxa de conclusão']}
                                />
                                <Bar dataKey="taxaConclusao" fill="#6366f1" radius={[0, 4, 4, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Gargalo: Revisão */}
                <div className="card" style={{ marginBottom: '20px' }}>
                    <div className="card-header">
                        <h2 className="card-title">⏸️ Gargalo — Processos Parados em Revisão</h2>
                    </div>
                    {processosEmRevisao.length === 0 ? (
                        <div className="empty-state">
                            <div className="empty-state-icon">✅</div>
                            <div className="empty-state-text">Nenhum processo aguardando revisão</div>
                        </div>
                    ) : (
                        <div className="table-wrapper">
                            <table>
                                <thead>
                                    <tr>
                                        <th>Processo</th>
                                        <th>Executor</th>
                                        <th>Revisor</th>
                                        <th>Prazo</th>
                                        <th>Dias Parado</th>
                                        <th>Risco</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {processosEmRevisao.map(p => {
                                        const risco = calcularRisco(p.data_prazo, p.status_kanban);
                                        return (
                                            <tr key={p.id}>
                                                <td>
                                                    <div style={{ fontWeight: 600 }}>{p.tipo_assunto}</div>
                                                    <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>{p.assunto}</div>
                                                </td>
                                                <td>{p.responsavel_execucao}</td>
                                                <td style={{ color: p.responsavel_revisao ? 'var(--text-primary)' : 'var(--accent-red)' }}>
                                                    {p.responsavel_revisao ?? '⚠️ Sem revisor'}
                                                </td>
                                                <td>
                                                    {p.data_prazo
                                                        ? format(parseISO(p.data_prazo), 'dd/MM/yyyy')
                                                        : '—'}
                                                </td>
                                                <td>
                                                    <span style={{
                                                        background: p.diasParado > 5 ? 'rgba(239,68,68,0.15)' : 'rgba(245,158,11,0.15)',
                                                        color: p.diasParado > 5 ? '#f87171' : '#fbbf24',
                                                        padding: '3px 8px',
                                                        borderRadius: '6px',
                                                        fontWeight: 700,
                                                        fontSize: '12px'
                                                    }}>
                                                        {p.diasParado}d
                                                    </span>
                                                </td>
                                                <td>
                                                    <span className={`badge badge-risco-${risco}`}>{RISCO_LABELS[risco]}</span>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>

                {/* Matriz completa por tipo */}
                <div className="card">
                    <div className="card-header">
                        <h2 className="card-title">🗂️ Desempenho por Tipo de Assunto</h2>
                    </div>
                    <div className="table-wrapper">
                        <table>
                            <thead>
                                <tr>
                                    <th>Tipo de Assunto</th>
                                    <th>Total</th>
                                    <th>Finalizados</th>
                                    <th>Críticos</th>
                                    <th>Lead Time Médio</th>
                                    <th>Taxa Conclusão</th>
                                </tr>
                            </thead>
                            <tbody>
                                {porTipo.sort((a, b) => b.total - a.total).map(t => (
                                    <tr key={t.tipo}>
                                        <td style={{ fontWeight: 600 }}>{t.tipo}</td>
                                        <td>{t.total}</td>
                                        <td style={{ color: '#34d399' }}>{t.finalizados}</td>
                                        <td>
                                            {t.criticos > 0 ? (
                                                <span className="badge badge-risco-critico">{t.criticos}</span>
                                            ) : <span style={{ color: 'var(--text-muted)' }}>0</span>}
                                        </td>
                                        <td>{t.mediaLeadTime} dias</td>
                                        <td>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                <div className="progress-bar" style={{ width: '80px' }}>
                                                    <div className="progress-fill" style={{ width: `${t.taxaConclusao}%` }} />
                                                </div>
                                                <span style={{ fontSize: '12px', fontWeight: 600 }}>{t.taxaConclusao}%</span>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </>
    );
}
