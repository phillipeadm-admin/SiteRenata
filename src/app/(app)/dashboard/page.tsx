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
    ResponsiveContainer, Cell
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


    const tipoData = useMemo(() => {
        const map: Record<string, number> = {};
        todos
            .filter(p => p.status_kanban.toUpperCase() !== 'FINALIZADO')
            .forEach(p => {
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
            .filter(p => {
                const status = p.status_kanban.toUpperCase();
                return status !== 'FINALIZADO' && 
                       status !== 'ARQUIVO' && 
                       !status.includes('REVISÃO') &&
                       !status.includes('REVISAO');
            })
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

        return Object.values(porExecutor).sort((a: any, b: any) => a.nome.localeCompare(b.nome));
    }, [todos]);

    const desempenhoPorRevisor = useMemo(() => {
        const porRevisor: Record<string, any> = {};

        todos
            .filter(p => {
                const status = p.status_kanban.toUpperCase();
                return (status === '1ª REVISÃO' || status === 'REVISÃO FINAL' || status === '1A REVISAO' || status === 'REVISAO FINAL') && 
                       p.responsavel_revisao;
            })
            .forEach(p => {
                const revisor = p.responsavel_revisao!;
                if (!porRevisor[revisor]) {
                    porRevisor[revisor] = {
                        nome: revisor,
                        tipos: {} as Record<string, { count: number; processos: { assunto: string; leadTime: number; executor: string }[] }>
                };
            }

            if (!porRevisor[revisor].tipos[p.tipo_assunto]) {
                porRevisor[revisor].tipos[p.tipo_assunto] = { count: 0, processos: [] };
            }

                const leadTimeEntry = p.datas_intermediarias?.find(d => 
                    d.justificativa.toLowerCase().includes('revisão') || 
                    d.justificativa.toLowerCase().includes('revisao')
                );
                const dateToUse = leadTimeEntry ? leadTimeEntry.data : p.data_entrada;
                const leadTime = differenceInDays(new Date(), parseISO(dateToUse));
                porRevisor[revisor].tipos[p.tipo_assunto].count += 1;
                porRevisor[revisor].tipos[p.tipo_assunto].processos.push({
                    assunto: p.assunto,
                    leadTime,
                    executor: p.responsavel_execucao || 'Sem Executor'
                });
            });

        return Object.values(porRevisor).sort((a: any, b: any) => a.nome.localeCompare(b.nome));
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
                <div style={{ marginBottom: '20px' }}>
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
                                <Bar dataKey="value" radius={[6, 6, 0, 0]} name="Processos">
                                    {tipoData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={index % 2 === 0 ? 'var(--accent-blue)' : 'var(--accent-cyan)'} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Desempenho por Executor */}
                <div className="section-container" style={{ marginTop: '32px' }}>
                    <div className="section-header" style={{ marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <h2 className="card-title" style={{ margin: 0 }}>👥 Desempenho por Executor (Ativos)</h2>
                        <span className="badge" style={{ backgroundColor: 'var(--accent-purple)15', color: 'var(--accent-purple)', fontWeight: 600 }}>
                            {desempenhoPorExecutor.length} Executores
                        </span>
                    </div>

                    <div className="executor-grid" style={{ 
                        display: 'grid', 
                        gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', 
                        gap: '20px' 
                    }}>
                        {desempenhoPorExecutor.length > 0 ? (
                            desempenhoPorExecutor.map((exec: any) => {
                                const totalProcessos = Object.values(exec.tipos).reduce((acc: number, t: any) => acc + t.count, 0);
                                return (
                                    <div key={exec.nome} className="card executor-card" style={{ 
                                        padding: '20px',
                                        transition: 'transform 0.2s, box-shadow 0.2s',
                                        cursor: 'default',
                                        border: '1px solid rgba(99, 102, 241, 0.4)',
                                        background: 'linear-gradient(135deg, var(--bg-card), rgba(99, 102, 241, 0.05))'
                                    }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                                <div style={{ 
                                                    width: '40px', 
                                                    height: '40px', 
                                                    borderRadius: '10px', 
                                                    backgroundColor: 'var(--accent-purple)', 
                                                    color: 'white',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    fontWeight: 700,
                                                    fontSize: '16px'
                                                }}>
                                                    {exec.nome.charAt(0).toUpperCase()}
                                                </div>
                                                <div>
                                                    <div style={{ fontWeight: 700, fontSize: '15px', color: 'var(--text-primary)' }}>{exec.nome}</div>
                                                    <div style={{ fontSize: '12px', color: 'var(--accent-purple)', fontWeight: 600 }}>Executor Ativo</div>
                                                </div>
                                            </div>
                                            <div style={{ textAlign: 'right' }}>
                                                <div style={{ fontSize: '24px', fontWeight: 800, color: 'var(--accent-purple)', lineHeight: 1 }}>{totalProcessos}</div>
                                                <div style={{ fontSize: '10px', color: 'var(--text-secondary)', fontWeight: 600, textTransform: 'uppercase' }}>Processos</div>
                                            </div>
                                        </div>

                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                            {Object.entries(exec.tipos).map(([tipo, data]: [string, any]) => (
                                                <div key={tipo} className="executor-task-group" style={{ 
                                                    padding: '12px', 
                                                    backgroundColor: 'var(--bg-secondary)', 
                                                    borderRadius: '12px',
                                                    border: '1px solid var(--border-color)'
                                                }}>
                                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                                                        <span style={{ fontWeight: 600, fontSize: '13px' }}>{tipo}</span>
                                                        <span className="badge" style={{ backgroundColor: 'var(--accent-blue)', color: 'white', fontSize: '10px', padding: '2px 6px' }}>
                                                            {data.count}
                                                        </span>
                                                    </div>
                                                    
                                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                                                        {data.processos.slice(0, 5).map((proc: any, idx: number) => (
                                                            <div 
                                                                key={idx} 
                                                                className="tooltip-container"
                                                            >
                                                                <div style={{ 
                                                                    fontSize: '10px', 
                                                                    padding: '2px 6px', 
                                                                    background: 'white', 
                                                                    borderRadius: '4px',
                                                                    border: '1px solid var(--border-color)',
                                                                    color: 'var(--text-secondary)',
                                                                    display: 'flex',
                                                                    alignItems: 'center',
                                                                    gap: '2px',
                                                                    cursor: 'default'
                                                                }}>
                                                                    ⏱️ {proc.leadTime}d
                                                                </div>
                                                                <div className="tooltip-content">
                                                                    {proc.assunto}
                                                                </div>
                                                            </div>
                                                        ))}
                                                        {data.count > 5 && (
                                                            <span style={{ fontSize: '10px', color: 'var(--text-secondary)', alignSelf: 'center' }}>
                                                                +{data.count - 5}
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                );
                            })
                        ) : (
                            <div className="card" style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '40px', color: 'var(--text-secondary)' }}>
                                Nenhum processo ativo encontrado para executores.
                            </div>
                        )}
                    </div>
                </div>

                {/* Desempenho por Revisor */}
                <div className="section-container" style={{ marginTop: '48px', paddingBottom: '40px' }}>
                    <div className="section-header" style={{ marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <h2 className="card-title" style={{ margin: 0 }}>🔍 Desempenho por Revisor (Ativos)</h2>
                        <span className="badge" style={{ backgroundColor: 'var(--accent-cyan)15', color: 'var(--accent-cyan)', fontWeight: 600 }}>
                            {desempenhoPorRevisor.length} Revisores
                        </span>
                    </div>

                    <div className="executor-grid" style={{ 
                        display: 'grid', 
                        gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', 
                        gap: '20px' 
                    }}>
                        {desempenhoPorRevisor.length > 0 ? (
                            desempenhoPorRevisor.map((rev: any) => {
                                const totalProcessos = Object.values(rev.tipos).reduce((acc: number, t: any) => acc + t.count, 0);
                                return (
                                    <div key={rev.nome} className="card executor-card" style={{ 
                                        padding: '20px',
                                        transition: 'transform 0.2s, box-shadow 0.2s',
                                        cursor: 'default',
                                        border: '1px solid rgba(6, 182, 212, 0.4)',
                                        background: 'linear-gradient(135deg, var(--bg-card), rgba(6, 182, 212, 0.03))'
                                    }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                                <div style={{ 
                                                    width: '40px', 
                                                    height: '40px', 
                                                    borderRadius: '10px', 
                                                    backgroundColor: 'var(--accent-cyan)', 
                                                    color: 'white',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    fontWeight: 700,
                                                    fontSize: '16px'
                                                }}>
                                                    {rev.nome.charAt(0).toUpperCase()}
                                                </div>
                                                <div>
                                                    <div style={{ fontWeight: 700, fontSize: '15px', color: 'var(--text-primary)' }}>{rev.nome}</div>
                                                    <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Revisor Ativo</div>
                                                </div>
                                            </div>
                                            <div style={{ textAlign: 'right' }}>
                                                <div style={{ fontSize: '24px', fontWeight: 800, color: 'var(--accent-cyan)', lineHeight: 1 }}>{totalProcessos}</div>
                                                <div style={{ fontSize: '10px', color: 'var(--text-secondary)', fontWeight: 600, textTransform: 'uppercase' }}>Processos</div>
                                            </div>
                                        </div>

                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                            {Object.entries(rev.tipos).map(([tipo, data]: [string, any]) => (
                                                <div key={tipo} className="executor-task-group" style={{ 
                                                    padding: '12px', 
                                                    backgroundColor: 'var(--bg-secondary)', 
                                                    borderRadius: '12px',
                                                    border: '1px solid var(--border-color)'
                                                }}>
                                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                                                        <span style={{ fontWeight: 600, fontSize: '13px' }}>{tipo}</span>
                                                        <span className="badge" style={{ backgroundColor: 'var(--accent-blue)', color: 'white', fontSize: '10px', padding: '2px 6px' }}>
                                                            {data.count}
                                                        </span>
                                                    </div>
                                                    
                                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                                                        {data.processos.slice(0, 5).map((proc: any, idx: number) => (
                                                            <div 
                                                                key={idx} 
                                                                className="tooltip-container"
                                                            >
                                                                <div style={{ 
                                                                    fontSize: '10px', 
                                                                    padding: '4px 8px', 
                                                                    background: 'rgba(255,255,255,0.05)', 
                                                                    borderRadius: '6px',
                                                                    border: '1px solid var(--border)',
                                                                    color: 'var(--text-primary)',
                                                                    display: 'flex',
                                                                    flexDirection: 'column',
                                                                    gap: '2px',
                                                                    cursor: 'default'
                                                                }}>
                                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontWeight: 600 }}>
                                                                        ⏱️ {proc.leadTime}d
                                                                    </div>
                                                                    <div style={{ fontSize: '9px', color: 'var(--accent-blue)', fontWeight: 600 }}>
                                                                        👤 {proc.executor}
                                                                    </div>
                                                                </div>
                                                                <div className="tooltip-content">
                                                                    {proc.assunto}
                                                                </div>
                                                            </div>
                                                        ))}
                                                        {data.count > 5 && (
                                                            <span style={{ fontSize: '10px', color: 'var(--text-secondary)', alignSelf: 'center' }}>
                                                                +{data.count - 5}
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                );
                            })
                        ) : (
                            <div className="card" style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '40px', color: 'var(--text-secondary)' }}>
                                Nenhum processo ativo encontrado para revisores.
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </>
    );
}
