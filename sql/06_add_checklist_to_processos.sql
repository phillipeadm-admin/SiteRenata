-- Adiciona a coluna checklist para armazenar o estado das sub-etapas dos processos
ALTER TABLE public.renata_processos 
ADD COLUMN IF NOT EXISTS checklist JSONB DEFAULT '{}';

COMMENT ON COLUMN public.renata_processos.checklist IS 'Armazena o estado de conclusão das sub-etapas do fluxo (Ex: {"Etapa 1: Sub 1": true})';
