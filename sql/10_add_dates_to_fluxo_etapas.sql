-- Adiciona as colunas data_inicio e data_fim para as etapas de fluxo
ALTER TABLE public.renata_fluxo_etapas 
ADD COLUMN IF NOT EXISTS data_inicio TEXT,
ADD COLUMN IF NOT EXISTS data_fim TEXT;

COMMENT ON COLUMN public.renata_fluxo_etapas.data_inicio IS 'Data de início prevista para a etapa (template)';
COMMENT ON COLUMN public.renata_fluxo_etapas.data_fim IS 'Data final prevista para a etapa (template)';
