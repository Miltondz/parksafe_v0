-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create emergency alerts table
CREATE TABLE IF NOT EXISTS public.emergency_alerts (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id),
    type VARCHAR(50) NOT NULL,
    message TEXT,
    status VARCHAR(20) DEFAULT 'active',
    location GEOMETRY(POINT, 4326),
    metadata JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS emergency_alerts_user_id_idx ON public.emergency_alerts(user_id);
CREATE INDEX IF NOT EXISTS emergency_alerts_type_idx ON public.emergency_alerts(type);
CREATE INDEX IF NOT EXISTS emergency_alerts_status_idx ON public.emergency_alerts(status);
CREATE INDEX IF NOT EXISTS emergency_alerts_created_at_idx ON public.emergency_alerts(created_at DESC);

-- Enable RLS
ALTER TABLE public.emergency_alerts ENABLE ROW LEVEL SECURITY;

-- Create policies
DO $$ 
BEGIN
    DROP POLICY IF EXISTS "Enable read access for authenticated users" ON public.emergency_alerts;
    DROP POLICY IF EXISTS "Enable insert access for authenticated users" ON public.emergency_alerts;
    
    CREATE POLICY "Enable read access for authenticated users"
        ON public.emergency_alerts
        FOR SELECT
        TO authenticated
        USING (true);

    CREATE POLICY "Enable insert access for authenticated users"
        ON public.emergency_alerts
        FOR INSERT
        TO authenticated
        WITH CHECK (auth.uid() = user_id);
END $$;

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
DROP TRIGGER IF EXISTS update_emergency_alerts_updated_at ON public.emergency_alerts;
CREATE TRIGGER update_emergency_alerts_updated_at
    BEFORE UPDATE ON public.emergency_alerts
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();