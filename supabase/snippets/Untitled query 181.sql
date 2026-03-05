-- Création de la table pour stocker les comptes-rendus
CREATE TABLE IF NOT EXISTS public.generated_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    study_id UUID REFERENCES public.studies(id) ON DELETE CASCADE,
    content TEXT, -- Le texte du rapport
    status TEXT DEFAULT 'draft',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Activation de la sécurité (même en local, c'est mieux)
ALTER TABLE public.generated_reports ENABLE ROW LEVEL SECURITY;

-- Autoriser tout le monde à lire/écrire pour tes tests locaux
CREATE POLICY "Accès total en local" ON public.generated_reports
    FOR ALL USING (true) WITH CHECK (true);