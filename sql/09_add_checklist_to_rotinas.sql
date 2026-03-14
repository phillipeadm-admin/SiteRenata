-- Adiciona a coluna checklist para a tabela de rotinas
ALTER TABLE public.renata_rotinas 
ADD COLUMN IF NOT EXISTS checklist JSONB DEFAULT '{}';

COMMENT ON COLUMN public.renata_rotinas.checklist IS 'Armazena o estado padrão ou atual do checklist da rotina';
