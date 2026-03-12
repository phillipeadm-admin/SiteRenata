-- Migration: Add recurrence details to renata_rotinas (Simplified)
ALTER TABLE renata_rotinas 
DROP COLUMN IF EXISTS frequencia,
DROP COLUMN IF EXISTS dia_execucao;

ALTER TABLE renata_rotinas 
ADD COLUMN IF NOT EXISTS intervalo_dias INTEGER DEFAULT 30,
ADD COLUMN IF NOT EXISTS proxima_execucao DATE;

COMMENT ON COLUMN renata_rotinas.intervalo_dias IS 'Intervalo de recorrência em dias';
COMMENT ON COLUMN renata_rotinas.proxima_execucao IS 'Data da próxima criação automática';
