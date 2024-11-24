-- Drop existing policies for emergency_alerts if they exist
DO $$ 
BEGIN
    DROP POLICY IF EXISTS "Everyone can view emergency alerts" ON public.emergency_alerts;
    DROP POLICY IF EXISTS "Authenticated users can create emergency alerts" ON public.emergency_alerts;
    DROP POLICY IF EXISTS "Admins can manage emergency alerts" ON public.emergency_alerts;
END $$;

-- Create new policies with proper permissions
CREATE POLICY "Everyone can view emergency alerts"
    ON public.emergency_alerts FOR SELECT
    USING (true);

CREATE POLICY "Authenticated users can create emergency alerts"
    ON public.emergency_alerts FOR INSERT
    WITH CHECK (auth.uid() IS NOT NULL);

-- Updated policy that doesn't require direct user table access
CREATE POLICY "Admins can manage emergency alerts"
    ON public.emergency_alerts FOR ALL
    USING (
        auth.jwt() ->> 'role' = 'authenticated' AND
        (auth.jwt() ->> 'user_metadata')::jsonb ->> 'is_admin' = 'true'
    );

-- Create or replace function to handle alert deletion
CREATE OR REPLACE FUNCTION handle_emergency_alert_deletion()
RETURNS TRIGGER AS $$
BEGIN
    -- Update related messages to mark them as inactive
    UPDATE public.messages
    SET type = 'inactive'
    WHERE type = 'emergency'
    AND created_at = OLD.created_at;
    
    RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for emergency alert deletion
DROP TRIGGER IF EXISTS emergency_alert_deletion_trigger ON public.emergency_alerts;
CREATE TRIGGER emergency_alert_deletion_trigger
    BEFORE DELETE ON public.emergency_alerts
    FOR EACH ROW
    EXECUTE FUNCTION handle_emergency_alert_deletion();