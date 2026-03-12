-- Script para adicionar a coluna 'recorrente' às tabelas de processos e rotinas
-- Execute este script no SQL Editor do seu projeto Supabase

ALTER TABLE renata_processos ADD COLUMN IF NOT EXISTS recorrente BOOLEAN DEFAULT FALSE;
ALTER TABLE renata_rotinas ADD COLUMN IF NOT EXISTS recorrente BOOLEAN DEFAULT FALSE;

COMMENT ON COLUMN renata_processos.recorrente IS 'Identifica se o processo é uma rotina recorrente';
COMMENT ON COLUMN renata_rotinas.recorrente IS 'Identifica se a rotina é marcada como recorrente';
