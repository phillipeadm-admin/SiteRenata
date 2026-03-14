-- Adiciona o nome do responsável por etapa do fluxo
ALTER TABLE public.renata_fluxo_etapas 
ADD COLUMN IF NOT EXISTS responsavel_nome TEXT;

COMMENT ON COLUMN public.renata_fluxo_etapas.responsavel_nome IS 'Nome do responsável específico por esta etapa do fluxo';
