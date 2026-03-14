-- Adiciona a coluna status_vinculado para permitir agrupar etapas do fluxo nos status do Kanban
ALTER TABLE public.renata_fluxo_etapas 
ADD COLUMN IF NOT EXISTS status_vinculado TEXT;

COMMENT ON COLUMN public.renata_fluxo_etapas.status_vinculado IS 'Vincula a etapa do fluxo a um status específico do Kanban (ex: "Triagem", "Em Andamento")';
