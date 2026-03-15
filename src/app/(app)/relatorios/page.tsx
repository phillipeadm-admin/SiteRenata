'use client';

import { useMemo, useState } from 'react';
import { useProcessos } from '@/hooks/useProcessos';
import { useRotinas } from '@/hooks/useRotinas';
import { calcularRisco, RISCO_LABELS, TIPOS_ASSUNTO } from '@/lib/types';
import { differenceInDays, format, parseISO, getMonth, getYear } from 'date-fns';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
    ResponsiveContainer, LineChart, Line, Legend
} from 'recharts';

export default function RelatoriosPage() {
    const { processos, loading: loadingP } = useProcessos();
    const { rotinas, loading: loadingR } = useRotinas();
    const [filtroMes, setFiltroMes] = useState<string>('todos');
    const [filtroAno, setFiltroAno] = useState<string>(new Date().getFullYear().toString());

    const todos = useMemo(() => [...processos, ...rotinas], [processos, rotinas]);
    const loading = loadingP || loadingR;

    const anosDisponiveis = useMemo(() => {
        const anos = new Set<string>();
        anos.add(new Date().getFullYear().toString());
        todos.forEach(p => {
            if (p.data_entrada) {
                anos.add(getYear(parseISO(p.data_entrada)).toString());
            }
        });
        return Array.from(anos).sort((a, b) => b.localeCompare(a));
    }, [todos]);

    const meses = [
        { value: 'todos', label: 'Todos os Meses' },
        { value: '1', label: 'Janeiro' },
        { value: '2', label: 'Fevereiro' },
        { value: '3', label: 'Março' },
        { value: '4', label: 'Abril' },
        { value: '5', label: 'Maio' },
        { value: '6', label: 'Junho' },
        { value: '7', label: 'Julho' },
        { value: '8', label: 'Agosto' },
        { value: '9', label: 'Setembro' },
        { value: '10', label: 'Outubro' },
        { value: '11', label: 'Novembro' },
        { value: '12', label: 'Dezembro' },
    ];

    const processosFiltrados = useMemo(() => {
        return todos.filter(p => {
            if (!p.data_entrada) return false;
            const data = parseISO(p.data_entrada);
            const mesMatch = filtroMes === 'todos' || (getMonth(data) + 1).toString() === filtroMes;
            const anoMatch = filtroAno === 'todos' || getYear(data).toString() === filtroAno;
            return mesMatch && anoMatch;
        });
    }, [todos, filtroMes, filtroAno]);

    // Matriz de gestão: Executor → métricas
    const matrizExecutores = useMemo(() => {
        const map: Record<string, {
            executor: string;
            total: number;
            execucao: number;
            revisao: number;
            finalizados: number;
            criticos: number;
            somaLeadTime: number;
        }> = {};

        processosFiltrados.forEach(p => {
            const statusLower = p.status_kanban?.toLowerCase() || '';
            const isFinalizado = statusLower.includes('finalizado') || statusLower.includes('concluí');
            const isCritico = !isFinalizado && calcularRisco(p.data_prazo, p.status_kanban) === 'critico';
            
            const executoresRaw = p.responsavel_execucao ? p.responsavel_execucao.split(',').map(s => s.trim()).filter(Boolean) : ['Indefinido'];
            const revisoresRaw = p.responsavel_revisao ? p.responsavel_revisao.split(',').map(s => s.trim()).filter(Boolean) : [];

            // Todos os envolvidos contam para o TOTAL de processos (auxilia no cálculo de Aproveitamento)
            const todosEnvolvidos = Array.from(new Set([...executoresRaw, ...revisoresRaw]));
            
            todosEnvolvidos.forEach(nome => {
                if (!map[nome]) map[nome] = {
                    executor: nome, total: 0, execucao: 0,
                    revisao: 0, finalizados: 0, criticos: 0,
                    somaLeadTime: 0
                };
                
                map[nome].total++;
                if (isFinalizado) map[nome].finalizados++;
                if (isCritico) map[nome].criticos++;
            });

            // Somas específicas de EXECUÇÃO e REVISÃO só ocorrem quando FINALIZADO
            if (isFinalizado) {
                executoresRaw.forEach(ex => {
                    if (map[ex]) map[ex].execucao++;
                    
                    try {
                        const dataEntrada = p.data_entrada ? parseISO(p.data_entrada) : new Date();
                        const dataFim = p.data_finalizacao ? parseISO(p.data_finalizacao) : new Date();
                        if (map[ex]) map[ex].somaLeadTime += Math.max(0, differenceInDays(dataFim, dataEntrada));
                    } catch (e) {
                        console.error("Erro ao calcular lead time para executor:", ex, p.id, e);
                    }
                });

                revisoresRaw.forEach(rev => {
                    if (map[rev]) map[rev].revisao++;
                });
            }
        });

        return Object.values(map).map(m => ({
            ...m,
            mediaLeadTime: m.total > 0 ? Math.round(m.somaLeadTime / m.total) : 0,
        }));
    }, [processosFiltrados]);

    // Por tipo de assunto
    const porTipo = useMemo(() => {
        const map: Record<string, { total: number; finalizados: number; criticos: number; somaLT: number }> = {};
        processosFiltrados.forEach(p => {
            const t = p.tipo_assunto || 'Outros';
            if (!map[t]) map[t] = { total: 0, finalizados: 0, criticos: 0, somaLT: 0 };
            map[t].total++;
            const statusL = p.status_kanban?.toLowerCase() || '';
            if (statusL.includes('finalizado') || statusL.includes('concluí')) map[t].finalizados++;
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
    }, [processosFiltrados]);

    // Gargalo: processos parados em qualquer estágio não finalizado
    const gargalos = useMemo(() =>
        processosFiltrados
            .filter(p => {
                const s = p.status_kanban?.toLowerCase() || '';
                return !s.includes('finalizado') && !s.includes('concluí');
            })
            .map(p => {
                let diasParado = 0;
                try {
                    const dataUpdate = p.updated_at ? parseISO(p.updated_at) : (p.data_entrada ? parseISO(p.data_entrada) : new Date());
                    diasParado = Math.max(0, differenceInDays(new Date(), dataUpdate));
                } catch (e) {
                    console.error("Erro ao calcular dias parado:", p.id, e);
                }
                return {
                    ...p,
                    diasParado,
                };
            })
            .filter(p => p.diasParado >= 3) // Considera gargalo se estiver parado há 3 ou mais dias
            .sort((a, b) => b.diasParado - a.diasParado),
        [processosFiltrados]
    );

    // Dados para o card comparativo de produtividade
    const dadosProdutividade = useMemo(() => {
        return matrizExecutores
            .map(m => {
                const total = m.execucao + m.revisao;
                return {
                    name: m.executor,
                    entregas: total,
                    percExecucao: total > 0 ? Math.round((m.execucao / total) * 100) : 0,
                    percRevisao: total > 0 ? Math.round((m.revisao / total) * 100) : 0,
                    executado: m.execucao,
                    revisado: m.revisao
                };
            })
            .sort((a, b) => b.entregas - a.entregas);
    }, [matrizExecutores]);

    // Gráfico de executor vs. carga
    const chartExecutor = useMemo(() => matrizExecutores.map(m => ({
        name: (m.executor || 'Indefinido').split(' ')[0],
        'EXECUTADO': m.execucao || 0,
        'REVISADO': m.revisao || 0,
        'FINALIZADOS': m.finalizados || 0,
        Críticos: m.criticos || 0,
    })), [matrizExecutores]);

    if (loading) return <div style={{ padding: 40, color: 'var(--text-secondary)' }}>⏳ Carregando...</div>;

    if (todos.length === 0) {
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
            <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                    <h1 className="page-title">📈 Relatórios & Matriz de Gestão</h1>
                    <p className="page-subtitle">Visão holística — gerado em {format(new Date(), 'dd/MM/yyyy HH:mm')}</p>
                </div>
                <div style={{ display: 'flex', gap: '16px' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <label style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Filtrar por Mês</label>
                        <select 
                            className="input-field" 
                            style={{ 
                                padding: '8px 16px', 
                                fontSize: '13px', 
                                width: '180px',
                                background: 'var(--bg-secondary)',
                                border: '1px solid var(--border)',
                                borderRadius: '12px',
                                color: 'var(--text-primary)',
                                fontWeight: 600,
                                cursor: 'pointer',
                                transition: 'var(--transition)',
                                outline: 'none',
                                boxShadow: 'var(--shadow-sm)'
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.borderColor = 'var(--accent-purple)'}
                            onMouseLeave={(e) => e.currentTarget.style.borderColor = 'var(--border)'}
                            value={filtroMes}
                            onChange={(e) => setFiltroMes(e.target.value)}
                        >
                            {meses.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                        </select>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <label style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Filtrar por Ano</label>
                        <select 
                            className="input-field" 
                            style={{ 
                                padding: '8px 16px', 
                                fontSize: '13px', 
                                width: '120px',
                                background: 'linear-gradient(135deg, var(--bg-secondary), var(--bg-card))',
                                border: '1px solid var(--border)',
                                borderRadius: '12px',
                                color: 'var(--text-primary)',
                                fontWeight: 600,
                                cursor: 'pointer',
                                transition: 'var(--transition)',
                                outline: 'none',
                                boxShadow: 'var(--shadow-sm)'
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.borderColor = 'var(--accent-purple)'}
                            onMouseLeave={(e) => e.currentTarget.style.borderColor = 'var(--border)'}
                            value={filtroAno}
                            onChange={(e) => setFiltroAno(e.target.value)}
                        >
                            <option value="todos">Todos</option>
                            {anosDisponiveis.map(a => <option key={a} value={a}>{a}</option>)}
                        </select>
                    </div>
                </div>
            </div>

            <div className="page-body">
                {/* Matriz */}
                <div className="card" style={{ marginBottom: '20px' }}>
                    <div className="card-header">
                        <h2 className="card-title">👥 Matriz</h2>
                    </div>
                    <div className="table-wrapper">
                        <table>
                            <thead>
                                <tr>
                                    <th>Executor</th>
                                    <th>Total</th>
                                    <th>EXECUTADO</th>
                                    <th>REVISADO</th>
                                    <th>Finalizados</th>
                                    <th>Lead Time Médio</th>
                                </tr>
                            </thead>
                            <tbody>
                                {matrizExecutores.map(m => {
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
                                            <td style={{ color: '#60a5fa', fontWeight: 700 }}>{m.execucao}</td>
                                            <td style={{ color: '#fbbf24', fontWeight: 700 }}>{m.revisao}</td>
                                            <td style={{ color: '#34d399' }}>{m.finalizados}</td>
                                            <td style={{ fontWeight: 600 }}>{m.mediaLeadTime} dias</td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Gráfico de carga e Comparativo */}
                <div className="grid-2" style={{ marginBottom: '20px' }}>
                    <div className="card">
                        <div className="card-header">
                            <h2 className="card-title">📊 EXECUTADO E REVISADO POR RESPONSÁVEL</h2>
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
                                <Bar dataKey="EXECUTADO" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                                <Bar dataKey="REVISADO" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                                <Bar dataKey="FINALIZADOS" fill="#10b981" radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>

                    <div className="card">
                        <div className="card-header">
                            <h2 className="card-title">🏆 Comparativo de Produtividade</h2>
                        </div>
                        <div style={{ padding: '0 20px 20px' }}>
                            {dadosProdutividade.length === 0 ? (
                                <div className="empty-state">Sem dados para comparar</div>
                            ) : (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                    {dadosProdutividade.slice(0, 5).map((item, idx) => {
                                        return (
                                            <div key={item.name} style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', fontWeight: 600 }}>
                                                    <span>{idx + 1}. {item.name}</span>
                                                    <span style={{ color: 'var(--text-secondary)' }}>{item.entregas} entregas</span>
                                                </div>
                                                <div className="progress-bar" style={{ height: '10px', background: 'var(--bg-secondary)', display: 'flex', overflow: 'hidden' }}>
                                                    <div style={{ 
                                                        width: `${item.percExecucao}%`, 
                                                        background: 'var(--accent-blue)',
                                                        height: '100%',
                                                        transition: 'var(--transition)'
                                                    }} title={`Execução: ${item.percExecucao}%`} />
                                                    <div style={{ 
                                                        width: `${item.percRevisao}%`, 
                                                        background: 'var(--accent-yellow)',
                                                        height: '100%',
                                                        transition: 'var(--transition)'
                                                    }} title={`Revisão: ${item.percRevisao}%`} />
                                                </div>
                                                <div style={{ display: 'flex', gap: '12px', fontSize: '10px', fontWeight: 700, textTransform: 'uppercase' }}>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                        <div style={{ width: '8px', height: '8px', borderRadius: '2px', background: 'var(--accent-blue)' }} />
                                                        <span style={{ color: 'var(--accent-blue)' }}>Execução {item.percExecucao}%</span>
                                                    </div>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                        <div style={{ width: '8px', height: '8px', borderRadius: '2px', background: 'var(--accent-yellow)' }} />
                                                        <span style={{ color: 'var(--accent-yellow)' }}>Revisão {item.percRevisao}%</span>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                <div className="grid-2" style={{ marginBottom: '20px' }}>
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

                    {/* Gargalo */}
                    <div className="card">
                        <div className="card-header">
                            <h2 className="card-title">⏸️ Gargalo</h2>
                        </div>
                        {gargalos.length === 0 ? (
                            <div className="empty-state">
                                <div className="empty-state-icon">✅</div>
                                <div className="empty-state-text">Nenhum gargalo identificado no momento</div>
                            </div>
                        ) : (
                            <div className="table-wrapper" style={{ maxHeight: '240px', overflowY: 'auto' }}>
                                <table className="table-compact">
                                    <thead>
                                        <tr>
                                            <th>Item</th>
                                            <th>Status</th>
                                            <th>Parado</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {gargalos.slice(0, 5).map(p => (
                                            <tr key={p.id}>
                                                <td style={{ fontSize: '11px' }}>
                                                    <div style={{ fontWeight: 600 }}>{p.tipo_assunto}</div>
                                                    <div style={{ color: 'var(--text-secondary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '120px' }}>{p.assunto}</div>
                                                </td>
                                                <td>
                                                    <span style={{ fontSize: '10px', background: 'var(--bg-secondary)', padding: '2px 6px', borderRadius: '4px', textTransform: 'capitalize' }}>
                                                        {p.status_kanban?.replace('_', ' ')}
                                                    </span>
                                                </td>
                                                <td>
                                                    <span style={{
                                                        color: p.diasParado > 7 ? 'var(--accent-red)' : 'var(--accent-yellow)',
                                                        fontWeight: 700,
                                                        fontSize: '11px'
                                                    }}>
                                                        {p.diasParado}d
                                                    </span>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
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
