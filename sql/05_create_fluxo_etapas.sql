CREATE TABLE IF NOT EXISTS public.renata_fluxo_etapas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tipo_assunto_id UUID NOT NULL REFERENCES public.renata_tipos_assunto(id) ON DELETE CASCADE,
    nome TEXT NOT NULL,
    dias_entrada INTEGER DEFAULT 0,
    dias_saida INTEGER DEFAULT 0,
    ordem INTEGER DEFAULT 0,
    sub_etapas TEXT[] DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

ALTER TABLE public.renata_fluxo_etapas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Etapas de fluxo visiveis por todos" ON public.renata_fluxo_etapas FOR SELECT USING (true);
CREATE POLICY "Etapas de fluxo inseriveis por todos" ON public.renata_fluxo_etapas FOR INSERT WITH CHECK (true);
CREATE POLICY "Etapas de fluxo atualizaveis por todos" ON public.renata_fluxo_etapas FOR UPDATE USING (true);
CREATE POLICY "Etapas de fluxo deletaveis por todos" ON public.renata_fluxo_etapas FOR DELETE USING (true);

CREATE INDEX IF NOT EXISTS idx_fluxo_etapas_tipo_assunto ON public.renata_fluxo_etapas(tipo_assunto_id);
