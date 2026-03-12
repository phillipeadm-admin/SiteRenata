-- Migration: Add responsavel_execucao and responsavel_revisao to renata_tipos_assunto
ALTER TABLE public.renata_tipos_assunto 
ADD COLUMN IF NOT EXISTS responsavel_execucao TEXT,
ADD COLUMN IF NOT EXISTS responsavel_revisao TEXT;

-- Update RLS policies (usually not needed if already enabled for the table)
