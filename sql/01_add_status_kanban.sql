-- 1. Criar a tabela de Status do Kanban
CREATE TABLE public.renata_status_kanban (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nome TEXT NOT NULL,
    cor TEXT NOT NULL DEFAULT '#6366f1',
    ordem INTEGER NOT NULL DEFAULT 0,
    ativo BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 2. Inserir os status padrão (mantendo as cores originais)
INSERT INTO public.renata_status_kanban (nome, cor, ordem) VALUES
('Triagem / Backlog', '#6366f1', 1),
('Em Execução', '#3b82f6', 2),
('Aguardando Revisão', '#f59e0b', 3),
('Ajustes', '#ef4444', 4),
('Finalizado', '#10b981', 5);

-- 3. Atualizar os processos antigos para usar o NOME do status em vez do id interno
UPDATE public.renata_processos SET status_kanban = 'Triagem / Backlog' WHERE status_kanban = 'triagem';
UPDATE public.renata_processos SET status_kanban = 'Em Execução' WHERE status_kanban = 'em_execucao';
UPDATE public.renata_processos SET status_kanban = 'Aguardando Revisão' WHERE status_kanban = 'aguardando_revisao';
UPDATE public.renata_processos SET status_kanban = 'Ajustes' WHERE status_kanban = 'ajustes';
UPDATE public.renata_processos SET status_kanban = 'Finalizado' WHERE status_kanban = 'finalizado';

-- Habilitar RLS (opcional)
ALTER TABLE public.renata_status_kanban ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Status kanban is viewable by everyone" ON public.renata_status_kanban FOR SELECT USING (true);
CREATE POLICY "Status kanban is insertable by authenticated" ON public.renata_status_kanban FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Status kanban is updatable by authenticated" ON public.renata_status_kanban FOR UPDATE USING (auth.role() = 'authenticated');
CREATE POLICY "Status kanban is deletable by authenticated" ON public.renata_status_kanban FOR DELETE USING (auth.role() = 'authenticated');
