export type StatusKanban =
    | 'triagem'
    | 'em_execucao'
    | 'aguardando_revisao'
    | 'ajustes'
    | 'finalizado';

export type RiscoStatus = 'no_prazo' | 'atencao' | 'critico' | 'finalizado';

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

export const STATUS_KANBAN_LABELS: Record<StatusKanban, string> = {
    triagem: 'Triagem / Backlog',
    em_execucao: 'Em Execução',
    aguardando_revisao: 'Aguardando Revisão',
    ajustes: 'Ajustes',
    finalizado: 'Finalizado',
};

export const STATUS_KANBAN_COLORS: Record<StatusKanban, string> = {
    triagem: '#6366f1',
    em_execucao: '#3b82f6',
    aguardando_revisao: '#f59e0b',
    ajustes: '#ef4444',
    finalizado: '#10b981',
};

export function calcularRisco(
    dataPrazo: string | null,
    status: StatusKanban
): RiscoStatus {
    if (status === 'finalizado') return 'finalizado';
    if (!dataPrazo) return 'no_prazo';
    const hoje = new Date();
    const prazo = new Date(dataPrazo);
    const diffDias = Math.ceil(
        (prazo.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24)
    );
    if (diffDias < 0) return 'critico';
    if (diffDias <= 3) return 'critico';
    if (diffDias <= 7) return 'atencao';
    return 'no_prazo';
}

export const RISCO_LABELS: Record<RiscoStatus, string> = {
    no_prazo: 'No Prazo',
    atencao: 'Atenção',
    critico: 'Crítico',
    finalizado: 'Finalizado',
};

export const RISCO_COLORS: Record<RiscoStatus, string> = {
    no_prazo: '#10b981',
    atencao: '#f59e0b',
    critico: '#ef4444',
    finalizado: '#6366f1',
};
