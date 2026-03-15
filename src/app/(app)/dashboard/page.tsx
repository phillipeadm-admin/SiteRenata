'use client';

import { useMemo } from 'react';
import { useProcessos } from '@/hooks/useProcessos';
import { useRotinas } from '@/hooks/useRotinas';
import { useCadastros } from '@/hooks/useCadastros';
import { calcularRisco, RISCO_LABELS, RISCO_COLORS } from '@/lib/types';
import { differenceInDays, format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
    ResponsiveContainer, PieChart, Pie, Cell, Legend
} from 'recharts';

export default function DashboardPage() {
    const { processosAtivos, loading: loadingP } = useProcessos();
    const { rotinas, loading: loadingR } = useRotinas();
    const { statusAtivos, cadastros, updateConfig } = useCadastros();

    const thresholdCritico = parseInt(cadastros.config.prazo_critico || '3');
    const thresholdAtencaoInicio = parseInt(cadastros.config.prazo_atencao_inicio || (thresholdCritico + 1).toString());
    const thresholdAtencao = parseInt(cadastros.config.prazo_atencao || '7');

    // Consolida processos + rotinas em um único array para o dashboard
    const todos = useMemo(() => [...processosAtivos, ...rotinas], [processosAtivos, rotinas]);
    const loading = loadingP || loadingR;

    const stats = useMemo(() => {
        const total = todos.length;
        const finalizados = todos.filter(p => p.status_kanban.toUpperCase() === 'FINALIZADO').length;
        
        // Em Execução: Tudo que não é triagem/entrada nem finalizado/arquivo
        const emExecucao = todos.filter(p => {
            const st = p.status_kanban.toUpperCase();
            return st !== 'TRIAGEM' && st !== 'FINALIZADO' && st !== 'ARQUIVO' && st !== 'ARQUIVADO';
        }).length;

        const vencidos = todos.filter(p => calcularRisco(p.data_prazo, p.status_kanban, thresholdCritico, thresholdAtencao) === 'vencido').length;
        const criticos = todos.filter(p => calcularRisco(p.data_prazo, p.status_kanban, thresholdCritico, thresholdAtencao) === 'critico').length;
        const atencao = todos.filter(p => calcularRisco(p.data_prazo, p.status_kanban, thresholdCritico, thresholdAtencao) === 'atencao').length;

        const leadTimes = todos
            .filter(p => p.status_kanban.toUpperCase() === 'FINALIZADO' && p.data_finalizacao)
            .map(p => differenceInDays(parseISO(p.data_finalizacao!), parseISO(p.data_entrada)));
        const mediaLeadTime = leadTimes.length
            ? Math.round(leadTimes.reduce((a, b) => a + b, 0) / leadTimes.length)
            : 0;

        return { total, finalizados, emExecucao, vencidos, criticos, atencao, mediaLeadTime };
    }, [todos, thresholdCritico, thresholdAtencao]);

    const kanbanData = useMemo(() => {
        const map: Record<string, number> = {};
        todos.forEach(p => {
            map[p.status_kanban] = (map[p.status_kanban] || 0) + 1;
        });
        return statusAtivos.map(s => ({
            name: s.nome,
            value: map[s.nome] || 0,
            color: s.cor || '#6366f1',
        }));
    }, [todos, statusAtivos]);

    const tipoData = useMemo(() => {
        const map: Record<string, number> = {};
        todos.forEach(p => {
            map[p.tipo_assunto] = (map[p.tipo_assunto] || 0) + 1;
        });
        return Object.entries(map).map(([name, value]) => ({ name, value }));
    }, [todos]);

    const processosCriticos = useMemo(() => {
        return todos
            .filter(p => {
                const risco = calcularRisco(p.data_prazo, p.status_kanban, thresholdCritico, thresholdAtencao);
                return (risco === 'critico' || risco === 'vencido') && p.status_kanban.toUpperCase() !== 'FINALIZADO';
            })
            .sort((a, b) => {
                const ra = calcularRisco(a.data_prazo, a.status_kanban, thresholdCritico, thresholdAtencao);
                const rb = calcularRisco(b.data_prazo, b.status_kanban, thresholdCritico, thresholdAtencao);
                if (ra === 'vencido' && rb !== 'vencido') return -1;
                if (ra !== 'vencido' && rb === 'vencido') return 1;
                return (a.data_prazo ?? '').localeCompare(b.data_prazo ?? '');
            });
    }, [todos, thresholdCritico, thresholdAtencao]);

    const desempenhoPorExecutor = useMemo(() => {
        const porExecutor: Record<string, any> = {};

        todos
            .filter(p => p.status_kanban.toUpperCase() !== 'FINALIZADO' && p.status_kanban.toUpperCase() !== 'ARQUIVO')
            .forEach(p => {
                const executor = p.responsavel_execucao || 'Sem Responsável';
                if (!porExecutor[executor]) {
                    porExecutor[executor] = {
                        nome: executor,
                        tipos: {} as Record<string, { count: number; processos: { assunto: string; leadTime: number }[] }>
                    };
                }

                if (!porExecutor[executor].tipos[p.tipo_assunto]) {
                    porExecutor[executor].tipos[p.tipo_assunto] = { count: 0, processos: [] };
                }

                const leadTime = differenceInDays(new Date(), parseISO(p.data_entrada));
                porExecutor[executor].tipos[p.tipo_assunto].count += 1;
                porExecutor[executor].tipos[p.tipo_assunto].processos.push({
                    assunto: p.assunto,
                    leadTime
                });
            });

        return Object.values(porExecutor).sort((a, b) => a.nome.localeCompare(b.nome));
    }, [todos]);

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
                    <div className="kpi-card" style={{ '--kpi-color': 'var(--accent-yellow)' } as React.CSSProperties}>
                        <span className="kpi-icon">⚠️</span>
                        <div className="kpi-label">Atenção</div>
                        <div className="kpi-value">{stats.atencao}</div>
                        <div className="kpi-change">
                            prazo de 
                            <input 
                                type="number" 
                                className="kpi-input"
                                value={thresholdAtencaoInicio} 
                                onChange={(e) => updateConfig('prazo_atencao_inicio', e.target.value)}
                            /> a 
                            <input 
                                type="number" 
                                className="kpi-input"
                                value={thresholdAtencao} 
                                onChange={(e) => updateConfig('prazo_atencao', e.target.value)}
                            /> dias
                        </div>
                    </div>
                    <div className="kpi-card" style={{ '--kpi-color': 'var(--accent-red)' } as React.CSSProperties}>
                        <span className="kpi-icon">🚨</span>
                        <div className="kpi-label">Críticos</div>
                        <div className="kpi-value">{stats.criticos}</div>
                        <div className="kpi-change">
                            prazo até 
                            <input 
                                type="number" 
                                className="kpi-input"
                                value={thresholdCritico} 
                                onChange={(e) => updateConfig('prazo_critico', e.target.value)}
                            /> dias
                        </div>
                    </div>
                    <div className="kpi-card" style={{ '--kpi-color': '#991b1b' } as React.CSSProperties}>
                        <span className="kpi-icon">🛑</span>
                        <div className="kpi-label">Vencidos</div>
                        <div className="kpi-value">{stats.vencidos}</div>
                        <div className="kpi-change">prazo ultrapassado</div>
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
                                                 <span className={`badge badge-risco-${calcularRisco(p.data_prazo, p.status_kanban, thresholdCritico, thresholdAtencao)}`}>
                                                     {calcularRisco(p.data_prazo, p.status_kanban, thresholdCritico, thresholdAtencao) === 'vencido' ? '🚨 Vencido' : '⚠️ Crítico'}
                                                 </span>
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

                {/* Desempenho por Executor */}
                <div className="card">
                    <div className="card-header">
                        <h2 className="card-title">👥 Desempenho por Executor (Ativos)</h2>
                    </div>
                    <div className="table-wrapper">
                        <table className="executor-performance-table">
                            <thead>
                                <tr>
                                    <th style={{ width: '200px' }}>Executor</th>
                                    <th>Carga de Trabalho (Tipo | Lead Time individual)</th>
                                </tr>
                            </thead>
                            <tbody>
                                {desempenhoPorExecutor.length > 0 ? (
                                    desempenhoPorExecutor.map(exec => (
                                        <tr key={exec.nome}>
                                            <td style={{ verticalAlign: 'top', paddingTop: '12px' }}>
                                                <div style={{ fontWeight: 600, color: 'var(--accent-indigo)' }}>{exec.nome}</div>
                                                <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                                                    {Object.values(exec.tipos).reduce((acc: number, t: any) => acc + t.count, 0)} processo(s) total
                                                </div>
                                            </td>
                                            <td>
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', padding: '10px 0' }}>
                                                    {Object.entries(exec.tipos).map(([tipo, data]: [string, any]) => (
                                                        <div key={tipo} style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '8px' }}>
                                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                                                                <span style={{ fontWeight: 600, fontSize: '12px' }}>{tipo}</span>
                                                                <span className="badge" style={{ backgroundColor: 'var(--accent-blue)15', color: 'var(--accent-blue)', fontSize: '10px' }}>
                                                                    {data.count}
                                                                </span>
                                                            </div>
                                                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                                                                {data.processos.map((proc: any, idx: number) => (
                                                                    <span 
                                                                        key={idx} 
                                                                        title={proc.assunto}
                                                                        style={{ 
                                                                            fontSize: '11px', 
                                                                            padding: '2px 8px', 
                                                                            background: 'var(--bg-secondary)', 
                                                                            borderRadius: '4px',
                                                                            border: '1px solid var(--border-color)',
                                                                            display: 'flex',
                                                                            alignItems: 'center',
                                                                            gap: '4px'
                                                                        }}
                                                                    >
                                                                        <span style={{ color: 'var(--text-secondary)' }}>⏱️ {proc.leadTime}d</span>
                                                                    </span>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan={2} style={{ textAlign: 'center', padding: '40px', color: 'var(--text-secondary)' }}>
                                            Nenhum processo ativo encontrado.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </>
    );
}
