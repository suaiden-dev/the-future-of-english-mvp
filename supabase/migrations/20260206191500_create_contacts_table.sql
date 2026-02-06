CREATE TABLE IF NOT EXISTS public.contacts (
    id UUID NOT NULL DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    phone TEXT,
    message TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    CONSTRAINT contacts_pkey PRIMARY KEY (id)
);

ALTER TABLE public.contacts ENABLE ROW LEVEL SECURITY;

-- Allow anyone to insert contacts (public form)
CREATE POLICY "Anyone can insert contacts"
    ON public.contacts
    FOR INSERT
    WITH CHECK (true);

-- Allow admins to view contacts
CREATE POLICY "Admins can select contacts"
    ON public.contacts
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role = 'admin'
        )
    );
