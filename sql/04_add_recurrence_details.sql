-- Migration: Add recurrence details to renata_rotinas
ALTER TABLE renata_rotinas 
ADD COLUMN IF NOT EXISTS frequencia TEXT CHECK (frequencia IN ('diaria', 'semanal', 'mensal', 'anual')),
ADD COLUMN IF NOT EXISTS dia_execucao INTEGER,
ADD COLUMN IF NOT EXISTS proxima_execucao DATE;

COMMENT ON COLUMN renata_rotinas.frequencia IS 'Frequência da recorrência';
COMMENT ON COLUMN renata_rotinas.dia_execucao IS 'Dia da execução (0-6 para semana, 1-31 para mês)';
COMMENT ON COLUMN renata_rotinas.proxima_execucao IS 'Data da próxima criação automática';
