'use client';

import { useMemo } from 'react';
import { useProcessos } from '@/hooks/useProcessos';
import { useRotinas } from '@/hooks/useRotinas';
import { calcularRisco, RISCO_LABELS, RISCO_COLORS, STATUS_KANBAN_LABELS, STATUS_KANBAN_COLORS } from '@/lib/types';
import { differenceInDays, format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
    ResponsiveContainer, PieChart, Pie, Cell, Legend
} from 'recharts';

export default function DashboardPage() {
    const { processosAtivos, loading: loadingP } = useProcessos();
    const { rotinas, loading: loadingR } = useRotinas();

    // Consolida processos + rotinas em um único array para o dashboard
    const todos = useMemo(() => [...processosAtivos, ...rotinas], [processosAtivos, rotinas]);
    const loading = loadingP || loadingR;

    const stats = useMemo(() => {
        const total = todos.length;
        const finalizados = todos.filter(p => p.status_kanban === 'finalizado').length;
        const emExecucao = todos.filter(p => p.status_kanban === 'em_execucao').length;
        const criticos = todos.filter(p => calcularRisco(p.data_prazo, p.status_kanban) === 'critico').length;
        const atencao = todos.filter(p => calcularRisco(p.data_prazo, p.status_kanban) === 'atencao').length;

        const leadTimes = todos
            .filter(p => p.status_kanban === 'finalizado' && p.data_finalizacao)
            .map(p => differenceInDays(parseISO(p.data_finalizacao!), parseISO(p.data_entrada)));
        const mediaLeadTime = leadTimes.length
            ? Math.round(leadTimes.reduce((a, b) => a + b, 0) / leadTimes.length)
            : 0;

        return { total, finalizados, emExecucao, criticos, atencao, mediaLeadTime };
    }, [todos]);

    const kanbanData = useMemo(() => {
        const map: Record<string, number> = {};
        todos.forEach(p => {
            map[p.status_kanban] = (map[p.status_kanban] || 0) + 1;
        });
        return Object.entries(STATUS_KANBAN_LABELS).map(([key, label]) => ({
            name: label,
            value: map[key] || 0,
            color: STATUS_KANBAN_COLORS[key as keyof typeof STATUS_KANBAN_COLORS],
        }));
    }, [todos]);

    const tipoData = useMemo(() => {
        const map: Record<string, number> = {};
        todos.forEach(p => {
            map[p.tipo_assunto] = (map[p.tipo_assunto] || 0) + 1;
        });
        return Object.entries(map).map(([name, value]) => ({ name, value }));
    }, [todos]);

    const processosCriticos = useMemo(() =>
        todos
            .filter(p => calcularRisco(p.data_prazo, p.status_kanban) === 'critico')
            .sort((a, b) => (a.data_prazo ?? '').localeCompare(b.data_prazo ?? '')),
        [todos]
    );

    const processosRecentes = useMemo(() =>
        [...todos]
            .sort((a, b) => b.created_at.localeCompare(a.created_at))
            .slice(0, 5),
        [todos]
    );

    if (loading) {
        return (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh' }}>
                <div style={{ color: 'var(--text-secondary)', fontSize: '24px' }}>⏳ Carregando...</div>
            </div>
        );
    }

    return (
        <>
            <div className="page-header">
                <div>
                    <h1 className="page-title">📊 Dashboard</h1>
                    <p className="page-subtitle">
                        {format(new Date(), "EEEE, dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                    </p>
                </div>
            </div>

            <div className="page-body">
                {/* KPIs */}
                <div className="kpi-grid">
                    <div className="kpi-card" style={{ '--kpi-color': 'var(--accent-purple)' } as React.CSSProperties}>
                        <span className="kpi-icon">📁</span>
                        <div className="kpi-label">Total de Processos</div>
                        <div className="kpi-value">{stats.total}</div>
                        <div className="kpi-change">todos os registros</div>
                    </div>
                    <div className="kpi-card" style={{ '--kpi-color': 'var(--accent-blue)' } as React.CSSProperties}>
                        <span className="kpi-icon">⚙️</span>
                        <div className="kpi-label">Em Execução</div>
                        <div className="kpi-value">{stats.emExecucao}</div>
                        <div className="kpi-change">atividades em andamento</div>
                    </div>
                    <div className="kpi-card" style={{ '--kpi-color': 'var(--accent-red)' } as React.CSSProperties}>
                        <span className="kpi-icon">🚨</span>
                        <div className="kpi-label">Críticos</div>
                        <div className="kpi-value">{stats.criticos}</div>
                        <div className="kpi-change">prazo vencido ou ≤ 3 dias</div>
                    </div>
                    <div className="kpi-card" style={{ '--kpi-color': 'var(--accent-yellow)' } as React.CSSProperties}>
                        <span className="kpi-icon">⚠️</span>
                        <div className="kpi-label">Atenção</div>
                        <div className="kpi-value">{stats.atencao}</div>
                        <div className="kpi-change">prazo entre 4-7 dias</div>
                    </div>
                    <div className="kpi-card" style={{ '--kpi-color': 'var(--accent-green)' } as React.CSSProperties}>
                        <span className="kpi-icon">✅</span>
                        <div className="kpi-label">Finalizados</div>
                        <div className="kpi-value">{stats.finalizados}</div>
                        <div className="kpi-change">entregas concluídas</div>
                    </div>
                    <div className="kpi-card" style={{ '--kpi-color': 'var(--accent-cyan)' } as React.CSSProperties}>
                        <span className="kpi-icon">⏱️</span>
                        <div className="kpi-label">Lead Time Médio</div>
                        <div className="kpi-value">{stats.mediaLeadTime}d</div>
                        <div className="kpi-change">dias até finalização</div>
                    </div>
                </div>

                {/* Alertas críticos */}
                {processosCriticos.length > 0 && (
                    <div className="card" style={{ marginBottom: '20px', borderColor: 'rgba(239,68,68,0.4)' }}>
                        <div className="card-header">
                            <h2 className="card-title">🚨 Processos Críticos — Ação Imediata</h2>
                        </div>
                        <div className="table-wrapper">
                            <table>
                                <thead>
                                    <tr>
                                        <th>Processo</th>
                                        <th>Responsável</th>
                                        <th>Prazo</th>
                                        <th>Status</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {processosCriticos.map(p => (
                                        <tr key={p.id}>
                                            <td>
                                                <div style={{ fontWeight: 600 }}>{p.tipo_assunto}</div>
                                                <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>{p.assunto}</div>
                                            </td>
                                            <td>{p.responsavel_execucao}</td>
                                            <td style={{ color: 'var(--accent-red)', fontWeight: 600 }}>
                                                {p.data_prazo
                                                    ? format(parseISO(p.data_prazo), 'dd/MM/yyyy')
                                                    : 'Sem prazo'}
                                            </td>
                                            <td>
                                                <span className="badge badge-risco-critico">⚠️ Crítico</span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* Gráficos */}
                <div className="dashboard-grid" style={{ marginBottom: '20px' }}>
                    <div className="card">
                        <div className="card-header">
                            <h2 className="card-title">📊 Processos por Tipo</h2>
                        </div>
                        <ResponsiveContainer width="100%" height={280}>
                            <BarChart data={tipoData} margin={{ top: 0, right: 8, left: -20, bottom: 70 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(99,102,241,0.1)" />
                                <XAxis
                                    dataKey="name"
                                    interval={0}
                                    angle={-40}
                                    textAnchor="end"
                                    height={80}
                                    tick={(props) => {
                                        const { x, y, payload } = props;
                                        const label: string = payload.value.length > 14
                                            ? payload.value.slice(0, 13) + '…'
                                            : payload.value;
                                        return (
                                            <text x={x} y={y} dy={4} textAnchor="end"
                                                fill="#8892aa" fontSize={10}>
                                                {label}
                                            </text>
                                        );
                                    }}
                                />
                                <YAxis tick={{ fontSize: 11, fill: '#8892aa' }} allowDecimals={false} />
                                <Tooltip
                                    contentStyle={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '10px', fontSize: '12px', color: '#1a202c' }}
                                    labelStyle={{ color: '#1a202c', fontWeight: 600 }}
                                    itemStyle={{ color: '#4a5568' }}
                                />
                                <Bar dataKey="value" fill="#6366f1" radius={[6, 6, 0, 0]} name="Processos" />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>

                    <div className="card">
                        <div className="card-header">
                            <h2 className="card-title">🔄 Status do Fluxo</h2>
                        </div>
                        <ResponsiveContainer width="100%" height={220}>
                            <PieChart>
                                <Pie data={kanbanData} cx="50%" cy="50%" innerRadius={55} outerRadius={80} paddingAngle={3} dataKey="value">
                                    {kanbanData.map((entry, index) => (
                                        <Cell key={index} fill={entry.color} />
                                    ))}
                                </Pie>
                                <Tooltip
                                    contentStyle={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '10px', fontSize: '13px', color: '#1a202c', boxShadow: '0 4px 20px rgba(0,0,0,0.15)' }}
                                    labelStyle={{ color: '#1a202c', fontWeight: 600 }}
                                    itemStyle={{ color: '#4a5568' }}
                                />
                                <Legend iconSize={10} wrapperStyle={{ fontSize: '11px', color: 'var(--text-secondary)' }} />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Recentes */}
                <div className="card">
                    <div className="card-header">
                        <h2 className="card-title">🕐 Processos Recentes</h2>
                    </div>
                    <div className="table-wrapper">
                        <table>
                            <thead>
                                <tr>
                                    <th>Assunto</th>
                                    <th>Executor</th>
                                    <th>Entrada</th>
                                    <th>Status</th>
                                    <th>Risco</th>
                                </tr>
                            </thead>
                            <tbody>
                                {processosRecentes.map(p => {
                                    const risco = calcularRisco(p.data_prazo, p.status_kanban);
                                    return (
                                        <tr key={p.id}>
                                            <td>
                                                <div style={{ fontWeight: 600 }}>{p.tipo_assunto}</div>
                                                <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>{p.assunto.slice(0, 60)}...</div>
                                            </td>
                                            <td>{p.responsavel_execucao}</td>
                                            <td style={{ color: 'var(--text-secondary)' }}>
                                                {format(parseISO(p.data_entrada), 'dd/MM/yyyy')}
                                            </td>
                                            <td>
                                                <span className={`badge badge-${p.status_kanban}`}>
                                                    {STATUS_KANBAN_LABELS[p.status_kanban]}
                                                </span>
                                            </td>
                                            <td>
                                                <span className={`badge badge-risco-${risco}`}>
                                                    {RISCO_LABELS[risco]}
                                                </span>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </>
    );
}
