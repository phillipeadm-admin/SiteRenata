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
            prodExecucao: number;
            prodRevisao: number;
        }> = {};

        processosFiltrados.forEach(p => {
            const statusLower = p.status_kanban?.toLowerCase() || '';
            const isFinalizado = statusLower.includes('finalizado') || statusLower.includes('concluí');
            const isCritico = !isFinalizado && calcularRisco(p.data_prazo, p.status_kanban) === 'critico';
            const peso = p.complexo ? 2 : 1;
            
            const executoresRaw = p.responsavel_execucao ? p.responsavel_execucao.split(',').map(s => s.trim()).filter(Boolean) : ['Indefinido'];
            const revisoresRaw = p.responsavel_revisao ? p.responsavel_revisao.split(',').map(s => s.trim()).filter(Boolean) : [];

            // Todos os envolvidos contam para o TOTAL de processos
            const todosEnvolvidos = Array.from(new Set([...executoresRaw, ...revisoresRaw]));
            
            todosEnvolvidos.forEach(nome => {
                if (!map[nome]) map[nome] = {
                    executor: nome, total: 0, execucao: 0,
                    revisao: 0, finalizados: 0, criticos: 0,
                    somaLeadTime: 0, prodExecucao: 0, prodRevisao: 0
                };
                
                map[nome].total++;
                if (isFinalizado) map[nome].finalizados++;
                if (isCritico) map[nome].criticos++;
            });

            // Somas específicas de EXECUÇÃO e REVISÃO
            if (isFinalizado) {
                executoresRaw.forEach(ex => {
                    if (map[ex]) {
                        map[ex].execucao++;
                        map[ex].prodExecucao += peso;
                    }
                    
                    try {
                        const dataEntrada = p.data_entrada ? parseISO(p.data_entrada) : new Date();
                        const dataFim = p.data_finalizacao ? parseISO(p.data_finalizacao) : new Date();
                        if (map[ex]) map[ex].somaLeadTime += Math.max(0, differenceInDays(dataFim, dataEntrada));
                    } catch (e) {
                        console.error("Erro ao calcular lead time para executor:", ex, p.id, e);
                    }
                });

                revisoresRaw.forEach(rev => {
                    if (map[rev]) {
                        map[rev].revisao++;
                        map[rev].prodRevisao += peso;
                    }
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
        const map: Record<string, { total: number; finalizados: number; executados: number; revisados: number; criticos: number; somaLT: number }> = {};
        processosFiltrados.forEach(p => {
            const t = p.tipo_assunto || 'Outros';
            if (!map[t]) map[t] = { total: 0, finalizados: 0, executados: 0, revisados: 0, criticos: 0, somaLT: 0 };
            map[t].total++;
            const statusL = p.status_kanban?.toLowerCase() || '';
            const isFinalizado = statusL.includes('finalizado') || statusL.includes('concluí');
            
            if (isFinalizado) {
                map[t].finalizados++;
                if (p.responsavel_execucao) map[t].executados++;
                if (p.responsavel_revisao) map[t].revisados++;
            }
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
            executados: v.executados,
            revisados: v.revisados,
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

    // Cruzamento de dados: Criados vs Finalizados
    const dadosGargaloResumo = useMemo(() => {
        let criados = 0;
        let finalizados = 0;

        processosFiltrados.forEach(p => {
            if (p.data_entrada) {
                const dataE = parseISO(p.data_entrada);
                const mesMatch = filtroMes === 'todos' || (getMonth(dataE) + 1).toString() === filtroMes;
                const anoMatch = filtroAno === 'todos' || getYear(dataE).toString() === filtroAno;
                if (mesMatch && anoMatch) criados++;
            }

            if (p.data_finalizacao) {
                const dataF = parseISO(p.data_finalizacao);
                const mesMatch = filtroMes === 'todos' || (getMonth(dataF) + 1).toString() === filtroMes;
                const anoMatch = filtroAno === 'todos' || getYear(dataF).toString() === filtroAno;
                if (mesMatch && anoMatch) finalizados++;
            }
        });

        return { criados, finalizados };
    }, [processosFiltrados, filtroMes, filtroAno]);

    // Cálculo de Lead Time Médio entre etapas
    const leadTimesEtapas = useMemo(() => {
        const somas = {
            'exec_revisao': { total: 0, count: 0 }, // Em Andamento -> 1ª Revisão
            'revisao_final': { total: 0, count: 0 }, // 1ª Revisão -> Revisão Final
            'finalizado': { total: 0, count: 0 }    // Revisão Final -> Finalizado
        };

        processosFiltrados.forEach(p => {
            const datas = p.datas_intermediarias || [];
            const dataEntrada = p.data_entrada ? parseISO(p.data_entrada) : null;
            const dataFinal = p.data_finalizacao ? parseISO(p.data_finalizacao) : null;

            const marco1Rev = datas.find(d => d.justificativa.includes('1ª Revisão'));
            const marcoRevFinal = datas.find(d => d.justificativa.includes('Revisão Final'));

            // 1. Entrada -> 1ª Revisão
            if (dataEntrada && marco1Rev) {
                const diff = differenceInDays(parseISO(marco1Rev.data), dataEntrada);
                if (diff >= 0) {
                    somas.exec_revisao.total += diff;
                    somas.exec_revisao.count++;
                }
            }

            // 2. 1ª Revisão -> Revisão Final
            if (marco1Rev && marcoRevFinal) {
                const diff = differenceInDays(parseISO(marcoRevFinal.data), parseISO(marco1Rev.data));
                if (diff >= 0) {
                    somas.revisao_final.total += diff;
                    somas.revisao_final.count++;
                }
            }

            // 3. Revisão Final -> Finalizado
            if (marcoRevFinal && dataFinal) {
                const diff = differenceInDays(dataFinal, parseISO(marcoRevFinal.data));
                if (diff >= 0) {
                    somas.finalizado.total += diff;
                    somas.finalizado.count++;
                }
            }
        });

        const labels = {
            exec_revisao: 'Em Andamento → 1ª Revisão',
            revisao_final: '1ª Revisão → Revisão Final',
            finalizado: 'Revisão Final → Finalizado'
        };

        const result = Object.entries(somas).map(([key, val]) => ({
            etapa: labels[key as keyof typeof labels],
            media: val.count > 0 ? Math.round(val.total / val.count) : 0,
            key
        }));

        const maxMedia = Math.max(...result.map(r => r.media));
        
        return result.map(r => ({
            ...r,
            isBottleneck: maxMedia > 0 && r.media === maxMedia
        }));
    }, [processosFiltrados]);

    // Dados para o card comparativo de produtividade (Pontuação ponderada)
    const dadosProdutividade = useMemo(() => {
        const totalGlobal = matrizExecutores.reduce((acc, m) => acc + m.prodExecucao + m.prodRevisao, 0);
        
        return matrizExecutores
            .map(m => {
                const totalPontos = m.prodExecucao + m.prodRevisao;
                return {
                    name: m.executor,
                    entregas: m.execucao + m.revisao, // Quantidade física
                    pontos: totalPontos,
                    percExecucao: totalPontos > 0 ? Math.round((m.prodExecucao / totalPontos) * 100) : 0,
                    percRevisao: totalPontos > 0 ? Math.round((m.prodRevisao / totalPontos) * 100) : 0,
                    executado: m.prodExecucao,
                    revisado: m.prodRevisao,
                    larguraTotal: totalGlobal > 0 ? (totalPontos / totalGlobal) * 100 : 0
                };
            })
            .sort((a, b) => b.pontos - a.pontos);
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
                    <h1 className="page-title">📈 Gestão/Controle & Matriz</h1>
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
                                                    <span style={{ color: 'var(--text-secondary)' }}>{Math.round(item.larguraTotal)}% da produtividade</span>
                                                </div>
                                                <div className="progress-bar" style={{ 
                                                    height: '10px', 
                                                    background: 'var(--bg-secondary)', 
                                                    display: 'flex', 
                                                    overflow: 'hidden',
                                                    width: `${item.larguraTotal}%`,
                                                    minWidth: '2px',
                                                    borderRadius: '5px'
                                                }}>
                                                    <div style={{ 
                                                        width: `${(item.executado / (item.pontos || 1)) * 100}%`, 
                                                        background: 'var(--accent-blue)',
                                                        height: '100%',
                                                        transition: 'var(--transition)'
                                                    }} title={`Execução: ${item.executado} pontos`} />
                                                    <div style={{ 
                                                        width: `${(item.revisado / (item.pontos || 1)) * 100}%`, 
                                                        background: 'var(--accent-yellow)',
                                                        height: '100%',
                                                        transition: 'var(--transition)'
                                                    }} title={`Revisão: ${item.revisado} pontos`} />
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
                            <h2 className="card-title">⏸️ Gargalo & Fluxo</h2>
                        </div>
                        
                        {/* Resumo Criados vs Finalizados */}
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '20px' }}>
                            <div style={{ background: 'rgba(99, 102, 241, 0.05)', padding: '12px', borderRadius: '12px', border: '1px solid var(--border)' }}>
                                <div style={{ fontSize: '10px', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 600 }}>Criados</div>
                                <div style={{ fontSize: '20px', fontWeight: 700, color: 'var(--accent-blue)' }}>{dadosGargaloResumo.criados}</div>
                            </div>
                            <div style={{ background: 'rgba(16, 185, 129, 0.05)', padding: '12px', borderRadius: '12px', border: '1px solid var(--border)' }}>
                                <div style={{ fontSize: '10px', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 600 }}>Finalizados</div>
                                <div style={{ fontSize: '20px', fontWeight: 700, color: 'var(--accent-green)' }}>{dadosGargaloResumo.finalizados}</div>
                            </div>
                        </div>

                        {/* Lead Time por Etapa */}
                        <div style={{ marginBottom: '20px' }}>
                            <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '8px', textTransform: 'uppercase' }}>Lead Time Médio por Etapa (dias)</div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                {leadTimesEtapas.map(lt => (
                                    <div key={lt.key} style={{ 
                                        display: 'flex', 
                                        alignItems: 'center', 
                                        justifyContent: 'space-between',
                                        padding: '8px 12px',
                                        background: lt.isBottleneck ? 'rgba(239, 68, 68, 0.08)' : 'var(--bg-secondary)',
                                        borderRadius: '8px',
                                        border: lt.isBottleneck ? '1px solid rgba(239, 68, 68, 0.3)' : '1px solid var(--border)',
                                        position: 'relative',
                                        overflow: 'hidden'
                                    }}>
                                        <div style={{ fontSize: '11px', fontWeight: 600 }}>
                                            {lt.etapa}
                                            {lt.isBottleneck && <span style={{ marginLeft: '8px', fontSize: '9px', background: 'var(--accent-red)', color: 'white', padding: '1px 4px', borderRadius: '4px' }}>GARGALO</span>}
                                        </div>
                                        <div style={{ fontSize: '12px', fontWeight: 700, color: lt.isBottleneck ? 'var(--accent-red)' : 'var(--text-primary)' }}>{lt.media}d</div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Itens Parados */}
                        <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '8px', textTransform: 'uppercase' }}>Itens Parados (+3 dias)</div>
                        {gargalos.length === 0 ? (
                            <div className="empty-state" style={{ padding: '20px' }}>
                                <div className="empty-state-text">Nenhum item parado no momento</div>
                            </div>
                        ) : (
                            <div className="table-wrapper" style={{ maxHeight: '160px', overflowY: 'auto' }}>
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
                                    <th>Executados</th>
                                    <th>Revisados</th>
                                    <th>Finalizados</th>
                                    <th>Lead Time Médio</th>
                                    <th>Taxa Conclusão</th>
                                </tr>
                            </thead>
                            <tbody>
                                {porTipo.sort((a, b) => b.total - a.total).map(t => (
                                    <tr key={t.tipo}>
                                        <td style={{ fontWeight: 600 }}>{t.tipo}</td>
                                        <td>{t.total}</td>
                                        <td style={{ color: '#60a5fa', fontWeight: 700 }}>{t.executados}</td>
                                        <td style={{ color: '#fbbf24', fontWeight: 700 }}>{t.revisados}</td>
                                        <td style={{ color: '#34d399' }}>{t.finalizados}</td>
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
