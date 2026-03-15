export type StatusKanban = string;

export interface StatusKanbanDef {
    id: string;
    nome: string;
    cor: string;
    ordem: number;
    ativo: boolean;
}

export interface FluxoEtapa {
    id: string;
    tipo_assunto_id: string;
    nome: string;
    dias_entrada: number;
    dias_saida: number;
    ordem: number;
    sub_etapas?: string[];
    status_vinculado?: string | null;
    responsavel_nome?: string | null;
    data_inicio?: string | null;
    data_fim?: string | null;
    created_at: string;
}

export type RiscoStatus = 'no_prazo' | 'atencao' | 'critico' | 'vencido' | 'finalizado';

export interface Usuario {
    id: string;
    nome: string;
    cargo: string;
    password: string;
    pin?: string;
    role: 'admin' | 'user';
    isFirstLogin: boolean;
    created_at: string;
    lastSeen?: string;
}

export interface DataIntermediaria {
    data: string;
    justificativa: string;
}

export interface Processo {
    id: string;
    assunto: string;
    tipo_assunto: string;
    responsavel_execucao: string;
    responsavel_revisao: string | null;
    data_entrada: string;
    data_prazo: string | null;
    data_finalizacao: string | null;
    status_kanban: StatusKanban;
    observacoes: string | null;
    numero_processo: string | null;
    datas_intermediarias?: DataIntermediaria[] | null;
    recorrente?: boolean | null;
    complexo?: boolean | null;
    intervalo_dias?: number | null;
    proxima_execucao?: string | null;
    checklist?: Record<string, boolean> | null;
    created_at: string;
    updated_at: string;
}

export interface HistoricoStatus {
    id: string;
    processo_id: string;
    status_anterior: StatusKanban | null;
    status_novo: StatusKanban;
    timestamp: string;
    observacao: string | null;
}

export const TIPOS_ASSUNTO = [
    'Progressão Funcional',
    'Aposentadoria',
    'Folha de Pagamento',
    'Licença Prêmio',
    'Abono de Permanência',
    'Progressão Docente',
    'Férias',
    'Licença Médica',
    'Exoneração',
    'Nomeação',
    'Outros',
];

// AS CORES E LABELS AGORA VÊM DO BANCO DE DADOS (renata_status_kanban)

export function calcularRisco(
    dataPrazo: string | null,
    status: StatusKanban,
    thresholdCritico: number = 3,
    thresholdAtencao: number = 7
): RiscoStatus {
    if (status && (status.toLowerCase().includes('finalizado') || status.toLowerCase().includes('concluído'))) return 'finalizado';
    if (!dataPrazo) return 'no_prazo';

    // Obter data atual no fuso horário do Brasil (Brasília)
    const agoraBR = new Date(new Date().toLocaleString("en-US", {timeZone: "America/Sao_Paulo"}));
    const hoje = new Date(agoraBR.getFullYear(), agoraBR.getMonth(), agoraBR.getDate());

    // Parse manual do prazo (sempre YYYY-MM-DD no banco) para evitar problemas de fuso
    const [ano, mes, dia] = dataPrazo.split('-').map(Number);
    const prazo = new Date(ano, mes - 1, dia);
    prazo.setHours(0, 0, 0, 0);

    const diffMs = prazo.getTime() - hoje.getTime();
    const diffDias = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDias < 0) return 'vencido';
    if (diffDias <= thresholdCritico) return 'critico';
    if (diffDias <= thresholdAtencao) return 'atencao';
    return 'no_prazo';
}

export const RISCO_LABELS: Record<RiscoStatus, string> = {
    no_prazo: 'No Prazo',
    atencao: 'Atenção',
    critico: 'Crítico',
    vencido: 'Vencido',
    finalizado: 'Finalizado',
};

export const RISCO_COLORS: Record<RiscoStatus, string> = {
    no_prazo: '#10b981',
    atencao: '#f59e0b',
    critico: '#ef4444',
    vencido: '#991b1b', // Vermelho escuro para vencidos
    finalizado: '#6366f1',
};
